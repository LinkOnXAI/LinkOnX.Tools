import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { RibbonBar } from "./components/RibbonBar";
import { RibbonIcon } from "./components/RibbonIcon";
import { OptionDialog } from "./components/OptionDialog";
import { MenuEditor } from "./menuEditor/MenuEditor";
import { LanguageEditor } from "./languageEditor/LanguageEditor";
import { ClientConfigEditor } from "./clientConfigEditor/ClientConfigEditor";
import { ToolsManual } from "./manual/ToolsManual";
import { QueryDeveloperPanel } from "./queryDeveloper/QueryDeveloperPanel";
import { CodeGenerator } from "./codeGenerator/CodeGenerator";
import {
  SQL_PROVIDERS,
  TREE_ACTION_ENDPOINTS,
} from "./queryDeveloper/constants";
import {
  applySavedPropertyToDetail,
  applySavedPropertyToTree,
  buildClientPath,
  buildTreeClipboardKey,
  buildQsfDownloadName,
  buildTreeMap,
  defaultExpanded,
  expandPath,
  findTreeMatches,
  flattenVisible,
  groupProperties,
  isAlwaysReadOnlyProperty,
  normalizeBoolValue,
  parseDownloadFileName,
  scrollTreeNodeIntoView,
  selectPath,
} from "./queryDeveloper/utils";

const TOOL_MODULES = [
  { id: "home", label: "Home" },
  { id: "option", label: "Option" },
  { id: "language", label: "Language" },
  { id: "codeGenerator", label: "Code Generator" },
  { id: "queryDeveloper", label: "Query Developer" },
  { id: "menuEditor", label: "Menu Editor" },
  { id: "manual", label: "User Manual" },
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
const DEVELOPMENT_RIBBON_SHORTCUTS = DEVELOPMENT_SHORTCUTS;

const HELP_SHORTCUTS = [
  { id: "manual", label: "User Manual", icon: "UM", description: "Open the web-based user manual for LinkOnX Tools." },
  { id: "option", label: "Option", icon: "OP", description: "Open theme, font, and tree depth options.", action: "openOptionDialog" },
];
const STITCH_NAV_GROUPS = [
  { title: "Declaration", items: DECLARATION_SHORTCUTS },
  { title: "Development", items: DEVELOPMENT_SHORTCUTS },
  { title: "Resources", items: HELP_SHORTCUTS },
];
const STITCH_TOP_BAR_GROUPS = [
  {
    title: "Home",
    items: [
      { id: "home", label: "Home", icon: "H" },
      { id: "option", label: "Option", icon: "OP", action: "openOptionDialog" },
    ],
  },
  { title: "Declaration", items: DECLARATION_SHORTCUTS },
  { title: "Development", items: DEVELOPMENT_SHORTCUTS },
];

const QUICK_ACCESS_GROUPS = [
  { title: "Declaration", items: DECLARATION_SHORTCUTS },
  { title: "Deployment", items: DEVELOPMENT_SHORTCUTS },
  { title: "Help", items: HELP_SHORTCUTS },
];

const QUICK_ACCESS_ITEMS = [...DECLARATION_SHORTCUTS, ...DEVELOPMENT_SHORTCUTS, ...HELP_SHORTCUTS];
const QUICK_ACCESS_ITEM_MAP = QUICK_ACCESS_ITEMS.reduce((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {});
const SCREENSHOT_PATHS = {
  queryDeveloper: buildClientPath("manual/screenshots/query-developer-overview.png"),
  menuEditor: buildClientPath("manual/screenshots/menu-editor-overview.png"),
  language: buildClientPath("manual/screenshots/language-editor-overview.png"),
  clientConfig: buildClientPath("manual/screenshots/client-config-client-overview.png"),
  manual: buildClientPath("manual/screenshots/language-editor-message-overview.png"),
  codeGenerator: buildClientPath("manual/screenshots/code-generator-overview.png"),
};
const GENERAL_HOME_SCREENSHOT_PATHS = {
  codeGenerator: buildClientPath("manual/screenshots/code-generator-home-overview.png"),
};

const HOME_MODULE_CARDS = [
  {
    key: "queryDeveloper",
    id: "queryDeveloper",
    icon: QUICK_ACCESS_ITEM_MAP.queryDeveloper?.icon || "QD",
    title: "Query Developer",
    description: QUICK_ACCESS_ITEM_MAP.queryDeveloper?.description || "",
    image: SCREENSHOT_PATHS.queryDeveloper,
  },
  {
    key: "menuEditor",
    id: "menuEditor",
    icon: QUICK_ACCESS_ITEM_MAP.menuEditor?.icon || "ME",
    title: "Menu Editor",
    description: QUICK_ACCESS_ITEM_MAP.menuEditor?.description || "",
    image: SCREENSHOT_PATHS.menuEditor,
  },
  {
    key: "language",
    id: "language",
    icon: QUICK_ACCESS_ITEM_MAP.language?.icon || "LA",
    title: "Language",
    description: QUICK_ACCESS_ITEM_MAP.language?.description || "",
    image: SCREENSHOT_PATHS.language,
  },
  {
    key: "clientConfig",
    id: "clientConfig",
    icon: QUICK_ACCESS_ITEM_MAP.clientConfig?.icon || "CC",
    title: "Client Config",
    description: QUICK_ACCESS_ITEM_MAP.clientConfig?.description || "",
    image: SCREENSHOT_PATHS.clientConfig,
  },
  {
    key: "codeGenerator",
    id: "codeGenerator",
    icon: QUICK_ACCESS_ITEM_MAP.codeGenerator?.icon || "CG",
    title: "Code Generator",
    description: QUICK_ACCESS_ITEM_MAP.codeGenerator?.description || "",
    image: GENERAL_HOME_SCREENSHOT_PATHS.codeGenerator,
  },
  {
    key: "manual",
    id: "manual",
    icon: QUICK_ACCESS_ITEM_MAP.manual?.icon || "UM",
    title: "User Manual",
    description: QUICK_ACCESS_ITEM_MAP.manual?.description || "",
    image: SCREENSHOT_PATHS.manual,
  },
];
const STITCH_HOME_MODULE_CARDS = [
  {
    key: "queryDeveloper",
    id: "queryDeveloper",
    icon: QUICK_ACCESS_ITEM_MAP.queryDeveloper?.icon || "QD",
    title: "Query Developer",
    description: QUICK_ACCESS_ITEM_MAP.queryDeveloper?.description || "",
    image: SCREENSHOT_PATHS.queryDeveloper,
  },
  {
    key: "menuEditor",
    id: "menuEditor",
    icon: QUICK_ACCESS_ITEM_MAP.menuEditor?.icon || "ME",
    title: "Menu Editor",
    description: QUICK_ACCESS_ITEM_MAP.menuEditor?.description || "",
    image: SCREENSHOT_PATHS.menuEditor,
  },
  {
    key: "language",
    id: "language",
    icon: QUICK_ACCESS_ITEM_MAP.language?.icon || "LA",
    title: "Language",
    description: QUICK_ACCESS_ITEM_MAP.language?.description || "",
    image: SCREENSHOT_PATHS.language,
  },
  {
    key: "clientConfig",
    id: "clientConfig",
    icon: QUICK_ACCESS_ITEM_MAP.clientConfig?.icon || "CC",
    title: "Client Config",
    description: QUICK_ACCESS_ITEM_MAP.clientConfig?.description || "",
    image: SCREENSHOT_PATHS.clientConfig,
  },
  {
    key: "codeGenerator",
    id: "codeGenerator",
    icon: QUICK_ACCESS_ITEM_MAP.codeGenerator?.icon || "CG",
    title: "Code Generator",
    description: QUICK_ACCESS_ITEM_MAP.codeGenerator?.description || "",
    image: GENERAL_HOME_SCREENSHOT_PATHS.codeGenerator,
  },
  {
    key: "manual",
    id: "manual",
    icon: QUICK_ACCESS_ITEM_MAP.manual?.icon || "UM",
    title: "User Manual",
    description: QUICK_ACCESS_ITEM_MAP.manual?.description || "",
    image: SCREENSHOT_PATHS.manual,
  },
];

const MAIN_LOGO_SRC = buildClientPath("linkonx-main-logo.svg");
const AUTO_LOGOUT_IDLE_MS = 10 * 60 * 1000;
const LOGIN_REMEMBER_KEY = "linkon.login.remember";
const LOGIN_REMEMBER_FACTORY_KEY = "linkon.login.factory";
const LOGIN_REMEMBER_USER_KEY = "linkon.login.user";
const STITCH_SIDEBAR_COLLAPSED_KEY = "linkon.stitchSidebarCollapsed";
const STITCH_THEME_PRESETS = ["stitchbasic", "stitchdark", "stitchpalette"];
const THEME_PRESETS = [
  "white",
  "dark",
  "vs2010",
  "sevenclassic",
  "office2013gray",
  "office2019darkgray",
  ...STITCH_THEME_PRESETS,
];
const DEFAULT_THEME_PRESET = "white";

function normalizeThemePreset(rawTheme) {
  const value = String(rawTheme || "").trim().toLowerCase();
  if (THEME_PRESETS.includes(value)) return value;
  return DEFAULT_THEME_PRESET;
}

function isStitchThemePreset(rawTheme) {
  return STITCH_THEME_PRESETS.includes(String(rawTheme || "").trim().toLowerCase());
}

function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);
  const [showOption, setShowOption] = useState(false);
  const [authPending, setAuthPending] = useState(false);
  const [authError, setAuthError] = useState("");
  const [factoryOptions, setFactoryOptions] = useState([]);
  const [factoryLoading, setFactoryLoading] = useState(false);
  const [credentials, setCredentials] = useState(() => {
    try {
      const remembered = window.localStorage.getItem(LOGIN_REMEMBER_KEY) === "true";
      if (!remembered) return { factory: "", username: "", password: "" };
      return {
        factory: String(window.localStorage.getItem(LOGIN_REMEMBER_FACTORY_KEY) || ""),
        username: String(window.localStorage.getItem(LOGIN_REMEMBER_USER_KEY) || ""),
        password: "",
      };
    } catch {
      return { factory: "", username: "", password: "" };
    }
  });
  const [rememberLoginId, setRememberLoginId] = useState(() => {
    try {
      return window.localStorage.getItem(LOGIN_REMEMBER_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [treeFontFamily, setTreeFontFamily] = useState("Noto Sans KR, Noto Sans, Segoe UI, system-ui, sans-serif");
  const [treeFontSize, setTreeFontSize] = useState(14);
  const [propFontFamily, setPropFontFamily] = useState("Noto Sans KR, Noto Sans, Segoe UI, system-ui, sans-serif");
  const [propFontSize, setPropFontSize] = useState(13);
  const [themePreset, setThemePreset] = useState(() => {
    try {
      const raw = window.localStorage.getItem("linkon.themePreset");
      return normalizeThemePreset(raw);
    } catch {
      return DEFAULT_THEME_PRESET;
    }
  });
  const [showTreeDepthGuide, setShowTreeDepthGuide] = useState(() => {
    try {
      const raw = window.localStorage.getItem("linkon.showTreeDepthGuide");
      if (raw === "false") return false;
      if (raw === "true") return true;
      return true;
    } catch {
      return true;
    }
  });
  const [stitchSidebarCollapsed, setStitchSidebarCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(STITCH_SIDEBAR_COLLAPSED_KEY) === "true";
    } catch {
      return false;
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
  const [treeClipboard, setTreeClipboard] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const treePaneRef = useRef(null);
  const contextMenuRef = useRef(null);

  const [nodeDetail, setNodeDetail] = useState(null);
  const [propertyDraft, setPropertyDraft] = useState({});
  const [propertiesCollapsed, setPropertiesCollapsed] = useState(false);
  const [sqlDraft, setSqlDraft] = useState({});
  const [activeSqlProvider, setActiveSqlProvider] = useState("MsSql");

  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState("");
  const [showAutoLogoutDialog, setShowAutoLogoutDialog] = useState(false);
  const idleTimerRef = useRef(null);
  const autoLogoutPendingRef = useRef(false);

  const treeMap = useMemo(() => buildTreeMap(treeRoot), [treeRoot]);
  const treeRows = useMemo(() => flattenVisible(treeRoot, expanded), [treeRoot, expanded]);
  const contextNode = useMemo(() => {
    if (!contextMenu?.pathText) return null;
    return treeMap.get(contextMenu.pathText) || null;
  }, [contextMenu, treeMap]);
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

  const resetSessionState = useCallback(() => {
    setUser(null);
    setFiles([]);
    setSelectedFile("");
    setTreeRoot(null);
    setSelectedPath("");
    setNodeDetail(null);
    initDrafts(null);
    setBanner("");
    setAuthError("");
  }, [initDrafts]);

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
        setExpanded(defaultExpanded(root, 1));

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
    let alive = true;
    (async () => {
      setFactoryLoading(true);
      try {
        const data = await apiRequest("/api/auth/factories");
        if (!alive) return;
        const options = Array.isArray(data?.factories)
          ? data.factories.map((item) => String(item || "").trim()).filter(Boolean)
          : [];
        setFactoryOptions(options);
        if (options.length > 0) {
          setCredentials((prev) => ({ ...prev, factory: options[0] }));
        }
      } catch {
        if (!alive) return;
        setFactoryOptions([]);
      } finally {
        if (alive) setFactoryLoading(false);
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
    const classPrefix = "app-theme-";
    const className = themePreset === DEFAULT_THEME_PRESET ? "" : `${classPrefix}${themePreset}`;

    for (const cssClass of Array.from(document.body.classList)) {
      if (cssClass.startsWith(classPrefix)) document.body.classList.remove(cssClass);
    }
    if (className) document.body.classList.add(className);

    try {
      window.localStorage.setItem("linkon.themePreset", themePreset);
    } catch {
      // ignore storage failures
    }
    return () => {
      if (className) document.body.classList.remove(className);
    };
  }, [themePreset]);

  useEffect(() => {
    try {
      window.localStorage.setItem("linkon.showTreeDepthGuide", showTreeDepthGuide ? "true" : "false");
    } catch {
      // ignore storage failures
    }
  }, [showTreeDepthGuide]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STITCH_SIDEBAR_COLLAPSED_KEY, stitchSidebarCollapsed ? "true" : "false");
    } catch {
      // ignore storage failures
    }
  }, [stitchSidebarCollapsed]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LOGIN_REMEMBER_KEY, rememberLoginId ? "true" : "false");
      if (!rememberLoginId) {
        window.localStorage.removeItem(LOGIN_REMEMBER_FACTORY_KEY);
        window.localStorage.removeItem(LOGIN_REMEMBER_USER_KEY);
      }
    } catch {
      // ignore storage failures
    }
  }, [rememberLoginId]);

  useEffect(() => {
    if (!banner) return undefined;
    const timer = window.setTimeout(() => {
      setBanner("");
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [banner]);

  const runAutoLogout = useCallback(async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore logout request failures during inactivity logout
    } finally {
      setCredentials((prev) => ({ ...prev, password: "" }));
      resetSessionState();
      setShowAutoLogoutDialog(true);
    }
  }, [resetSessionState]);

  useEffect(() => {
    if (!user) return undefined;

    const onUserActivity = () => {
      if (autoLogoutPendingRef.current) return;
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => {
        if (autoLogoutPendingRef.current) return;
        autoLogoutPendingRef.current = true;
        void runAutoLogout().finally(() => {
          autoLogoutPendingRef.current = false;
        });
      }, AUTO_LOGOUT_IDLE_MS);
    };

    const activityEvents = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "focus"];
    onUserActivity();
    activityEvents.forEach((eventName) => window.addEventListener(eventName, onUserActivity));

    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, onUserActivity));
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [runAutoLogout, user]);

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

  useEffect(() => {
    if (!contextMenu) return undefined;

    const onPointerDown = (event) => {
      const target = event.target;
      if (contextMenuRef.current && target instanceof Node && contextMenuRef.current.contains(target)) return;
      setContextMenu(null);
    };
    const onEscape = (event) => {
      if (event.key === "Escape") setContextMenu(null);
    };
    const onViewportChanged = () => setContextMenu(null);

    window.addEventListener("mousedown", onPointerDown, true);
    window.addEventListener("keydown", onEscape);
    window.addEventListener("resize", onViewportChanged);
    window.addEventListener("scroll", onViewportChanged, true);
    return () => {
      window.removeEventListener("mousedown", onPointerDown, true);
      window.removeEventListener("keydown", onEscape);
      window.removeEventListener("resize", onViewportChanged);
      window.removeEventListener("scroll", onViewportChanged, true);
    };
  }, [contextMenu]);

  const onLogin = async (event) => {
    event.preventDefault();
    setAuthError("");
    setBanner("");
    setAuthPending(true);

    const factory = credentials.factory.trim();
    const loginId = credentials.username.trim();
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
          id: loginId,
          username: loginId,
          password: credentials.password,
        },
      });
      setUser(session);
      setActiveModule("home");
      setShowAutoLogoutDialog(false);
      if (rememberLoginId) {
        try {
          window.localStorage.setItem(LOGIN_REMEMBER_FACTORY_KEY, factory);
          window.localStorage.setItem(LOGIN_REMEMBER_USER_KEY, loginId);
        } catch {
          // ignore storage failures
        }
      }
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
      setShowAutoLogoutDialog(false);
      resetSessionState();
    }
  };

  const onSelectModule = useCallback((moduleId) => {
    if (moduleId === activeModule) return;
    if (activeModule === "queryDeveloper" && !confirmDiscard()) return;
    setActiveModule(moduleId);
  }, [activeModule, confirmDiscard]);

  const onActivateHomeItem = useCallback((item) => {
    if (!item) return;
    if (item.action === "openOptionDialog") {
      setShowOption(true);
      return;
    }
    if (!item.id) return;
    onSelectModule(item.id);
  }, [onSelectModule]);

  const onDownloadSelectedFile = useCallback(async () => {
    if (!selectedFile) {
      setBanner("Select a qsf file first.");
      return;
    }

    try {
      const response = await fetch(resolveRequestUrl(`/api/qsf/download?name=${encodeURIComponent(selectedFile)}`), {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = payload?.message || `Download failed: ${response.status}`;
        throw new Error(message);
      }

      const blob = await response.blob();
      const selectedMeta = files.find((file) => file.name === selectedFile);
      const downloadName = buildQsfDownloadName(
        selectedMeta?.systemName,
        parseDownloadFileName(response.headers.get("Content-Disposition")) || selectedFile,
      );
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);

      setBanner(`Downloaded ${downloadName}`);
    } catch (error) {
      setBanner(`Download failed: ${error.message}`);
    }
  }, [files, selectedFile]);

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

  const onOpenContextMenu = useCallback((event, pathText) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      x: Number(event.clientX || 0),
      y: Number(event.clientY || 0),
      pathText,
    });
  }, []);

  const onRunTreeMutation = useCallback(async (action, pathText, sourcePathText = "", sourceXml = "") => {
    if (!selectedFile || !pathText) return;
    if (!confirmDiscard()) return;

    setSaving(true);
    setBanner("");
    setContextMenu(null);
    try {
      const data = await requestTreeAction({
        name: selectedFile,
        action,
        locator: { pathText },
        sourceLocator: sourcePathText ? { pathText: sourcePathText } : undefined,
        sourceXml: sourceXml ? String(sourceXml) : undefined,
      });

      const nextTree = data.tree || null;
      setTreeRoot(nextTree);
      const map = buildTreeMap(nextTree);
      const nextPath = selectPath(map, String(data.selectedPath || pathText));
      setSelectedPath(nextPath);
      setExpanded((prev) => expandPath(prev, nextPath));

      if (nextPath) {
        await loadNodeDetail(selectedFile, nextPath);
      } else {
        setNodeDetail(null);
        initDrafts(null);
      }
      if (action === "appendModule") setBanner("A new module was appended.");
      else if (action === "appendFunction") setBanner("A new function was appended.");
      else if (action === "appendSqlGroup") setBanner("A new SQL code was appended.");
      else if (action === "insertBeforeNode") setBanner("A new node was inserted before.");
      else if (action === "insertAfterNode") setBanner("A new node was inserted after.");
      else if (action === "deleteNode") setBanner("The node was deleted.");
      else if (action === "pasteNode") setBanner("The copied node was pasted.");
    } catch (error) {
      setBanner(`Tree action failed: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }, [confirmDiscard, initDrafts, loadNodeDetail, selectedFile]);

  const onTreeContextAction = useCallback(async (action) => {
    if (!contextMenu?.pathText) return;
    const pathText = contextMenu.pathText;
    const node = treeMap.get(pathText);
    if (!node) {
      setContextMenu(null);
      return;
    }

    const hasChildren = (node.children || []).length > 0;
    const isOpen = pathText === "root" ? true : expanded.has(pathText);

    if (action === "expand") {
      if (hasChildren) setExpanded((prev) => expandPath(prev, pathText));
      setContextMenu(null);
      return;
    }

    if (action === "collapse") {
      if (hasChildren && pathText !== "root" && isOpen) {
        setExpanded((prev) => {
          const next = new Set(prev);
          next.delete(pathText);
          return next;
        });
      }
      setContextMenu(null);
      return;
    }

    if (action === "copy") {
      setContextMenu(null);
      setSaving(true);
      setBanner("");
      try {
        const data = await apiRequest(
          `/api/qsf/query-developer/node?name=${encodeURIComponent(selectedFile)}&path=${encodeURIComponent(pathText)}&includeOuterXml=1`,
        );
        const outerXml = String(data?.node?.outerXml || "").trim();
        if (!outerXml) {
          throw new Error("Copy source xml is empty.");
        }

        const clipboardKey = buildTreeClipboardKey(node.kind);
        const clipboardEntry = {
          key: clipboardKey,
          fileName: selectedFile,
          pathText,
          kind: node.kind,
          label: node.label,
          data: outerXml,
        };
        setTreeClipboard(clipboardEntry);
        try {
          window.sessionStorage.setItem(clipboardKey, JSON.stringify(clipboardEntry));
        } catch {
          // ignore clipboard persistence failure
        }
        setBanner(`Copied: ${node.label}`);
      } catch (error) {
        setBanner(`Copy failed: ${error.message}`);
      } finally {
        setSaving(false);
      }
      return;
    }

    if (action === "paste") {
      if (!treeClipboard?.pathText || treeClipboard.fileName !== selectedFile) {
        setContextMenu(null);
        return;
      }
      await onRunTreeMutation("pasteNode", pathText, treeClipboard.pathText, treeClipboard.data || "");
      return;
    }

    if (action === "delete") {
      if (node.kind === "root" || hasChildren) {
        setContextMenu(null);
        return;
      }
      await onRunTreeMutation("deleteNode", pathText);
      return;
    }

    if (action === "appendChild") {
      const appendActionByKind = {
        system: "appendModule",
        module: "appendFunction",
        function: "appendSqlGroup",
      };
      const appendAction = appendActionByKind[node.kind];
      if (!appendAction) {
        setContextMenu(null);
        return;
      }
      await onRunTreeMutation(appendAction, pathText);
      return;
    }

    if (action === "insertBefore") {
      if (!["module", "function", "sqlGroup"].includes(node.kind)) {
        setContextMenu(null);
        return;
      }
      await onRunTreeMutation("insertBeforeNode", pathText);
      return;
    }

    if (action === "insertAfter") {
      if (!["module", "function", "sqlGroup"].includes(node.kind)) {
        setContextMenu(null);
        return;
      }
      await onRunTreeMutation("insertAfterNode", pathText);
    }
  }, [contextMenu, expanded, onRunTreeMutation, selectedFile, treeClipboard, treeMap]);

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
    const developmentButtons = DEVELOPMENT_RIBBON_SHORTCUTS.map((item) => ({
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
      "--tree-depth-guide-opacity": showTreeDepthGuide ? 0.7 : 0,
    }),
    [treeFontFamily, treeFontSize, propFontFamily, propFontSize, showTreeDepthGuide],
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
          <p className="subtext">User authentication is required to access the LinkOnX Tools.</p>

          <form onSubmit={onLogin}>
            <label>
              Factory
              {factoryOptions.length > 0 ? (
                <select
                  value={credentials.factory || factoryOptions[0] || ""}
                  onChange={(event) => setCredentials((prev) => ({ ...prev, factory: event.target.value }))}
                  required
                  disabled={factoryLoading || authPending}
                >
                  {factoryOptions.map((factory) => (
                    <option key={factory} value={factory}>{factory}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  autoComplete="organization"
                  value={credentials.factory}
                  onChange={(event) => setCredentials((prev) => ({ ...prev, factory: event.target.value }))}
                  required
                  disabled={factoryLoading || authPending}
                />
              )}
            </label>
            <label>
              User ID
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
            <label className="login-remember">
              <input
                type="checkbox"
                checked={rememberLoginId}
                onChange={(event) => setRememberLoginId(event.target.checked)}
              />
              Remember User ID
            </label>
            {authError && <p className="error-text">{authError}</p>}
            <button type="submit" className="primary-btn" disabled={authPending}>
              {authPending ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </section>
        {showAutoLogoutDialog && (
          <div className="session-dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="session-dialog-title">
            <section className="session-dialog">
              <h3 id="session-dialog-title">Session Timed Out</h3>
              <p>You were logged out automatically after 10 minutes of inactivity.</p>
              <p className="session-dialog-comment">Would you like to log in again?</p>
              <div className="session-dialog-actions">
                <button type="button" className="primary-btn" onClick={() => setShowAutoLogoutDialog(false)}>
                  Log In Again
                </button>
                <button type="button" onClick={() => setShowAutoLogoutDialog(false)}>
                  Close
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    );
  }

  const useStitchShell = isStitchThemePreset(themePreset);

  const defaultHomeContent = (
    <section className="panel home-panel">
      <div className="home-layout">
        <aside className="home-sidebar">
          <header className="home-sidebar-head">
            <h2>Quick Access</h2>
          </header>

          <div className="home-quick-groups">
            {QUICK_ACCESS_GROUPS.map((group) => (
              <section key={group.title} className="home-quick-group">
                <h3 className="home-quick-group-title">{group.title}</h3>
                <div className="home-quick-list">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="home-quick-item"
                      onClick={() => onActivateHomeItem(item)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </aside>

        <section className="home-workspace">
          <header className="home-workspace-head">
            <div className="home-title-wrap">
              <h2>LinkOnX Tools Web</h2>
            </div>
          </header>

          {HOME_MODULE_CARDS.length ? (
            <div className="home-module-grid">
              {HOME_MODULE_CARDS.map((card) => (
                card.splitItems?.length ? (
                  <article key={card.key} className="home-module-card home-module-card-split">
                    <div className="home-module-split-grid">
                      {card.splitItems.map((splitItem) => (
                        <button
                          key={`${card.key}-${splitItem.id}`}
                          type="button"
                          className="home-module-split-item"
                          onClick={() => onActivateHomeItem(splitItem)}
                        >
                          <span className="home-module-split-title">
                            <span className="home-shortcut-icon home-module-title-icon" aria-hidden="true">
                              <RibbonIcon label={splitItem.label} fallback={splitItem.icon} />
                            </span>
                            <span>{splitItem.label}</span>
                          </span>
                          <span className="home-module-desc">{splitItem.description}</span>
                        </button>
                      ))}
                    </div>
                  </article>
                ) : (
                  <button
                    key={card.key}
                    type="button"
                    className="home-module-card"
                    onClick={() => onActivateHomeItem(card)}
                  >
                    <span className="home-module-title-row">
                      <span className="home-shortcut-icon home-module-title-icon" aria-hidden="true">
                        <RibbonIcon label={card.title} fallback={card.icon} />
                      </span>
                      <span>{card.title}</span>
                    </span>
                    <span className="home-module-desc">{card.description}</span>
                    {card.image && <img src={card.image} alt={`${card.title} preview`} className="home-module-thumb" />}
                  </button>
                )
              ))}
            </div>
          ) : (
            <p className="home-card-empty">No module matched your search keyword.</p>
          )}
        </section>
      </div>
    </section>
  );

  const stitchHomeContent = (
    <section className="stitch-home-panel">
      <div className="stitch-home-canvas">
        <header className="stitch-home-head">
          <div>
            <h2>LinkOnX Tools Web</h2>
          </div>
        </header>

        <div className="stitch-home-grid">
          {STITCH_HOME_MODULE_CARDS.map((card) => (
            <button
              key={`stitch-home-card-${card.key}`}
              type="button"
              className="stitch-home-card"
              onClick={() => onActivateHomeItem(card)}
              >
                <span className="stitch-home-card-icon" aria-hidden="true">
                  <RibbonIcon label={card.title} fallback={card.icon} />
                </span>
                <span className="stitch-home-card-title">{card.title}</span>
                <span className="stitch-home-card-desc">{card.description}</span>
                {card.image && <img src={card.image} alt={`${card.title} preview`} className="stitch-home-thumb" />}
              </button>
          ))}
        </div>
      </div>
    </section>
  );

  const moduleContent = activeModule === "home"
    ? (useStitchShell ? stitchHomeContent : defaultHomeContent)
    : activeModule === "menuEditor" ? (
      <MenuEditor />
    ) : activeModule === "language" ? (
      <LanguageEditor />
    ) : activeModule === "clientConfig" ? (
      <ClientConfigEditor />
    ) : activeModule === "codeGenerator" ? (
      <CodeGenerator />
    ) : activeModule === "manual" ? (
      <ToolsManual />
    ) : activeModule !== "queryDeveloper" ? (
      <section className="panel module-placeholder">
        <h2>{activeModuleInfo.label}</h2>
        <p className="subtext">This module page will be connected in the next step.</p>
      </section>
    ) : (
      <QueryDeveloperPanel
        files={files}
        filesLoading={filesLoading}
        fileLoading={fileLoading}
        selectedFile={selectedFile}
        onRefresh={() => {
          void loadFiles(true);
        }}
        refreshDisabled={filesLoading || fileLoading}
        onDownloadSelectedFile={onDownloadSelectedFile}
        onSelectFile={onSelectFile}
        treePaneRef={treePaneRef}
        searchCollapsed={searchCollapsed}
        setSearchCollapsed={setSearchCollapsed}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={onSearch}
        searchCaseSensitive={searchCaseSensitive}
        setSearchCaseSensitive={setSearchCaseSensitive}
        searchMatches={searchMatches}
        currentSearchDisplay={currentSearchDisplay}
        moveSearch={moveSearch}
        treeRows={treeRows}
        selectedPath={selectedPath}
        expanded={expanded}
        onSelectNode={onSelectNode}
        onOpenContextMenu={onOpenContextMenu}
        toggleNodeExpanded={toggleNodeExpanded}
        nodeDetail={nodeDetail}
        propertyGroups={propertyGroups}
        propertiesCollapsed={propertiesCollapsed}
        setPropertiesCollapsed={setPropertiesCollapsed}
        propertyDraft={propertyDraft}
        onChangeProperty={onChangeProperty}
        saving={saving}
        propertyDirty={propertyDirty}
        onUpdateProperties={onUpdateProperties}
        activeSqlProvider={activeSqlProvider}
        setActiveSqlProvider={setActiveSqlProvider}
        sqlDraft={sqlDraft}
        setSqlDraft={setSqlDraft}
        sqlDirty={sqlDirty}
        onUpdateSqlQueries={onUpdateSqlQueries}
        contextMenu={contextMenu}
        contextNode={contextNode}
        contextMenuRef={contextMenuRef}
        treeClipboard={treeClipboard}
        onTreeContextAction={onTreeContextAction}
      />
    );

  const optionDialog = showOption && (
    <OptionDialog
      initialTreeFont={treeFontFamily}
      initialTreeSize={treeFontSize}
      initialPropFont={propFontFamily}
      initialPropSize={propFontSize}
      initialThemePreset={themePreset}
      themePresets={THEME_PRESETS}
      initialShowTreeDepthGuide={showTreeDepthGuide}
      onCancel={() => setShowOption(false)}
      onApply={(vals) => {
        setTreeFontFamily(vals.treeFont);
        setTreeFontSize(vals.treeSize);
        setPropFontFamily(vals.propFont);
        setPropFontSize(vals.propSize);
        setThemePreset(normalizeThemePreset(vals.themePreset));
        setShowTreeDepthGuide(Boolean(vals.showTreeDepthGuide));
        setShowOption(false);
      }}
    />
  );

  if (useStitchShell) {
    return (
      <div className={`app-shell app-shell-stitch ${stitchSidebarCollapsed ? "stitch-sidebar-collapsed" : ""}`} style={appShellStyle}>
        <aside className="stitch-sidebar">
          <button
            type="button"
            className="stitch-splitter-toggle-btn stitch-splitter-toggle-btn-inline"
            onClick={() => setStitchSidebarCollapsed((prev) => !prev)}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            >
              <span className="stitch-splitter-toggle-symbol" aria-hidden="true">
                {"="}
              </span>
            </button>
          <div className="stitch-brand">
            <img src={MAIN_LOGO_SRC} alt="LinkOnX main logo" className="stitch-brand-logo" />
            <div className="stitch-brand-text">
              <h1>LinkOnX Tools Web</h1>
            </div>
          </div>

          <button
            type="button"
            className={`stitch-nav-item stitch-nav-home ${activeModule === "home" ? "active" : ""}`}
            onClick={() => onSelectModule("home")}
          >
            <span className="stitch-nav-icon" aria-hidden="true">
              <RibbonIcon label="Home" fallback="H" />
            </span>
            <span>Home</span>
          </button>

          <div className="stitch-nav-groups">
            {STITCH_NAV_GROUPS.map((group) => (
              <section key={`stitch-nav-${group.title}`} className="stitch-nav-group">
                <h3>{group.title}</h3>
                <div className="stitch-nav-list">
                  {group.items.map((item) => (
                    <button
                      key={`stitch-nav-item-${item.id}`}
                      type="button"
                      className={`stitch-nav-item ${activeModule === item.id ? "active" : ""}`}
                      onClick={() => onActivateHomeItem(item)}
                    >
                      <span className="stitch-nav-icon" aria-hidden="true">
                        <RibbonIcon label={item.label} fallback={item.icon} />
                      </span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </aside>
        {stitchSidebarCollapsed && (
          <button
            type="button"
            className="stitch-splitter-toggle-btn stitch-splitter-toggle-btn-floating"
            onClick={() => setStitchSidebarCollapsed((prev) => !prev)}
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <span className="stitch-splitter-toggle-symbol" aria-hidden="true">
              {"="}
            </span>
          </button>
        )}

        <main className="stitch-main">
          <header className="stitch-topbar">
            <div className="stitch-topbar-left">
              {STITCH_TOP_BAR_GROUPS.map((group) => (
                <section key={`stitch-topbar-${group.title}`} className="stitch-topbar-group">
                  <h3>{group.title}</h3>
                  <div className="stitch-topbar-buttons">
                    {group.items.map((item) => (
                      <button
                        key={`stitch-topbar-btn-${group.title}-${item.id}`}
                        type="button"
                        className={`stitch-topbar-btn ${activeModule === item.id ? "active" : ""}`}
                        onClick={() => onActivateHomeItem(item)}
                        title={item.label}
                        aria-label={item.label}
                      >
                        <span className="stitch-topbar-btn-icon" aria-hidden="true">
                          <RibbonIcon label={item.label} fallback={item.icon} />
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="stitch-topbar-right">
              <div className="stitch-user-chip" title={sessionLabel}>
                <span className="stitch-user-icon" aria-hidden="true">
                  <RibbonIcon label="User" fallback="U" />
                </span>
                <span>{sessionLabel || "Administrator"}</span>
              </div>
              <button
                type="button"
                className="stitch-user-action"
                onClick={() => {
                  void onLogout();
                }}
                title="Logout"
                aria-label="Logout"
              >
                <RibbonIcon label="Logout" fallback="LO" />
              </button>
            </div>
          </header>

          {banner && <div className="banner">{banner}</div>}
          <div className="stitch-main-content">{moduleContent}</div>
        </main>
        {optionDialog}
      </div>
    );
  }

  return (
    <div className="app-shell" style={appShellStyle}>
      <RibbonBar sections={ribbonSections} sessionLabel={sessionLabel} quickActions={ribbonQuickActions} />

      {banner && <div className="banner">{banner}</div>}
      {moduleContent}
      {optionDialog}
    </div>
  );
}

// Query Developer UI/helpers moved to ./queryDeveloper/* modules

async function apiRequest(url, options = {}) {
  const response = await fetch(resolveRequestUrl(url), {
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
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function resolveRequestUrl(url) {
  const text = String(url || "").trim();
  if (!text) return text;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) {
    return text;
  }
  return buildClientPath(text);
}

async function requestTreeAction(body) {
  let lastError = null;
  for (const endpoint of TREE_ACTION_ENDPOINTS) {
    for (const method of ["POST", "PUT"]) {
      try {
        return await apiRequest(endpoint, { method, body });
      } catch (error) {
        if (Number(error?.status || 0) !== 404) {
          throw error;
        }
        lastError = error;
      }
    }
  }

  throw lastError || new Error("Tree action endpoint not found.");
}

export default App;
