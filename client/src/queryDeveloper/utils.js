export function isAlwaysReadOnlyProperty(prop) {
  if (Boolean(prop?.readOnly)) return true;
  const key = String(prop?.key || "").toLowerCase();
  const label = String(prop?.label || "").toLowerCase();
  const category = String(prop?.category || "").toLowerCase();
  const isRelationGroup = category.includes("relation");
  return isRelationGroup || key === "type" || key === "systemkey" || key === "sequenceid" || label === "type" || label === "id";
}

export function normalizeBoolValue(value) {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "").trim().toLowerCase();
  return ["true", "t", "1", "yes", "y"].includes(text);
}

export function boolToSelectValue(value) {
  return normalizeBoolValue(value) ? "true" : "false";
}

export function getSqlProviderMonogram(provider) {
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

export function getSqlProviderLogoSrc(provider) {
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

export function applySavedPropertyToDetail(detail, pathText, key, value) {
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

export function applySavedPropertyToTree(root, pathText, key, value) {
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

export function mapTreeNodeByPath(root, pathText, updater) {
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

export function formatQueryDeveloperLabel(name, description) {
  return `${String(name || "")} Desc=[${String(description || "")}]`;
}

export function buildTreeMap(root) {
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

export function flattenVisible(root, expanded) {
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

export function defaultExpanded(root, maxDepth) {
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

export function selectPath(treeMap, preferredPath) {
  if (!treeMap.size) return "";
  if (preferredPath && treeMap.has(preferredPath)) return preferredPath;
  for (const [pathText, node] of treeMap.entries()) {
    if (node.kind !== "root") return pathText;
  }
  return treeMap.keys().next().value || "";
}

export function findTreeMatches(root, keyword, caseSensitive = false) {
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

export function getQueryDeveloperTreeIcon(kind) {
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

export function buildTreeClipboardKey(kind) {
  return `QBEX_${toClipboardObjectType(kind)}`;
}

function toClipboardObjectType(kind) {
  switch (String(kind || "").toLowerCase()) {
    case "system":
      return "System";
    case "module":
      return "Module";
    case "function":
      return "Function";
    case "sqlgroup":
      return "SqlGroup";
    case "root":
      return "Root";
    default: {
      const text = String(kind || "").trim();
      if (!text) return "Unknown";
      return `${text.slice(0, 1).toUpperCase()}${text.slice(1)}`;
    }
  }
}

export function scrollTreeNodeIntoView(container, key) {
  if (!container || !key) return;
  const labels = container.querySelectorAll(".tree-label[data-node-key]");
  for (const label of labels) {
    if (label.dataset.nodeKey !== key) continue;
    label.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    break;
  }
}

export function expandPath(base, pathText) {
  const next = new Set(base);
  if (!pathText || pathText === "root") return next;
  const parts = pathText.split(".");
  for (let i = 1; i <= parts.length; i += 1) {
    next.add(parts.slice(0, i).join("."));
  }
  return next;
}

export function groupProperties(properties) {
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

export function parseDownloadFileName(contentDisposition) {
  const header = String(contentDisposition || "");
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      // ignore malformed encoding
    }
  }
  const quotedMatch = header.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) return quotedMatch[1];
  const plainMatch = header.match(/filename=([^;]+)/i);
  if (plainMatch?.[1]) return plainMatch[1].trim();
  return "";
}

export function buildQsfDownloadName(systemName, fallbackName) {
  const fallbackBase = String(fallbackName || "")
    .replace(/\.qsf$/i, "")
    .trim();
  const preferredBase = String(systemName || "").trim();
  const rawBase = preferredBase || fallbackBase || "download";
  const sanitizedBase = rawBase
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim();
  const finalBase = sanitizedBase || fallbackBase || "download";
  return /\.qsf$/i.test(finalBase) ? finalBase : `${finalBase}.qsf`;
}
