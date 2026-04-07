import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./LanguageEditor.css";

const APP_BASE_PATH = normalizeBasePath(import.meta.env.BASE_URL || "/");

const ROOT_META_ORDER = ["QF", "QV", "QC", "QU", "QD", "QS"];
const NEW_ICON_SRC = buildClientPath("icons/menuEditor/new_16x16.png");
const OPEN_ICON_SRC = buildClientPath("icons/menuEditor/open_16x16.png");
const SAVE_ICON_SRC = buildClientPath("icons/menuEditor/save_16x16.png");
const SAVE_AS_ICON_SRC = buildClientPath("icons/languageEditor/saveas_16x16.png");
const UPDATE_ICON_SRC = buildClientPath("icons/languageEditor/ToolCheck.png");
const DELETE_ICON_SRC = buildClientPath("icons/languageEditor/ToolRemove.png");
const GOTO_ERROR_ICON_SRC = buildClientPath("icons/languageEditor/ToolGotoError.png");
const GEN_ENUM_ICON_SRC = buildClientPath("icons/languageEditor/ToolEnumGenerate.png");
const TOOL_LANGUAGE_ICON_SRC = buildClientPath("icons/languageEditor/ToolLanguage.png");
const TOOL_MESSAGE_ICON_SRC = buildClientPath("icons/languageEditor/ToolMessage.png");

const CAPTION_PROPERTY_GROUPS = [
  { key: "general", title: "[01] General", rows: [{ key: "DEF", label: "Default", multiline: false }] },
  {
    key: "language",
    title: "[02] Language",
    rows: [
      { key: "ENG", label: "English", multiline: false },
      { key: "KOR", label: "Korean", multiline: false },
      { key: "CHN", label: "Chinese", multiline: false },
    ],
  },
  { key: "description", title: "[03] Description", rows: [{ key: "DEC", label: "Description", multiline: true }] },
];

const MESSAGE_PROPERTY_GROUPS = [
  {
    key: "general",
    title: "[01] General",
    rows: [
      { key: "MID", label: "Message ID", multiline: false },
      { key: "DEF", label: "Default", multiline: false },
    ],
  },
  {
    key: "language",
    title: "[02] Language",
    rows: [
      { key: "ENG", label: "English", multiline: false },
      { key: "KOR", label: "Korean", multiline: false },
      { key: "CHN", label: "Chinese", multiline: false },
    ],
  },
  { key: "description", title: "[03] Description", rows: [{ key: "DEC", label: "Description", multiline: true }] },
];

export function LanguageEditor() {
  const fileInputRef = useRef(null);
  const treeScrollRef = useRef(null);
  const propertyScrollRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [fileHandle, setFileHandle] = useState(null);
  const [languageMeta, setLanguageMeta] = useState(() => createDefaultLanguageMeta(new Date()));
  const [languageData, setLanguageData] = useState(() => createDefaultLanguageData());
  const [isDirty, setIsDirty] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [activeTab, setActiveTab] = useState("caption");
  const [selectedNodeId, setSelectedNodeId] = useState("Q.CG");
  const [expandedNodeIds, setExpandedNodeIds] = useState(() => new Set(["Q", "Q.CG", "Q.MG"]));

  const [propertyType, setPropertyType] = useState("caption");
  const [propertyDraft, setPropertyDraft] = useState(() => createDefaultCaptionDraft());

  const [treeSearchDraft, setTreeSearchDraft] = useState("");
  const [treeSearchQuery, setTreeSearchQuery] = useState("");
  const [treeSearchMatches, setTreeSearchMatches] = useState([]);
  const [treeSearchIndex, setTreeSearchIndex] = useState(-1);

  const [captionGotoErrorIndex, setCaptionGotoErrorIndex] = useState(0);
  const [messageGotoErrorIndex, setMessageGotoErrorIndex] = useState(0);

  const treeRoot = useMemo(
    () => buildLanguageTree(languageData),
    [languageData],
  );
  const treeRows = useMemo(
    () => flattenLanguageRows(treeRoot, expandedNodeIds),
    [treeRoot, expandedNodeIds],
  );
  const visibleRows = useMemo(() => {
    const targetTag = activeTab === "message" ? "M" : "C";
    return treeRows.filter((row) => String(row?.node?.tag || "").toUpperCase() === targetTag);
  }, [activeTab, treeRows]);
  const selectedNode = useMemo(
    () => findLanguageNodeById(treeRoot, selectedNodeId) || findLanguageNodeById(treeRoot, "Q.CG"),
    [treeRoot, selectedNodeId],
  );
  const selectedPropertyContext = useMemo(
    () => buildLanguagePropertyContext(selectedNode, languageData),
    [selectedNode, languageData],
  );
  const treeSearchHighlightSet = useMemo(
    () => buildLanguageTreeHighlightSet(treeSearchMatches),
    [treeSearchMatches],
  );
  const propertyGroups = useMemo(
    () => (propertyType === "message" ? MESSAGE_PROPERTY_GROUPS : CAPTION_PROPERTY_GROUPS),
    [propertyType],
  );
  const captionDuplicateValues = useMemo(
    () => findDuplicateValues(languageData.captions.map((item) => String(item.DEF ?? ""))),
    [languageData.captions],
  );
  const messageDuplicateValues = useMemo(
    () => findDuplicateValues(languageData.messages.map((item) => String(item.MID ?? ""))),
    [languageData.messages],
  );

  const currentTreeSearchDisplay = treeSearchMatches.length > 0 && treeSearchIndex >= 0
    ? treeSearchIndex + 1
    : 0;
  const canDelete = selectedNode?.tag === "C" || selectedNode?.tag === "M";
  const canGotoError = activeTab === "message"
    ? messageDuplicateValues.length > 0
    : captionDuplicateValues.length > 0;
  const canGenEnum = activeTab === "message";

  useEffect(() => {
    setPropertyType(selectedPropertyContext.type);
    setPropertyDraft(selectedPropertyContext.values);
    if (propertyScrollRef.current) {
      propertyScrollRef.current.scrollTop = 0;
    }
  }, [selectedPropertyContext.contextId, selectedPropertyContext.type, selectedPropertyContext.values]);

  useEffect(() => {
    setCaptionGotoErrorIndex(0);
  }, [captionDuplicateValues.join("\u0001")]);

  useEffect(() => {
    setMessageGotoErrorIndex(0);
  }, [messageDuplicateValues.join("\u0001")]);

  useEffect(() => {
    if (treeSearchIndex < 0 || !selectedNodeId) return;
    const container = treeScrollRef.current;
    if (!container) return;

    const rows = container.querySelectorAll(".LanguageEditor-tree-row[data-node-id]");
    let targetRow = null;
    for (const row of rows) {
      if (row.getAttribute("data-node-id") === selectedNodeId) {
        targetRow = row;
        break;
      }
    }
    if (!targetRow) return;

    const stickyHeader = container.querySelector(".LanguageEditor-caption-head, .LanguageEditor-message-head");
    const stickyHeaderHeight = stickyHeader instanceof HTMLElement ? stickyHeader.offsetHeight : 0;
    const containerRect = container.getBoundingClientRect();
    const rowRect = targetRow.getBoundingClientRect();
    const rowTopInContent = container.scrollTop + (rowRect.top - containerRect.top);
    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
    const nextScrollTop = Math.min(
      maxScrollTop,
      Math.max(0, rowTopInContent - stickyHeaderHeight - 2),
    );
    container.scrollTop = nextScrollTop;
    if (typeof container.focus === "function") {
      container.focus({ preventScroll: true });
    }
  }, [activeTab, selectedNodeId, treeSearchIndex, visibleRows.length]);

  const onCreateLanguageFile = useCallback(() => {
    setSelectedFile({ name: "Language.lng" });
    setFileHandle(null);
    setLanguageMeta(createDefaultLanguageMeta(new Date()));
    setLanguageData(createDefaultLanguageData());
    setActiveTab("caption");
    setSelectedNodeId("Q.CG");
    setExpandedNodeIds(new Set(["Q", "Q.CG", "Q.MG"]));
    setIsDirty(false);
    setTreeSearchDraft("");
    setTreeSearchQuery("");
    setTreeSearchMatches([]);
    setTreeSearchIndex(-1);
    setErrorText("");
  }, []);

  const onLoadLanguageFile = useCallback(async (file, nextHandle = null) => {
    if (!file) return;

    if (!/\.lng$/i.test(String(file.name || ""))) {
      setErrorText("Please select a file with the .lng extension.");
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseLanguageXml(text);
      setSelectedFile({ name: String(file.name || "Language.lng") });
      setFileHandle(nextHandle);
      setLanguageMeta(parsed.meta);
      setLanguageData(parsed.data);
      setActiveTab("caption");
      setSelectedNodeId("Q.CG");
      setExpandedNodeIds(new Set(["Q", "Q.CG", "Q.MG"]));
      setIsDirty(false);
      setTreeSearchDraft("");
      setTreeSearchQuery("");
      setTreeSearchMatches([]);
      setTreeSearchIndex(-1);
      if (parsed.captionDuplicates.length > 0 || parsed.messageDuplicates.length > 0) {
        setErrorText("Duplicate caption/message keys were found in this file.");
      } else {
        setErrorText("");
      }
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Failed to parse .lng file.");
    }
  }, []);

  const onOpenLanguageFile = useCallback(async () => {
    if (supportsFileSystemAccess()) {
      try {
        const [handle] = await window.showOpenFilePicker({
          multiple: false,
          excludeAcceptAllOption: true,
          types: [{
            description: "Language Files",
            accept: { "application/xml": [".lng"] },
          }],
        });
        if (!handle) return;
        const file = await handle.getFile();
        await onLoadLanguageFile(file, handle);
      } catch (error) {
        if (isAbortError(error)) return;
        setErrorText(error instanceof Error ? error.message : "Failed to open .lng file.");
      }
      return;
    }

    const input = fileInputRef.current;
    if (!input) return;
    input.value = "";
    input.click();
  }, [onLoadLanguageFile]);

  const onPickFile = useCallback(async (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;
    await onLoadLanguageFile(file, null);
  }, [onLoadLanguageFile]);

  const onSwitchTab = useCallback((nextTab) => {
    const normalized = nextTab === "message" ? "message" : "caption";
    setActiveTab(normalized);
    setSelectedNodeId(normalized === "message" ? "Q.MG" : "Q.CG");
    setTreeSearchDraft("");
    setTreeSearchQuery("");
    setTreeSearchMatches([]);
    setTreeSearchIndex(-1);
  }, []);

  const onChangeProperty = useCallback((key, value) => {
    setPropertyDraft((prev) => ({
      ...prev,
      [key]: String(value ?? ""),
    }));
  }, []);

  const onSaveLanguageFile = useCallback(async (forceSaveAs = false) => {
    if (captionDuplicateValues.length > 0 || messageDuplicateValues.length > 0) {
      setErrorText("Duplicate caption/message keys exist. Resolve duplicates before saving.");
      return;
    }

    try {
      const built = buildLanguageXml(languageData, languageMeta);
      let nextHandle = fileHandle;
      let nextFileName = ensureLanguageFileName(selectedFile?.name);

      if (supportsFileSystemAccess()) {
        if (forceSaveAs || !nextHandle) {
          nextHandle = await window.showSaveFilePicker({
            suggestedName: nextFileName,
            excludeAcceptAllOption: true,
            types: [{
              description: "Language Files",
              accept: { "application/xml": [".lng"] },
            }],
          });
        }

        const writable = await nextHandle.createWritable();
        await writable.write(built.xmlText);
        await writable.close();
        nextFileName = ensureLanguageFileName(nextHandle.name || nextFileName);
        setFileHandle(nextHandle);
      } else {
        if (forceSaveAs || !selectedFile?.name) {
          nextFileName = ensureLanguageFileName(window.prompt("Save file name", nextFileName) || nextFileName);
        }
        downloadLanguageFile(nextFileName, built.xmlText);
        setFileHandle(null);
      }

      setLanguageMeta(built.meta);
      setSelectedFile({ name: nextFileName });
      setIsDirty(false);
      setErrorText("");
    } catch (error) {
      if (isAbortError(error)) return;
      setErrorText(error instanceof Error ? error.message : "Failed to save .lng file.");
    }
  }, [captionDuplicateValues.length, fileHandle, languageData, languageMeta, messageDuplicateValues.length, selectedFile]);

  const onUpdateEntry = useCallback(() => {
    if (propertyType === "message") {
      const nextMessage = normalizeMessageItem(propertyDraft);
      if (!String(nextMessage.MID || "").trim()) {
        setErrorText("Message ID is required.");
        return;
      }
      if (!String(nextMessage.DEF || "").trim()) {
        setErrorText("Default is required.");
        return;
      }

      const nextMessages = [...languageData.messages];
      const targetIndex = nextMessages.findIndex((item) => String(item.MID || "") === String(nextMessage.MID || ""));
      if (targetIndex >= 0) {
        nextMessages[targetIndex] = nextMessage;
      } else {
        nextMessages.push(nextMessage);
      }
      const sortedMessages = sortMessages(nextMessages);
      const nextData = { ...languageData, messages: sortedMessages };
      setLanguageData(nextData);
      setSelectedNodeId(findMessageNodeIdByKey(sortedMessages, nextMessage.MID));
      setIsDirty(true);
      setErrorText("");
      return;
    }

    const nextCaption = normalizeCaptionItem(propertyDraft);
    if (!String(nextCaption.DEF || "").trim()) {
      setErrorText("Default is required.");
      return;
    }

    const nextCaptions = [...languageData.captions];
    const targetIndex = nextCaptions.findIndex((item) => String(item.DEF || "") === String(nextCaption.DEF || ""));
    if (targetIndex >= 0) {
      nextCaptions[targetIndex] = nextCaption;
    } else {
      nextCaptions.push(nextCaption);
    }
    const sortedCaptions = sortCaptions(nextCaptions);
    const nextData = { ...languageData, captions: sortedCaptions };
    setLanguageData(nextData);
    setSelectedNodeId(findCaptionNodeIdByKey(sortedCaptions, nextCaption.DEF));
    setIsDirty(true);
    setErrorText("");
  }, [languageData, propertyDraft, propertyType]);

  const onDeleteEntry = useCallback(() => {
    if (!selectedNode) return;

    if (selectedNode.tag === "M") {
      const index = parseNodeIndex(selectedNode.id);
      if (index < 0 || index >= languageData.messages.length) return;
      const nextMessages = languageData.messages.filter((_, itemIndex) => itemIndex !== index);
      const sortedMessages = sortMessages(nextMessages);
      const nextData = { ...languageData, messages: sortedMessages };
      setLanguageData(nextData);
      if (sortedMessages.length) {
        const nextIndex = Math.min(index, sortedMessages.length - 1);
        setSelectedNodeId(`Q.MG.${nextIndex + 1}`);
      } else {
        setSelectedNodeId("Q.MG");
      }
      setIsDirty(true);
      setErrorText("");
      return;
    }

    if (selectedNode.tag === "C") {
      const index = parseNodeIndex(selectedNode.id);
      if (index < 0 || index >= languageData.captions.length) return;
      const nextCaptions = languageData.captions.filter((_, itemIndex) => itemIndex !== index);
      const sortedCaptions = sortCaptions(nextCaptions);
      const nextData = { ...languageData, captions: sortedCaptions };
      setLanguageData(nextData);
      if (sortedCaptions.length) {
        const nextIndex = Math.min(index, sortedCaptions.length - 1);
        setSelectedNodeId(`Q.CG.${nextIndex + 1}`);
      } else {
        setSelectedNodeId("Q.CG");
      }
      setIsDirty(true);
      setErrorText("");
    }
  }, [languageData, selectedNode]);

  const onGotoError = useCallback(() => {
    if (activeTab === "message") {
      if (!messageDuplicateValues.length) return;
      const baseIndex = messageGotoErrorIndex >= messageDuplicateValues.length ? 0 : messageGotoErrorIndex;
      const key = messageDuplicateValues[baseIndex];
      setSelectedNodeId(findMessageNodeIdByKey(languageData.messages, key));
      setMessageGotoErrorIndex((baseIndex + 1) % messageDuplicateValues.length);
      return;
    }

    if (!captionDuplicateValues.length) return;
    const baseIndex = captionGotoErrorIndex >= captionDuplicateValues.length ? 0 : captionGotoErrorIndex;
    const key = captionDuplicateValues[baseIndex];
    setSelectedNodeId(findCaptionNodeIdByKey(languageData.captions, key));
    setCaptionGotoErrorIndex((baseIndex + 1) % captionDuplicateValues.length);
  }, [
    activeTab,
    captionDuplicateValues,
    captionGotoErrorIndex,
    languageData.captions,
    languageData.messages,
    messageDuplicateValues,
    messageGotoErrorIndex,
  ]);

  const onGenerateEnum = useCallback(async () => {
    if (activeTab !== "message") return;

    const lines = [];
    lines.push("public enum QMessageId : int");
    lines.push("{");
    lines.push("/// <summary>");
    lines.push("/// None");
    lines.push("/// </summary>");
    lines.push("NONE,");

    for (const message of languageData.messages) {
      const messageId = String(message.MID || "").trim();
      if (!messageId) continue;
      lines.push("/// <summary>");
      lines.push(`/// ${String(message.DEF || "")}`);
      lines.push("/// </summary>");
      lines.push(`${messageId},`);
    }

    lines.push("}");
    const enumText = lines.join("\n");
    try {
      await copyTextToClipboard(enumText);
      setErrorText("");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Failed to copy enum text.");
    }
  }, [activeTab, languageData.messages]);

  const onSearchTree = useCallback(() => {
    const keyword = normalizeSearchText(treeSearchDraft);
    if (!keyword) {
      setTreeSearchQuery("");
      setTreeSearchMatches([]);
      setTreeSearchIndex(-1);
      setSelectedNodeId(activeTab === "message" ? "Q.MG" : "Q.CG");
      return;
    }

    const matches = visibleRows
      .filter((row) => {
        if (!row?.node) return false;
        const source = `${String(row.node.tag || "")} ${String(row.node.label || "")} ${String(row.node.searchText || "")}`;
        return normalizeSearchText(source).includes(keyword);
      })
      .map((row) => row.node.id);

    setTreeSearchQuery(keyword);
    setTreeSearchMatches(matches);
    if (!matches.length) {
      setTreeSearchIndex(-1);
      return;
    }

    const targetNodeId = matches[0];
    setTreeSearchIndex(0);
    setSelectedNodeId(targetNodeId);
  }, [activeTab, treeSearchDraft, visibleRows]);

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
  }, [onSearchTree, treeSearchIndex, treeSearchMatches]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".lng"
        onChange={(event) => {
          void onPickFile(event);
        }}
        style={{ display: "none" }}
      />

      <section className="panel LanguageEditor-panel">
        <div className="LanguageEditor-file-actions-wrap">
          <div className="LanguageEditor-file-actions">
            <button
              type="button"
              className="LanguageEditor-file-action-btn"
              onClick={onCreateLanguageFile}
              title="New .lng file"
              aria-label="New .lng file"
            >
              <img src={NEW_ICON_SRC} alt="" />
            </button>
            <button
              type="button"
              className="LanguageEditor-file-action-btn"
              onClick={() => {
                void onOpenLanguageFile();
              }}
              title="Open .lng file"
              aria-label="Open .lng file"
            >
              <img src={OPEN_ICON_SRC} alt="" />
            </button>
            <button
              type="button"
              className="LanguageEditor-file-action-btn"
              onClick={() => {
                void onSaveLanguageFile(false);
              }}
              title="Save .lng file"
              aria-label="Save .lng file"
              disabled={!isDirty}
            >
              <img src={SAVE_ICON_SRC} alt="" />
            </button>
            <button
              type="button"
              className="LanguageEditor-file-action-btn"
              onClick={() => {
                void onSaveLanguageFile(true);
              }}
              title="Save As .lng file"
              aria-label="Save As .lng file"
              disabled={!isDirty}
            >
              <img src={SAVE_AS_ICON_SRC} alt="" />
            </button>
            <button
              type="button"
              className="LanguageEditor-file-action-btn"
              onClick={onGotoError}
              title="Goto Error"
              aria-label="Goto Error"
              disabled={!canGotoError}
            >
              <img src={GOTO_ERROR_ICON_SRC} alt="" />
            </button>
            <button
              type="button"
              className="LanguageEditor-file-action-btn"
              onClick={() => {
                void onGenerateEnum();
              }}
              title="Gen Enum"
              aria-label="Gen Enum"
              disabled={!canGenEnum}
            >
              <img src={GEN_ENUM_ICON_SRC} alt="" />
            </button>
          </div>
          <div className="LanguageEditor-inline-file-name" title={selectedFile?.name || ""}>
            {selectedFile?.name || ""}
          </div>
        </div>
        {errorText ? <p className="error-text LanguageEditor-inline-error">{errorText}</p> : null}

        <div className="LanguageEditor-workspace">
          <section className={`LanguageEditor-tree-panel${activeTab === "caption" ? " caption-mode" : activeTab === "message" ? " message-mode" : ""}`}>
            <div className="LanguageEditor-tab-strip" role="tablist" aria-label="Language tabs">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "caption"}
                className={`LanguageEditor-tab-btn${activeTab === "caption" ? " active" : ""}`}
                onClick={() => onSwitchTab("caption")}
              >
                Caption
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "message"}
                className={`LanguageEditor-tab-btn${activeTab === "message" ? " active" : ""}`}
                onClick={() => onSwitchTab("message")}
              >
                Message
              </button>
            </div>

            <div className="LanguageEditor-tree-search">
              <div className="LanguageEditor-tree-search-panel">
                <input
                  value={treeSearchDraft}
                  placeholder={activeTab === "message" ? "Search Message ID / Default / Description" : "Search Default / Description"}
                  aria-label="Search Language Editor list"
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setTreeSearchDraft(nextValue);
                    if (!normalizeSearchText(nextValue)) {
                      setTreeSearchQuery("");
                      setTreeSearchMatches([]);
                      setTreeSearchIndex(-1);
                      setSelectedNodeId(activeTab === "message" ? "Q.MG" : "Q.CG");
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onSearchTree();
                    }
                  }}
                />
                <button type="button" className="LanguageEditor-tree-search-btn" onClick={onSearchTree}>
                  Find
                </button>
                <span className="LanguageEditor-tree-search-count" title={`${treeSearchMatches.length} matched rows`}>
                  {currentTreeSearchDisplay}/{treeSearchMatches.length}
                </span>
                <button
                  type="button"
                  className="LanguageEditor-tree-search-icon-btn"
                  onClick={() => onMoveTreeSearch(-1)}
                  disabled={!treeSearchMatches.length}
                  title="Previous match"
                  aria-label="Previous match"
                >
                  <span className="LanguageEditor-tree-search-icon LanguageEditor-tree-search-icon-up" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="LanguageEditor-tree-search-icon-btn"
                  onClick={() => onMoveTreeSearch(1)}
                  disabled={!treeSearchMatches.length}
                  title="Next match"
                  aria-label="Next match"
                >
                  <span className="LanguageEditor-tree-search-icon LanguageEditor-tree-search-icon-down" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div
              ref={treeScrollRef}
              className={`LanguageEditor-tree-scroll${activeTab === "caption" ? " caption-mode" : activeTab === "message" ? " message-mode" : ""}`}
              role="listbox"
              aria-label="Language rows"
              tabIndex={0}
            >
              {activeTab === "caption" ? (
                <div className="LanguageEditor-caption-head" aria-hidden="true">
                  <span>DEF</span>
                  <span>ENG</span>
                </div>
              ) : activeTab === "message" ? (
                <div className="LanguageEditor-message-head" aria-hidden="true">
                  <span>Message ID</span>
                  <span>DEF</span>
                  <span>ENG</span>
                </div>
              ) : null}
              {visibleRows.map((row) => {
                const isSelected = selectedNode?.id === row.node.id;
                const isMatched = treeSearchHighlightSet.has(row.node.id);
                return (
                  <div
                    key={row.node.id}
                    data-node-id={row.node.id}
                    className={`LanguageEditor-tree-row${activeTab === "caption" ? " LanguageEditor-tree-row-caption" : activeTab === "message" ? " LanguageEditor-tree-row-message" : ""}${isSelected ? " selected" : ""}${isMatched ? " matched" : ""}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      setSelectedNodeId(row.node.id);
                    }}
                  >
                    {activeTab === "caption" ? (
                      <>
                        <span className="LanguageEditor-caption-col LanguageEditor-caption-col-def" title={row.node.defText || ""}>
                          <span className="LanguageEditor-caption-def-wrap">
                            <img src={TOOL_LANGUAGE_ICON_SRC} alt="" className="LanguageEditor-caption-lang-icon" />
                            <span>{row.node.defText || ""}</span>
                          </span>
                        </span>
                        <span className="LanguageEditor-caption-col LanguageEditor-caption-col-eng" title={row.node.engText || ""}>{row.node.engText || ""}</span>
                      </>
                    ) : activeTab === "message" ? (
                      <>
                        <span className="LanguageEditor-message-col LanguageEditor-message-col-id" title={row.node.midText || ""}>
                          <span className="LanguageEditor-message-id-wrap">
                            <img src={TOOL_MESSAGE_ICON_SRC} alt="" className="LanguageEditor-message-icon" />
                            <span>{row.node.midText || ""}</span>
                          </span>
                        </span>
                        <span className="LanguageEditor-message-col LanguageEditor-message-col-def" title={row.node.defText || ""}>{row.node.defText || ""}</span>
                        <span className="LanguageEditor-message-col LanguageEditor-message-col-eng" title={row.node.engText || ""}>{row.node.engText || ""}</span>
                      </>
                    ) : (
                      <>
                        <span className={`LanguageEditor-tree-tag ${activeTab === "message" ? "tag-m" : "tag-c"}`}>
                          {row.node.tag}
                        </span>
                        <span className="LanguageEditor-tree-text" title={row.node.label}>
                          {row.node.label}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="LanguageEditor-prop-panel">
            <div className="LanguageEditor-prop-head">
              <h3>Properties</h3>
              <div className="LanguageEditor-prop-head-actions">
                <button
                  type="button"
                  className="LanguageEditor-prop-action-btn"
                  onClick={onUpdateEntry}
                  title="Update"
                  aria-label="Update"
                >
                  <img src={UPDATE_ICON_SRC} alt="" />
                </button>
                <button
                  type="button"
                  className="LanguageEditor-prop-action-btn"
                  onClick={onDeleteEntry}
                  title="Delete"
                  aria-label="Delete"
                  disabled={!canDelete}
                >
                  <img src={DELETE_ICON_SRC} alt="" />
                </button>
              </div>
            </div>
            <div className="LanguageEditor-prop-scroll" ref={propertyScrollRef}>
              {propertyGroups.map((group) => (
                <div key={group.key} className="LanguageEditor-prop-group">
                  <div className="LanguageEditor-prop-category">{group.title}</div>
                  {group.rows.map((row) => (
                    <div key={row.key} className="LanguageEditor-prop-row">
                      <label>{row.label}</label>
                      {row.multiline ? (
                        <textarea
                          value={propertyDraft[row.key] || ""}
                          rows={3}
                          onChange={(event) => onChangeProperty(row.key, event.target.value)}
                        />
                      ) : (
                        <input
                          value={propertyDraft[row.key] || ""}
                          onChange={(event) => onChangeProperty(row.key, event.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </>
  );
}

function buildLanguageTree(data) {
  const captions = Array.isArray(data?.captions) ? data.captions : [];
  const messages = Array.isArray(data?.messages) ? data.messages : [];

  const captionNodes = captions.map((item, index) => ({
    id: `Q.CG.${index + 1}`,
    tag: "C",
    defText: formatCaptionDefText(item),
    engText: formatCaptionEngText(item),
    label: formatCaptionNodeTitle(item),
    searchText: `${item.DEF || ""} ${item.ENG || ""} ${item.KOR || ""} ${item.CHN || ""} ${item.DEC || ""}`,
    children: [],
  }));

  const messageNodes = messages.map((item, index) => ({
    id: `Q.MG.${index + 1}`,
    tag: "M",
    midText: formatMessageIdText(item),
    defText: formatMessageDefText(item),
    engText: formatMessageEngText(item),
    label: formatMessageNodeTitle(item),
    searchText: `${item.MID || ""} ${item.DEF || ""} ${item.ENG || ""} ${item.KOR || ""} ${item.CHN || ""} ${item.DEC || ""}`,
    children: [],
  }));

  return {
    id: "Q",
    tag: "Q",
    label: "Language",
    searchText: "Language",
    children: [
      {
        id: "Q.CG",
        tag: "CG",
        label: "[CG] Caption",
        searchText: "Caption CG",
        children: captionNodes,
      },
      {
        id: "Q.MG",
        tag: "MG",
        label: "[MG] Message",
        searchText: "Message MG",
        children: messageNodes,
      },
    ],
  };
}

function formatCaptionNodeTitle(item) {
  const def = formatCaptionDefText(item);
  const eng = formatCaptionEngText(item);
  if (def && eng) return `${def} ${eng}`;
  if (def) return def;
  if (eng) return eng;
  return "(empty caption)";
}

function formatCaptionDefText(item) {
  return String(item?.DEF || "").trim();
}

function formatCaptionEngText(item) {
  return String(item?.ENG || "").trim();
}

function formatMessageNodeTitle(item) {
  const messageId = formatMessageIdText(item);
  const title = firstNonEmpty(formatMessageDefText(item), formatMessageEngText(item), item?.KOR, item?.CHN);
  if (messageId && title) return `[${messageId}] ${title}`;
  if (messageId) return `[${messageId}]`;
  if (title) return title;
  return "(empty message)";
}

function formatMessageIdText(item) {
  return String(item?.MID || "").trim();
}

function formatMessageDefText(item) {
  return String(item?.DEF || "").trim();
}

function formatMessageEngText(item) {
  return String(item?.ENG || "").trim();
}

function flattenLanguageRows(root, expandedNodeIds) {
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

function findLanguageNodeById(node, id) {
  if (!node || !id) return null;
  if (node.id === id) return node;
  for (const child of node.children || []) {
    const found = findLanguageNodeById(child, id);
    if (found) return found;
  }
  return null;
}

function buildLanguagePropertyContext(node, languageData) {
  const tag = String(node?.tag || "").toUpperCase();
  if (tag === "M" || tag === "MG") {
    if (tag === "M") {
      const index = parseNodeIndex(node?.id || "");
      const selected = languageData?.messages?.[index];
      if (selected) {
        return {
          contextId: `message:${node.id}:${selected.MID || ""}:${selected.DEF || ""}`,
          type: "message",
          values: normalizeMessageItem(selected),
        };
      }
    }
    return {
      contextId: `message:${node?.id || "Q.MG"}:new`,
      type: "message",
      values: createDefaultMessageDraft(),
    };
  }

  if (tag === "C") {
    const index = parseNodeIndex(node?.id || "");
    const selected = languageData?.captions?.[index];
    if (selected) {
      return {
        contextId: `caption:${node.id}:${selected.DEF || ""}`,
        type: "caption",
        values: normalizeCaptionItem(selected),
      };
    }
  }

  return {
    contextId: `caption:${node?.id || "Q.CG"}:new`,
    type: "caption",
    values: createDefaultCaptionDraft(),
  };
}

function parseNodeIndex(nodeId) {
  const parts = String(nodeId || "").split(".");
  if (!parts.length) return -1;
  const parsed = Number.parseInt(parts[parts.length - 1], 10);
  if (!Number.isFinite(parsed)) return -1;
  return parsed - 1;
}

function normalizeCaptionItem(item) {
  return {
    DEF: String(item?.DEF ?? ""),
    ENG: String(item?.ENG ?? ""),
    KOR: String(item?.KOR ?? ""),
    CHN: String(item?.CHN ?? ""),
    DEC: String(item?.DEC ?? ""),
  };
}

function normalizeMessageItem(item) {
  return {
    MID: String(item?.MID ?? ""),
    DEF: String(item?.DEF ?? ""),
    ENG: String(item?.ENG ?? ""),
    KOR: String(item?.KOR ?? ""),
    CHN: String(item?.CHN ?? ""),
    DEC: String(item?.DEC ?? ""),
  };
}

function createDefaultCaptionDraft() {
  return { DEF: "", ENG: "", KOR: "", CHN: "", DEC: "" };
}

function createDefaultMessageDraft() {
  return { MID: "", DEF: "", ENG: "", KOR: "", CHN: "", DEC: "" };
}

function createDefaultLanguageData() {
  return { captions: [], messages: [] };
}

function createDefaultLanguageMeta(now) {
  const timestamp = formatLanguageTimestamp(now || new Date());
  return {
    QF: "LNG",
    QV: "1.0.0.0",
    QC: timestamp,
    QU: timestamp,
    QD: "LinkOn Language File",
    QS: "0",
  };
}

function parseLanguageXml(xmlText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(String(xmlText || ""), "application/xml");
  const parseError = xml.getElementsByTagName("parsererror")[0];
  if (parseError) throw new Error("Invalid .lng XML format.");

  const root = xml.documentElement;
  if (!root || root.tagName !== "Q") {
    throw new Error("Language file must include a Q root element.");
  }

  const captionsGroup = Array.from(root.children || []).find((child) => child.tagName === "CG");
  const messagesGroup = Array.from(root.children || []).find((child) => child.tagName === "MG");
  const captions = sortCaptions(parseCaptionNodes(captionsGroup));
  const messages = sortMessages(parseMessageNodes(messagesGroup));
  const meta = normalizeLanguageMeta(extractElementAttributes(root));
  return {
    meta,
    data: { captions, messages },
    captionDuplicates: findDuplicateValues(captions.map((item) => String(item.DEF || ""))),
    messageDuplicates: findDuplicateValues(messages.map((item) => String(item.MID || ""))),
  };
}

function parseCaptionNodes(groupElement) {
  if (!groupElement) return [];
  return Array.from(groupElement.children || [])
    .filter((child) => child.tagName === "C")
    .map((child) => normalizeCaptionItem({
      DEF: child.getAttribute("DEF") || "",
      ENG: child.getAttribute("ENG") || "",
      KOR: child.getAttribute("KOR") || "",
      CHN: child.getAttribute("CHN") || "",
      DEC: child.getAttribute("DEC") || "",
    }));
}

function parseMessageNodes(groupElement) {
  if (!groupElement) return [];
  return Array.from(groupElement.children || [])
    .filter((child) => child.tagName === "M")
    .map((child) => normalizeMessageItem({
      MID: child.getAttribute("MID") || "",
      DEF: child.getAttribute("DEF") || "",
      ENG: child.getAttribute("ENG") || "",
      KOR: child.getAttribute("KOR") || "",
      CHN: child.getAttribute("CHN") || "",
      DEC: child.getAttribute("DEC") || "",
    }));
}

function normalizeLanguageMeta(meta) {
  const defaults = createDefaultLanguageMeta(new Date());
  const next = { ...defaults };
  for (const key of ROOT_META_ORDER) {
    const text = String(meta?.[key] ?? "").trim();
    if (text) next[key] = text;
  }
  return next;
}

function buildLanguageXml(languageData, languageMeta) {
  const nextMeta = normalizeLanguageMeta({ ...(languageMeta || {}), QU: formatLanguageTimestamp(new Date()) });
  if (!String(nextMeta.QC || "").trim()) {
    nextMeta.QC = nextMeta.QU;
  }
  const rootAttributes = ROOT_META_ORDER
    .filter((key) => String(nextMeta[key] ?? "").trim() !== "")
    .map((key) => `${key}="${escapeXmlAttribute(nextMeta[key])}"`)
    .join(" ");
  const captions = sortCaptions(languageData?.captions || []);
  const messages = sortMessages(languageData?.messages || []);
  const lines = [
    "<?xml version=\"1.0\"?>",
    `<Q ${rootAttributes}>`,
    "  <CG>",
    ...captions.map((item) => renderCaptionXmlLine(item, 2)),
    "  </CG>",
    "  <MG>",
    ...messages.map((item) => renderMessageXmlLine(item, 2)),
    "  </MG>",
    "</Q>",
  ];
  return { xmlText: lines.join("\n"), meta: nextMeta };
}

function renderCaptionXmlLine(item, depth) {
  const indent = "  ".repeat(Math.max(0, depth));
  const attrs = [
    ["DEF", item.DEF],
    ["ENG", item.ENG],
    ["KOR", item.KOR],
    ["CHN", item.CHN],
    ["DEC", item.DEC],
  ]
    .filter(([, value]) => String(value ?? "").length > 0)
    .map(([key, value]) => `${key}="${escapeXmlAttribute(value)}"`)
    .join(" ");
  return `${indent}<C${attrs ? ` ${attrs}` : ""} />`;
}

function renderMessageXmlLine(item, depth) {
  const indent = "  ".repeat(Math.max(0, depth));
  const attrs = [
    ["MID", item.MID],
    ["DEF", item.DEF],
    ["ENG", item.ENG],
    ["KOR", item.KOR],
    ["CHN", item.CHN],
    ["DEC", item.DEC],
  ]
    .filter(([, value]) => String(value ?? "").length > 0)
    .map(([key, value]) => `${key}="${escapeXmlAttribute(value)}"`)
    .join(" ");
  return `${indent}<M${attrs ? ` ${attrs}` : ""} />`;
}

function sortCaptions(items) {
  return [...(items || [])]
    .map((item) => normalizeCaptionItem(item))
    .sort((left, right) => compareText(left.DEF, right.DEF));
}

function sortMessages(items) {
  return [...(items || [])]
    .map((item) => normalizeMessageItem(item))
    .sort((left, right) => compareText(left.MID, right.MID));
}

function compareText(left, right) {
  return String(left ?? "").localeCompare(String(right ?? ""), undefined, { sensitivity: "base" });
}

function findCaptionNodeIdByKey(captions, key) {
  const index = (captions || []).findIndex((item) => String(item.DEF || "") === String(key || ""));
  if (index < 0) return "Q.CG";
  return `Q.CG.${index + 1}`;
}

function findMessageNodeIdByKey(messages, key) {
  const index = (messages || []).findIndex((item) => String(item.MID || "") === String(key || ""));
  if (index < 0) return "Q.MG";
  return `Q.MG.${index + 1}`;
}

function findDuplicateValues(values) {
  const seen = new Set();
  const duplicates = [];
  const duplicateSet = new Set();
  for (const value of values || []) {
    const text = String(value ?? "");
    if (!text) continue;
    if (seen.has(text) && !duplicateSet.has(text)) {
      duplicates.push(text);
      duplicateSet.add(text);
      continue;
    }
    seen.add(text);
  }
  return duplicates;
}

function normalizeSearchText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function findLanguageTreeMatches(root, keyword) {
  if (!root) return [];
  const needle = normalizeSearchText(keyword);
  if (!needle) return [];
  const matches = [];
  const walk = (node) => {
    if (!node) return;
    const source = `${String(node.tag || "")} ${String(node.label || "")} ${String(node.searchText || "")}`;
    if (normalizeSearchText(source).includes(needle)) {
      matches.push(node.id);
    }
    for (const child of node.children || []) {
      walk(child);
    }
  };
  walk(root);
  return matches;
}

function buildLanguageTreeHighlightSet(matchIds) {
  return new Set(matchIds || []);
}

function escapeXmlAttribute(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function ensureLanguageFileName(fileName) {
  const nameText = String(fileName ?? "").trim();
  const fallbackName = nameText || "Language.lng";
  return /\.lng$/i.test(fallbackName) ? fallbackName : `${fallbackName}.lng`;
}

function extractElementAttributes(element) {
  const attributes = {};
  for (const attr of Array.from(element?.attributes || [])) {
    attributes[attr.name] = String(attr.value ?? "");
  }
  return attributes;
}

function formatLanguageTimestamp(dateLike) {
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

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
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

function supportsFileSystemAccess() {
  return (
    typeof window !== "undefined" &&
    typeof window.showOpenFilePicker === "function" &&
    typeof window.showSaveFilePicker === "function"
  );
}

function isAbortError(error) {
  return error && String(error?.name || "") === "AbortError";
}

function downloadLanguageFile(fileName, text) {
  const safeName = ensureLanguageFileName(fileName);
  const blob = new Blob([String(text ?? "")], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

async function copyTextToClipboard(text) {
  const value = String(text ?? "");
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const area = document.createElement("textarea");
  area.value = value;
  area.setAttribute("readonly", "readonly");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(area);
  if (!copied) throw new Error("Clipboard API is not available.");
}
