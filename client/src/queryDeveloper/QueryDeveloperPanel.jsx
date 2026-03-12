import { useEffect, useState } from "react";
import Split from "react-split";
import "./QueryDeveloperPanel.css";
import { RibbonIcon } from "../components/RibbonIcon";
import { SqlHighlightEditor } from "./SqlHighlightEditor";
import { CONTEXT_ALLOWED_CHILDREN, SQL_PROVIDERS, TREE_NODE_DEPTH_INDENT_PX } from "./constants";
import {
  boolToSelectValue,
  buildClientPath,
  getQueryDeveloperTreeIcon,
  getSqlProviderLogoSrc,
  getSqlProviderMonogram,
  isAlwaysReadOnlyProperty,
} from "./utils";

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

export function QueryDeveloperPanel({
  files,
  filesLoading,
  fileLoading,
  selectedFile,
  onRefresh,
  refreshDisabled,
  onDownloadSelectedFile,
  onSelectFile,
  treePaneRef,
  searchCollapsed,
  setSearchCollapsed,
  searchQuery,
  setSearchQuery,
  onSearch,
  searchCaseSensitive,
  setSearchCaseSensitive,
  searchMatches,
  currentSearchDisplay,
  moveSearch,
  treeRows,
  selectedPath,
  expanded,
  onSelectNode,
  onOpenContextMenu,
  toggleNodeExpanded,
  nodeDetail,
  propertyGroups,
  propertiesCollapsed,
  setPropertiesCollapsed,
  propertyDraft,
  onChangeProperty,
  saving,
  propertyDirty,
  onUpdateProperties,
  activeSqlProvider,
  setActiveSqlProvider,
  sqlDraft,
  setSqlDraft,
  sqlDirty,
  onUpdateSqlQueries,
  contextMenu,
  contextNode,
  contextMenuRef,
  treeClipboard,
  onTreeContextAction,
}) {
  const [showSqlDialog, setShowSqlDialog] = useState(false);

  useEffect(() => {
    if (!showSqlDialog) return undefined;
    const onEscape = (event) => {
      if (event.key === "Escape") setShowSqlDialog(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [showSqlDialog]);

  useEffect(() => {
    if (nodeDetail?.kind !== "sqlGroup") {
      setShowSqlDialog(false);
    }
  }, [nodeDetail?.kind]);

  const renderSqlEditorBody = () => {
    if (nodeDetail?.kind !== "sqlGroup") {
      return <p className="empty-text">Select an SQL Code node(SG) to edit provider queries.</p>;
    }
    return (
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
    );
  };

  return (
    <>
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
            const hasChildren = (contextNode.children || []).length > 0;
            const pathText = contextMenu.pathText;
            const isOpen = pathText === "root" ? true : expanded.has(pathText);
            const allowedPasteKinds = CONTEXT_ALLOWED_CHILDREN[contextNode.kind] || [];
            const canPaste = Boolean(
              treeClipboard &&
              treeClipboard.fileName === selectedFile &&
              (allowedPasteKinds.includes(treeClipboard.kind) || treeClipboard.kind === contextNode.kind),
            );
            const canAppendChild = contextNode.kind === "system" || contextNode.kind === "module" || contextNode.kind === "function";
            const canInsertSibling =
              contextNode.kind === "module" || contextNode.kind === "function" || contextNode.kind === "sqlGroup";
            const canDelete = contextNode.kind !== "root" && !hasChildren;
            return (
              <>
                <button type="button" onClick={() => void onTreeContextAction("expand")} disabled={!hasChildren || isOpen}>
                  <span className="tree-context-item-icon tree-context-icon-expand" aria-hidden="true" />
                  <span>Expand</span>
                </button>
                <button
                  type="button"
                  onClick={() => void onTreeContextAction("collapse")}
                  disabled={!hasChildren || !isOpen || pathText === "root"}
                >
                  <span className="tree-context-item-icon tree-context-icon-collapse" aria-hidden="true" />
                  <span>Collapse</span>
                </button>
                <button type="button" onClick={() => void onTreeContextAction("copy")} disabled={contextNode.kind === "root"}>
                  <span className="tree-context-item-icon tree-context-icon-copy" aria-hidden="true" />
                  <span>Copy</span>
                </button>
                <button type="button" onClick={() => void onTreeContextAction("paste")} disabled={!canPaste}>
                  <span className="tree-context-item-icon tree-context-icon-paste" aria-hidden="true" />
                  <span>Paste</span>
                </button>
                <button type="button" onClick={() => void onTreeContextAction("delete")} disabled={!canDelete}>
                  <span className="tree-context-item-icon tree-context-icon-delete" aria-hidden="true" />
                  <span>Delete</span>
                </button>
                {(canAppendChild || canInsertSibling) && (
                  <>
                    <span className="tree-context-separator" role="separator" />
                    {canAppendChild && (
                      <button type="button" onClick={() => void onTreeContextAction("appendChild")}>
                        <span className="tree-context-item-icon tree-context-icon-append" aria-hidden="true" />
                        <span>Append Child</span>
                      </button>
                    )}
                    {canInsertSibling && (
                      <>
                        <button type="button" onClick={() => void onTreeContextAction("insertBefore")}>
                          <span className="tree-context-item-icon tree-context-icon-insert-before" aria-hidden="true" />
                          <span>Insert Before</span>
                        </button>
                        <button type="button" onClick={() => void onTreeContextAction("insertAfter")}>
                          <span className="tree-context-item-icon tree-context-icon-insert-after" aria-hidden="true" />
                          <span>Insert After</span>
                        </button>
                      </>
                    )}
                  </>
                )}
              </>
            );
          })()}
        </div>
      )}

      <main className="workspace message-like-layout">
        <aside className="panel file-panel">
          <div className="system-head">
            <h2>System</h2>
            <button
              type="button"
              className="system-download-btn"
              onClick={() => void onDownloadSelectedFile()}
              title="Download selected .qsf"
              aria-label="Download selected .qsf"
              disabled={!selectedFile || filesLoading || fileLoading}
            >
              <span className="system-download-icon" aria-hidden="true" />
            </button>
          </div>
          {files.length === 0 && <p className="empty-text">No systems found.</p>}
          <ul className="file-list">
            {files.map((file) => (
              <li key={file.name}>
                <button type="button" className={selectedFile === file.name ? "active" : ""} onClick={() => void onSelectFile(file.name)}>
                  <span className="system-file-name">
                    <img src={buildClientPath("icons/SqlSystem.png")} alt="" className="system-file-icon" />
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
            <button
              type="button"
              className="qd-module-refresh-btn"
              onClick={() => void onRefresh?.()}
              disabled={Boolean(refreshDisabled)}
              title="Refresh"
              aria-label="Refresh"
            >
              <span className="qd-module-refresh-icon" aria-hidden="true">
                <RibbonIcon label="Refresh" fallback="R" />
              </span>
            </button>
          </div>

          <Split
            className="message-editor split split-horizontal qd-split"
            direction="horizontal"
            sizes={[70, 30]}
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
                    <div
                      key={pathText || row.node.id}
                      className="tree-node"
                      style={{
                        "--tree-depth": row.depth,
                        "--tree-indent-size": `${TREE_NODE_DEPTH_INDENT_PX}px`,
                        paddingLeft: `${row.depth * TREE_NODE_DEPTH_INDENT_PX}px`,
                      }}
                    >
                      <div
                        className={`tree-label ${selected ? "active" : ""}`}
                        data-node-key={pathText}
                        onClick={() => {
                          void onSelectNode(pathText);
                        }}
                        onContextMenu={(event) => onOpenContextMenu(event, pathText)}
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
                  <div className="qd-prop-head qd-sql-head">
                    <h4>SQL Editor</h4>
                    <div className="qd-prop-head-actions">
                      <button
                        type="button"
                        className="prop-update-btn sql-dialog-open-btn"
                        onClick={() => setShowSqlDialog(true)}
                        title="Open SQL editor in dialog"
                        aria-label="Open SQL editor in dialog"
                        disabled={nodeDetail?.kind !== "sqlGroup"}
                      >
                        <span className="sql-dialog-open-icon" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  {renderSqlEditorBody()}
                </section>
              </div>
            </div>
          </Split>
        </section>
      </main>

      {showSqlDialog && nodeDetail?.kind === "sqlGroup" && (
        <div
          className="sql-editor-dialog-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sql-editor-dialog-title"
          onMouseDown={() => setShowSqlDialog(false)}
        >
          <section className="sql-editor-dialog" onMouseDown={(event) => event.stopPropagation()}>
            <div className="sql-editor-dialog-head">
              <h4 id="sql-editor-dialog-title">SQL Editor</h4>
              <button
                type="button"
                className="prop-update-btn sql-dialog-close-btn"
                onClick={() => setShowSqlDialog(false)}
                title="Close"
                aria-label="Close"
              >
                <span className="sql-dialog-close-icon" aria-hidden="true" />
              </button>
            </div>
            <div className="sql-editor-dialog-body">{renderSqlEditorBody()}</div>
          </section>
        </div>
      )}
    </>
  );
}
