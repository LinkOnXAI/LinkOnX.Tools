import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

const RIBBON_MODULES = [
  { id: "option", label: ["Option"] },
  { id: "language", label: ["Language"] },
  { id: "codeGenerator", label: ["Code", "Generator"] },
  { id: "queryDeveloper", label: ["Query", "Developer"] },
  { id: "menuEditor", label: ["Menu", "Editor"] },
  { id: "clientConfig", label: ["Client", "Config"] },
  { id: "laboratory", label: ["Laboratory"] },
];

const MAIN_LOGO_SRC = "/linkonx-main-logo.svg";
const SQL_PROVIDERS = ["MsSql", "Oracle", "MySql", "MariaDb", "PostgreSql", "Machbase", "OleDb", "Influx", "SQLite"];

function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);
  const [authPending, setAuthPending] = useState(false);
  const [authError, setAuthError] = useState("");
  const [credentials, setCredentials] = useState({ factory: "", username: "", password: "" });

  const [activeModule, setActiveModule] = useState("queryDeveloper");

  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState("");
  const [fileLoading, setFileLoading] = useState(false);

  const [treeRoot, setTreeRoot] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const [selectedPath, setSelectedPath] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatches, setSearchMatches] = useState([]);
  const [searchIndex, setSearchIndex] = useState(-1);

  const [nodeDetail, setNodeDetail] = useState(null);
  const [propertyDraft, setPropertyDraft] = useState({});
  const [sqlDraft, setSqlDraft] = useState({});
  const [activeSqlProvider, setActiveSqlProvider] = useState("MsSql");

  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState("");

  const treeMap = useMemo(() => buildTreeMap(treeRoot), [treeRoot]);
  const treeRows = useMemo(() => flattenVisible(treeRoot, expanded), [treeRoot, expanded]);
  const activeModuleInfo = useMemo(
    () => RIBBON_MODULES.find((item) => item.id === activeModule) || RIBBON_MODULES[0],
    [activeModule],
  );

  const propertyGroups = useMemo(() => groupProperties(nodeDetail?.properties || []), [nodeDetail]);

  const nodeDirty = useMemo(() => {
    if (!nodeDetail) return false;

    const propDirty = (nodeDetail.properties || []).some((prop) => {
      if (prop.readOnly) return false;
      if (prop.type === "bool") return Boolean(propertyDraft[prop.key]) !== Boolean(prop.value);
      return String(propertyDraft[prop.key] ?? "") !== String(prop.value ?? "");
    });
    if (propDirty) return true;

    if (nodeDetail.kind !== "sqlGroup") return false;
    return SQL_PROVIDERS.some((provider) => String(sqlDraft[provider] ?? "") !== String(nodeDetail.sqlQueries?.[provider] ?? ""));
  }, [nodeDetail, propertyDraft, sqlDraft]);

  const confirmDiscard = useCallback(() => {
    if (!nodeDirty) return true;
    return window.confirm("Unsaved changes exist. Continue and discard changes?");
  }, [nodeDirty]);

  const initDrafts = useCallback((detail) => {
    const nextProps = {};
    for (const prop of detail?.properties || []) {
      if (prop.readOnly) continue;
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
  }, [user, loadFiles]);

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
      setActiveModule("queryDeveloper");
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

  const onSelectModule = (moduleId) => {
    if (moduleId === activeModule) return;
    if (activeModule === "queryDeveloper" && !confirmDiscard()) return;
    setActiveModule(moduleId);
  };

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

  const onSearch = async () => {
    const keyword = searchQuery.trim();
    if (!keyword) {
      setSearchMatches([]);
      setSearchIndex(-1);
      return;
    }

    const matches = findTreeMatches(treeRoot, keyword);
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
    setPropertyDraft((prev) => ({
      ...prev,
      [prop.key]: prop.type === "bool" ? Boolean(value) : String(value ?? ""),
    }));
  };

  const onSave = async () => {
    if (!selectedFile || !nodeDetail || nodeDetail.kind === "root") return;

    const updates = {};
    for (const prop of nodeDetail.properties || []) {
      if (prop.readOnly) continue;
      updates[prop.key] = prop.type === "bool" ? Boolean(propertyDraft[prop.key]) : String(propertyDraft[prop.key] ?? "");
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
    <div className="app-shell">
      <header className="tool-header">
        <div className="tool-brand">
          <img src={MAIN_LOGO_SRC} alt="LinkOnX main logo" className="header-main-logo" />
          <div>
            <p className="eyebrow">LinkOnX Tools</p>
            <h1>LinkOn.Modeler.Web</h1>
          </div>
        </div>
        <div className="toolbar-actions">
          <span className="user-chip">
            {user.userName || user.username}
            {user.factory ? ` @ ${user.factory}` : ""}
          </span>
          {activeModule === "queryDeveloper" && (
            <>
              <button type="button" onClick={() => void loadFiles(true)} disabled={filesLoading || fileLoading}>
                {filesLoading ? "Refreshing..." : "Refresh"}
              </button>
              <button type="button" className="primary-btn" onClick={onSave} disabled={!nodeDirty || saving || fileLoading}>
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          )}
          <button type="button" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <nav className="ribbon" aria-label="Tools ribbon">
        {RIBBON_MODULES.map((module) => (
          <button
            key={module.id}
            type="button"
            className={`ribbon-item ${activeModule === module.id ? "active" : ""}`}
            onClick={() => onSelectModule(module.id)}
          >
            <span className="ribbon-icon">
              <RibbonGlyph />
            </span>
            <span className="ribbon-label">
              {module.label.map((line, idx) => (
                <span key={`${module.id}-${idx}`} className="ribbon-label-line">{line}</span>
              ))}
            </span>
          </button>
        ))}
      </nav>

      {banner && <div className="banner">{banner}</div>}

      {activeModule !== "queryDeveloper" ? (
        <section className="panel module-placeholder">
          <h2>{activeModuleInfo.label.join(" ")}</h2>
          <p className="subtext">This module page will be connected in the next step.</p>
        </section>
      ) : (
        <main className="workspace message-like-layout">
          <aside className="panel file-panel">
            <h2>QSF Files (Disk)</h2>
            {files.length === 0 && <p className="empty-text">No .qsf files found.</p>}
            <ul className="file-list">
              {files.map((file) => (
                <li key={file.name}>
                  <button type="button" className={selectedFile === file.name ? "active" : ""} onClick={() => void onSelectFile(file.name)}>
                    <span>{file.name}</span>
                    <small>{formatFileSize(file.size)} | {formatDate(file.modifiedAt)}</small>
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

            <div className="message-editor split split-horizontal qd-split">
              <div className="message-list qd-tree-pane">
                <div className="tree-search-panel">
                  <input
                    value={searchQuery}
                    placeholder="Search tree"
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void onSearch();
                      }
                    }}
                  />
                  <button type="button" onClick={() => void onSearch()}>Find</button>
                  <button type="button" onClick={() => void moveSearch(-1)} disabled={!searchMatches.length}>Prev</button>
                  <button type="button" onClick={() => void moveSearch(1)} disabled={!searchMatches.length}>Next</button>
                  <span className="tree-search-count">{searchMatches.length ? `${searchIndex + 1}/${searchMatches.length}` : "0/0"}</span>
                </div>

                <div className="tree">
                  {treeRows.length === 0 && <p className="empty-text">Select a qsf file to load TreeView.</p>}
                  {treeRows.map((row) => {
                    const pathText = row.node.locator?.pathText || "";
                    const selected = pathText === selectedPath;
                    const hasChildren = (row.node.children || []).length > 0;
                    const isOpen = expanded.has(pathText);
                    return (
                      <div key={pathText || row.node.id} className="tree-node" style={{ marginLeft: row.depth * 8 }}>
                        <div className={`tree-label ${selected ? "active" : ""}`}>
                          {hasChildren ? (
                            <button
                              type="button"
                              className="tree-toggle"
                              onClick={(event) => {
                                event.stopPropagation();
                                setExpanded((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(pathText)) next.delete(pathText);
                                  else next.add(pathText);
                                  return next;
                                });
                              }}
                            >
                              {isOpen ? "?" : "?"}
                            </button>
                          ) : (
                            <span className="tree-toggle spacer" />
                          )}
                          <button type="button" className="tree-label-btn" onClick={() => void onSelectNode(pathText)}>{row.node.label}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="msg-form qd-detail-pane">
                <div className="qd-detail-head">
                  <h3>{treeMap.get(selectedPath)?.label || "No node selected"}</h3>
                  <p className="subtext">{nodeDetail?.path || "Select a tree node to edit."}</p>
                </div>

                <div className="qd-detail-grid">
                  <section className="qd-prop-grid">
                    <h4>Properties</h4>
                    {!nodeDetail || !(nodeDetail.properties || []).length ? (
                      <p className="empty-text">No editable properties for this node.</p>
                    ) : (
                      <div className="prop-grid">
                        {propertyGroups.map((group) => (
                          <div key={group.category}>
                            <div className="prop-category">{group.category}</div>
                            {group.items.map((prop) => (
                              <div className="prop-row" key={prop.key}>
                                <label>{prop.label}</label>
                                {prop.type === "enum" ? (
                                  <select
                                    value={String(propertyDraft[prop.key] ?? prop.value ?? "")}
                                    onChange={(event) => onChangeProperty(prop, event.target.value)}
                                    disabled={prop.readOnly || fileLoading || saving}
                                  >
                                    {(prop.options || []).map((option) => (
                                      <option key={option} value={option}>{option}</option>
                                    ))}
                                  </select>
                                ) : prop.type === "bool" ? (
                                  <input
                                    type="checkbox"
                                    checked={Boolean(propertyDraft[prop.key] ?? prop.value)}
                                    onChange={(event) => onChangeProperty(prop, event.target.checked)}
                                    disabled={prop.readOnly || fileLoading || saving}
                                  />
                                ) : (
                                  <input
                                    value={String(propertyDraft[prop.key] ?? prop.value ?? "")}
                                    onChange={(event) => onChangeProperty(prop, event.target.value)}
                                    readOnly={prop.readOnly}
                                    disabled={fileLoading || saving}
                                  />
                                )}
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
                          {SQL_PROVIDERS.map((provider) => (
                            <button
                              key={provider}
                              type="button"
                              className={`sql-tab-btn ${activeSqlProvider === provider ? "active" : ""}`}
                              onClick={() => setActiveSqlProvider(provider)}
                            >
                              {provider}
                            </button>
                          ))}
                        </div>
                        <textarea
                          className="sql-textarea"
                          value={String(sqlDraft[activeSqlProvider] ?? "")}
                          onChange={(event) => setSqlDraft((prev) => ({ ...prev, [activeSqlProvider]: event.target.value }))}
                          disabled={fileLoading || saving}
                          spellCheck={false}
                        />
                      </>
                    )}
                  </section>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}

function RibbonGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="ribbon-svg" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4.6" y="5" width="14.8" height="14" rx="2.2" />
      <path d="M8 9h8M8 12h8M8 15h6" />
    </svg>
  );
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

function findTreeMatches(root, keyword) {
  if (!root) return [];
  const query = keyword.toLowerCase();
  const matches = [];
  const walk = (node) => {
    const target = `${node?.name || ""} ${node?.description || ""} ${node?.label || ""}`.toLowerCase();
    if (target.includes(query) && node?.locator?.pathText) {
      matches.push(node.locator.pathText);
    }
    for (const child of node.children || []) walk(child);
  };
  walk(root);
  return matches;
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
