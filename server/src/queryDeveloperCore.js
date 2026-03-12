// Query Developer core logic (client-collaboration split).

const SYSTEM_SQL_PROVIDERS = Object.freeze([
  "MsSql",
  "Oracle",
  "MySql",
  "MariaDb",
  "PostgreSql",
  "Machbase",
  "OleDb",
  "Influx",
  "MongoDb",
  "SQLite",
]);
const QUERY_SQL_PROVIDERS = Object.freeze(SYSTEM_SQL_PROVIDERS.filter((provider) => provider !== "MongoDb"));
const QUERY_DEVELOPER_KIND_BY_TAG = Object.freeze({
  S: "system",
  M: "module",
  F: "function",
  SG: "sqlGroup",
});
const QUERY_DEVELOPER_CHILD_TAGS = Object.freeze({
  Q: ["S"],
  S: ["M"],
  M: ["F"],
  F: ["SG"],
  SG: [],
});
const QUERY_PROVIDER_ATTR_MAP = Object.freeze({
  MSQ: "MsSql",
  ORQ: "Oracle",
  MYQ: "MySql",
  MDQ: "MariaDb",
  PGQ: "PostgreSql",
  MBQ: "Machbase",
  ODQ: "OleDb",
  IFQ: "Influx",
  SQQ: "SQLite",
});


function buildQueryDeveloperTree(rootNode, fileName, factoryName) {
  const rootLabel = String(factoryName || "").trim() || String(fileName || "").trim() || "Factory";
  const childRefs = collectQueryChildRefs(rootNode, [], QUERY_DEVELOPER_CHILD_TAGS.Q);
  return {
    id: "qd:root",
    kind: "root",
    tag: rootNode.tagName,
    label: rootLabel,
    path: `/${rootNode.tagName}[1]`,
    locator: {
      elementPath: [],
      pathText: "root",
    },
    children: childRefs.map((ref) => buildQueryDeveloperTreeNode(rootNode, ref.elementNode, ref.elementPath)),
  };
}

function buildQueryDeveloperTreeNode(rootNode, elementNode, elementPath) {
  const kind = QUERY_DEVELOPER_KIND_BY_TAG[elementNode.tagName];
  if (!kind) {
    throw new Error(`Unsupported tag for Query Developer tree: ${elementNode.tagName}`);
  }

  const nodeInfo = readQueryDeveloperNodeInfo(kind, elementNode);
  const childTags = QUERY_DEVELOPER_CHILD_TAGS[elementNode.tagName] || [];
  const childRefs = collectQueryChildRefs(elementNode, elementPath, childTags);

  return {
    id: `qd:${kind}:${elementPathToText(elementPath)}`,
    kind,
    tag: elementNode.tagName,
    label: buildQueryDeveloperLabel(nodeInfo.name, nodeInfo.description),
    name: nodeInfo.name,
    description: nodeInfo.description,
    sequenceId: nodeInfo.sequenceId,
    systemKey: nodeInfo.systemKey || "",
    path: buildPathLabel(rootNode, elementPath),
    locator: {
      elementPath,
      pathText: elementPathToText(elementPath),
    },
    children: childRefs.map((ref) => buildQueryDeveloperTreeNode(rootNode, ref.elementNode, ref.elementPath)),
  };
}

function collectQueryChildRefs(parentNode, parentPath, allowedTags) {
  const tags = new Set((allowedTags || []).map((value) => String(value || "").trim()).filter(Boolean));
  const refs = [];
  getElementChildren(parentNode).forEach((childNode, index) => {
    if (!tags.has(childNode.tagName)) return;
    refs.push({
      elementNode: childNode,
      elementPath: [...parentPath, index],
    });
  });
  return refs;
}

function buildQueryDeveloperLabel(name, description) {
  return `${String(name || "")} Desc=[${String(description || "")}]`;
}

function parseElementPathText(pathText) {
  const text = String(pathText || "").trim();
  if (!text || text.toLowerCase() === "root") return [];

  const split = text.split(".");
  const path = split.map((chunk) => Number(chunk));
  if (path.some((index) => !Number.isInteger(index) || index < 0)) {
    throw new Error("Invalid node path.");
  }
  return path;
}

function elementPathToText(elementPath) {
  if (!Array.isArray(elementPath) || elementPath.length === 0) return "root";
  return elementPath.join(".");
}

function normalizeElementLocator(rawLocator) {
  if (rawLocator == null) {
    throw new Error("Missing node locator.");
  }

  if (Array.isArray(rawLocator)) {
    return normalizeElementPath(rawLocator);
  }

  if (typeof rawLocator === "string") {
    return parseElementPathText(rawLocator);
  }

  if (typeof rawLocator === "object") {
    if (Array.isArray(rawLocator.elementPath)) {
      return normalizeElementPath(rawLocator.elementPath);
    }
    if (rawLocator.pathText != null) {
      return parseElementPathText(rawLocator.pathText);
    }
  }

  throw new Error("Invalid node locator.");
}

function normalizeElementPath(rawPath) {
  const elementPath = rawPath.map((value) => Number(value));
  for (const index of elementPath) {
    if (!Number.isInteger(index) || index < 0) {
      throw new Error("Invalid locator element path.");
    }
  }
  return elementPath;
}

function buildQueryDeveloperNodeDetail(rootNode, elementPath) {
  const path = normalizeElementPath(elementPath);
  if (path.length === 0) {
    return {
      id: "qd:root",
      kind: "root",
      tag: rootNode.tagName,
      label: rootNode.tagName,
      path: `/${rootNode.tagName}[1]`,
      locator: {
        elementPath: [],
        pathText: "root",
      },
      properties: [],
      sqlQueries: null,
    };
  }

  const targetNode = findElementByPath(rootNode, path);
  const kind = QUERY_DEVELOPER_KIND_BY_TAG[targetNode.tagName];
  if (!kind) {
    throw new Error(`Unsupported node type: ${targetNode.tagName}`);
  }

  const relation = resolveQueryDeveloperRelation(rootNode, path);
  const current = readQueryDeveloperNodeInfo(kind, targetNode);
  const baseDetail = {
    id: `qd:${kind}:${elementPathToText(path)}`,
    kind,
    tag: targetNode.tagName,
    label: buildQueryDeveloperLabel(current.name, current.description),
    path: buildPathLabel(rootNode, path),
    locator: {
      elementPath: path,
      pathText: elementPathToText(path),
    },
  };

  if (kind === "system") {
    return {
      ...baseDetail,
      properties: [
        makeProperty("[01] General", "Type", "Type", "text", "System", true),
        makeProperty("[01] General", "SystemKey", "ID", "text", current.systemKey, true),
        makeProperty("[01] General", "System", "Name", "text", current.name, false),
        makeProperty("[01] General", "Description", "Description", "text", current.description, false),
        makeProperty(
          "[02] Provider",
          "SystemSqlProvider",
          "System Sql Provider",
          "enum",
          normalizeSystemSqlProvider(current.standardDatabase),
          false,
          SYSTEM_SQL_PROVIDERS,
        ),
      ],
      sqlQueries: null,
    };
  }

  if (kind === "module") {
    return {
      ...baseDetail,
      properties: [
        makeProperty("[01] General", "Type", "Type", "text", "Module", true),
        makeProperty("[01] General", "SequenceId", "ID", "text", current.sequenceId, true),
        makeProperty("[01] General", "Module", "Module", "text", current.name, false),
        makeProperty("[01] General", "Description", "Description", "text", current.description, false),
        makeProperty("[02] Relation", "System", "Name", "text", relation.systemName, true),
      ],
      sqlQueries: null,
    };
  }

  if (kind === "function") {
    return {
      ...baseDetail,
      properties: [
        makeProperty("[01] General", "Type", "Type", "text", "Function", true),
        makeProperty("[01] General", "SequenceId", "ID", "text", current.sequenceId, true),
        makeProperty("[01] General", "Function", "Function", "text", current.name, false),
        makeProperty("[01] General", "Description", "Description", "text", current.description, false),
        makeProperty("[02] Relation", "System", "Name", "text", relation.systemName, true),
        makeProperty("[02] Relation", "Module", "Module", "text", relation.moduleName, true),
      ],
      sqlQueries: null,
    };
  }

  if (kind === "sqlGroup") {
    const sqlInfo = readSqlGroupQueries(targetNode);
    return {
      ...baseDetail,
      properties: [
        makeProperty("[01] General", "Type", "Type", "text", "SQL Code", true),
        makeProperty("[01] General", "SequenceId", "ID", "text", current.sequenceId, true),
        makeProperty("[01] General", "SqlGroup", "Name", "text", current.name, false),
        makeProperty("[01] General", "Description", "Description", "text", current.description, false),
        makeProperty("[01] General", "IsProcedure", "Is Procedure", "bool", normalizeBoolFlag(current.isProcedure), false),
        makeProperty("[02] Relation", "System", "System", "text", relation.systemName, true),
        makeProperty("[02] Relation", "Module", "Module", "text", relation.moduleName, true),
        makeProperty("[02] Relation", "Function", "Function", "text", relation.functionName, true),
        makeProperty(
          "[03] Migration",
          "UsedMigration",
          "Used",
          "enum",
          normalizeYesNo(current.usedMigration, "Yes"),
          false,
          ["Yes", "No"],
        ),
      ],
      sqlQueries: sqlInfo,
    };
  }

  throw new Error(`Unsupported node type: ${targetNode.tagName}`);
}

function makeProperty(category, key, label, type, value, readOnly, options = null) {
  return {
    category,
    key,
    label,
    type,
    value,
    readOnly: Boolean(readOnly),
    options: options || undefined,
  };
}

function resolveQueryDeveloperRelation(rootNode, elementPath) {
  let current = rootNode;
  const relation = {
    systemName: "",
    systemKey: "",
    moduleName: "",
    functionName: "",
  };

  for (const index of elementPath) {
    const children = getElementChildren(current);
    if (index < 0 || index >= children.length) {
      throw new Error("Invalid locator path.");
    }
    current = children[index];
    if (current.tagName === "S") {
      relation.systemName = readAttribute(current, "N", "");
      relation.systemKey = readAttribute(current, "_RK", "");
    } else if (current.tagName === "M") {
      relation.moduleName = readAttribute(current, "N", "");
    } else if (current.tagName === "F") {
      relation.functionName = readAttribute(current, "N", "");
    }
  }

  return relation;
}

function readQueryDeveloperNodeInfo(kind, elementNode) {
  const base = {
    sequenceId: readAttribute(elementNode, "_S", ""),
    name: readAttribute(elementNode, "N", ""),
    description: readAttribute(elementNode, "D", ""),
    systemKey: "",
    standardDatabase: "MsSql",
    usedMigration: "Yes",
    isProcedure: false,
  };

  if (kind === "system") {
    base.systemKey = readAttribute(elementNode, "_RK", "");
    base.standardDatabase = normalizeSystemSqlProvider(readAttribute(elementNode, "B", "MsSql"));
    return base;
  }

  if (kind === "sqlGroup") {
    base.usedMigration = normalizeYesNo(readAttribute(elementNode, "UMG", "Yes"), "Yes");
    base.isProcedure = normalizeBoolFlag(readAttribute(elementNode, "IPC", "F"));
    return base;
  }

  return base;
}

function applyQueryDeveloperNodeUpdate(documentNode, elementPath, payload) {
  const rootNode = documentNode?.documentElement;
  if (!rootNode || rootNode.tagName !== "Q") {
    throw new Error("Invalid qsf xml format.");
  }

  const path = normalizeElementPath(elementPath);
  if (path.length === 0) {
    throw new Error("Root node cannot be updated.");
  }

  const targetNode = findElementByPath(rootNode, path);
  const kind = QUERY_DEVELOPER_KIND_BY_TAG[targetNode.tagName];
  if (!kind) {
    throw new Error(`Unsupported node type: ${targetNode.tagName}`);
  }

  const updates = payload?.updates && typeof payload.updates === "object" ? payload.updates : {};
  const sqlQueries = payload?.sqlQueries && typeof payload.sqlQueries === "object" ? payload.sqlQueries : null;
  const changed = [];

  if (kind === "system") {
    if (updates.System !== undefined) setAttributeIfChanged(targetNode, "N", updates.System, changed, "System");
    if (updates.Name !== undefined) setAttributeIfChanged(targetNode, "N", updates.Name, changed, "System");
    if (updates.Description !== undefined) {
      setAttributeIfChanged(targetNode, "D", updates.Description, changed, "Description");
    }
    if (updates.SystemSqlProvider !== undefined || updates.StandardDatabase !== undefined) {
      const provider = normalizeSystemSqlProvider(
        updates.SystemSqlProvider !== undefined ? updates.SystemSqlProvider : updates.StandardDatabase,
      );
      setAttributeIfChanged(targetNode, "B", provider, changed, "SystemSqlProvider");
    }
    return { changed };
  }

  if (kind === "module") {
    if (updates.Module !== undefined) setAttributeIfChanged(targetNode, "N", updates.Module, changed, "Module");
    if (updates.Name !== undefined) setAttributeIfChanged(targetNode, "N", updates.Name, changed, "Module");
    if (updates.Description !== undefined) {
      setAttributeIfChanged(targetNode, "D", updates.Description, changed, "Description");
    }
    return { changed };
  }

  if (kind === "function") {
    if (updates.Function !== undefined) setAttributeIfChanged(targetNode, "N", updates.Function, changed, "Function");
    if (updates.Name !== undefined) setAttributeIfChanged(targetNode, "N", updates.Name, changed, "Function");
    if (updates.Description !== undefined) {
      setAttributeIfChanged(targetNode, "D", updates.Description, changed, "Description");
    }
    return { changed };
  }

  if (kind === "sqlGroup") {
    if (updates.SqlGroup !== undefined) setAttributeIfChanged(targetNode, "N", updates.SqlGroup, changed, "SqlGroup");
    if (updates.Name !== undefined) setAttributeIfChanged(targetNode, "N", updates.Name, changed, "SqlGroup");
    if (updates.Description !== undefined) {
      setAttributeIfChanged(targetNode, "D", updates.Description, changed, "Description");
    }
    if (updates.UsedMigration !== undefined) {
      setAttributeIfChanged(
        targetNode,
        "UMG",
        normalizeYesNo(updates.UsedMigration, "Yes"),
        changed,
        "UsedMigration",
      );
    }
    if (updates.IsProcedure !== undefined) {
      setAttributeIfChanged(
        targetNode,
        "IPC",
        normalizeBoolFlag(updates.IsProcedure) ? "T" : "F",
        changed,
        "IsProcedure",
      );
    }
    if (sqlQueries) {
      setSqlGroupQueries(targetNode, sqlQueries, changed);
    }
    return { changed };
  }

  throw new Error(`Unsupported node type: ${targetNode.tagName}`);
}

function appendDefaultModuleToSystem(documentNode, targetPath) {
  return appendDefaultChildNode(documentNode, targetPath, {
    parentTag: "S",
    childTag: "M",
    defaultName: "DefaultModule",
    invalidTargetMessage: "Append Child is allowed only on a System node.",
  });
}

function appendDefaultFunctionToModule(documentNode, targetPath) {
  return appendDefaultChildNode(documentNode, targetPath, {
    parentTag: "M",
    childTag: "F",
    defaultName: "DefaultFunction",
    invalidTargetMessage: "Append Child is allowed only on a Module node.",
  });
}

function appendDefaultSqlGroupToFunction(documentNode, targetPath) {
  return appendDefaultChildNode(documentNode, targetPath, {
    parentTag: "F",
    childTag: "SG",
    defaultName: "DefaultSqlCode",
    invalidTargetMessage: "Append Child is allowed only on a Function node.",
    extraAttributes: {
      UMG: "Yes",
      IPC: "F",
    },
  });
}

function appendDefaultChildNode(documentNode, targetPath, options) {
  const rootNode = documentNode?.documentElement;
  if (!rootNode || rootNode.tagName !== "Q") {
    throw new Error("Invalid qsf xml format.");
  }

  const path = normalizeElementPath(targetPath);
  if (!path.length) {
    throw new Error("Target node is required.");
  }

  const parentTag = String(options?.parentTag || "").trim();
  const childTag = String(options?.childTag || "").trim();
  const defaultName = String(options?.defaultName || "").trim();
  const invalidTargetMessage = String(options?.invalidTargetMessage || "Append Child target is invalid.");
  const extraAttributes = options?.extraAttributes && typeof options.extraAttributes === "object"
    ? options.extraAttributes
    : {};
  if (!parentTag || !childTag) {
    throw new Error("Append Child configuration is invalid.");
  }

  const parentNode = findElementByPath(rootNode, path);
  if (parentNode.tagName !== parentTag) {
    throw new Error(invalidTargetMessage);
  }

  const allowedTags = QUERY_DEVELOPER_CHILD_TAGS[parentTag] || [];
  if (!allowedTags.includes(childTag)) {
    throw new Error("Append Child is not allowed for this node.");
  }

  const childNode = createDefaultNodeByTag(documentNode, rootNode, childTag, {
    defaultName,
    extraAttributes,
  });
  parentNode.appendChild(childNode);

  const childIndex = getElementChildren(parentNode).length - 1;
  return {
    selectedPath: elementPathToText([...path, childIndex]),
    changed: ["AppendChild"],
  };
}

function insertBeforeDefaultSiblingNode(documentNode, targetPath) {
  return insertDefaultSiblingNode(documentNode, targetPath, "before");
}

function insertAfterDefaultSiblingNode(documentNode, targetPath) {
  return insertDefaultSiblingNode(documentNode, targetPath, "after");
}

function insertDefaultSiblingNode(documentNode, targetPath, direction) {
  const rootNode = documentNode?.documentElement;
  if (!rootNode || rootNode.tagName !== "Q") {
    throw new Error("Invalid qsf xml format.");
  }

  const path = normalizeElementPath(targetPath);
  if (!path.length) {
    throw new Error("Target node is required.");
  }

  const targetNode = findElementByPath(rootNode, path);
  const targetTag = String(targetNode.tagName || "").trim();
  if (!["M", "F", "SG"].includes(targetTag)) {
    throw new Error("Insert Before/After is allowed only for child nodes under System.");
  }

  const parentPath = path.slice(0, -1);
  const parentNode = findElementByPath(rootNode, parentPath);
  const siblingAllowedTags = QUERY_DEVELOPER_CHILD_TAGS[parentNode.tagName] || [];
  if (!siblingAllowedTags.includes(targetTag)) {
    throw new Error("Insert Before/After is not allowed for this node.");
  }

  const siblings = getElementChildren(parentNode);
  const targetIndex = path[path.length - 1];
  if (targetIndex < 0 || targetIndex >= siblings.length) {
    throw new Error("Invalid locator path.");
  }

  const normalizedDirection = String(direction || "").trim().toLowerCase();
  const insertIndex = normalizedDirection === "before" ? targetIndex : targetIndex + 1;
  if (!["before", "after"].includes(normalizedDirection)) {
    throw new Error("Invalid insert direction.");
  }

  const insertedNode = createDefaultNodeByTag(documentNode, rootNode, targetTag);
  parentNode.insertBefore(insertedNode, siblings[insertIndex] || null);

  return {
    selectedPath: elementPathToText([...parentPath, insertIndex]),
    changed: [normalizedDirection === "before" ? "InsertBefore" : "InsertAfter"],
  };
}

function createDefaultNodeByTag(documentNode, rootNode, tagName, overrides = {}) {
  const tag = String(tagName || "").trim();
  if (!tag) {
    throw new Error("Invalid node tag.");
  }

  const { defaultName, extraAttributes } = resolveDefaultNodeTemplate(tag, overrides);
  const node = documentNode.createElement(tag);
  node.setAttribute("_S", allocateNextQuerySequence(rootNode));
  if (defaultName) {
    node.setAttribute("N", defaultName);
  }
  for (const [attrName, attrValue] of Object.entries(extraAttributes)) {
    const key = String(attrName || "").trim();
    if (!key) continue;
    node.setAttribute(key, String(attrValue ?? ""));
  }
  return node;
}

function resolveDefaultNodeTemplate(tagName, overrides = {}) {
  const tag = String(tagName || "").trim();
  const defaultTemplate = {
    defaultName: "",
    extraAttributes: {},
  };

  if (tag === "M") {
    defaultTemplate.defaultName = "DefaultModule";
  } else if (tag === "F") {
    defaultTemplate.defaultName = "DefaultFunction";
  } else if (tag === "SG") {
    defaultTemplate.defaultName = "DefaultSqlCode";
    defaultTemplate.extraAttributes = { UMG: "Yes", IPC: "F" };
  }

  const mergedExtra = {
    ...(defaultTemplate.extraAttributes || {}),
    ...(overrides?.extraAttributes && typeof overrides.extraAttributes === "object" ? overrides.extraAttributes : {}),
  };
  const mergedName = String(overrides?.defaultName ?? defaultTemplate.defaultName ?? "").trim();
  return {
    defaultName: mergedName,
    extraAttributes: mergedExtra,
  };
}

function deleteQueryDeveloperNode(documentNode, targetPath) {
  const rootNode = documentNode?.documentElement;
  if (!rootNode || rootNode.tagName !== "Q") {
    throw new Error("Invalid qsf xml format.");
  }

  const path = normalizeElementPath(targetPath);
  if (!path.length) {
    throw new Error("Root node cannot be deleted.");
  }

  const parentPath = path.slice(0, -1);
  const childIndex = path[path.length - 1];
  const parentNode = findElementByPath(rootNode, parentPath);
  const children = getElementChildren(parentNode);
  if (childIndex < 0 || childIndex >= children.length) {
    throw new Error("Invalid locator path.");
  }

  const targetNode = children[childIndex];
  if ((getElementChildren(targetNode) || []).length > 0) {
    throw new Error("Delete is disabled when the node has child items.");
  }

  parentNode.removeChild(targetNode);
  const remainingChildren = getElementChildren(parentNode);
  const hasPreviousSibling = childIndex - 1 >= 0 && childIndex - 1 < remainingChildren.length;
  const nextSelectedPath = hasPreviousSibling
    ? elementPathToText([...parentPath, childIndex - 1])
    : elementPathToText(parentPath);
  return {
    selectedPath: nextSelectedPath,
    changed: ["DeleteNode"],
  };
}

function pasteQueryDeveloperNode(documentNode, sourcePayload, targetPath) {
  const rootNode = documentNode?.documentElement;
  if (!rootNode || rootNode.tagName !== "Q") {
    throw new Error("Invalid qsf xml format.");
  }

  const target = normalizeElementPath(targetPath);
  const sourceXmlElement = sourcePayload?.sourceXmlElement;
  const sourcePath = sourcePayload?.sourcePath;

  let sourceNode;
  if (sourceXmlElement) {
    if (sourceXmlElement.nodeType !== 1) {
      throw new Error("Source xml must be an element node.");
    }
    sourceNode = sourceXmlElement;
  } else {
    const source = normalizeElementPath(sourcePath);
    if (!source.length) {
      throw new Error("Root node cannot be copied.");
    }
    sourceNode = findElementByPath(rootNode, source);
  }

  const targetNode = findElementByPath(rootNode, target);

  const clonedNode = cloneNodeIntoDocument(documentNode, sourceNode);
  renumberSequenceAttributes(rootNode, clonedNode);
  const sourceTag = String(sourceNode.tagName || "").trim();
  const targetTag = String(targetNode.tagName || "").trim();

  if (sourceTag === targetTag) {
    if (!target.length) {
      throw new Error("Root node cannot be pasted as sibling.");
    }
    const parentPath = target.slice(0, -1);
    const parentNode = findElementByPath(rootNode, parentPath);
    const siblingAllowedTags = QUERY_DEVELOPER_CHILD_TAGS[parentNode.tagName] || [];
    if (!siblingAllowedTags.includes(sourceTag)) {
      throw new Error("Paste is not allowed for this target node.");
    }

    const siblings = getElementChildren(parentNode);
    const targetIndex = target[target.length - 1];
    if (targetIndex < 0 || targetIndex >= siblings.length) {
      throw new Error("Invalid locator path.");
    }

    const insertIndex = targetIndex + 1;
    parentNode.insertBefore(clonedNode, siblings[insertIndex] || null);
    return {
      selectedPath: elementPathToText([...parentPath, insertIndex]),
      changed: ["PasteNode"],
    };
  }

  const childAllowedTags = QUERY_DEVELOPER_CHILD_TAGS[targetTag] || [];
  if (!childAllowedTags.includes(sourceTag)) {
    throw new Error("Paste is not allowed for this target node.");
  }

  targetNode.appendChild(clonedNode);
  const childIndex = getElementChildren(targetNode).length - 1;
  return {
    selectedPath: elementPathToText([...target, childIndex]),
    changed: ["PasteNode"],
  };
}

function cloneNodeIntoDocument(documentNode, sourceNode) {
  if (!documentNode || !sourceNode) {
    throw new Error("Invalid source node.");
  }

  if (sourceNode.nodeType === 1) {
    const nextElement = documentNode.createElement(sourceNode.tagName);
    for (const attr of Array.from(sourceNode.attributes || [])) {
      const attrName = String(attr?.name || "").trim();
      if (!attrName) continue;
      nextElement.setAttribute(attrName, String(attr?.value ?? ""));
    }

    for (const childNode of Array.from(sourceNode.childNodes || [])) {
      const nextChild = cloneNodeIntoDocument(documentNode, childNode);
      if (!nextChild) continue;
      nextElement.appendChild(nextChild);
    }

    return nextElement;
  }

  if (sourceNode.nodeType === 3) {
    return documentNode.createTextNode(String(sourceNode.data || ""));
  }

  if (sourceNode.nodeType === 4) {
    if (typeof documentNode.createCDATASection === "function") {
      return documentNode.createCDATASection(String(sourceNode.data || ""));
    }
    return documentNode.createTextNode(String(sourceNode.data || ""));
  }

  return null;
}

function renumberSequenceAttributes(rootNode, node) {
  if (!node || node.nodeType !== 1) return;
  if (node.hasAttribute("_S")) {
    node.setAttribute("_S", allocateNextQuerySequence(rootNode));
  }

  for (const childNode of getElementChildren(node)) {
    renumberSequenceAttributes(rootNode, childNode);
  }
}

function allocateNextQuerySequence(rootNode) {
  const current = Number.parseInt(readAttribute(rootNode, "QS", "0"), 10);
  const safeCurrent = Number.isFinite(current) ? current : 0;
  const nextValue = safeCurrent + 1;
  rootNode.setAttribute("QS", String(nextValue));
  return String(nextValue);
}

function setAttributeIfChanged(elementNode, attributeName, nextValue, changed, changedKey) {
  const normalized = String(nextValue ?? "");
  const before = String(elementNode.getAttribute(attributeName) ?? "");
  if (before === normalized) return;
  elementNode.setAttribute(attributeName, normalized);
  if (changedKey) changed.push(changedKey);
}

function readSqlGroupQueries(sqlGroupNode) {
  const values = {};
  QUERY_SQL_PROVIDERS.forEach((provider) => {
    values[provider] = "";
  });

  Object.entries(QUERY_PROVIDER_ATTR_MAP).forEach(([attrName, provider]) => {
    const value = readAttribute(sqlGroupNode, attrName, "");
    if (value) {
      values[provider] = value;
    }
  });

  getElementChildren(sqlGroupNode).forEach((childNode) => {
    if (childNode.tagName !== "QY") return;
    const provider = normalizeSqlProviderName(readAttribute(childNode, "P", ""));
    if (!provider || !Object.hasOwn(values, provider)) return;
    values[provider] = readAttribute(childNode, "Q", "");
  });

  return values;
}

function setSqlGroupQueries(sqlGroupNode, rawSqlQueries, changed) {
  const providerMap = new Map();
  const unknownProviderNodes = [];
  const qyNodes = getElementChildren(sqlGroupNode).filter((childNode) => childNode.tagName === "QY");

  qyNodes.forEach((qyNode) => {
    const provider = normalizeSqlProviderName(readAttribute(qyNode, "P", ""));
    if (!provider || providerMap.has(provider)) {
      unknownProviderNodes.push(qyNode);
      return;
    }
    providerMap.set(provider, qyNode);
  });

  qyNodes.forEach((qyNode) => {
    sqlGroupNode.removeChild(qyNode);
  });

  QUERY_SQL_PROVIDERS.forEach((provider) => {
    const currentNode = providerMap.get(provider);
    const hadNode = Boolean(currentNode);
    const queryText = String(rawSqlQueries[provider] ?? (hadNode ? readAttribute(currentNode, "Q", "") : ""));

    if (!hadNode && queryText === "") {
      return;
    }

    const qyNode = currentNode || sqlGroupNode.ownerDocument.createElement("QY");
    const before = readAttribute(qyNode, "Q", "");
    qyNode.setAttribute("P", provider);
    qyNode.setAttribute("Q", queryText);
    refreshSqlParameterNodes(qyNode, provider, queryText);
    sqlGroupNode.appendChild(qyNode);

    if (!hadNode || before !== queryText) {
      changed.push(`Query:${provider}`);
    }
  });

  unknownProviderNodes.forEach((qyNode) => {
    sqlGroupNode.appendChild(qyNode);
  });
}

function refreshSqlParameterNodes(queryNode, provider, queryText) {
  const oldParameterNodes = getElementChildren(queryNode).filter((childNode) => childNode.tagName === "QP");
  oldParameterNodes.forEach((parameterNode) => {
    queryNode.removeChild(parameterNode);
  });

  const parameters = extractSqlParameters(provider, queryText);
  parameters.forEach((parameterName) => {
    const parameterNode = queryNode.ownerDocument.createElement("QP");
    parameterNode.setAttribute("N", parameterName);
    queryNode.appendChild(parameterNode);
  });
}

function extractSqlParameters(_provider, queryText) {
  const text = String(queryText || "");
  if (!text) return [];

  const names = [];
  const seen = new Set();
  let index = 0;
  let state = "normal";

  while (index < text.length) {
    const char = text[index];
    const next = text[index + 1];

    if (state === "line-comment") {
      if (char === "\n") state = "normal";
      index += 1;
      continue;
    }

    if (state === "block-comment") {
      if (char === "*" && next === "/") {
        state = "normal";
        index += 2;
      } else {
        index += 1;
      }
      continue;
    }

    if (state === "single-quote") {
      if (char === "'" && next === "'") {
        index += 2;
      } else if (char === "'") {
        state = "normal";
        index += 1;
      } else {
        index += 1;
      }
      continue;
    }

    if (state === "double-quote") {
      if (char === '"' && next === '"') {
        index += 2;
      } else if (char === '"') {
        state = "normal";
        index += 1;
      } else {
        index += 1;
      }
      continue;
    }

    if (char === "-" && next === "-") {
      state = "line-comment";
      index += 2;
      continue;
    }

    if (char === "/" && next === "*") {
      state = "block-comment";
      index += 2;
      continue;
    }

    if (char === "'") {
      state = "single-quote";
      index += 1;
      continue;
    }

    if (char === '"') {
      state = "double-quote";
      index += 1;
      continue;
    }

    if (isParameterPrefix(text, index)) {
      let cursor = index + 1;
      while (cursor < text.length && isIdentifierChar(text[cursor])) {
        cursor += 1;
      }
      const parameterName = text.slice(index + 1, cursor);
      if (parameterName) {
        const key = parameterName.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          names.push(parameterName);
        }
      }
      index = cursor;
      continue;
    }

    index += 1;
  }

  return names;
}

function isParameterPrefix(text, index) {
  const char = text[index];
  const next = text[index + 1];
  if (!isIdentifierStart(next)) return false;
  if (char === "@") return true;
  if (char !== ":") return false;
  if (index > 0 && text[index - 1] === ":") return false;
  return true;
}

function isIdentifierStart(char) {
  return /[A-Za-z_]/.test(String(char || ""));
}

function isIdentifierChar(char) {
  return /[A-Za-z0-9_]/.test(String(char || ""));
}

function normalizeSqlProviderName(rawProvider) {
  const value = String(rawProvider || "").trim();
  if (!value) return "";
  const normalized = value.replace(/\s+/g, "").toLowerCase();

  if (normalized === "mssql") return "MsSql";
  if (normalized === "oracle") return "Oracle";
  if (normalized === "mysql") return "MySql";
  if (normalized === "mariadb") return "MariaDb";
  if (normalized === "postgresql" || normalized === "postgres") return "PostgreSql";
  if (normalized === "machbase") return "Machbase";
  if (normalized === "oledb") return "OleDb";
  if (normalized === "influx" || normalized === "influxdb") return "Influx";
  if (normalized === "sqlite") return "SQLite";
  if (normalized === "mongodb" || normalized === "mongo") return "MongoDb";

  const exact = SYSTEM_SQL_PROVIDERS.find((provider) => provider.toLowerCase() === normalized);
  return exact || "";
}

function normalizeSystemSqlProvider(rawProvider) {
  const normalized = normalizeSqlProviderName(rawProvider);
  if (normalized) return normalized;
  return "MsSql";
}

function normalizeYesNo(rawValue, fallback = "Yes") {
  const value = String(rawValue ?? "").trim().toLowerCase();
  if (!value) return fallback;
  if (["yes", "y", "1", "true", "t"].includes(value)) return "Yes";
  if (["no", "n", "0", "false", "f"].includes(value)) return "No";
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  return fallback;
}

function normalizeBoolFlag(rawValue) {
  if (typeof rawValue === "boolean") return rawValue;
  const value = String(rawValue ?? "").trim().toLowerCase();
  return ["true", "t", "1", "yes", "y"].includes(value);
}

function readAttribute(elementNode, attributeName, fallback = "") {
  const value = elementNode?.getAttribute?.(attributeName);
  if (value == null) return fallback;
  return String(value);
}

function findElementByPath(root, elementPath) {
  let current = root;
  for (const index of elementPath) {
    const children = getElementChildren(current);
    if (index < 0 || index >= children.length) {
      throw new Error("Invalid locator path.");
    }
    current = children[index];
  }
  return current;
}

function buildPathLabel(root, elementPath) {
  let current = root;
  let label = `/${root.tagName}[1]`;
  for (const index of elementPath) {
    const children = getElementChildren(current);
    if (index < 0 || index >= children.length) {
      throw new Error("Invalid locator path.");
    }
    current = children[index];
    label += `/${current.tagName}[${index + 1}]`;
  }
  return label;
}

function getElementChildren(elementNode) {
  const children = [];
  for (const childNode of Array.from(elementNode.childNodes || [])) {
    if (childNode.nodeType === 1) {
      children.push(childNode);
    }
  }
  return children;
}


function applyQueryDeveloperTreeAction(documentNode, action, targetPath, sourcePayload) {
  const normalizedAction = String(action || "").trim().toLowerCase();
  const normalizedTargetPath = normalizeElementPath(targetPath);
  if (normalizedAction === "appendmodule") {
    return appendDefaultModuleToSystem(documentNode, normalizedTargetPath);
  }
  if (normalizedAction === "appendfunction") {
    return appendDefaultFunctionToModule(documentNode, normalizedTargetPath);
  }
  if (normalizedAction === "appendsqlgroup") {
    return appendDefaultSqlGroupToFunction(documentNode, normalizedTargetPath);
  }
  if (normalizedAction === "insertbeforenode") {
    return insertBeforeDefaultSiblingNode(documentNode, normalizedTargetPath);
  }
  if (normalizedAction === "insertafternode") {
    return insertAfterDefaultSiblingNode(documentNode, normalizedTargetPath);
  }
  if (normalizedAction === "deletenode") {
    return deleteQueryDeveloperNode(documentNode, normalizedTargetPath);
  }
  if (normalizedAction === "pastenode") {
    return pasteQueryDeveloperNode(documentNode, sourcePayload, normalizedTargetPath);
  }
  throw new Error(`Unsupported tree action: ${normalizedAction}`);
}

export {
  buildQueryDeveloperTree,
  parseElementPathText,
  normalizeElementLocator,
  buildQueryDeveloperNodeDetail,
  applyQueryDeveloperNodeUpdate,
  applyQueryDeveloperTreeAction,
};
