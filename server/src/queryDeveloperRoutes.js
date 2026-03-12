import {
  applyQueryDeveloperNodeUpdate,
  applyQueryDeveloperTreeAction,
  buildQueryDeveloperNodeDetail,
  buildQueryDeveloperTree,
  normalizeElementLocator,
  parseElementPathText,
} from "./queryDeveloperCore.js";

export function registerQueryDeveloperRoutes({
  app,
  requireAuth,
  safeQsfFileName,
  resolveQsfPath,
  fileExists,
  parseXmlDocument,
  fs,
  XMLSerializer,
}) {
  app.get("/api/qsf/query-developer/tree", requireAuth, async (req, res) => {
    const fileName = safeQsfFileName(req.query.name);
    if (!fileName) {
      return res.status(400).json({ message: "Invalid qsf file name." });
    }

    const fullPath = resolveQsfPath(fileName);
    const exists = await fileExists(fullPath);
    if (!exists) {
      return res.status(404).json({ message: "qsf file not found." });
    }

    const xmlText = await fs.promises.readFile(fullPath, "utf8");
    let documentNode;
    try {
      documentNode = parseXmlDocument(xmlText);
    } catch (error) {
      return res.status(422).json({ message: error.message });
    }

    const root = documentNode.documentElement;
    if (!root || root.tagName !== "Q") {
      return res.status(422).json({ message: "Invalid qsf xml format." });
    }

    const stat = await fs.promises.stat(fullPath);
    const factoryName = String(req.user?.factory || "").trim();
    const tree = buildQueryDeveloperTree(root, fileName, factoryName);

    return res.json({
      name: fileName,
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      tree,
    });
  });

  app.get("/api/qsf/query-developer/node", requireAuth, async (req, res) => {
    const fileName = safeQsfFileName(req.query.name);
    const pathText = String(req.query.path || "").trim();
    const includeOuterXml = parseBooleanLike(req.query.includeOuterXml);
    if (!fileName) {
      return res.status(400).json({ message: "Invalid qsf file name." });
    }
    if (!pathText) {
      return res.status(400).json({ message: "Node path is required." });
    }

    const fullPath = resolveQsfPath(fileName);
    const exists = await fileExists(fullPath);
    if (!exists) {
      return res.status(404).json({ message: "qsf file not found." });
    }

    const xmlText = await fs.promises.readFile(fullPath, "utf8");
    let documentNode;
    try {
      documentNode = parseXmlDocument(xmlText);
    } catch (error) {
      return res.status(422).json({ message: error.message });
    }

    const root = documentNode.documentElement;
    if (!root || root.tagName !== "Q") {
      return res.status(422).json({ message: "Invalid qsf xml format." });
    }

    let elementPath;
    try {
      elementPath = parseElementPathText(pathText);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    let node;
    try {
      node = buildQueryDeveloperNodeDetail(root, elementPath);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    if (includeOuterXml && elementPath.length > 0) {
      try {
        const elementNode = findElementByPath(root, elementPath);
        node.outerXml = new XMLSerializer().serializeToString(elementNode);
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }
    }

    return res.json({
      ok: true,
      name: fileName,
      node,
    });
  });

  app.put("/api/qsf/query-developer/node", requireAuth, async (req, res) => {
    const fileName = safeQsfFileName(req.body?.name);
    if (!fileName) {
      return res.status(400).json({ message: "Invalid qsf file name." });
    }

    let elementPath;
    try {
      elementPath = normalizeElementLocator(req.body?.locator);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    const fullPath = resolveQsfPath(fileName);
    const exists = await fileExists(fullPath);
    if (!exists) {
      return res.status(404).json({ message: "qsf file not found." });
    }

    const xmlText = await fs.promises.readFile(fullPath, "utf8");
    let documentNode;
    try {
      documentNode = parseXmlDocument(xmlText);
    } catch (error) {
      return res.status(422).json({ message: error.message });
    }

    const root = documentNode.documentElement;
    if (!root || root.tagName !== "Q") {
      return res.status(422).json({ message: "Invalid qsf xml format." });
    }

    let updateResult;
    try {
      updateResult = applyQueryDeveloperNodeUpdate(documentNode, elementPath, {
        updates: req.body?.updates,
        sqlQueries: req.body?.sqlQueries,
      });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    const serialized = new XMLSerializer().serializeToString(documentNode);
    await fs.promises.writeFile(fullPath, serialized, "utf8");
    const stat = await fs.promises.stat(fullPath);

    let node;
    try {
      node = buildQueryDeveloperNodeDetail(documentNode.documentElement, elementPath);
    } catch {
      node = null;
    }

    return res.json({
      ok: true,
      name: fileName,
      node,
      changed: updateResult.changed,
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      updatedBy: req.user.sub || "unknown",
    });
  });

  const handleTreeAction = async (req, res) => {
    const fileName = safeQsfFileName(req.body?.name);
    if (!fileName) {
      return res.status(400).json({ message: "Invalid qsf file name." });
    }

    const action = String(req.body?.action || "").trim().toLowerCase();
    if (!action) {
      return res.status(400).json({ message: "Tree action is required." });
    }

    let targetPath;
    try {
      targetPath = normalizeElementLocator(req.body?.locator);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    const fullPath = resolveQsfPath(fileName);
    const exists = await fileExists(fullPath);
    if (!exists) {
      return res.status(404).json({ message: "qsf file not found." });
    }

    const xmlText = await fs.promises.readFile(fullPath, "utf8");
    let documentNode;
    try {
      documentNode = parseXmlDocument(xmlText);
    } catch (error) {
      return res.status(422).json({ message: error.message });
    }

    const root = documentNode.documentElement;
    if (!root || root.tagName !== "Q") {
      return res.status(422).json({ message: "Invalid qsf xml format." });
    }

    let actionResult;
    try {
      let sourcePayload;
      if (action === "pastenode") {
        sourcePayload = {};
        const rawSourceXml = String(req.body?.sourceXml ?? "").trim();
        if (rawSourceXml) {
          sourcePayload.sourceXmlElement = parseSingleSourceElement(rawSourceXml, parseXmlDocument);
        } else {
          sourcePayload.sourcePath = normalizeElementLocator(req.body?.sourceLocator);
        }
      }
      actionResult = applyQueryDeveloperTreeAction(documentNode, action, targetPath, sourcePayload);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    const serialized = new XMLSerializer().serializeToString(documentNode);
    await fs.promises.writeFile(fullPath, serialized, "utf8");
    const stat = await fs.promises.stat(fullPath);
    const factoryName = String(req.user?.factory || "").trim();
    const tree = buildQueryDeveloperTree(documentNode.documentElement, fileName, factoryName);

    return res.json({
      ok: true,
      name: fileName,
      tree,
      selectedPath: actionResult.selectedPath || "root",
      changed: actionResult.changed || [action],
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      updatedBy: req.user.sub || "unknown",
    });
  };

  // Keep backward-compatible endpoints to avoid 404 during mixed client/server deployments.
  const treeActionRoutes = [
    "/api/qsf/query-developer/tree-action",
    "/api/qsf/tree-action",
    "/api/qsf/query-developer/treeAction",
    "/api/qsf/treeAction",
    "/api/qsf/query-developer/tree/action",
  ];
  for (const routePath of treeActionRoutes) {
    app.post(routePath, requireAuth, handleTreeAction);
    app.put(routePath, requireAuth, handleTreeAction);
  }
}

function parseBooleanLike(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "y";
}

function parseSingleSourceElement(rawSourceXml, parseXmlDocument) {
  let wrapper;
  try {
    wrapper = parseXmlDocument(`<QBEX>${rawSourceXml}</QBEX>`);
  } catch (error) {
    throw new Error(`Invalid source xml: ${error.message}`);
  }

  const root = wrapper?.documentElement;
  if (!root || root.tagName !== "QBEX") {
    throw new Error("Invalid source xml.");
  }

  const elementChildren = getElementChildren(root);
  if (elementChildren.length !== 1) {
    throw new Error("Source xml must contain one root element.");
  }
  return elementChildren[0];
}

function findElementByPath(rootNode, elementPath) {
  let current = rootNode;
  for (const index of elementPath) {
    const children = getElementChildren(current);
    if (index < 0 || index >= children.length) {
      throw new Error("Invalid locator path.");
    }
    current = children[index];
  }
  return current;
}

function getElementChildren(elementNode) {
  const children = [];
  for (const childNode of Array.from(elementNode?.childNodes || [])) {
    if (childNode.nodeType === 1) {
      children.push(childNode);
    }
  }
  return children;
}
