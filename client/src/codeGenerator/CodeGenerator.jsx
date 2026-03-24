import { useEffect, useMemo, useRef, useState } from "react";
import { buildClientPath } from "../queryDeveloper/utils";
import "./CodeGenerator.css";

const CAN_CHECK_NODE_LEVEL = 2;
const OPTION_STORAGE_KEY = "linkon.codegen.options";
const DEFAULT_OPTIONS = {
  outputPath: "",
  creator: "",
  description: "",
  organizeUsing: "",
  generateParameter: true,
  generateFunction: true,
  internalClass: true,
};

const CODEGEN_ICON_PATHS = {
  open: buildClientPath("icons/codeGenerator/open_16x16.png"),
  generate: buildClientPath("icons/codeGenerator/Execute.png"),
  namespace: buildClientPath("icons/codeGenerator/Namespace.png"),
  group: buildClientPath("icons/codeGenerator/Group.png"),
  parameter: buildClientPath("icons/codeGenerator/Parameter.png"),
  function: buildClientPath("icons/codeGenerator/Function.png"),
  element: buildClientPath("icons/codeGenerator/Element.png"),
  attribute: buildClientPath("icons/codeGenerator/Attribute.png"),
};

const NODE_ICON_BY_KIND = {
  namespace: "namespace",
  group: "group",
  parameters: "parameter",
  function: "function",
  element: "element",
  attribute: "attribute",
};

export function CodeGenerator() {
  const fileInputRef = useRef(null);
  const searchInputRef = useRef(null);

  const [sourceFileName, setSourceFileName] = useState("");
  const [xmlText, setXmlText] = useState("");
  const [tree, setTree] = useState([]);
  const [expanded, setExpanded] = useState(() => new Set());
  const [checkedMap, setCheckedMap] = useState({});
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchIndex, setSearchIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [banner, setBanner] = useState("");
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [options, setOptions] = useState(() => {
    try {
      const raw = window.localStorage.getItem(OPTION_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_OPTIONS };
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_OPTIONS,
        ...parsed,
      };
    } catch {
      return { ...DEFAULT_OPTIONS };
    }
  });

  const treeMap = useMemo(() => {
    const map = new Map();
    const walk = (nodes, parentId = "") => {
      for (const node of nodes || []) {
        map.set(node.id, { ...node, parentId });
        walk(node.children || [], node.id);
      }
    };
    walk(tree);
    return map;
  }, [tree]);

  const selectedNode = selectedNodeId ? treeMap.get(selectedNodeId) || null : null;
  const canGenerate = Boolean(xmlText && !loading);

  useEffect(() => {
    if (!banner) return undefined;
    const timer = window.setTimeout(() => setBanner(""), 3500);
    return () => window.clearTimeout(timer);
  }, [banner]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!event.ctrlKey) return;
      const key = event.key.toLowerCase();

      if (key === "f") {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (!selectedNode) return;

      if (key === "e") {
        event.preventDefault();
        if (selectedNode.kind === "namespace" || selectedNode.kind === "group") {
          setExpanded((prev) => new Set([...prev, selectedNode.id]));
        } else {
          const next = new Set(expanded);
          expandSubTree(treeMap, selectedNode.id, next);
          setExpanded(next);
        }
      } else if (key === "l") {
        event.preventDefault();
        setExpanded((prev) => {
          const next = new Set(prev);
          next.delete(selectedNode.id);
          return next;
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded, selectedNode, treeMap]);

  const onClickOpen = () => {
    fileInputRef.current?.click();
  };

  const onFileChanged = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setLoading(true);
      setBanner("");
      const nextXmlText = await readFileTextWithBom(file);
      const response = await apiRequest("/api/code-generator/parse", {
        method: "POST",
        body: { xmlText: nextXmlText },
      });

      const nextTree = Array.isArray(response.tree) ? response.tree : [];
      setSourceFileName(file.name);
      setXmlText(nextXmlText);
      setTree(nextTree);
      setCheckedMap({});
      setSelectedNodeId(nextTree[0]?.id || "");
      setExpanded(defaultExpanded(nextTree));
    } catch (error) {
      setBanner(`Load failed: ${error.message}`);
      setSourceFileName("");
      setXmlText("");
      setTree([]);
      setCheckedMap({});
      setExpanded(new Set());
      setSelectedNodeId("");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (nodeId) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const toggleChecked = (nodeId, nextChecked) => {
    const node = treeMap.get(nodeId);
    if (!node || node.level > CAN_CHECK_NODE_LEVEL) return;

    setCheckedMap((prev) => {
      const next = { ...prev, [nodeId]: nextChecked };
      applyCheckToChildren(nodeId, nextChecked, treeMap, next);
      return next;
    });
  };

  const normalizedSearch = useMemo(() => String(searchQuery || "").trim().toLowerCase(), [searchQuery]);

  const visibleTree = useMemo(() => {
    if (!normalizedSearch) return tree;

    const filterNodes = (nodes) => {
      const result = [];
      for (const node of nodes || []) {
        const children = filterNodes(node.children || []);
        const isSelfMatched = String(node.label || "").toLowerCase().includes(normalizedSearch);
        if (isSelfMatched || children.length > 0) {
          result.push({ ...node, children });
        }
      }
      return result;
    };

    return filterNodes(tree);
  }, [normalizedSearch, tree]);

  const searchMatchIds = useMemo(() => {
    if (!normalizedSearch) return [];
    return collectMatchedNodeIds(visibleTree, normalizedSearch);
  }, [visibleTree, normalizedSearch]);

  useEffect(() => {
    if (!normalizedSearch || searchMatchIds.length === 0) {
      setSearchIndex(-1);
      return;
    }
    setSearchIndex((prev) => {
      if (prev >= 0 && prev < searchMatchIds.length) return prev;
      return 0;
    });
  }, [normalizedSearch, searchMatchIds]);

  useEffect(() => {
    if (searchIndex < 0 || searchIndex >= searchMatchIds.length) return;
    const targetId = searchMatchIds[searchIndex];
    if (!targetId) return;
    setSelectedNodeId(targetId);
    setExpanded((prev) => {
      const next = new Set(prev);
      expandAncestors(treeMap, targetId, next);
      return next;
    });
  }, [searchIndex, searchMatchIds, treeMap]);

  const onSearchPrev = () => {
    if (searchMatchIds.length === 0) return;
    setSearchIndex((prev) => (prev <= 0 ? searchMatchIds.length - 1 : prev - 1));
  };

  const onSearchNext = () => {
    if (searchMatchIds.length === 0) return;
    setSearchIndex((prev) => (prev < 0 || prev >= searchMatchIds.length - 1 ? 0 : prev + 1));
  };

  const onGenerate = async () => {
    if (!canGenerate) return;
    try {
      setGenerating(true);
      setBanner("");

      const checkedLevel2Ids = [];
      for (const [id, node] of treeMap.entries()) {
        if (node.level !== 2) continue;
        if (!["parameters", "function"].includes(node.kind)) continue;
        if (!checkedMap[id]) continue;
        checkedLevel2Ids.push(id);
      }

      const response = await apiRequest("/api/code-generator/generate", {
        method: "POST",
        body: {
          xmlText,
          checkedLevel2Ids,
          options,
        },
      });

      try {
        window.localStorage.setItem(OPTION_STORAGE_KEY, JSON.stringify(options));
      } catch {
        // ignore local storage failures
      }

      setShowOptionModal(false);
      setBanner(`Generated ${response.generatedCount || 0} files.`);

      const outputPath = String(response.outputPath || options.outputPath || "").trim();
      if (outputPath && window.confirm("Code generation completed. Open output folder?")) {
        await apiRequest("/api/code-generator/open-output", {
          method: "POST",
          body: { outputPath },
        });
      }
    } catch (error) {
      setBanner(`Generate failed: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <section className="panel codegen-panel">
      <header className="codegen-file-actions-wrap">
        <div className="codegen-file-actions">
          <button
            type="button"
            className="codegen-file-action-btn"
            onClick={onClickOpen}
            disabled={loading || generating}
            title="Open"
            aria-label="Open"
          >
            <img src={CODEGEN_ICON_PATHS.open} alt="" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="codegen-file-action-btn"
            onClick={() => setShowOptionModal(true)}
            disabled={!canGenerate || generating}
            title="Generate"
            aria-label="Generate"
          >
            <img src={CODEGEN_ICON_PATHS.generate} alt="" aria-hidden="true" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".gen"
            onChange={onFileChanged}
            className="codegen-hidden-input"
          />
        </div>

        <div className="codegen-inline-file-name" title={sourceFileName || ""}>
          {sourceFileName || ""}
        </div>
      </header>

      <div className="codegen-toolbar-splitter" />

      <section className="codegen-tree-panel">
        <div className="codegen-tree-search">
          <input
            id="codegen-search"
            ref={searchInputRef}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              if (event.shiftKey) onSearchPrev();
              else onSearchNext();
            }}
            placeholder="Search"
            disabled={!tree.length}
          />
          <button
            type="button"
            className="codegen-tree-search-icon-btn"
            onClick={onSearchPrev}
            disabled={searchMatchIds.length === 0}
            title="Previous result"
            aria-label="Previous result"
          >
            <span className="codegen-tree-search-icon codegen-tree-search-icon-up" />
          </button>
          <button
            type="button"
            className="codegen-tree-search-icon-btn"
            onClick={onSearchNext}
            disabled={searchMatchIds.length === 0}
            title="Next result"
            aria-label="Next result"
          >
            <span className="codegen-tree-search-icon codegen-tree-search-icon-down" />
          </button>
          <span className="codegen-tree-search-count">
            {searchMatchIds.length > 0 && searchIndex >= 0 ? `${searchIndex + 1}/${searchMatchIds.length}` : "0/0"}
          </span>
        </div>

        <div className="codegen-tree-scroll">
          {visibleTree.length === 0 ? null : (
            <ul className="codegen-tree">
              {visibleTree.map((node) => (
                <TreeNodeRow
                  key={node.id}
                  node={node}
                  selectedNodeId={selectedNodeId}
                  checkedMap={checkedMap}
                  expanded={expanded}
                  onSelectNode={setSelectedNodeId}
                  onToggleExpanded={toggleExpanded}
                  onToggleChecked={toggleChecked}
                />
              ))}
            </ul>
          )}
        </div>
      </section>

      {banner && <div className="codegen-banner">{banner}</div>}

      {showOptionModal && (
        <div className="codegen-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="codegen-option-title">
          <section className="codegen-modal">
            <h3 id="codegen-option-title">Code Generate Option</h3>

            <label>
              Output Path
              <input
                type="text"
                value={options.outputPath}
                onChange={(event) => setOptions((prev) => ({ ...prev, outputPath: event.target.value }))}
              />
            </label>

            <label>
              Creator
              <textarea
                value={options.creator}
                onChange={(event) => setOptions((prev) => ({ ...prev, creator: event.target.value }))}
                rows={2}
              />
            </label>

            <label>
              Description
              <textarea
                value={options.description}
                onChange={(event) => setOptions((prev) => ({ ...prev, description: event.target.value }))}
                rows={2}
              />
            </label>

            <label>
              Organize Using
              <textarea
                value={options.organizeUsing}
                onChange={(event) => setOptions((prev) => ({ ...prev, organizeUsing: event.target.value }))}
                rows={2}
              />
            </label>

            <div className="codegen-option-checks">
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(options.generateParameter)}
                  onChange={(event) => setOptions((prev) => ({ ...prev, generateParameter: event.target.checked }))}
                />
                Generate Parameter
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={Boolean(options.generateFunction)}
                  onChange={(event) => setOptions((prev) => ({ ...prev, generateFunction: event.target.checked }))}
                />
                Generate Function
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={Boolean(options.internalClass)}
                  onChange={(event) => setOptions((prev) => ({ ...prev, internalClass: event.target.checked }))}
                />
                Internal Class
              </label>
            </div>

            <div className="codegen-modal-actions">
              <button
                type="button"
                className="primary-btn"
                disabled={generating}
                onClick={() => {
                  void onGenerate();
                }}
              >
                {generating ? "Generating..." : "OK"}
              </button>
              <button type="button" disabled={generating} onClick={() => setShowOptionModal(false)}>
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function TreeNodeRow({
  node,
  selectedNodeId,
  checkedMap,
  expanded,
  onSelectNode,
  onToggleExpanded,
  onToggleChecked,
}) {
  const hasChildren = (node.children || []).length > 0;
  const isExpanded = expanded.has(node.id);
  const checked = Boolean(checkedMap[node.id]);
  const canCheck = Boolean(node.checkable && node.level <= CAN_CHECK_NODE_LEVEL);
  const iconKey = NODE_ICON_BY_KIND[node.kind] || "element";
  const iconSrc = CODEGEN_ICON_PATHS[iconKey];

  return (
    <li className="codegen-tree-item">
      <div
        className={`codegen-tree-row ${selectedNodeId === node.id ? "selected" : ""}`}
        style={{ "--node-depth": node.level }}
        onClick={() => onSelectNode(node.id)}
      >
        <span className="codegen-tree-expander-slot">
          {hasChildren ? (
            <button
              type="button"
              className="codegen-tree-expander"
              onClick={(event) => {
                event.stopPropagation();
                onToggleExpanded(node.id);
              }}
              aria-label={isExpanded ? "Collapse node" : "Expand node"}
            >
              {isExpanded ? "▾" : "▸"}
            </button>
          ) : (
            <span className="codegen-tree-expander-placeholder" />
          )}
        </span>

        <span className="codegen-tree-check-slot">
          {canCheck ? (
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => {
                event.stopPropagation();
                onToggleChecked(node.id, event.target.checked);
              }}
            />
          ) : (
            <span className="codegen-tree-check-placeholder" />
          )}
        </span>

        <span className="codegen-tree-kind-slot">
          <img src={iconSrc} alt="" className="codegen-tree-kind-icon" aria-hidden="true" />
        </span>

        <span className="codegen-tree-label">{node.label}</span>
      </div>

      {hasChildren && isExpanded && (
        <ul className="codegen-tree">
          {node.children.map((childNode) => (
            <TreeNodeRow
              key={childNode.id}
              node={childNode}
              selectedNodeId={selectedNodeId}
              checkedMap={checkedMap}
              expanded={expanded}
              onSelectNode={onSelectNode}
              onToggleExpanded={onToggleExpanded}
              onToggleChecked={onToggleChecked}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function applyCheckToChildren(nodeId, nextChecked, treeMap, nextMap) {
  const node = treeMap.get(nodeId);
  if (!node) return;

  for (const candidate of treeMap.values()) {
    if (candidate.parentId !== node.id) continue;
    if (candidate.level > CAN_CHECK_NODE_LEVEL) continue;
    nextMap[candidate.id] = nextChecked;
    applyCheckToChildren(candidate.id, nextChecked, treeMap, nextMap);
  }
}

function expandSubTree(treeMap, nodeId, expandedSet) {
  expandedSet.add(nodeId);
  for (const candidate of treeMap.values()) {
    if (candidate.parentId !== nodeId) continue;
    expandSubTree(treeMap, candidate.id, expandedSet);
  }
}

function defaultExpanded(tree) {
  const expanded = new Set();
  const walk = (nodes) => {
    for (const node of nodes || []) {
      if (node.level <= 1) expanded.add(node.id);
      walk(node.children || []);
    }
  };
  walk(tree);
  return expanded;
}

function collectMatchedNodeIds(nodes, query) {
  const matches = [];
  const walk = (items) => {
    for (const node of items || []) {
      const text = String(node.label || "").toLowerCase();
      if (text.includes(query)) matches.push(node.id);
      walk(node.children || []);
    }
  };
  walk(nodes);
  return matches;
}

function expandAncestors(treeMap, nodeId, expandedSet) {
  let cursor = treeMap.get(nodeId);
  while (cursor && cursor.parentId) {
    expandedSet.add(cursor.parentId);
    cursor = treeMap.get(cursor.parentId);
  }
}

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
    throw new Error(payload?.message || `Request failed: ${response.status}`);
  }
  return payload;
}

function resolveRequestUrl(url) {
  const text = String(url || "").trim();
  if (!text) return text;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) return text;
  return buildClientPath(text);
}

async function readFileTextWithBom(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // UTF-16 LE BOM
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes);
  }

  // UTF-16 BE BOM
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    const swapped = new Uint8Array(bytes.length);
    for (let index = 0; index + 1 < bytes.length; index += 2) {
      swapped[index] = bytes[index + 1];
      swapped[index + 1] = bytes[index];
    }
    return new TextDecoder("utf-16le").decode(swapped);
  }

  return new TextDecoder("utf-8").decode(bytes);
}
