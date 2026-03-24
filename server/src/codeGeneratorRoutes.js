import {
  generateCodeFromDocument,
  openOutputPathInExplorer,
  parseCodeGeneratorDocument,
} from "./codeGeneratorCore.js";

export function registerCodeGeneratorRoutes({
  app,
  requireAuth,
  parseXmlDocument,
}) {
  app.post("/api/code-generator/parse", requireAuth, async (req, res) => {
    const xmlText = String(req.body?.xmlText || "");
    if (!xmlText.trim()) {
      return res.status(400).json({ message: "GEN xml text is required." });
    }

    let documentNode;
    try {
      documentNode = parseXmlDocument(xmlText);
    } catch (error) {
      return res.status(422).json({ message: error.message });
    }

    try {
      const parsed = parseCodeGeneratorDocument(documentNode);
      return res.json({
        ok: true,
        tree: parsed.tree,
        stats: parsed.stats,
      });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/code-generator/generate", requireAuth, async (req, res) => {
    const xmlText = String(req.body?.xmlText || "");
    if (!xmlText.trim()) {
      return res.status(400).json({ message: "GEN xml text is required." });
    }

    let documentNode;
    try {
      documentNode = parseXmlDocument(xmlText);
    } catch (error) {
      return res.status(422).json({ message: error.message });
    }

    try {
      const result = await generateCodeFromDocument({
        documentNode,
        checkedLevel2Ids: Array.isArray(req.body?.checkedLevel2Ids) ? req.body.checkedLevel2Ids : [],
        options: req.body?.options || {},
      });

      return res.json({
        ok: true,
        ...result,
      });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/code-generator/open-output", requireAuth, async (req, res) => {
    const outputPath = String(req.body?.outputPath || "");
    if (!outputPath.trim()) {
      return res.status(400).json({ message: "Output path is required." });
    }

    try {
      const result = await openOutputPathInExplorer(outputPath);
      return res.json({
        ok: true,
        ...result,
      });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  });
}
