import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { RibbonBar } from "./components/RibbonBar";
import { RibbonIcon } from "./components/RibbonIcon";
import { OptionDialog } from "./components/OptionDialog";
import Split from "react-split";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-sql";

const TOOL_MODULES = [
  { id: "home", label: "Home" },
  { id: "option", label: "Option" },
  { id: "language", label: "Language" },
  { id: "codeGenerator", label: "Code Generator" },
  { id: "queryDeveloper", label: "Query Developer" },
  { id: "menuEditor", label: "Menu Editor" },
  { id: "clientConfig", label: "Client Config" },
  { id: "laboratory", label: "Laboratory" },
];

const DECLARATION_SHORTCUTS = [
  { id: "language", label: "Language", icon: "LA", description: "Define language declarations and metadata." },
  { id: "menuEditor", label: "Menu Editor", icon: "ME", description: "Configure menu structures and behaviors." },
  { id: "clientConfig", label: "Client Config", icon: "CC", description: "Manage client-side configuration options." },
];

const DEVELOPMENT_SHORTCUTS = [
  { id: "queryDeveloper", label: "Query Developer", icon: "QD", description: "Build and edit query tree and SQL mappings." },
  { id: "codeGenerator", label: "Code Generator", icon: "CG", description: "Generate code artifacts from definitions." },
  { id: "laboratory", label: "Laboratory", icon: "LB", description: "Use experimental and test utilities." },
];

const HOME_SHORTCUT_GROUPS = [
  { title: "Declaration", items: DECLARATION_SHORTCUTS },
  { title: "Development", items: DEVELOPMENT_SHORTCUTS },
];

const MAIN_LOGO_SRC = "/linkonx-main-logo.svg";
const SQL_PROVIDERS = ["MsSql", "Oracle", "MySql", "MariaDb", "PostgreSql", "Machbase", "OleDb", "Influx", "SQLite"];

function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);
  const [showOption, setShowOption] = useState(false);
  const [authPending, setAuthPending] = useState(false);
  const [authError, setAuthError] = useState("");
  const [credentials, setCredentials] = useState({ factory: "", username: "", password: "" });
  const [treeFontFamily, setTreeFontFamily] = useState("Noto Sans KR, Noto Sans, Segoe UI, system-ui, sans-serif");
  const [treeFontSize, setTreeFontSize] = useState(14);
  const [propFontFamily, setPropFontFamily] = useState("Noto Sans KR, Noto Sans, Segoe UI, system-ui, sans-serif");
  const [propFontSize, setPropFontSize] = useState(13);
  const [themePreset, setThemePreset] = useState(() => {
    try {
      const raw = window.localStorage.getItem("linkon.themePreset");
      return raw === "dark" ? "dark" : "white";
    } catch {
      return "white";
    }
  });

  const [activeModule, setActiveModule] = useState("home");

  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState("");
  const [fileLoading, setFileLoading] = useState(false);

  const [treeRoot, setTreeRoot] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const [selectedPath, setSelectedPath] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCollapsed, setSearchCollapsed] = useState(true);
  const [searchCaseSensitive, setSearchCaseSensitive] = useState(false);
  const [searchMatches, setSearchMatches] = useState([]);
  const [searchIndex, setSearchIndex] = useState(-1);
  const treePaneRef = useRef(null);

  const [nodeDetail, setNodeDetail] = useState(null);
  const [propertyDraft, setPropertyDraft] = useState({});
  const [propertiesCollapsed, setPropertiesCollapsed] = useState(false);
  const [sqlDraft, setSqlDraft] = useState({});
  const [activeSqlProvider, setActiveSqlProvider] = useState("MsSql");

  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState("");

  const treeMap = useMemo(() => buildTreeMap(treeRoot), [treeRoot]);
  const treeRows = useMemo(() => flattenVisible(treeRoot, expanded), [treeRoot, expanded]);
  const activeModuleInfo = useMemo(
    () => TOOL_MODULES.find((item) => item.id === activeModule) || TOOL_MODULES[0],
    [activeModule],
  );

  const propertyGroups = useMemo(() => groupProperties(nodeDetail?.properties || []), [nodeDetail]);

  const propertyDirty = useMemo(() => {
    if (!nodeDetail) return false;
    return (nodeDetail.properties || []).some((prop) => {
      if (isAlwaysReadOnlyProperty(prop)) return false;
      if (prop.type === "bool") return normalizeBoolValue(propertyDraft[prop.key] ?? prop.value) !== normalizeBoolValue(prop.value);
      return String(propertyDraft[prop.key] ?? prop.value ?? "") !== String(prop.value ?? "");
    });
  }, [nodeDetail, propertyDraft]);

  const sqlDirty = useMemo(() => {
    if (!nodeDetail) return false;
    if (nodeDetail.kind !== "sqlGroup") return false;
    return SQL_PROVIDERS.some((provider) => String(sqlDraft[provider] ?? "") !== String(nodeDetail.sqlQueries?.[provider] ?? ""));
  }, [nodeDetail, sqlDraft]);

  const nodeDirty = propertyDirty || sqlDirty;

  const confirmDiscard = useCallback(() => {
    if (!nodeDirty) return true;
    return window.confirm("Unsaved changes exist. Continue and discard changes?");
  }, [nodeDirty]);

  const initDrafts = useCallback((detail) => {
    const nextProps = {};
    for (const prop of detail?.properties || []) {
      if (isAlwaysReadOnlyProperty(prop)) continue;
      nextProps[prop.key] = prop.type === "bool" ? Boolean(prop.value) : String(prop.value ?? "");
    }
    setPropertyDraft(nextProps);

    if (detail?.kind === "sqlGroup") {
      const nextSql = {};
      for (const provider of SQL_PROVIDERS) {
        nextSql[provider] = String(detail.sqlQueries?.[provider] ?? "");
      }
      setSqlDraft(nextSql);
    } else {
      setSqlDraft({});
      setActiveSqlProvider("MsSql");
    }
  }, []);

  const loadNodeDetail = useCallback(
    async (fileName, pathText) => {
      const data = await apiRequest(
        `/api/qsf/query-developer/node?name=${encodeURIComponent(fileName)}&path=${encodeURIComponent(pathText)}`,
      );
      const detail = data.node || null;
      setNodeDetail(detail);
      initDrafts(detail);
    },
    [initDrafts],
  );

  const loadTree = useCallback(
    async (fileName, preferredPath = "") => {
      if (!fileName) return;
      setFileLoading(true);
      setBanner("");
      try {
        const data = await apiRequest(`/api/qsf/query-developer/tree?name=${encodeURIComponent(fileName)}`);
        const root = data.tree || null;
        setSelectedFile(data.name || fileName);
        setTreeRoot(root);
        setExpanded(defaultExpanded(root, 2));

        const map = buildTreeMap(root);
        const targetPath = selectPath(map, preferredPath);
        setSelectedPath(targetPath);
        if (targetPath) {
          await loadNodeDetail(fileName, targetPath);
        } else {
          setNodeDetail(null);
          initDrafts(null);
        }
      } catch (error) {
        setTreeRoot(null);
        setSelectedPath("");
        setNodeDetail(null);
        initDrafts(null);
        setBanner(`Load failed: ${error.message}`);
      } finally {
        setFileLoading(false);
      }
    },
    [initDrafts, loadNodeDetail],
  );

  const loadFiles = useCallback(
    async (keepSelection = true) => {
      setFilesLoading(true);
      setBanner("");
      try {
        const data = await apiRequest("/api/qsf/files");
        const nextFiles = data.files || [];
        setFiles(nextFiles);

        if (!nextFiles.length) {
          setSelectedFile("");
          setTreeRoot(null);
          setSelectedPath("");
          setNodeDetail(null);
          initDrafts(null);
          return;
        }

        const current = keepSelection ? selectedFile : "";
        const fallback = nextFiles[0].name;
        const target = nextFiles.some((item) => item.name === current) ? current : fallback;
        if (target) {
          await loadTree(target, keepSelection ? selectedPath : "");
        }
      } catch (error) {
        setBanner(`File list load failed: ${error.message}`);
      } finally {
        setFilesLoading(false);
      }
    },
    [initDrafts, loadTree, selectedFile, selectedPath],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const session = await apiRequest("/api/auth/me");
        if (!alive) return;
        setUser(session);
      } catch {
        if (!alive) return;
        setUser(null);
      } finally {
        if (alive) setBooting(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    void loadFiles(true);
  }, [user]);

  useEffect(() => {
    const className = "app-theme-dark";
    if (themePreset === "dark") document.body.classList.add(className);
    else document.body.classList.remove(className);
    try {
      window.localStorage.setItem("linkon.themePreset", themePreset);
    } catch {
      // ignore storage failures
    }
    return () => {
      document.body.classList.remove(className);
    };
  }, [themePreset]);

  useEffect(() => {
    setSearchMatches([]);
    setSearchIndex(-1);
  }, [treeRoot]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      scrollTreeNodeIntoView(treePaneRef.current, selectedPath);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedPath, expanded]);

  const onLogin = async (event) => {
    event.preventDefault();
    setAuthError("");
    setBanner("");
    setAuthPending(true);

    const factory = credentials.factory.trim();
    if (!factory) {
      setAuthError("Factory is required.");
      setAuthPending(false);
      return;
    }

    try {
      const session = await apiRequest("/api/auth/login", {
        method: "POST",
        body: {
          factory,
          id: credentials.username.trim(),
          username: credentials.username.trim(),
          password: credentials.password,
        },
      });
      setUser(session);
      setActiveModule("home");
      setCredentials((prev) => ({ ...prev, password: "" }));
      setBanner("Login completed. LinkOnX Tools is ready.");
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthPending(false);
    }
  };

  const onLogout = async () => {
    if (!confirmDiscard()) return;
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setFiles([]);
      setSelectedFile("");
      setTreeRoot(null);
      setSelectedPath("");
      setNodeDetail(null);
      initDrafts(null);
      setBanner("");
      setAuthError("");
    }
  };

  const onSelectModule = useCallback((moduleId) => {
    if (moduleId === activeModule) return;
    if (activeModule === "queryDeveloper" && !confirmDiscard()) return;
    setActiveModule(moduleId);
  }, [activeModule, confirmDiscard]);

  const onSelectFile = async (fileName) => {
    if (fileName === selectedFile) return;
    if (!confirmDiscard()) return;
    await loadTree(fileName, "");
  };

  const onSelectNode = async (pathText) => {
    if (!selectedFile || pathText === selectedPath) return;
    if (!confirmDiscard()) return;

    setSelectedPath(pathText);
    setFileLoading(true);
    try {
      await loadNodeDetail(selectedFile, pathText);
    } catch (error) {
      setBanner(`Node load failed: ${error.message}`);
    } finally {
      setFileLoading(false);
    }
  };

  const toggleNodeExpanded = useCallback((pathText) => {
    if (!pathText) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(pathText)) next.delete(pathText);
      else next.add(pathText);
      return next;
    });
  }, []);

  const onSearch = async () => {
    const keyword = searchQuery.trim();
    if (!keyword) {
      setSearchMatches([]);
      setSearchIndex(-1);
      return;
    }

    const matches = findTreeMatches(treeRoot, keyword, searchCaseSensitive);
    setSearchMatches(matches);
    if (!matches.length) {
      setSearchIndex(-1);
      return;
    }

    setSearchIndex(0);
    const target = matches[0];
    setExpanded((prev) => expandPath(prev, target));
    await onSelectNode(target);
  };

  const currentSearchDisplay = searchMatches.length > 0 && searchIndex >= 0 ? searchIndex + 1 : 0;

  const moveSearch = async (step) => {
    if (!searchMatches.length) return;
    const base = searchIndex >= 0 ? searchIndex : 0;
    const next = (base + step + searchMatches.length) % searchMatches.length;
    setSearchIndex(next);
    const target = searchMatches[next];
    setExpanded((prev) => expandPath(prev, target));
    await onSelectNode(target);
  };

  const onChangeProperty = (prop, value) => {
    if (isAlwaysReadOnlyProperty(prop)) return;
    const nextValue = prop.type === "bool" ? normalizeBoolValue(value) : String(value ?? "");
    setPropertyDraft((prev) => ({
      ...prev,
      [prop.key]: nextValue,
    }));
  };

  const onUpdateProperties = useCallback(async () => {
    if (!selectedFile || !selectedPath || !nodeDetail || nodeDetail.kind === "root") return;
    const updates = {};
    for (const prop of nodeDetail.properties || []) {
      if (isAlwaysReadOnlyProperty(prop)) continue;
      const nextValue = prop.type === "bool"
        ? normalizeBoolValue(propertyDraft[prop.key] ?? prop.value)
        : String(propertyDraft[prop.key] ?? prop.value ?? "");
      const currentValue = prop.type === "bool"
        ? normalizeBoolValue(prop.value)
        : String(prop.value ?? "");
      if (nextValue === currentValue) continue;
      updates[prop.key] = nextValue;
    }

    const updateEntries = Object.entries(updates);
    if (updateEntries.length === 0) {
      setBanner("No property changes to update.");
      return;
    }

    setSaving(true);
    setBanner("");
    try {
      await apiRequest("/api/qsf/query-developer/node", {
        method: "PUT",
        body: {
          name: selectedFile,
          locator: { pathText: selectedPath },
          updates,
        },
      });

      setNodeDetail((prev) => {
        let next = prev;
        for (const [key, value] of updateEntries) {
          next = applySavedPropertyToDetail(next, selectedPath, key, value);
        }
        return next;
      });
      setTreeRoot((prev) => {
        let next = prev;
        for (const [key, value] of updateEntries) {
          next = applySavedPropertyToTree(next, selectedPath, key, value);
        }
        return next;
      });
      setBanner(`Updated ${updateEntries.length} properties.`);
    } catch (error) {
      setBanner(`Property update failed: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }, [nodeDetail, propertyDraft, selectedFile, selectedPath]);

  const onUpdateSqlQueries = useCallback(async () => {
    if (!selectedFile || !selectedPath || !nodeDetail || nodeDetail.kind !== "sqlGroup") return;

    const sqlQueries = SQL_PROVIDERS.reduce((acc, provider) => {
      acc[provider] = String(sqlDraft[provider] ?? "");
      return acc;
    }, {});
    const changedProviders = SQL_PROVIDERS.filter(
      (provider) => String(sqlQueries[provider] ?? "") !== String(nodeDetail.sqlQueries?.[provider] ?? ""),
    );

    if (!changedProviders.length) {
      setBanner("No SQL changes to update.");
      return;
    }

    setSaving(true);
    setBanner("");
    try {
      await apiRequest("/api/qsf/query-developer/node", {
        method: "PUT",
        body: {
          name: selectedFile,
          locator: { pathText: selectedPath },
          updates: {},
          sqlQueries,
        },
      });
      setNodeDetail((prev) => {
        if (!prev || prev?.locator?.pathText !== selectedPath) return prev;
        return { ...prev, sqlQueries: { ...(prev.sqlQueries || {}), ...sqlQueries } };
      });
      setBanner(`Updated SQL for ${changedProviders.length} DBs.`);
    } catch (error) {
      setBanner(`SQL update failed: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }, [nodeDetail, selectedFile, selectedPath, sqlDraft]);

  const onSave = async () => {
    if (!selectedFile || !nodeDetail || nodeDetail.kind === "root") return;

    const updates = {};
    for (const prop of nodeDetail.properties || []) {
      if (isAlwaysReadOnlyProperty(prop)) continue;
      updates[prop.key] = prop.type === "bool" ? normalizeBoolValue(propertyDraft[prop.key]) : String(propertyDraft[prop.key] ?? "");
    }

    const payload = {
      name: selectedFile,
      locator: { pathText: selectedPath },
      updates,
    };
    if (nodeDetail.kind === "sqlGroup") {
      payload.sqlQueries = SQL_PROVIDERS.reduce((acc, provider) => {
        acc[provider] = String(sqlDraft[provider] ?? "");
        return acc;
      }, {});
    }

    setSaving(true);
    setBanner("");
    try {
      await apiRequest("/api/qsf/query-developer/node", { method: "PUT", body: payload });
      setBanner(`Saved ${selectedFile} ${selectedPath}`);
      await loadTree(selectedFile, selectedPath);
    } catch (error) {
      setBanner(`Save failed: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const ribbonSections = useMemo(() => {
    const homeButtons = [
      {
        label: "Home",
        icon: "H",
        onClick: () => onSelectModule("home"),
        disabled: activeModule === "home",
      },
      {
        label: "Option",
        icon: "P",
        onClick: () => setShowOption(true),
      },
    ];
    const declarationButtons = DECLARATION_SHORTCUTS.map((item) => ({
      label: item.label,
      icon: item.icon,
      onClick: () => onSelectModule(item.id),
    }));
    const developmentButtons = DEVELOPMENT_SHORTCUTS.map((item) => ({
      label: item.label,
      icon: item.icon,
      onClick: () => onSelectModule(item.id),
    }));
    return [
      { title: "Home", buttons: homeButtons },
      { title: "Declaration", buttons: declarationButtons },
      { title: "Development", buttons: developmentButtons },
    ];
  }, [activeModule, onSelectModule]);

  const sessionLabel = user
    ? `${user.userName || user.username}${user.factory ? ` @ ${user.factory}` : ""}`
    : "";

  const ribbonQuickActions = [
    ...(activeModule === "queryDeveloper"
      ? [
          {
            label: "Refresh",
            icon: "R",
            onClick: () => {
              void loadFiles(true);
            },
            disabled: filesLoading || fileLoading,
          },
          {
            label: "Save",
            icon: "S",
            onClick: () => {
              void onSave();
            },
            disabled: !nodeDirty || saving || fileLoading,
          },
        ]
      : []),
    {
      label: "Logout",
      icon: "LO",
      onClick: () => {
        void onLogout();
      },
      disabled: false,
    },
  ];

  const appShellStyle = useMemo(
    () => ({
      "--tree-font-family": treeFontFamily,
      "--tree-font-size": `${Math.max(8, Math.min(32, Number(treeFontSize) || 14))}px`,
      "--prop-label-font-family": propFontFamily,
      "--prop-label-font-size": `${Math.max(8, Math.min(32, Number(propFontSize) || 13))}px`,
    }),
    [treeFontFamily, treeFontSize, propFontFamily, propFontSize],
  );

  if (booting) {
    return (
      <div className="screen-center">
        <img src={MAIN_LOGO_SRC} alt="LinkOnX main logo" className="boot-logo" />
        <div className="pulse-dot" />
        <p>Starting LinkOnX Tools...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="login-wrap">
        <section className="login-card">
          <div className="login-brand">
            <img src={MAIN_LOGO_SRC} alt="LinkOnX main logo" className="login-main-logo" />
            <div className="login-brand-text">
              <p className="eyebrow">LinkOnX Tools</p>
              <h1>LinkOnX Tools Login</h1>
            </div>
          </div>
          <p className="subtext">Query Developer module access requires authentication.</p>

          <form onSubmit={onLogin}>
            <label>
              Factory
              <input
                type="text"
                autoComplete="organization"
                value={credentials.factory}
                onChange={(event) => setCredentials((prev) => ({ ...prev, factory: event.target.value }))}
                required
              />
            </label>
            <label>
              ID
              <input
                type="text"
                autoComplete="username"
                value={credentials.username}
                onChange={(event) => setCredentials((prev) => ({ ...prev, username: event.target.value }))}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={credentials.password}
                onChange={(event) => setCredentials((prev) => ({ ...prev, password: event.target.value }))}
                required
              />
            </label>
            {authError && <p className="error-text">{authError}</p>}
            <button type="submit" className="primary-btn" disabled={authPending}>
              {authPending ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="app-shell" style={appShellStyle}>
      <RibbonBar sections={ribbonSections} sessionLabel={sessionLabel} quickActions={ribbonQuickActions} />

      {banner && <div className="banner">{banner}</div>}

      {activeModule === "home" ? (
        <section className="panel home-panel">
          <div className="home-content">
            <div className="home-title-wrap">
              <h2>Home</h2>
              <p className="subtext">Declaration and Development shortcuts.</p>
            </div>

            {HOME_SHORTCUT_GROUPS.map((group) => (
              <section key={group.title} className="home-group">
                <h3>{group.title}</h3>
                <div className="home-shortcut-grid">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="home-shortcut-card"
                      onClick={() => onSelectModule(item.id)}
                    >
                      <span className="home-shortcut-icon" aria-hidden="true">
                        <RibbonIcon label={item.label} fallback={item.icon} />
                      </span>
                      <span className="home-shortcut-text">
                        <span className="home-shortcut-name">{item.label}</span>
                        <span className="home-shortcut-desc">{item.description}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      ) : activeModule !== "queryDeveloper" ? (
        <section className="panel module-placeholder">
          <h2>{activeModuleInfo.label}</h2>
          <p className="subtext">This module page will be connected in the next step.</p>
        </section>
      ) : (
        <main className="workspace message-like-layout">
          <aside className="panel file-panel">
            <h2>System</h2>
            {files.length === 0 && <p className="empty-text">No systems found.</p>}
            <ul className="file-list">
              {files.map((file) => (
                <li key={file.name}>
                  <button type="button" className={selectedFile === file.name ? "active" : ""} onClick={() => void onSelectFile(file.name)}>
                    <span className="system-file-name">
                      <img src="/icons/SqlSystem.png" alt="" className="system-file-icon" />
                      {file.systemName || file.name}
                    </span>
                    <small>{file.name} | {formatFileSize(file.size)} | {formatDate(file.modifiedAt)}</small>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section className="panel query-developer-panel">
            <div className="module-head">
              <h2>Query Developer</h2>
              <p className="subtext">MessageEditor style layout with TreeView and PropertyGrid.</p>
            </div>

            <Split
              className="message-editor split split-horizontal qd-split"
              direction="horizontal"
              sizes={[44, 56]}
              minSize={[280, 320]}
              gutterSize={6}
              gutterAlign="center"
            >
              <div ref={treePaneRef} className="message-list qd-tree-pane">
                <div className={`tree-search ${searchCollapsed ? "collapsed" : "expanded"}`}>
                  <button
                    type="button"
                    className="tree-search-icon-btn tree-search-toggle"
                    onClick={() => setSearchCollapsed((prev) => !prev)}
                    title={searchCollapsed ? "Expand search" : "Collapse search"}
                    aria-label={searchCollapsed ? "Expand search" : "Collapse search"}
                  >
                    <span className="tree-search-icon tree-search-icon-magnify" aria-hidden="true" />
                  </button>

                  {!searchCollapsed && (
                    <div className="tree-search-panel">
                      <input
                        value={searchQuery}
                        placeholder="Search Name / Description"
                        aria-label="Search Query Developer tree"
                        onChange={(event) => setSearchQuery(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void onSearch();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className={`tree-search-icon-btn tree-search-case ${searchCaseSensitive ? "active" : ""}`}
                        onClick={() => setSearchCaseSensitive((prev) => !prev)}
                        title={searchCaseSensitive ? "Case sensitive on" : "Case sensitive off"}
                        aria-label="Toggle case sensitive search"
                        aria-pressed={searchCaseSensitive}
                      >
                        <span className="tree-search-case-label" aria-hidden="true">Aa</span>
                      </button>
                      <button type="button" className="tree-search-icon-btn" onClick={() => void onSearch()} title="Search" aria-label="Search">
                        <span className="tree-search-icon tree-search-icon-magnify" aria-hidden="true" />
                      </button>
                      <span className="tree-search-count" title={`${searchMatches.length} matched nodes`}>
                        {currentSearchDisplay}/{searchMatches.length}
                      </span>
                      <button
                        type="button"
                        className="tree-search-icon-btn"
                        onClick={() => void moveSearch(-1)}
                        disabled={!searchMatches.length}
                        title="Previous match"
                        aria-label="Previous match"
                      >
                        <span className="tree-search-icon tree-search-icon-up" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="tree-search-icon-btn"
                        onClick={() => void moveSearch(1)}
                        disabled={!searchMatches.length}
                        title="Next match"
                        aria-label="Next match"
                      >
                        <span className="tree-search-icon tree-search-icon-down" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="tree">
                  {treeRows.length === 0 && <p className="empty-text">Select a qsf file to load TreeView.</p>}
                  {treeRows.map((row) => {
                    const pathText = row.node.locator?.pathText || "";
                    const selected = pathText === selectedPath;
                    const hasChildren = (row.node.children || []).length > 0;
                    const isOpen = row.depth === 0 ? true : expanded.has(pathText);
                    const nodeIcon = getQueryDeveloperTreeIcon(row.node.kind);
                    return (
                      <div key={pathText || row.node.id} className="tree-node" style={{ marginLeft: row.depth * 5 }}>
                        <div
                          className={`tree-label ${selected ? "active" : ""}`}
                          data-node-key={pathText}
                          onClick={() => {
                            void onSelectNode(pathText);
                          }}
                          onDoubleClick={(event) => {
                            if (!hasChildren) return;
                            const target = event.target;
                            if (target instanceof Element && target.closest(".tree-toggle")) return;
                            toggleNodeExpanded(pathText);
                          }}
                        >
                          {hasChildren ? (
                            <button
                              type="button"
                              className="tree-toggle"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleNodeExpanded(pathText);
                              }}
                            >
                              {isOpen ? "\u25BE" : "\u25B8"}
                            </button>
                          ) : (
                            <span className="tree-toggle spacer" />
                          )}
                          {nodeIcon ? <img src={nodeIcon} alt={row.node.tag || row.node.kind || ""} className="node-icon" /> : null}
                          <span className="tag">{row.node.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="msg-form qd-detail-pane">
                <div className="qd-detail-grid">
                  <section className="qd-prop-grid">
                    <div className="qd-prop-head">
                      <h4>Properties</h4>
                      <div className="qd-prop-head-actions">
                        <button
                          type="button"
                          className="prop-update-btn"
                          onClick={() => void onUpdateProperties()}
                          title="Update"
                          aria-label="Update"
                          disabled={saving || fileLoading || !propertyDirty || !nodeDetail || nodeDetail.kind === "root"}
                        >
                          <span className="prop-update-icon" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="prop-update-btn prop-toggle-btn"
                          onClick={() => setPropertiesCollapsed((prev) => !prev)}
                          title={propertiesCollapsed ? "Expand properties" : "Collapse properties"}
                          aria-label={propertiesCollapsed ? "Expand properties" : "Collapse properties"}
                          aria-expanded={!propertiesCollapsed}
                        >
                          <span
                            className={`prop-toggle-icon ${propertiesCollapsed ? "collapsed" : "expanded"}`}
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                    </div>
                    {propertiesCollapsed ? null : !nodeDetail || !(nodeDetail.properties || []).length ? (
                      <p className="empty-text">No editable properties for this node.</p>
                    ) : (
                      <div className="prop-grid">
                        {propertyGroups.map((group) => (
                          <div key={group.category}>
                            <div className="prop-category">{group.category}</div>
                            {group.items.map((prop) => (
                              <div className="prop-row" key={prop.key}>
                                <label>{prop.label}</label>
                                {(() => {
                                  const readOnly = isAlwaysReadOnlyProperty(prop);
                                  if (prop.type === "enum") {
                                    return (
                                      <select
                                        value={String(propertyDraft[prop.key] ?? prop.value ?? "")}
                                        onChange={(event) => onChangeProperty(prop, event.target.value)}
                                        disabled={readOnly || fileLoading || saving}
                                      >
                                        {(prop.options || []).map((option) => (
                                          <option key={option} value={option}>{option}</option>
                                        ))}
                                      </select>
                                    );
                                  }
                                  if (prop.type === "bool") {
                                    return (
                                      <select
                                        value={boolToSelectValue(propertyDraft[prop.key] ?? prop.value)}
                                        onChange={(event) => onChangeProperty(prop, event.target.value)}
                                        disabled={readOnly || fileLoading || saving}
                                      >
                                        <option value="true">True</option>
                                        <option value="false">False</option>
                                      </select>
                                    );
                                  }
                                  return (
                                    <input
                                      value={String(propertyDraft[prop.key] ?? prop.value ?? "")}
                                      onChange={(event) => onChangeProperty(prop, event.target.value)}
                                      readOnly={readOnly}
                                      disabled={fileLoading || saving}
                                    />
                                  );
                                })()}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="qd-sql-editor">
                    <h4>SQL Editor</h4>
                    {nodeDetail?.kind !== "sqlGroup" ? (
                      <p className="empty-text">Select an SQL Code node(SG) to edit provider queries.</p>
                    ) : (
                      <>
                        <div className="sql-tab-row">
                          <button
                            type="button"
                            className="prop-update-btn sql-update-btn"
                            onClick={() => void onUpdateSqlQueries()}
                            title="Update"
                            aria-label="Update"
                            disabled={saving || fileLoading || !sqlDirty || nodeDetail?.kind !== "sqlGroup"}
                          >
                            <span className="prop-update-icon" aria-hidden="true" />
                          </button>
                          <span className="sql-tab-separator" role="separator" aria-orientation="vertical" />
                          {SQL_PROVIDERS.map((provider) => (
                            (() => {
                              const logoSrc = getSqlProviderLogoSrc(provider);
                              return (
                                <button
                                  key={provider}
                                  type="button"
                                  className={`sql-tab-btn sql-tab-icon-btn ${activeSqlProvider === provider ? "active" : ""}`}
                                  onClick={() => setActiveSqlProvider(provider)}
                                  title={provider}
                                  aria-label={provider}
                                >
                                  <span className="sql-provider-icon" aria-hidden="true">
                                    {logoSrc ? (
                                      <img src={logoSrc} alt="" className="sql-provider-logo" />
                                    ) : (
                                      <span className="sql-provider-fallback">{getSqlProviderMonogram(provider)}</span>
                                    )}
                                  </span>
                                </button>
                              );
                            })()
                          ))}
                        </div>
                        <SqlHighlightEditor
                          value={String(sqlDraft[activeSqlProvider] ?? "")}
                          onChange={(nextValue) => setSqlDraft((prev) => ({ ...prev, [activeSqlProvider]: nextValue }))}
                          disabled={fileLoading || saving}
                        />
                      </>
                    )}
                  </section>
                </div>
              </div>
            </Split>
          </section>
        </main>
      )}

      {showOption && (
        <OptionDialog
          initialTreeFont={treeFontFamily}
          initialTreeSize={treeFontSize}
          initialPropFont={propFontFamily}
          initialPropSize={propFontSize}
          initialThemePreset={themePreset}
          onCancel={() => setShowOption(false)}
          onApply={(vals) => {
            setTreeFontFamily(vals.treeFont);
            setTreeFontSize(vals.treeSize);
            setPropFontFamily(vals.propFont);
            setPropFontSize(vals.propSize);
            setThemePreset(vals.themePreset);
            setShowOption(false);
          }}
        />
      )}
    </div>
  );
}

function SqlHighlightEditor({ value, onChange, disabled }) {
  const wrapperRef = useRef(null);

  const syncHighlightScroll = useCallback((inputEl, preEl) => {
    const left = Number(inputEl?.scrollLeft || 0);
    const top = Number(inputEl?.scrollTop || 0);
    preEl.style.transform = `translate(${-left}px, ${-top}px)`;
  }, []);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return undefined;

    const inputEl = wrapper.querySelector(".sql-textarea-input");
    const preEl = wrapper.querySelector(".sql-textarea-pre");
    if (!inputEl || !preEl) return undefined;

    const onScroll = () => syncHighlightScroll(inputEl, preEl);
    onScroll();
    inputEl.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      inputEl.removeEventListener("scroll", onScroll);
      preEl.style.transform = "";
    };
  }, [syncHighlightScroll]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const inputEl = wrapper.querySelector(".sql-textarea-input");
    const preEl = wrapper.querySelector(".sql-textarea-pre");
    if (!inputEl || !preEl) return;

    syncHighlightScroll(inputEl, preEl);
  }, [value, disabled, syncHighlightScroll]);

  return (
    <div ref={wrapperRef} className="sql-highlight-editor-wrap">
      <Editor
        value={String(value ?? "")}
        onValueChange={onChange}
        highlight={highlightSqlCode}
        padding={12}
        className={`sql-textarea sql-highlight-editor ${disabled ? "disabled" : ""}`}
        textareaClassName="sql-textarea-input"
        preClassName="sql-textarea-pre"
        disabled={disabled}
        spellCheck={false}
        style={{
          fontFamily: 'Consolas, "Courier New", monospace',
          fontSize: "0.84rem",
          lineHeight: 1.42,
        }}
      />
    </div>
  );
}

function highlightSqlCode(code) {
  const highlighted = Prism.highlight(String(code ?? ""), Prism.languages.sql || Prism.languages.clike, "sql");
  return highlighted.replace(
    /<span class="token operator">(AND|OR)<\/span>/gi,
    '<span class="token keyword token-logical">$1</span>',
  );
}

function isAlwaysReadOnlyProperty(prop) {
  if (Boolean(prop?.readOnly)) return true;
  const key = String(prop?.key || "").toLowerCase();
  const label = String(prop?.label || "").toLowerCase();
  const category = String(prop?.category || "").toLowerCase();
  const isRelationGroup = category.includes("relation");
  return isRelationGroup || key === "type" || key === "systemkey" || key === "sequenceid" || label === "type" || label === "id";
}

function normalizeBoolValue(value) {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "").trim().toLowerCase();
  return ["true", "t", "1", "yes", "y"].includes(text);
}

function boolToSelectValue(value) {
  return normalizeBoolValue(value) ? "true" : "false";
}

function getSqlProviderMonogram(provider) {
  switch (String(provider || "").toLowerCase()) {
    case "mssql":
      return "MS";
    case "oracle":
      return "OR";
    case "mysql":
      return "MY";
    case "mariadb":
      return "MD";
    case "postgresql":
      return "PG";
    case "machbase":
      return "MB";
    case "oledb":
      return "OD";
    case "influx":
      return "IF";
    case "sqlite":
      return "SQ";
    default:
      return String(provider || "").slice(0, 2).toUpperCase();
  }
}

function getSqlProviderLogoSrc(provider) {
  switch (String(provider || "").toLowerCase()) {
    case "mssql":
      return "/icons/db/mssql.svg";
    case "oracle":
      return "/icons/db/oracle.svg";
    case "mysql":
      return "/icons/db/mysql.svg";
    case "mariadb":
      return "/icons/db/mariadb.svg";
    case "postgresql":
      return "/icons/db/postgresql.svg";
    case "influx":
      return "/icons/db/influxdb.svg";
    case "sqlite":
      return "/icons/db/sqlite.svg";
    case "oledb":
      return "/icons/db/mssql.svg";
    default:
      return "";
  }
}

function applySavedPropertyToDetail(detail, pathText, key, value) {
  if (!detail || detail?.locator?.pathText !== pathText) return detail;
  let changed = false;
  const nextProperties = (detail.properties || []).map((prop) => {
    if (String(prop?.key || "") !== key) return prop;
    changed = true;
    return { ...prop, value };
  });
  if (!changed) return detail;
  return { ...detail, properties: nextProperties };
}

function applySavedPropertyToTree(root, pathText, key, value) {
  if (!root || !pathText) return root;
  const nameKeys = new Set(["System", "Module", "Function", "SqlGroup", "Name"]);
  return mapTreeNodeByPath(root, pathText, (node) => {
    const keyText = String(key || "");
    let nextName = String(node?.name ?? "");
    let nextDescription = String(node?.description ?? "");
    let touched = false;

    if (nameKeys.has(keyText)) {
      nextName = String(value ?? "");
      touched = true;
    }
    if (keyText === "Description") {
      nextDescription = String(value ?? "");
      touched = true;
    }
    if (!touched) return node;

    return {
      ...node,
      name: nextName,
      description: nextDescription,
      label: formatQueryDeveloperLabel(nextName, nextDescription),
    };
  });
}

function mapTreeNodeByPath(root, pathText, updater) {
  let changed = false;

  const walk = (node) => {
    if (!node) return node;

    let nextNode = node;
    if (String(node?.locator?.pathText || "") === pathText) {
      const updated = updater(node);
      if (updated !== node) {
        nextNode = updated;
        changed = true;
      }
    }

    const children = node.children || [];
    if (!children.length) return nextNode;

    let childChanged = false;
    const nextChildren = children.map((child) => {
      const nextChild = walk(child);
      if (nextChild !== child) childChanged = true;
      return nextChild;
    });
    if (!childChanged) return nextNode;

    changed = true;
    return nextNode === node ? { ...node, children: nextChildren } : { ...nextNode, children: nextChildren };
  };

  const nextRoot = walk(root);
  return changed ? nextRoot : root;
}

function formatQueryDeveloperLabel(name, description) {
  return `${String(name || "")} Desc=[${String(description || "")}]`;
}

function buildTreeMap(root) {
  const map = new Map();
  if (!root) return map;
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    const pathText = node?.locator?.pathText;
    if (pathText) map.set(pathText, node);
    for (const child of node.children || []) {
      stack.push(child);
    }
  }
  return map;
}

function flattenVisible(root, expanded) {
  if (!root) return [];
  const rows = [];
  const walk = (node, depth) => {
    const pathText = node?.locator?.pathText || "";
    const children = node.children || [];
    rows.push({ node, depth });
    if (!children.length) return;
    const isOpen = depth === 0 || expanded.has(pathText);
    if (!isOpen) return;
    for (const child of children) walk(child, depth + 1);
  };
  walk(root, 0);
  return rows;
}

function defaultExpanded(root, maxDepth) {
  const next = new Set();
  if (!root) return next;
  const walk = (node, depth) => {
    const pathText = node?.locator?.pathText || "";
    if (depth <= maxDepth && pathText && (node.children || []).length) {
      next.add(pathText);
    }
    for (const child of node.children || []) walk(child, depth + 1);
  };
  walk(root, 0);
  return next;
}

function selectPath(treeMap, preferredPath) {
  if (!treeMap.size) return "";
  if (preferredPath && treeMap.has(preferredPath)) return preferredPath;
  for (const [pathText, node] of treeMap.entries()) {
    if (node.kind !== "root") return pathText;
  }
  return treeMap.keys().next().value || "";
}

function findTreeMatches(root, keyword, caseSensitive = false) {
  if (!root) return [];
  const query = caseSensitive ? String(keyword || "") : String(keyword || "").toLowerCase();
  const matches = [];
  const walk = (node) => {
    const text = `${node?.name || ""} ${node?.description || ""} ${node?.label || ""}`;
    const target = caseSensitive ? text : text.toLowerCase();
    if (target.includes(query) && node?.locator?.pathText) {
      matches.push(node.locator.pathText);
    }
    for (const child of node.children || []) walk(child);
  };
  walk(root);
  return matches;
}

function getQueryDeveloperTreeIcon(kind) {
  switch (String(kind || "").toLowerCase()) {
    case "root":
      return "/factory-icon.svg";
    case "system":
      return "/icons/SqlSystem.png";
    case "module":
      return "/icons/SqlModule.png";
    case "function":
      return "/icons/SqlFunction.png";
    case "sqlgroup":
      return "/icons/SqlQuery.png";
    default:
      return "";
  }
}

function scrollTreeNodeIntoView(container, key) {
  if (!container || !key) return;
  const labels = container.querySelectorAll(".tree-label[data-node-key]");
  for (const label of labels) {
    if (label.dataset.nodeKey !== key) continue;
    label.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    break;
  }
}

function expandPath(base, pathText) {
  const next = new Set(base);
  if (!pathText || pathText === "root") return next;
  const parts = pathText.split(".");
  for (let i = 1; i <= parts.length; i += 1) {
    next.add(parts.slice(0, i).join("."));
  }
  return next;
}

function groupProperties(properties) {
  const groups = [];
  let current = null;
  for (const property of properties) {
    if (!current || current.category !== property.category) {
      current = { category: property.category || "General", items: [] };
      groups.push(current);
    }
    current.items.push(property);
  }
  return groups;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatFileSize(size) {
  const value = Number(size || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.message || `Request failed: ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

export default App;
