import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./MenuEditor.css";

const APP_BASE_PATH = normalizeBasePath(import.meta.env.BASE_URL || "/");

const TREE_NODE_TAGS = new Set(["MNU", "MSY", "MIT", "PIT"]);

const CATEGORY_ORDER = ["General", "Font", "Menu", "Assembly", "Image", "User Tag", "Etc"];
const CATEGORY_DISPLAY = {
  General: "General",
  Font: "Font",
  Menu: "Menu",
  Assembly: "Assembly",
  Image: "Image",
  "User Tag": "User Tag",
  Etc: "Etc",
};

const ATTRIBUTE_PRIORITY = [
  "_S",
  "NM",
  "CD",
  "D",
  "FC",
  "FB",
  "MC",
  "MD",
  "MB",
  "MV",
  "MT",
  "AN",
  "TP",
  "NS",
  "CN",
  "UF",
  "CH",
  "PT",
  "AMF",
  "PC",
  "PD",
  "PB",
  "PP",
  "PU",
  "PL",
  "MI",
  "ML",
  "TG1",
  "TG2",
  "TG3",
  "TG4",
  "TG5",
  "U1",
  "U2",
  "U3",
  "U4",
  "U5",
];

const PROPERTY_META = {
  _S: { label: "ID", category: "General", readOnly: true },
  NM: { label: "Name", category: "General" },
  D: { label: "Description", category: "General" },
  CD: { label: "Code", category: "General" },
  FC: { label: "Color", category: "Font" },
  FB: { label: "Bold", category: "Font" },
  MB: { label: "Begin Group", category: "Menu" },
  MV: { label: "Visible", category: "Menu" },
  MT: { label: "Visible Type", category: "Menu" },
  MC: { label: "Caption", category: "Menu" },
  MD: { label: "Description", category: "Menu" },
  TP: { label: "Form Title Prefix", category: "Menu" },
  CN: { label: "Form Name", category: "Assembly" },
  UF: { label: "User Function", category: "Menu" },
  CH: { label: "Cast Channel", category: "Menu" },
  PT: { label: "Parameters", category: "Assembly" },
  AMF: { label: "Allow Multiple Forms", category: "Menu" },
  PC: { label: "Caption", category: "Menu" },
  PD: { label: "Description", category: "Menu" },
  PB: { label: "Behavior", category: "Menu" },
  PP: { label: "Permission", category: "Menu" },
  PU: { label: "Custom Code", category: "Menu" },
  PL: { label: "Link Menu", category: "Menu" },
  AN: { label: "Assembly Name", category: "Assembly" },
  NS: { label: "Assembly Name Space", category: "Assembly" },
  MI: { label: "Image(16x16)", category: "Image" },
  ML: { label: "Large Image(32x32)", category: "Image" },
  TG1: { label: "User Tag 1", category: "User Tag" },
  TG2: { label: "User Tag 2", category: "User Tag" },
  TG3: { label: "User Tag 3", category: "User Tag" },
  TG4: { label: "User Tag 4", category: "User Tag" },
  TG5: { label: "User Tag 5", category: "User Tag" },
  U1: { label: "User Tag 1", category: "User Tag" },
  U2: { label: "User Tag 2", category: "User Tag" },
  U3: { label: "User Tag 3", category: "User Tag" },
  U4: { label: "User Tag 4", category: "User Tag" },
  U5: { label: "User Tag 5", category: "User Tag" },
};

const NODE_PROPERTY_KEYS_BY_TAG = {
  MNU: ["_S", "NM", "D", "FC", "FB", "TG1", "TG2", "TG3", "TG4", "TG5"],
  MSY: ["_S", "NM", "CD", "D", "FC", "FB", "MI", "ML", "TG1", "TG2", "TG3", "TG4", "TG5"],
  MIT: [
    "_S",
    "NM",
    "D",
    "FC",
    "FB",
    "MC",
    "MD",
    "MB",
    "MV",
    "MT",
    "AN",
    "TP",
    "NS",
    "CN",
    "UF",
    "CH",
    "PT",
    "AMF",
    "MI",
    "ML",
    "TG1",
    "TG2",
    "TG3",
    "TG4",
    "TG5",
  ],
  PIT: ["_S", "NM", "D", "FC", "FB", "PC", "PD", "PB", "PP", "PU", "PL", "TG1", "TG2", "TG3", "TG4", "TG5"],
};

const DEFAULT_ATTRIBUTE_VALUES = {
  FC: "Black",
  FB: "F",
  MB: "F",
  MV: "T",
  MT: "F",
  PB: "Custom",
  PP: "None",
  AMF: "F",
};

const ENUM_VALUE_OPTIONS = {
  MT: [
    { value: "F", label: "Form" },
    { value: "D", label: "Dialog" },
  ],
  PB: [
    { value: "Custom", label: "Custom" },
    { value: "Link", label: "Link" },
  ],
  PP: [
    { value: "None", label: "None" },
    { value: "Caller", label: "Caller" },
    { value: "Menu", label: "Menu" },
  ],
};
const BOOLEAN_VALUE_OPTIONS = [
  { value: "T", label: "True" },
  { value: "F", label: "False" },
];

const IMAGE_PREVIEW_ROW_META = {
  MI: { key: "__preview_MI", label: "Selected Image" },
  ML: { key: "__preview_ML", label: "Selected Large Image" },
};

const BOOLEAN_VALUE_KEYS = new Set(["FB", "MB", "MV", "AMF"]);
const MULTILINE_KEYS = new Set(["MI", "ML"]);
const TREE_ICON_MAP = {
  MNU: buildClientPath("icons/menuEditor/ToolMenu.png"),
  MSY: buildClientPath("icons/menuEditor/ToolMenuSystem.png"),
  MIT: buildClientPath("icons/menuEditor/ToolMenuItem.png"),
  PIT: buildClientPath("icons/menuEditor/ToolMenuPopupItem.png"),
};
const NEW_ICON_SRC = buildClientPath("icons/menuEditor/new_16x16.png");
const OPEN_ICON_SRC = buildClientPath("icons/menuEditor/open_16x16.png");
const SAVE_ICON_SRC = buildClientPath("icons/menuEditor/save_16x16.png");
const FALLBACK_MENU_ITEM_ICON = buildClientPath("icons/menuEditor/ToolMenuItem.png");
const FALLBACK_MENU_GROUP_ICON = buildClientPath("icons/menuEditor/ToolMenuGroup.png");
const FALLBACK_MENU_GROUP_SUB_ICON = buildClientPath("icons/menuEditor/ToolMenuGroupSub.png");
const ROOT_META_ORDER = ["QF", "QV", "QC", "QU", "QD", "QS"];

export function MenuEditor() {
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const treeScrollRef = useRef(null);
  const propertyScrollRef = useRef(null);
  const contextMenuRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileHandle, setFileHandle] = useState(null);
  const [menuMeta, setMenuMeta] = useState(() => createDefaultMenuMeta(new Date()));
  const [isDirty, setIsDirty] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [treeRoot, setTreeRoot] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [expandedNodeIds, setExpandedNodeIds] = useState(() => new Set());
  const [pendingImageKey, setPendingImageKey] = useState("");
  const [treeSearchDraft, setTreeSearchDraft] = useState("");
  const [treeSearchQuery, setTreeSearchQuery] = useState("");
  const [treeSearchMatches, setTreeSearchMatches] = useState([]);
  const [treeSearchIndex, setTreeSearchIndex] = useState(-1);
  const [contextMenu, setContextMenu] = useState(null);
  const [treeClipboard, setTreeClipboard] = useState(null);

  const treeRows = useMemo(
    () => flattenTreeRows(treeRoot, expandedNodeIds),
    [treeRoot, expandedNodeIds],
  );
  const treeSearchHighlightSet = useMemo(
    () => buildMenuTreeHighlightSet(treeSearchMatches),
    [treeSearchMatches],
  );
  const selectedNode = useMemo(
    () => findNodeById(treeRoot, selectedNodeId),
    [treeRoot, selectedNodeId],
  );
  const contextNode = useMemo(
    () => (contextMenu?.nodeId ? findNodeById(treeRoot, contextMenu.nodeId) : null),
    [contextMenu?.nodeId, treeRoot],
  );
  const propertyRows = useMemo(
    () => buildPropertyRows(selectedNode),
    [selectedNode],
  );
  const propertyGroups = useMemo(
    () => groupPropertyRows(propertyRows),
    [propertyRows],
  );

  useEffect(() => {
    if (propertyScrollRef.current) {
      propertyScrollRef.current.scrollTop = 0;
    }
  }, [selectedNodeId]);

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

  const onLoadMenuFile = useCallback(async (file, nextHandle = null) => {
    if (!file) return;

    if (!/\.mnu$/i.test(String(file.name || ""))) {
      setSelectedFile(null);
      setFileHandle(null);
      setTreeRoot(null);
      setSelectedNodeId("");
      setExpandedNodeIds(new Set());
      setIsDirty(false);
      setTreeSearchDraft("");
      setTreeSearchQuery("");
      setTreeSearchMatches([]);
      setTreeSearchIndex(-1);
      setContextMenu(null);
      setTreeClipboard(null);
      setErrorText("Please select a file with the .mnu extension.");
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseMenuTree(text);
      setSelectedFile({
        name: String(file.name || "LinkOnMenu.mnu"),
      });
      setFileHandle(nextHandle);
      setTreeRoot(parsed.tree);
      setMenuMeta(parsed.meta);
      setSelectedNodeId(parsed.tree.id);
      setExpandedNodeIds(defaultExpandedNodes(parsed.tree, 1));
      setIsDirty(false);
      setTreeSearchDraft("");
      setTreeSearchQuery("");
      setTreeSearchMatches([]);
      setTreeSearchIndex(-1);
      setContextMenu(null);
      setTreeClipboard(null);
      setErrorText("");
    } catch (error) {
      setSelectedFile(null);
      setFileHandle(null);
      setTreeRoot(null);
      setSelectedNodeId("");
      setExpandedNodeIds(new Set());
      setIsDirty(false);
      setTreeSearchDraft("");
      setTreeSearchQuery("");
      setTreeSearchMatches([]);
      setTreeSearchIndex(-1);
      setContextMenu(null);
      setTreeClipboard(null);
      setErrorText(error instanceof Error ? error.message : "Failed to parse .mnu file.");
    }
  }, []);

  const onCreateMenuFile = useCallback(() => {
    const tree = createDefaultMenuTree();
    setSelectedFile({ name: "LinkOnMenu.mnu" });
    setFileHandle(null);
    setTreeRoot(tree);
    setMenuMeta(createDefaultMenuMeta(new Date()));
    setSelectedNodeId(tree.id);
    setExpandedNodeIds(defaultExpandedNodes(tree, 1));
    setIsDirty(true);
    setTreeSearchDraft("");
    setTreeSearchQuery("");
    setTreeSearchMatches([]);
    setTreeSearchIndex(-1);
    setContextMenu(null);
    setTreeClipboard(null);
    setErrorText("");
  }, []);

  const onOpenMenuFile = useCallback(async () => {
    if (supportsFileSystemAccess()) {
      try {
        const [handle] = await window.showOpenFilePicker({
          multiple: false,
          excludeAcceptAllOption: true,
          types: [{
            description: "Menu Files",
            accept: { "application/xml": [".mnu"] },
          }],
        });
        if (!handle) return;
        const file = await handle.getFile();
        await onLoadMenuFile(file, handle);
      } catch (error) {
        if (isAbortError(error)) return;
        setErrorText(error instanceof Error ? error.message : "Failed to open .mnu file.");
      }
      return;
    }

    const input = fileInputRef.current;
    if (!input) return;
    input.value = "";
    input.click();
  }, [onLoadMenuFile]);

  const onPickFile = useCallback(async (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;
    await onLoadMenuFile(file, null);
  }, [onLoadMenuFile]);

  const onToggleNode = useCallback((nodeId) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const onChangeProperty = useCallback((row, value) => {
    if (!row || row.readOnly || row.key === "__type" || !selectedNodeId) return;

    setTreeRoot((prev) => updateNodeById(prev, selectedNodeId, (node) => {
      const nextAttributes = {
        ...(node.attributes || {}),
        [row.key]: value,
      };
      applyTagPropertyRules(node.tag, nextAttributes);
      return {
        ...node,
        attributes: nextAttributes,
      };
    }));
    setIsDirty(true);
  }, [selectedNodeId]);

  const onOpenImagePicker = useCallback((attributeKey) => {
    if (!selectedNodeId || !attributeKey) return;
    setPendingImageKey(String(attributeKey || ""));
    const input = imageInputRef.current;
    if (!input) return;
    input.value = "";
    input.click();
  }, [selectedNodeId]);

  const onPickImageFile = useCallback(async (event) => {
    const file = event.target?.files?.[0];
    const targetKey = String(pendingImageKey || "");
    setPendingImageKey("");

    if (!file || !targetKey || !selectedNodeId) return;

    const fileName = String(file.name || "");
    const validExt = /\.(png|bmp|jpg|jpeg|gif)$/i.test(fileName);
    if (!validExt) {
      setErrorText("Please select an image file (.png, .bmp, .jpg, .jpeg, .gif).");
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const hex = arrayBufferToHexString(buffer);
      setTreeRoot((prev) => updateNodeById(prev, selectedNodeId, (node) => ({
        ...node,
        attributes: {
          ...(node.attributes || {}),
          [targetKey]: hex,
        },
      })));
      setIsDirty(true);
      setErrorText("");
    } catch {
      setErrorText("Failed to load selected image.");
    }
  }, [pendingImageKey, selectedNodeId]);

  const onSaveMenuFile = useCallback(async () => {
    if (!treeRoot) return;

    try {
      const built = buildMenuXml(treeRoot, menuMeta);
      let nextHandle = fileHandle;
      let nextFileName = ensureMenuFileName(selectedFile?.name);
      let saved = false;

      if (supportsFileSystemAccess()) {
        try {
          if (!nextHandle) {
            nextHandle = await window.showSaveFilePicker({
              suggestedName: nextFileName,
              excludeAcceptAllOption: true,
              types: [{
                description: "Menu Files",
                accept: { "application/xml": [".mnu"] },
              }],
            });
          }

          const writable = await nextHandle.createWritable();
          await writable.write(built.xmlText);
          await writable.close();

          nextFileName = ensureMenuFileName(nextHandle.name || nextFileName);
          setFileHandle(nextHandle);
          saved = true;
        } catch (error) {
          if (isAbortError(error)) return;
          downloadTextFile(nextFileName, built.xmlText);
          setFileHandle(null);
          saved = true;
        }
      } else {
        downloadTextFile(nextFileName, built.xmlText);
        saved = true;
      }

      if (!saved) {
        return;
      }

      setMenuMeta(built.meta);
      setSelectedFile({ name: nextFileName });
      setIsDirty(false);
      setErrorText("");
    } catch (error) {
      if (isAbortError(error)) return;
      setErrorText(error instanceof Error ? error.message : "Failed to save .mnu file.");
    }
  }, [treeRoot, menuMeta, fileHandle, selectedFile]);

  const onSearchTree = useCallback(() => {
    const keyword = normalizeSearchText(treeSearchDraft);
    if (!treeRoot) return;
    if (!keyword) {
      setTreeSearchQuery("");
      setTreeSearchMatches([]);
      setTreeSearchIndex(-1);
      return;
    }

    const isSameQuery = keyword === treeSearchQuery;
    let matches = treeSearchMatches;
    let nextIndex = treeSearchIndex;

    if (!isSameQuery || !matches.length) {
      matches = findMenuTreeMatches(treeRoot, keyword);
      setTreeSearchQuery(keyword);
      setTreeSearchMatches(matches);
      if (!matches.length) {
        setTreeSearchIndex(-1);
        return;
      }
      nextIndex = 0;
    } else {
      const base = treeSearchIndex >= 0 ? treeSearchIndex : -1;
      nextIndex = (base + 1) % matches.length;
    }

    const targetNodeId = matches[nextIndex];
    setTreeSearchIndex(nextIndex);
    setSelectedNodeId(targetNodeId);
    setExpandedNodeIds((prev) => expandTreePath(prev, targetNodeId));
  }, [treeRoot, treeSearchDraft, treeSearchQuery, treeSearchMatches, treeSearchIndex]);

  const onMoveTreeSearch = useCallback((step) => {
    if (!treeSearchMatches.length) {
      onSearchTree();
      return;
    }

    const base = treeSearchIndex >= 0 ? treeSearchIndex : 0;
    const nextIndex = (base + step + treeSearchMatches.length) % treeSearchMatches.length;
    const targetNodeId = treeSearchMatches[nextIndex];

    setTreeSearchIndex(nextIndex);
    setSelectedNodeId(targetNodeId);
    setExpandedNodeIds((prev) => expandTreePath(prev, targetNodeId));
  }, [treeSearchMatches, treeSearchIndex, onSearchTree]);

  const onTreeKeyDown = useCallback((event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const key = String(event.key || "");
    if (key !== "ArrowLeft" && key !== "ArrowRight" && key !== "ArrowUp" && key !== "ArrowDown") return;
    if (!treeRows.length) return;

    const selectedIndex = treeRows.findIndex((row) => row.node.id === selectedNodeId);
    if (selectedIndex < 0) {
      const fallbackRow = key === "ArrowUp" ? treeRows[treeRows.length - 1] : treeRows[0];
      if (!fallbackRow) return;
      event.preventDefault();
      setSelectedNodeId(fallbackRow.node.id);
      return;
    }

    const activeRow = treeRows[selectedIndex];
    const activeNode = activeRow.node;
    const activeNodeId = activeNode.id;
    const hasChildren = (activeNode.children || []).length > 0;
    const isExpanded = activeRow.depth === 0 || expandedNodeIds.has(activeNodeId);

    if (key === "ArrowDown") {
      if (selectedIndex >= treeRows.length - 1) return;
      event.preventDefault();
      setSelectedNodeId(treeRows[selectedIndex + 1].node.id);
      return;
    }

    if (key === "ArrowUp") {
      if (selectedIndex <= 0) return;
      event.preventDefault();
      setSelectedNodeId(treeRows[selectedIndex - 1].node.id);
      return;
    }

    if (key === "ArrowRight") {
      event.preventDefault();
      if (!hasChildren) return;
      if (!isExpanded) {
        setExpandedNodeIds((prev) => {
          const next = new Set(prev);
          next.add(activeNodeId);
          return next;
        });
        return;
      }

      const nextRow = treeRows[selectedIndex + 1];
      if (nextRow && nextRow.depth === activeRow.depth + 1) {
        setSelectedNodeId(nextRow.node.id);
      }
      return;
    }

    if (key === "ArrowLeft") {
      event.preventDefault();
      if (hasChildren && isExpanded && activeRow.depth > 0) {
        setExpandedNodeIds((prev) => {
          const next = new Set(prev);
          next.delete(activeNodeId);
          return next;
        });
        return;
      }

      const path = parseNodePath(activeNodeId);
      if (!path || path.length === 0) return;
      setSelectedNodeId(nodeIdFromPath(path.slice(0, -1)));
    }
  }, [expandedNodeIds, selectedNodeId, treeRows]);

  const onOpenContextMenu = useCallback((event, nodeId) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedNodeId(nodeId);
    setContextMenu({
      x: Number(event.clientX || 0),
      y: Number(event.clientY || 0),
      nodeId,
    });
  }, []);

  const onTreeContextAction = useCallback((action, nodeIdOverride = "") => {
    const targetNodeId = String(nodeIdOverride || contextMenu?.nodeId || "");
    if (!treeRoot || !targetNodeId) {
      setContextMenu(null);
      return;
    }

    const targetNode = findNodeById(treeRoot, targetNodeId);
    if (!targetNode) {
      setContextMenu(null);
      return;
    }

    const targetPath = parseNodePath(targetNodeId);
    if (!targetPath) {
      setContextMenu(null);
      return;
    }

    const isRoot = targetPath.length === 0;
    const hasChildren = (targetNode.children || []).length > 0;
    const isOpen = isRoot ? true : expandedNodeIds.has(targetNode.id);

    if (action === "expand") {
      if (hasChildren) setExpandedNodeIds((prev) => expandTreePath(prev, targetNode.id));
      setContextMenu(null);
      return;
    }

    if (action === "collapse") {
      if (hasChildren && !isRoot && isOpen) {
        setExpandedNodeIds((prev) => {
          const next = new Set(prev);
          next.delete(targetNode.id);
          return next;
        });
      }
      setContextMenu(null);
      return;
    }

    if (action === "copy") {
      if (!isRoot) {
        setTreeClipboard({
          tag: targetNode.tag,
          node: cloneMenuTreeNode(targetNode),
        });
      }
      setContextMenu(null);
      return;
    }

    const nextTreeRoot = cloneMenuTreeNode(treeRoot);
    const sequenceState = {
      value: Math.max(parseSequenceNumber(menuMeta?.QS), findMaxSequenceId(nextTreeRoot)),
    };
    const usedNames = collectUsedMenuNames(nextTreeRoot);
    let nextSelectedPath = targetPath;
    let changed = false;

    if (action === "cut") {
      if (!isRoot) {
        setTreeClipboard({
          tag: targetNode.tag,
          node: cloneMenuTreeNode(targetNode),
        });
        const parentPath = targetPath.slice(0, -1);
        const parentNode = getNodeByPath(nextTreeRoot, parentPath);
        const childIndex = targetPath[targetPath.length - 1];
        if (parentNode && Array.isArray(parentNode.children) && childIndex >= 0 && childIndex < parentNode.children.length) {
          parentNode.children.splice(childIndex, 1);
          nextSelectedPath = findPreviousSelectionPath(parentPath, childIndex);
          changed = true;
        }
      }
    } else if (action === "pasteSibling") {
      if (canPasteToSibling(targetNode, treeClipboard) && !isRoot) {
        const parentPath = targetPath.slice(0, -1);
        const parentNode = getNodeByPath(nextTreeRoot, parentPath);
        const childIndex = targetPath[targetPath.length - 1];
        if (parentNode && Array.isArray(parentNode.children)) {
          const pasted = assignSequenceIdsToNode(cloneMenuTreeNode(treeClipboard.node), sequenceState, usedNames);
          const insertIndex = childIndex + 1;
          parentNode.children.splice(insertIndex, 0, pasted);
          nextSelectedPath = [...parentPath, insertIndex];
          changed = true;
        }
      }
    } else if (action === "pasteChild") {
      if (canPasteChildToNode(targetNode, treeClipboard)) {
        const targetNode = getNodeByPath(nextTreeRoot, targetPath);
        if (targetNode) {
          const pasted = assignSequenceIdsToNode(cloneMenuTreeNode(treeClipboard.node), sequenceState, usedNames);
          const appendIndex = (targetNode.children || []).length;
          targetNode.children = [...(targetNode.children || []), pasted];
          nextSelectedPath = [...targetPath, appendIndex];
          changed = true;
        }
      }
    } else if (action === "pastePopupMenus") {
      if (canPastePopupMenusToNode(targetNode, treeClipboard)) {
        const targetNode = getNodeByPath(nextTreeRoot, targetPath);
        if (targetNode) {
          const clipNode = assignSequenceIdsToNode(cloneMenuTreeNode(treeClipboard.node), sequenceState, usedNames);
          const popupChildren = (clipNode.children || []).filter((child) => String(child?.tag || "").toUpperCase() === "PIT");
          if (popupChildren.length > 0) {
            targetNode.children = [...(targetNode.children || []), ...popupChildren];
            nextSelectedPath = targetPath;
            changed = true;
          }
        }
      }
    } else if (action === "moveUp") {
      if (canMoveNodeByPath(nextTreeRoot, targetPath, -1)) {
        const parentPath = targetPath.slice(0, -1);
        const parentNode = getNodeByPath(nextTreeRoot, parentPath);
        const childIndex = targetPath[targetPath.length - 1];
        const swapIndex = childIndex - 1;
        const temp = parentNode.children[swapIndex];
        parentNode.children[swapIndex] = parentNode.children[childIndex];
        parentNode.children[childIndex] = temp;
        nextSelectedPath = [...parentPath, swapIndex];
        changed = true;
      }
    } else if (action === "moveDown") {
      if (canMoveNodeByPath(nextTreeRoot, targetPath, 1)) {
        const parentPath = targetPath.slice(0, -1);
        const parentNode = getNodeByPath(nextTreeRoot, parentPath);
        const childIndex = targetPath[targetPath.length - 1];
        const swapIndex = childIndex + 1;
        const temp = parentNode.children[swapIndex];
        parentNode.children[swapIndex] = parentNode.children[childIndex];
        parentNode.children[childIndex] = temp;
        nextSelectedPath = [...parentPath, swapIndex];
        changed = true;
      }
    } else if (action === "remove") {
      if (!isRoot) {
        const parentPath = targetPath.slice(0, -1);
        const parentNode = getNodeByPath(nextTreeRoot, parentPath);
        const childIndex = targetPath[targetPath.length - 1];
        if (parentNode && Array.isArray(parentNode.children) && childIndex >= 0 && childIndex < parentNode.children.length) {
          parentNode.children.splice(childIndex, 1);
          nextSelectedPath = findPreviousSelectionPath(parentPath, childIndex);
          changed = true;
        }
      }
    } else if (action === "removePopupMenus") {
      if (canRemovePopupMenusFromNode(targetNode)) {
        const targetNode = getNodeByPath(nextTreeRoot, targetPath);
        if (targetNode) {
          const beforeCount = (targetNode.children || []).length;
          targetNode.children = (targetNode.children || []).filter((child) => String(child?.tag || "").toUpperCase() !== "PIT");
          if (targetNode.children.length !== beforeCount) {
            nextSelectedPath = targetPath;
            changed = true;
          }
        }
      }
    } else if (action === "appendMenuItem") {
      const appendTag = resolveAppendChildTag(targetNode);
      if (appendTag) {
        const targetNode = getNodeByPath(nextTreeRoot, targetPath);
        if (targetNode) {
          const created = createMenuNodeForTag(appendTag);
          const nextNode = assignSequenceIdsToNode(created, sequenceState, usedNames);
          const appendIndex = (targetNode.children || []).length;
          targetNode.children = [...(targetNode.children || []), nextNode];
          nextSelectedPath = [...targetPath, appendIndex];
          changed = true;
        }
      }
    } else if (action === "appendPopupMenuItem") {
      if (canAppendPopupMenuItemToNode(targetNode)) {
        const targetNode = getNodeByPath(nextTreeRoot, targetPath);
        if (targetNode) {
          const created = createMenuNodeForTag("PIT");
          const nextNode = assignSequenceIdsToNode(created, sequenceState, usedNames);
          const appendIndex = (targetNode.children || []).length;
          targetNode.children = [...(targetNode.children || []), nextNode];
          nextSelectedPath = [...targetPath, appendIndex];
          changed = true;
        }
      }
    } else if (action === "insertBeforeMenuItem" || action === "insertAfterMenuItem") {
      if (!isRoot) {
        const parentPath = targetPath.slice(0, -1);
        const parentNode = getNodeByPath(nextTreeRoot, parentPath);
        const childIndex = targetPath[targetPath.length - 1];
        if (parentNode && Array.isArray(parentNode.children)) {
          const created = createMenuNodeForTag(targetNode.tag);
          const nextNode = assignSequenceIdsToNode(created, sequenceState, usedNames);
          const insertIndex = action === "insertBeforeMenuItem" ? childIndex : childIndex + 1;
          parentNode.children.splice(insertIndex, 0, nextNode);
          nextSelectedPath = [...parentPath, insertIndex];
          changed = true;
        }
      }
    }

    if (!changed) {
      setContextMenu(null);
      return;
    }

    const rebuiltTree = rebuildMenuTreeIds(nextTreeRoot);
    const nextSelectedId = nodeIdFromPath(nextSelectedPath);
    const selectedExists = Boolean(findNodeById(rebuiltTree, nextSelectedId));
    const finalSelectedId = selectedExists ? nextSelectedId : rebuiltTree.id;
    const nextExpanded = expandTreePath(defaultExpandedNodes(rebuiltTree, 1), finalSelectedId);

    setTreeRoot(rebuiltTree);
    setSelectedNodeId(finalSelectedId);
    setExpandedNodeIds(nextExpanded);
    setMenuMeta((prev) => ({
      ...(prev || {}),
      QS: String(Math.max(parseSequenceNumber(prev?.QS), sequenceState.value)),
    }));
    setIsDirty(true);
    setErrorText("");
    setContextMenu(null);
  }, [contextMenu?.nodeId, expandedNodeIds, menuMeta?.QS, treeClipboard, treeRoot]);

  useEffect(() => {
    const onDeleteKeyDown = (event) => {
      if (event.key !== "Delete") return;

      const target = event.target;
      if (target instanceof Element && target.closest("input, textarea, select, [contenteditable=\"true\"]")) {
        return;
      }

      if (!selectedNodeId) return;
      event.preventDefault();
      onTreeContextAction("remove", selectedNodeId);
    };

    window.addEventListener("keydown", onDeleteKeyDown);
    return () => {
      window.removeEventListener("keydown", onDeleteKeyDown);
    };
  }, [onTreeContextAction, selectedNodeId]);

  const currentTreeSearchDisplay = treeSearchMatches.length > 0 && treeSearchIndex >= 0
    ? treeSearchIndex + 1
    : 0;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".mnu"
        onChange={(event) => {
          void onPickFile(event);
        }}
        style={{ display: "none" }}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept=".png,.bmp,.jpg,.jpeg,.gif,image/png,image/bmp,image/jpeg,image/gif"
        onChange={(event) => {
          void onPickImageFile(event);
        }}
        style={{ display: "none" }}
      />

      {contextMenu && contextNode && (
        <div
          ref={contextMenuRef}
          className="tree-context-menu"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
        >
          {(() => {
            const nodePath = parseNodePath(contextNode.id) || [];
            const isRoot = nodePath.length === 0;
            const hasChildren = (contextNode.children || []).length > 0;
            const isOpen = isRoot ? true : expandedNodeIds.has(contextNode.id);
            const canCopy = !isRoot;
            const canCut = !isRoot;
            const canPasteSibling = canPasteToSibling(contextNode, treeClipboard);
            const canPasteChild = canPasteChildToNode(contextNode, treeClipboard);
            const showPopupMenuActions = canShowPopupMenuActions(contextNode);
            const canPastePopupMenus = canPastePopupMenusToNode(contextNode, treeClipboard);
            const canMoveUp = canMoveNodeByPath(treeRoot, nodePath, -1);
            const canMoveDown = canMoveNodeByPath(treeRoot, nodePath, 1);
            const canRemove = !isRoot;
            const canRemovePopupMenus = canRemovePopupMenusFromNode(contextNode);
            const canAppendMenuItem = canAppendMenuItemToNode(contextNode);
            const canAppendPopupMenuItem = canAppendPopupMenuItemToNode(contextNode);
            const canInsertSibling = !isRoot;
            return (
              <>
                <button type="button" onClick={() => onTreeContextAction("expand")} disabled={!hasChildren || isOpen}>
                  <span className="tree-context-item-icon tree-context-icon-expand" aria-hidden="true" />
                  <span>Expand</span>
                </button>
                <button
                  type="button"
                  onClick={() => onTreeContextAction("collapse")}
                  disabled={!hasChildren || !isOpen || isRoot}
                >
                  <span className="tree-context-item-icon tree-context-icon-collapse" aria-hidden="true" />
                  <span>Collapse</span>
                </button>

                <span className="tree-context-separator" role="separator" />

                <button type="button" onClick={() => onTreeContextAction("copy")} disabled={!canCopy}>
                  <span className="tree-context-item-icon tree-context-icon-copy" aria-hidden="true" />
                  <span>Copy</span>
                </button>
                <button type="button" onClick={() => onTreeContextAction("cut")} disabled={!canCut}>
                  <span className="tree-context-item-icon tree-context-icon-cut" aria-hidden="true" />
                  <span>Cut</span>
                </button>
                <button type="button" onClick={() => onTreeContextAction("pasteSibling")} disabled={!canPasteSibling}>
                  <span className="tree-context-item-icon tree-context-icon-paste" aria-hidden="true" />
                  <span>Paste Sibling</span>
                </button>
                <button type="button" onClick={() => onTreeContextAction("pasteChild")} disabled={!canPasteChild}>
                  <span className="tree-context-item-icon tree-context-icon-paste" aria-hidden="true" />
                  <span>Paste Child</span>
                </button>
                {showPopupMenuActions && (
                  <button type="button" onClick={() => onTreeContextAction("pastePopupMenus")} disabled={!canPastePopupMenus}>
                    <span className="tree-context-item-icon tree-context-icon-paste" aria-hidden="true" />
                    <span>Paste Popup Menus</span>
                  </button>
                )}

                <span className="tree-context-separator" role="separator" />

                <button type="button" onClick={() => onTreeContextAction("moveUp")} disabled={!canMoveUp}>
                  <span className="tree-context-item-icon tree-context-icon-move-up" aria-hidden="true" />
                  <span>Move Up</span>
                </button>
                <button type="button" onClick={() => onTreeContextAction("moveDown")} disabled={!canMoveDown}>
                  <span className="tree-context-item-icon tree-context-icon-move-down" aria-hidden="true" />
                  <span>Move Down</span>
                </button>

                <span className="tree-context-separator" role="separator" />

                <button type="button" onClick={() => onTreeContextAction("remove")} disabled={!canRemove}>
                  <span className="tree-context-item-icon tree-context-icon-delete" aria-hidden="true" />
                  <span>Remove</span>
                </button>
                {showPopupMenuActions && (
                  <button type="button" onClick={() => onTreeContextAction("removePopupMenus")} disabled={!canRemovePopupMenus}>
                    <span className="tree-context-item-icon tree-context-icon-delete" aria-hidden="true" />
                    <span>Remove Popup Menus</span>
                  </button>
                )}
                <button type="button" onClick={() => onTreeContextAction("insertBeforeMenuItem")} disabled={!canInsertSibling}>
                  <span className="tree-context-item-icon tree-context-icon-insert-before" aria-hidden="true" />
                  <span>Insert Before Menu Item</span>
                </button>
                <button type="button" onClick={() => onTreeContextAction("insertAfterMenuItem")} disabled={!canInsertSibling}>
                  <span className="tree-context-item-icon tree-context-icon-insert-after" aria-hidden="true" />
                  <span>Insert After Menu Item</span>
                </button>
                {canAppendMenuItem && (
                  <button type="button" onClick={() => onTreeContextAction("appendMenuItem")}>
                    <span className="tree-context-item-icon tree-context-icon-append" aria-hidden="true" />
                    <span>Append Menu Item</span>
                  </button>
                )}
                {showPopupMenuActions && (
                  <button type="button" onClick={() => onTreeContextAction("appendPopupMenuItem")} disabled={!canAppendPopupMenuItem}>
                    <span className="tree-context-item-icon tree-context-icon-append" aria-hidden="true" />
                    <span>Append Popup Menu Item</span>
                  </button>
                )}
              </>
            );
          })()}
        </div>
      )}

      <section className="panel MenuEditor-panel">
        <div className="MenuEditor-file-actions-wrap">
          <div className="MenuEditor-file-actions">
            <button
              type="button"
              className="MenuEditor-file-action-btn"
              onClick={onCreateMenuFile}
              title="New .mnu file"
              aria-label="New .mnu file"
            >
              <img src={NEW_ICON_SRC} alt="" />
            </button>
            <button
              type="button"
              className="MenuEditor-file-action-btn"
              onClick={() => {
                void onOpenMenuFile();
              }}
              title="Open .mnu file"
              aria-label="Open .mnu file"
            >
              <img src={OPEN_ICON_SRC} alt="" />
            </button>
            <button
              type="button"
              className="MenuEditor-file-action-btn"
              onClick={() => {
                void onSaveMenuFile();
              }}
              title="Save .mnu file"
              aria-label="Save .mnu file"
              disabled={!treeRoot || !isDirty}
            >
              <img src={SAVE_ICON_SRC} alt="" />
            </button>
          </div>
          <div className="MenuEditor-inline-file-name" title={selectedFile?.name || ""}>
            {selectedFile ? selectedFile.name : ""}
          </div>
        </div>
        {errorText ? <p className="error-text MenuEditor-inline-error">{errorText}</p> : null}

        <div className="MenuEditor-workspace">
          <section className="MenuEditor-tree-panel">
            <div className="MenuEditor-tree-search">
              <div className="MenuEditor-tree-search-panel">
                <input
                  value={treeSearchDraft}
                  placeholder="Search Name / Description"
                  aria-label="Search Menu Editor tree"
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setTreeSearchDraft(nextValue);
                    if (!normalizeSearchText(nextValue)) {
                      setTreeSearchQuery("");
                      setTreeSearchMatches([]);
                      setTreeSearchIndex(-1);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onSearchTree();
                    }
                  }}
                />
                <button type="button" className="MenuEditor-tree-search-icon-btn" onClick={onSearchTree} title="Search" aria-label="Search">
                  <span className="MenuEditor-tree-search-icon MenuEditor-tree-search-icon-magnify" aria-hidden="true" />
                </button>
                <span className="MenuEditor-tree-search-count" title={`${treeSearchMatches.length} matched nodes`}>
                  {currentTreeSearchDisplay}/{treeSearchMatches.length}
                </span>
                <button
                  type="button"
                  className="MenuEditor-tree-search-icon-btn"
                  onClick={() => onMoveTreeSearch(-1)}
                  disabled={!treeSearchMatches.length}
                  title="Previous match"
                  aria-label="Previous match"
                >
                  <span className="MenuEditor-tree-search-icon MenuEditor-tree-search-icon-up" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="MenuEditor-tree-search-icon-btn"
                  onClick={() => onMoveTreeSearch(1)}
                  disabled={!treeSearchMatches.length}
                  title="Next match"
                  aria-label="Next match"
                >
                  <span className="MenuEditor-tree-search-icon MenuEditor-tree-search-icon-down" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div
              ref={treeScrollRef}
              className="MenuEditor-tree-scroll"
              role="tree"
              aria-label="Menu tree"
              tabIndex={0}
              onKeyDown={onTreeKeyDown}
            >
              {treeRows.map((row) => {
                const hasChildren = (row.node.children || []).length > 0;
                const isExpanded = expandedNodeIds.has(row.node.id);
                const isSelected = selectedNodeId === row.node.id;
                const isMatched = treeSearchHighlightSet.has(row.node.id);

                return (
                  <div
                    key={row.node.id}
                    className={`MenuEditor-tree-row ${isSelected ? "selected" : ""} ${isMatched ? "matched" : ""}`}
                    style={{ paddingLeft: `${12 + row.depth * 18}px` }}
                    role="treeitem"
                    aria-level={row.depth + 1}
                    aria-selected={isSelected}
                    aria-expanded={hasChildren ? isExpanded : undefined}
                    onClick={() => {
                      setSelectedNodeId(row.node.id);
                      if (treeScrollRef.current) {
                        treeScrollRef.current.focus();
                      }
                    }}
                    onContextMenu={(event) => onOpenContextMenu(event, row.node.id)}
                    onDoubleClick={(event) => {
                      if (!hasChildren) return;
                      const target = event.target;
                      if (target instanceof Element && target.closest(".MenuEditor-tree-toggle")) return;
                      onToggleNode(row.node.id);
                    }}
                  >
                    {hasChildren ? (
                      <button
                        type="button"
                        className="MenuEditor-tree-toggle"
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleNode(row.node.id);
                        }}
                        aria-label={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded ? "\u25BE" : "\u25B8"}
                      </button>
                    ) : (
                      <span className="MenuEditor-tree-toggle MenuEditor-tree-toggle-spacer" />
                    )}
                    <span
                      className={`MenuEditor-tree-tag tag-${row.node.tag.toLowerCase()}`}
                      title={row.node.tag}
                      aria-hidden="true"
                    >
                      <img src={TREE_ICON_MAP[row.node.tag] || TREE_ICON_MAP.MIT} alt="" />
                    </span>
                    <span className="MenuEditor-tree-text">{formatNodeTitle(row.node)}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="MenuEditor-prop-panel">
            <div className="MenuEditor-prop-head">
              <h3>Properties</h3>
            </div>
            <div ref={propertyScrollRef} className="MenuEditor-prop-scroll">
              {selectedNode ? propertyGroups.map((group, groupIndex) => (
                <div key={group.category} className="MenuEditor-prop-group">
                    <div className="MenuEditor-prop-category">{formatCategoryDisplay(group.category, groupIndex + 1)}</div>
                  {group.rows.map((row) => {
                    const isFixedGeneralReadonly = row.category === "General" && (row.key === "__type" || row.key === "_S");
                    return (
                      <div key={row.key} className="MenuEditor-prop-row">
                        <label title={row.displayKey}>{row.label}</label>
                        {row.imagePreviewOnly ? (
                          <div className="MenuEditor-image-preview-wrap">
                            {(() => {
                              const previewSrc = resolveMenuImagePreviewSrc(treeRoot, selectedNode, row.previewKey, row.value);
                              return previewSrc ? (
                                <img src={previewSrc} alt={row.label} className="MenuEditor-image-preview" />
                              ) : (
                                <span className="MenuEditor-image-preview-empty">No image</span>
                              );
                            })()}
                          </div>
                        ) : row.readOnly ? (
                          <input
                            value={row.value}
                            readOnly
                            disabled={isFixedGeneralReadonly}
                            tabIndex={isFixedGeneralReadonly ? -1 : undefined}
                            className={isFixedGeneralReadonly ? "MenuEditor-prop-input-locked" : undefined}
                          />
                        ) : row.options ? (
                          <select value={row.value} onChange={(event) => onChangeProperty(row, event.target.value)}>
                            {row.options.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : row.isImage ? (
                          <div className="MenuEditor-image-picker-field">
                            <input
                              value={resolveMenuImagePreviewSrc(treeRoot, selectedNode, row.key, row.value) ? "System.Drawing.Bitmap" : ""}
                              readOnly
                            />
                            <button
                              type="button"
                              className="MenuEditor-image-select-btn"
                              onClick={() => onOpenImagePicker(row.key)}
                              title="Select image"
                              aria-label="Select image"
                            >
                              ...
                            </button>
                          </div>
                        ) : row.multiline ? (
                          <textarea value={row.value} rows={3} onChange={(event) => onChangeProperty(row, event.target.value)} />
                        ) : (
                          <input value={row.value} onChange={(event) => onChangeProperty(row, event.target.value)} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )) : null}
            </div>
          </section>
        </div>
      </section>
    </>
  );
}

function parseNodePath(nodeId) {
  const text = String(nodeId || "").trim();
  if (!text) return null;
  const parts = text.split(".");
  if (parts[0] !== "mnu") return null;
  if (parts.length === 1) return [];

  const path = [];
  for (let index = 1; index < parts.length; index += 1) {
    const parsed = Number.parseInt(parts[index], 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    path.push(parsed - 1);
  }
  return path;
}

function nodeIdFromPath(path) {
  if (!Array.isArray(path) || path.length === 0) return "mnu";
  return `mnu.${path.map((value) => value + 1).join(".")}`;
}

function parseSequenceNumber(value) {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cloneMenuTreeNode(node) {
  if (!node) return node;
  return {
    ...node,
    attributes: { ...(node.attributes || {}) },
    children: (node.children || []).map((child) => cloneMenuTreeNode(child)),
  };
}

function rebuildMenuTreeIds(node, nodeId = "mnu") {
  if (!node) return null;
  return {
    ...node,
    id: nodeId,
    children: (node.children || []).map((child, index) => rebuildMenuTreeIds(child, `${nodeId}.${index + 1}`)),
  };
}

function getNodeByPath(root, path) {
  if (!root) return null;
  let cursor = root;
  for (const childIndex of path || []) {
    const index = Number(childIndex);
    const children = cursor.children || [];
    if (!Number.isFinite(index) || index < 0 || index >= children.length) return null;
    cursor = children[index];
  }
  return cursor;
}

function findPreviousSelectionPath(parentPath, childIndex) {
  if (childIndex > 0) return [...parentPath, childIndex - 1];
  return [...parentPath];
}

function canMoveNodeByPath(root, path, direction) {
  if (!Array.isArray(path) || path.length === 0) return false;
  const parentPath = path.slice(0, -1);
  const parentNode = getNodeByPath(root, parentPath);
  if (!parentNode) return false;

  const childIndex = path[path.length - 1];
  const nextIndex = childIndex + direction;
  const siblings = parentNode.children || [];
  return nextIndex >= 0 && nextIndex < siblings.length;
}

function canPasteToSibling(targetNode, clipboard) {
  if (!targetNode || !clipboard?.node) return false;
  const targetTag = String(targetNode.tag || "").toUpperCase();
  if (targetTag === "MNU") return false;
  return String(clipboard.tag || "").toUpperCase() === targetTag;
}

function canPasteChildToNode(targetNode, clipboard) {
  if (!targetNode || !clipboard?.node) return false;
  const targetTag = String(targetNode.tag || "").toUpperCase();
  const clipTag = String(clipboard.tag || "").toUpperCase();

  if (targetTag === "MNU") return clipTag === "MSY";
  if (targetTag === "MSY") return clipTag === "MIT";
  if (targetTag === "MIT") {
    if (clipTag === "MIT") return !hasDirectChildTag(targetNode, "PIT");
    if (clipTag === "PIT") return !hasDirectChildTag(targetNode, "MIT");
    return false;
  }
  return false;
}

function canShowPopupMenuActions(targetNode) {
  const targetTag = String(targetNode?.tag || "").toUpperCase();
  if (targetTag !== "MIT") return false;
  return !hasDirectChildTag(targetNode, "MIT");
}

function canPastePopupMenusToNode(targetNode, clipboard) {
  if (!canShowPopupMenuActions(targetNode)) return false;
  if (!clipboard?.node) return false;
  if (String(clipboard.tag || "").toUpperCase() !== "MIT") return false;
  if (hasDirectChildTag(targetNode, "PIT")) return false;
  return hasDirectChildTag(clipboard.node, "PIT");
}

function canRemovePopupMenusFromNode(targetNode) {
  if (!canShowPopupMenuActions(targetNode)) return false;
  return hasDirectChildTag(targetNode, "PIT");
}

function canAppendMenuItemToNode(targetNode) {
  return Boolean(resolveAppendChildTag(targetNode));
}

function canAppendPopupMenuItemToNode(targetNode) {
  const targetTag = String(targetNode?.tag || "").toUpperCase();
  if (targetTag !== "MIT") return false;
  return !hasDirectChildTag(targetNode, "MIT");
}

function resolveAppendChildTag(targetNode) {
  const targetTag = String(targetNode?.tag || "").toUpperCase();
  if (targetTag === "MNU") return "MSY";
  if (targetTag === "MSY") return "MIT";
  if (targetTag === "MIT" && !hasDirectChildTag(targetNode, "PIT")) return "MIT";
  return "";
}

function hasDirectChildTag(node, tag) {
  const targetTag = String(tag || "").toUpperCase();
  return (node?.children || []).some((child) => String(child?.tag || "").toUpperCase() === targetTag);
}

function createMenuNodeForTag(tag) {
  const nextTag = String(tag || "").toUpperCase();
  return {
    id: "",
    tag: nextTag,
    attributes: createDefaultAttributesByTag(nextTag),
    children: [],
  };
}

function createDefaultAttributesByTag(tag) {
  const attributes = {};
  const keys = NODE_PROPERTY_KEYS_BY_TAG[tag] || ["_S", "NM"];
  for (const key of keys) {
    if (key === "_S") {
      attributes._S = "0";
      continue;
    }
    attributes[key] = resolvePropertyDefaultValue(key);
  }
  if (!Object.prototype.hasOwnProperty.call(attributes, "_S")) {
    attributes._S = "0";
  }
  if (!Object.prototype.hasOwnProperty.call(attributes, "NM")) {
    attributes.NM = "";
  }
  return attributes;
}

function collectUsedMenuNames(root) {
  const used = new Set();
  const walk = (node) => {
    if (!node) return;
    const tag = String(node.tag || "").toUpperCase();
    if (tag === "MSY" || tag === "MIT") {
      const name = String(node?.attributes?.NM ?? "").trim();
      if (name) used.add(name);
    }
    for (const child of node.children || []) {
      walk(child);
    }
  };
  walk(root);
  return used;
}

function ensureUniqueNodeName(name, fallbackName, usedNames) {
  let candidate = String(name || "").trim() || String(fallbackName || "").trim();
  if (!usedNames || !candidate) return candidate;
  if (!usedNames.has(candidate)) return candidate;

  const baseName = candidate;
  let suffix = 2;
  while (usedNames.has(`${baseName}_${suffix}`)) {
    suffix += 1;
  }
  return `${baseName}_${suffix}`;
}

function assignSequenceIdsToNode(node, sequenceState, usedNames) {
  const next = cloneMenuTreeNode(node);
  const nextSeq = Math.max(0, Number(sequenceState?.value || 0)) + 1;
  sequenceState.value = nextSeq;

  const tag = String(next.tag || "").toUpperCase();
  const attributes = {
    ...(next.attributes || {}),
    _S: String(nextSeq),
  };

  if (tag === "MSY") {
    const ensuredName = ensureUniqueNodeName(attributes.NM, `NewSystem_${nextSeq}`, usedNames);
    attributes.NM = ensuredName;
    if (ensuredName) usedNames.add(ensuredName);
  } else if (tag === "MIT") {
    const ensuredName = ensureUniqueNodeName(attributes.NM, `NewMenu_${nextSeq}`, usedNames);
    attributes.NM = ensuredName;
    if (ensuredName) usedNames.add(ensuredName);
  } else if (tag === "PIT") {
    const name = String(attributes.NM ?? "").trim();
    if (!name) {
      attributes.NM = `NewPopupMenu_${nextSeq}`;
    }
  }

  next.attributes = attributes;
  next.children = (next.children || []).map((child) => assignSequenceIdsToNode(child, sequenceState, usedNames));
  return next;
}

function parseMenuTree(xmlText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(String(xmlText || ""), "application/xml");
  const parseError = xml.getElementsByTagName("parsererror")[0];
  if (parseError) {
    throw new Error("Invalid .mnu XML format.");
  }

  const root = xml.documentElement;
  if (!root || root.tagName !== "Q") {
    throw new Error("Menu file must include a Q root element.");
  }

  const mnuElement = Array.from(root.children || []).find((element) => element.tagName === "MNU");
  if (!mnuElement) {
    throw new Error("MNU node not found in selected file.");
  }

  const tree = parseTreeNode(mnuElement, "mnu");
  const meta = normalizeMenuMeta(extractElementAttributes(root), tree);
  return { tree, meta };
}

function parseTreeNode(element, id) {
  const attributes = {};
  for (const attr of Array.from(element.attributes || [])) {
    attributes[attr.name] = attr.value;
  }

  const children = Array.from(element.children || [])
    .filter((child) => TREE_NODE_TAGS.has(child.tagName))
    .map((child, index) => parseTreeNode(child, `${id}.${index + 1}`));

  return {
    id,
    tag: element.tagName,
    attributes,
    children,
  };
}

function defaultExpandedNodes(root, maxDepth = 1) {
  const expanded = new Set();
  const walk = (node, depth) => {
    if (!node) return;
    if (depth <= maxDepth) expanded.add(node.id);
    for (const child of node.children || []) {
      walk(child, depth + 1);
    }
  };
  walk(root, 0);
  return expanded;
}

function flattenTreeRows(root, expandedNodeIds) {
  if (!root) return [];
  const rows = [];

  const walk = (node, depth) => {
    rows.push({ node, depth });
    const children = node.children || [];
    if (!children.length) return;
    const isExpanded = depth === 0 || expandedNodeIds.has(node.id);
    if (!isExpanded) return;
    for (const child of children) {
      walk(child, depth + 1);
    }
  };

  walk(root, 0);
  return rows;
}

function findMenuTreeMatches(root, keyword) {
  if (!root) return [];
  const needle = normalizeSearchText(keyword);
  if (!needle) return [];

  const matches = [];
  const walk = (node) => {
    if (!node) return;
    if (isMenuTreeNodeMatched(node, needle)) {
      matches.push(node.id);
    }
    for (const child of node.children || []) {
      walk(child);
    }
  };
  walk(root);
  return matches;
}

function isMenuTreeNodeMatched(node, needle) {
  if (!node || !needle) return false;
  const source = `${String(node.tag || "")} ${formatNodeTitle(node)}`;
  return normalizeSearchText(source).includes(needle);
}

function normalizeSearchText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function buildMenuTreeHighlightSet(matchIds) {
  const highlightSet = new Set();
  for (const id of matchIds || []) {
    const parts = String(id || "").split(".");
    for (let index = 1; index <= parts.length; index += 1) {
      highlightSet.add(parts.slice(0, index).join("."));
    }
  }
  return highlightSet;
}

function expandTreePath(expandedSet, nodeId) {
  const next = new Set(expandedSet || []);
  const parts = String(nodeId || "").split(".");
  for (let index = 1; index <= parts.length; index += 1) {
    next.add(parts.slice(0, index).join("."));
  }
  return next;
}

function findNodeById(node, id) {
  if (!node || !id) return null;
  if (node.id === id) return node;
  for (const child of node.children || []) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}

function updateNodeById(node, nodeId, updater) {
  if (!node || !nodeId) return node;
  if (node.id === nodeId) return updater(node);

  const children = node.children || [];
  if (!children.length) return node;

  let changed = false;
  const nextChildren = children.map((child) => {
    const next = updateNodeById(child, nodeId, updater);
    if (next !== child) changed = true;
    return next;
  });

  if (!changed) return node;
  return { ...node, children: nextChildren };
}

function formatNodeTitle(node) {
  const attrs = node?.attributes || {};
  const tag = String(node?.tag || "").toUpperCase();

  if (tag === "MNU") {
    return firstNonEmpty(attrs.NM) || "(unnamed)";
  }

  if (tag === "MSY") {
    return formatBracketCaption(attrs.NM, attrs.CD);
  }

  if (tag === "MIT") {
    return formatBracketCaption(attrs.NM, attrs.MC);
  }

  if (tag === "PIT") {
    return formatBracketCaption(attrs.NM, attrs.PC);
  }

  const title = firstNonEmpty(attrs.NM, attrs.MC, attrs.PC, attrs.CD, attrs.CN, attrs.D, attrs.MD, attrs.PU, attrs.PL);
  return title || "(unnamed)";
}

function formatBracketCaption(name, caption) {
  const nameText = String(name ?? "").trim();
  const captionText = String(caption ?? "").trim();

  if (nameText && captionText) {
    return `[${nameText}] ${captionText}`;
  }
  if (nameText) {
    return `[${nameText}]`;
  }
  if (captionText) {
    return captionText;
  }
  return "(unnamed)";
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function buildPropertyRows(node) {
  if (!node) return [];

  const rows = [
    {
      key: "__type",
      displayKey: "Type",
      label: "Type",
      category: "General",
      value: node.tag,
      readOnly: true,
      multiline: false,
      options: null,
    },
  ];

  const attributes = node.attributes || {};
  const tag = String(node.tag || "").toUpperCase();
  const preferredKeys = NODE_PROPERTY_KEYS_BY_TAG[tag] || [];
  const keys = buildOrderedPropertyKeys(preferredKeys, Object.keys(attributes || {}));
  for (const key of keys) {
    if (!isPropertyVisibleForTag(tag, key, attributes)) continue;

    const hasAttribute = Object.prototype.hasOwnProperty.call(attributes, key);
    const value = String(hasAttribute ? attributes[key] ?? "" : resolvePropertyDefaultValue(key));
    const meta = PROPERTY_META[key] || getFallbackMeta(key);
    rows.push({
      key,
      displayKey: key,
      label: meta.label,
      category: meta.category,
      value,
      readOnly: isPropertyReadOnlyForTag(tag, key, attributes, meta),
      multiline: MULTILINE_KEYS.has(key) || value.length >= 140,
      options: ENUM_VALUE_OPTIONS[key] || (BOOLEAN_VALUE_KEYS.has(key) ? BOOLEAN_VALUE_OPTIONS : null),
      isImage: key === "MI" || key === "ML",
      imagePreviewOnly: false,
      previewKey: "",
    });
    if (key === "MI" || key === "ML") {
      const previewMeta = IMAGE_PREVIEW_ROW_META[key];
      rows.push({
        key: previewMeta.key,
        displayKey: previewMeta.key,
        label: previewMeta.label,
        category: "Image",
        value,
        readOnly: true,
        multiline: false,
        options: null,
        isImage: false,
        imagePreviewOnly: true,
        previewKey: key,
      });
    }
  }

  return rows;
}

function applyTagPropertyRules(tag, attributes) {
  const tagText = String(tag || "").toUpperCase();
  if (tagText !== "PIT" || !attributes) return;

  const behavior = normalizePopupBehavior(attributes.PB);
  if (behavior === "Link") {
    attributes.PP = "Menu";
    attributes.PU = "";
  }

  const permission = normalizePopupPermission(attributes.PP);
  if (permission !== "Menu") {
    attributes.PL = "";
  }
}

function isPropertyVisibleForTag(tag, key, attributes) {
  const tagText = String(tag || "").toUpperCase();
  const keyText = String(key || "").toUpperCase();
  if (tagText !== "PIT") return true;

  const behavior = normalizePopupBehavior(attributes?.PB);
  const permission = resolveEffectivePopupPermission(attributes);

  if (keyText === "PU") return behavior !== "Link";
  if (keyText === "PL") return permission === "Menu";
  return true;
}

function isPropertyReadOnlyForTag(tag, key, attributes, meta) {
  if (meta?.readOnly) return true;

  const tagText = String(tag || "").toUpperCase();
  const keyText = String(key || "").toUpperCase();
  if (tagText === "PIT" && keyText === "PP") {
    return normalizePopupBehavior(attributes?.PB) === "Link";
  }

  return false;
}

function normalizePopupBehavior(value) {
  const text = String(value ?? "").trim();
  return text === "Link" ? "Link" : "Custom";
}

function normalizePopupPermission(value) {
  const text = String(value ?? "").trim();
  if (text === "Menu") return "Menu";
  if (text === "Caller") return "Caller";
  return "None";
}

function resolveEffectivePopupPermission(attributes) {
  if (normalizePopupBehavior(attributes?.PB) === "Link") return "Menu";
  return normalizePopupPermission(attributes?.PP);
}

function buildOrderedPropertyKeys(preferredKeys, actualKeys) {
  const ordered = [];
  const seen = new Set();

  for (const key of preferredKeys || []) {
    const keyText = String(key || "");
    if (!keyText || seen.has(keyText)) continue;
    seen.add(keyText);
    ordered.push(keyText);
  }

  const extras = [];
  for (const key of actualKeys || []) {
    const keyText = String(key || "");
    if (!keyText || seen.has(keyText)) continue;
    seen.add(keyText);
    extras.push(keyText);
  }

  extras.sort(compareAttributeKey);
  return [...ordered, ...extras];
}

function resolvePropertyDefaultValue(key) {
  if (Object.prototype.hasOwnProperty.call(DEFAULT_ATTRIBUTE_VALUES, key)) {
    return DEFAULT_ATTRIBUTE_VALUES[key];
  }
  return "";
}

function compareAttributeKey(left, right) {
  const leftIndex = ATTRIBUTE_PRIORITY.indexOf(left);
  const rightIndex = ATTRIBUTE_PRIORITY.indexOf(right);

  if (leftIndex >= 0 && rightIndex >= 0) return leftIndex - rightIndex;
  if (leftIndex >= 0) return -1;
  if (rightIndex >= 0) return 1;
  return String(left).localeCompare(String(right));
}

function getFallbackMeta(key) {
  const keyText = String(key || "").toUpperCase();
  if (/^(U[0-9]+|TG[0-9]+)$/.test(keyText)) return { label: keyText, category: "User Tag", readOnly: false };
  if (["AN", "NS"].includes(keyText)) return { label: keyText, category: "Assembly", readOnly: false };
  if (["MI", "ML"].includes(keyText)) return { label: keyText, category: "Image", readOnly: false };
  if (["FC", "FB"].includes(keyText)) return { label: keyText, category: "Font", readOnly: false };
  if (["MC", "MD", "PC", "PD", "PU", "PP", "PB", "PL", "TP", "UF", "MB", "MV", "MT", "CH", "PT", "AMF", "CN"].includes(keyText)) {
    return { label: keyText, category: "Menu", readOnly: false };
  }
  return { label: keyText, category: "Etc", readOnly: false };
}

function groupPropertyRows(rows) {
  const groups = new Map();
  for (const category of CATEGORY_ORDER) {
    groups.set(category, []);
  }

  for (const row of rows) {
    const category = groups.has(row.category) ? row.category : "Etc";
    groups.get(category).push(row);
  }

  const ordered = [];
  for (const category of CATEGORY_ORDER) {
    const categoryRows = groups.get(category) || [];
    if (!categoryRows.length) continue;
    ordered.push({ category, rows: categoryRows });
  }
  return ordered;
}

function formatCategoryDisplay(category, displayOrder = 0) {
  const name = CATEGORY_DISPLAY[category] || category;
  const safeIndex = Number.isFinite(displayOrder) && displayOrder > 0 ? displayOrder : 0;
  const prefix = safeIndex > 0 ? `[${String(safeIndex).padStart(2, "0")}] ` : "";
  return `${prefix}${name}`;
}

function resolveMenuImagePreviewSrc(root, node, key, value) {
  const fromHex = hexToImageDataUrl(value);
  if (fromHex) return fromHex;

  if (!node || !["MI", "ML"].includes(String(key || "").toUpperCase())) {
    return "";
  }

  const nodeTag = String(node.tag || "").toUpperCase();
  if (nodeTag === "MSY") {
    return FALLBACK_MENU_ITEM_ICON;
  }

  if (nodeTag === "MIT") {
    const parent = findParentNode(root, node.id);
    const parentTag = String(parent?.tag || "").toUpperCase();
    if (parentTag === "MSY") {
      return FALLBACK_MENU_GROUP_ICON;
    }
    const hasChildMit = (node.children || []).some((child) => String(child?.tag || "").toUpperCase() === "MIT");
    return hasChildMit ? FALLBACK_MENU_GROUP_SUB_ICON : FALLBACK_MENU_ITEM_ICON;
  }

  return "";
}

function findParentNode(root, nodeId) {
  if (!root || !nodeId) return null;
  const parts = String(nodeId).split(".");
  if (parts.length <= 1) return null;
  const parentId = parts.slice(0, -1).join(".");
  return findNodeById(root, parentId);
}

function hexToImageDataUrl(hexText) {
  const cleaned = String(hexText || "").replace(/[^0-9a-fA-F]/g, "");
  if (!cleaned || cleaned.length < 8 || cleaned.length % 2 !== 0) return "";

  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < cleaned.length; i += 2) {
    const next = Number.parseInt(cleaned.slice(i, i + 2), 16);
    if (Number.isNaN(next)) return "";
    bytes[i / 2] = next;
  }

  const mime = detectImageMime(bytes);
  if (!mime) return "";
  const base64 = uint8ToBase64(bytes);
  return `data:${mime};base64,${base64}`;
}

function detectImageMime(bytes) {
  if (!bytes || bytes.length < 4) return "";
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return "image/jpeg";
  }
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return "image/bmp";
  }
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46
  ) {
    return "image/gif";
  }
  return "";
}

function uint8ToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function arrayBufferToHexString(buffer) {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0").toUpperCase()).join(" ");
}

function supportsFileSystemAccess() {
  return (
    typeof window !== "undefined" &&
    typeof window.showOpenFilePicker === "function" &&
    typeof window.showSaveFilePicker === "function"
  );
}

function buildClientPath(pathText) {
  const normalizedPath = String(pathText || "").replace(/^\/+/, "");
  return `${APP_BASE_PATH}${normalizedPath}`;
}

function normalizeBasePath(baseUrl) {
  const raw = String(baseUrl || "/").trim();
  if (!raw) return "/";
  let normalized = raw.startsWith("/") ? raw : `/${raw}`;
  if (!normalized.endsWith("/")) normalized += "/";
  return normalized;
}

function isAbortError(error) {
  return error && String(error?.name || "") === "AbortError";
}

function createDefaultMenuTree() {
  return {
    id: "mnu",
    tag: "MNU",
    attributes: {
      _S: "1",
      NM: "LinkOnMenu",
    },
    children: [],
  };
}

function createDefaultMenuMeta(now) {
  const timestamp = formatMenuTimestamp(now || new Date());
  return {
    QF: "MNU",
    QV: "1.0.0.0",
    QC: timestamp,
    QU: timestamp,
    QD: "LinkOn Menu File",
    QS: "1",
  };
}

function normalizeMenuMeta(meta, treeRoot) {
  const defaults = createDefaultMenuMeta(new Date());
  const next = { ...defaults };
  for (const key of ROOT_META_ORDER) {
    const text = String(meta?.[key] ?? "").trim();
    if (text) next[key] = text;
  }

  const parsedSeq = Number.parseInt(String(next.QS || "0"), 10);
  const currentSeq = Number.isFinite(parsedSeq) ? parsedSeq : 0;
  const maxSeq = findMaxSequenceId(treeRoot);
  next.QS = String(Math.max(1, currentSeq, maxSeq));
  return next;
}

function extractElementAttributes(element) {
  const attributes = {};
  for (const attr of Array.from(element?.attributes || [])) {
    attributes[attr.name] = String(attr.value ?? "");
  }
  return attributes;
}

function findMaxSequenceId(root) {
  let maxSeq = 0;
  const walk = (node) => {
    if (!node) return;
    const parsed = Number.parseInt(String(node?.attributes?._S ?? ""), 10);
    if (Number.isFinite(parsed)) {
      maxSeq = Math.max(maxSeq, parsed);
    }
    for (const child of node.children || []) {
      walk(child);
    }
  };
  walk(root);
  return maxSeq;
}

function formatMenuTimestamp(dateLike) {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  const millisecond = String(date.getMilliseconds()).padStart(3, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}.${millisecond}`;
}

function buildMenuXml(treeRoot, menuMeta) {
  const nextMeta = normalizeMenuMeta({
    ...(menuMeta || {}),
    QU: formatMenuTimestamp(new Date()),
  }, treeRoot);
  if (!String(nextMeta.QC || "").trim()) {
    nextMeta.QC = nextMeta.QU;
  }

  const rootAttributes = ROOT_META_ORDER
    .map((key) => `${key}="${escapeXmlAttribute(nextMeta[key])}"`)
    .join(" ");

  const lines = [
    "<?xml version=\"1.0\"?>",
    `<Q ${rootAttributes}>`,
    ...renderMenuTreeXml(treeRoot, 1),
    "</Q>",
  ];

  return {
    xmlText: lines.join("\n"),
    meta: nextMeta,
  };
}

function renderMenuTreeXml(node, depth) {
  if (!node) return [];

  const indent = "  ".repeat(Math.max(0, depth));
  const entries = Object.entries(node.attributes || {})
    .filter(([key]) => Boolean(String(key || "").trim()))
    .sort(([left], [right]) => compareAttributeKey(left, right));
  const attributesText = entries
    .map(([key, value]) => `${key}="${escapeXmlAttribute(String(value ?? ""))}"`)
    .join(" ");
  const children = node.children || [];
  if (!children.length) {
    return [`${indent}<${node.tag}${attributesText ? ` ${attributesText}` : ""} />`];
  }

  const lines = [`${indent}<${node.tag}${attributesText ? ` ${attributesText}` : ""}>`];
  for (const child of children) {
    lines.push(...renderMenuTreeXml(child, depth + 1));
  }
  lines.push(`${indent}</${node.tag}>`);
  return lines;
}

function escapeXmlAttribute(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function ensureMenuFileName(fileName) {
  const nameText = String(fileName ?? "").trim();
  const fallbackName = nameText || "LinkOnMenu.mnu";
  return /\.mnu$/i.test(fallbackName) ? fallbackName : `${fallbackName}.mnu`;
}

function downloadTextFile(fileName, text) {
  const safeName = ensureMenuFileName(fileName);
  const blob = new Blob([String(text ?? "")], {
    type: "application/xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
