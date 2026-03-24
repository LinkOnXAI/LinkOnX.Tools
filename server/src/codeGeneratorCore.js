import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const CAN_CHECK_NODE_LEVEL = 2;
const TAGS = {
  namespace: "Namespace",
  group: "Group",
  parameters: "Parameters",
  function: "Function",
  element: "Element",
  attribute: "Attribute",
};

const ATTRS = {
  name: "Name",
  moduleName: "ModuleName",
  className: "Class",
  deliveryMode: "DeliveryMode",
  async: "Async",
  guaranteed: "Guaranteed",
  tag: "Tag",
  defaultValue: "DefaultValue",
};

const DEFAULTS = {
  deliveryMode: "UNICAST",
  async: "False",
  guaranteed: "False",
};

const COPYRIGHT_BLOCK = [
  "* \ud504\ub85c\uadf8\ub7a8\uc5d0 \ub300\ud55c \uc800\uc791\uad8c\uc744 \ud3ec\ud568\ud55c \uc9c0\uc801\uc7ac\uc0b0\uad8c\uc740(\uc8fc)\ud050\ubca1\uc2a4\uc5d0 \uc788\uc73c\uba70, (\uc8fc)\ud050\ubca1\uc2a4\uac00 \uba85\uc2dc\uc801\uc73c\ub85c \ud5c8\uc6a9\ud558\uc9c0 \uc54a\uc740",
  "* \uc0ac\uc6a9, \ubcf5\uc0ac, \ubcc0\uacbd, \uc81c3\uc790\uc5d0\uc758 \uacf5\uac1c, \ubc30\ud3ec\ub294 \uc5c4\uaca9\ud788 \uae08\uc9c0\ub418\uc5b4 \uc788\uc2b5\ub2c8\ub2e4. ",
  "* (Copyright \u24d2 2019 QBEX. All Rights Reserved | Confidential)",
];

export function parseCodeGeneratorDocument(documentNode) {
  const root = documentNode?.documentElement;
  if (!root) throw new Error("Invalid gen xml format.");

  const stats = {
    namespaceCount: 0,
    groupCount: 0,
    parameterCount: 0,
    functionCount: 0,
  };

  const namespaces = elementChildrenByTag(root, TAGS.namespace);
  stats.namespaceCount = namespaces.length;

  const tree = namespaces.map((namespaceNode, namespaceIndex) => {
    const namespaceName = attr(namespaceNode, ATTRS.name, "");
    const moduleName = attr(namespaceNode, ATTRS.moduleName, "");

    const groups = elementChildrenByTag(namespaceNode, TAGS.group);
    stats.groupCount += groups.length;

    return {
      id: `n:${namespaceIndex}`,
      kind: "namespace",
      level: 0,
      checkable: true,
      label: `${namespaceName} Module=[${moduleName}]`,
      children: groups.map((groupNode, groupIndex) => {
        const groupChildren = elementChildren(groupNode).filter((node) =>
          [TAGS.parameters, TAGS.function].includes(node.tagName),
        );

        return {
          id: `g:${namespaceIndex}.${groupIndex}`,
          kind: "group",
          level: 1,
          checkable: true,
          label: attr(groupNode, ATTRS.name, ""),
          children: groupChildren.map((childNode, level2Index) => {
            const id = level2Id(namespaceIndex, groupIndex, level2Index);
            if (childNode.tagName === TAGS.parameters) {
              stats.parameterCount += 1;
              return buildParameterTree(childNode, id);
            }

            stats.functionCount += 1;
            const functionName = attr(childNode, ATTRS.name, "");
            const deliveryMode = attr(childNode, ATTRS.deliveryMode, DEFAULTS.deliveryMode);
            const asyncFlag = attr(childNode, ATTRS.async, DEFAULTS.async);
            return {
              id,
              kind: "function",
              level: 2,
              checkable: true,
              label: `${functionName} DeliveryMode=[${deliveryMode}] Name=[${functionName}] Async=[${asyncFlag}]`,
              children: [],
            };
          }),
        };
      }),
    };
  });

  return { tree, stats };
}

export async function generateCodeFromDocument({ documentNode, checkedLevel2Ids, options }) {
  const root = documentNode?.documentElement;
  if (!root) throw new Error("Invalid gen xml format.");

  const normalizedOptions = normalizeOptions(options);
  const outputRoot = normalizedOptions.outputPath || process.cwd();

  const checkedSet = new Set((Array.isArray(checkedLevel2Ids) ? checkedLevel2Ids : []).map((id) => String(id || "")));
  const namespaces = elementChildrenByTag(root, TAGS.namespace);
  const generatedFiles = [];
  const generatedNamespaces = [];

  for (let namespaceIndex = 0; namespaceIndex < namespaces.length; namespaceIndex += 1) {
    const namespaceNode = namespaces[namespaceIndex];
    const namespaceName = attr(namespaceNode, ATTRS.name, "");
    const moduleName = attr(namespaceNode, ATTRS.moduleName, "");
    if (!moduleName.trim()) {
      throw new Error(`Namespace at index ${namespaceIndex} has empty ModuleName.`);
    }

    const modulePath = path.join(outputRoot, moduleName);
    await fs.promises.rm(modulePath, { recursive: true, force: true });
    await fs.promises.mkdir(modulePath, { recursive: true });

    if (normalizedOptions.generateParameter) {
      const paths = await writeParameterFiles({
        namespaceNode,
        namespaceIndex,
        namespaceName,
        moduleName,
        modulePath,
        checkedSet,
        options: normalizedOptions,
      });
      generatedFiles.push(...paths);
    }

    if (normalizedOptions.generateFunction) {
      const paths = await writeFunctionFiles({
        namespaceNode,
        namespaceIndex,
        namespaceName,
        moduleName,
        modulePath,
        checkedSet,
        options: normalizedOptions,
      });
      generatedFiles.push(...paths);
    }

    const functions = collectFunctions(namespaceNode);
    const casterPath = path.join(modulePath, `c_Q${moduleName}Caster.cs`);
    const skeletonPath = path.join(modulePath, `c_Q${moduleName}Skeleton.cs`);
    const tunerPath = path.join(modulePath, `c_Q${moduleName}Tuner.cs`);
    await writeText(casterPath, renderCaster(moduleName, namespaceName, normalizedOptions, functions));
    await writeText(skeletonPath, renderSkeleton(moduleName, namespaceName, normalizedOptions, functions));
    await writeText(tunerPath, renderTuner(moduleName, namespaceName, normalizedOptions, functions));
    generatedFiles.push(casterPath, skeletonPath, tunerPath);

    generatedNamespaces.push({
      namespaceName,
      moduleName,
      modulePath,
    });
  }

  return {
    outputPath: path.resolve(outputRoot),
    generatedCount: generatedFiles.length,
    generatedFiles,
    namespaces: generatedNamespaces,
  };
}

export async function openOutputPathInExplorer(outputPath) {
  const target = path.resolve(String(outputPath || ""));
  if (!target) throw new Error("Output path is required.");
  const stat = await fs.promises.stat(target).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throw new Error("Output directory does not exist.");
  }

  if (process.platform === "win32") {
    const child = spawn("explorer.exe", [target], { detached: true, stdio: "ignore" });
    child.unref();
    return { opened: true, outputPath: target };
  }

  return { opened: false, outputPath: target };
}

function buildParameterTree(parameterNode, id) {
  const elements = elementChildrenByTag(parameterNode, TAGS.element);
  return {
    id,
    kind: "parameters",
    level: 2,
    checkable: true,
    label: attr(parameterNode, ATTRS.name, ""),
    children: elements.map((elementNode, index) =>
      buildElementTree(elementNode, {
        idPrefix: `${id}:el${index}`,
        level: 3,
      })),
  };
}

function buildElementTree(elementNode, context) {
  const children = [];
  const subElements = elementChildrenByTag(elementNode, TAGS.element);
  subElements.forEach((childNode, index) => {
    children.push(
      buildElementTree(childNode, {
        idPrefix: `${context.idPrefix}.el${index}`,
        level: context.level + 1,
      }),
    );
  });

  const attributes = elementChildrenByTag(elementNode, TAGS.attribute);
  attributes.forEach((attributeNode, index) => {
    const name = attr(attributeNode, ATTRS.name, "");
    const defaultValue = attr(attributeNode, ATTRS.defaultValue, "");
    children.push({
      id: `${context.idPrefix}.at${index}`,
      kind: "attribute",
      level: context.level + 1,
      checkable: false,
      label: `${name} DefaultValue=[${defaultValue}]`,
      children: [],
    });
  });

  return {
    id: context.idPrefix,
    kind: "element",
    level: context.level,
    checkable: context.level <= CAN_CHECK_NODE_LEVEL,
    label: attr(elementNode, ATTRS.name, ""),
    children,
  };
}

async function writeParameterFiles({
  namespaceNode,
  namespaceIndex,
  namespaceName,
  moduleName,
  modulePath,
  checkedSet,
  options,
}) {
  const targetDir = path.join(modulePath, `${moduleName}Callback`, "Parameters");
  await fs.promises.mkdir(targetDir, { recursive: true });
  const files = [];

  const groups = elementChildrenByTag(namespaceNode, TAGS.group);
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const groupNode = groups[groupIndex];
    const children = elementChildren(groupNode).filter((node) => [TAGS.parameters, TAGS.function].includes(node.tagName));

    for (let level2Index = 0; level2Index < children.length; level2Index += 1) {
      const node = children[level2Index];
      if (node.tagName !== TAGS.parameters) continue;
      if (!checkedSet.has(level2Id(namespaceIndex, groupIndex, level2Index))) continue;

      const parameterName = attr(node, ATTRS.name, "");
      const lines = [];
      lines.push(...renderSimpleHeader(options));
      lines.push("using System;");
      lines.push("using System.Collections.Generic;");
      lines.push("using System.Linq;");
      lines.push("using System.Text;");
      lines.push("");
      lines.push(`namespace ${namespaceName}`);
      lines.push("{");
      lines.push(`    ${options.internalClass ? "internal" : "public"} static class ${parameterName}`);
      lines.push("    {");

      const elements = elementChildrenByTag(node, TAGS.element);
      for (const elementNode of elements) {
        lines.push("");
        lines.push("        //------------------------------------------------------------------------------------------------------------------------");
        lines.push("");
        appendElement(lines, elementNode, "        ");
        appendSubElement(lines, elementNode, "        ");
      }

      lines.push("");
      lines.push("        //------------------------------------------------------------------------------------------------------------------------");
      lines.push("");
      lines.push("    }   // Class end");
      lines.push("}   // Namespace end");

      const filePath = path.join(targetDir, `c_${parameterName}.cs`);
      await writeText(filePath, lines.join("\r\n"));
      files.push(filePath);
    }
  }

  return files;
}

async function writeFunctionFiles({
  namespaceNode,
  namespaceIndex,
  namespaceName,
  moduleName,
  modulePath,
  checkedSet,
  options,
}) {
  const targetDir = path.join(modulePath, `${moduleName}Callback`);
  await fs.promises.mkdir(targetDir, { recursive: true });
  const files = [];

  const groups = elementChildrenByTag(namespaceNode, TAGS.group);
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const groupNode = groups[groupIndex];
    const children = elementChildren(groupNode).filter((node) => [TAGS.parameters, TAGS.function].includes(node.tagName));

    for (let level2Index = 0; level2Index < children.length; level2Index += 1) {
      const node = children[level2Index];
      if (node.tagName !== TAGS.function) continue;
      if (!checkedSet.has(level2Id(namespaceIndex, groupIndex, level2Index))) continue;

      const className = attr(node, ATTRS.className, "");
      const functionName = attr(node, ATTRS.name, "");
      const deliveryMode = attr(node, ATTRS.deliveryMode, DEFAULTS.deliveryMode);

      const lines = [];
      lines.push(...renderSimpleHeader(options));
      lines.push("using System;");
      lines.push("using System.Collections;");
      lines.push("using System.Collections.Generic;");
      lines.push("using System.Linq;");
      lines.push("using System.Text;");
      lines.push("using System.Data;");

      // Preserve WinForms implementation behavior.
      if (!String(options.organizeUsing || "").trim()) {
        lines.push(String(options.organizeUsing || ""));
      }

      lines.push("");
      lines.push(`namespace ${namespaceName}`);
      lines.push("{");
      lines.push(`    ${options.internalClass ? "internal" : "public"} partial class ${className}`);
      lines.push("    {");
      lines.push("");
      lines.push("        //------------------------------------------------------------------------------------------------------------------------");
      lines.push("");
      lines.push(`        public override void ${functionName}(`);
      if (deliveryMode === "REQUEST") {
        lines.push("            QXNode qXNodeIn,");
        lines.push("            ref QXNode qXNodeOut");
      } else {
        lines.push("            QXNode qXNodeIn");
      }
      lines.push("            )");
      lines.push("        {");
      lines.push("            try");
      lines.push("            {");
      lines.push("");
      lines.push("            }");
      lines.push("            catch (Exception ex)");
      lines.push("            {");
      lines.push("                QDiagnostics.Throw(ex);");
      lines.push("            }");
      lines.push("            finally");
      lines.push("            {");
      lines.push("");
      lines.push("            }");
      lines.push("        }");
      lines.push("");
      lines.push("        //------------------------------------------------------------------------------------------------------------------------");
      lines.push("");
      lines.push("    }   // Class end");
      lines.push("}   // Namespace end");

      const filePath = path.join(targetDir, `c_Q${functionName}.cs`);
      await writeText(filePath, lines.join("\r\n"));
      files.push(filePath);
    }
  }

  return files;
}

function renderCaster(moduleName, namespaceName, options, functions) {
  const moduleLower = moduleName.toLowerCase();
  const moduleUpper = moduleName.toUpperCase();
  const lines = [];
  lines.push(...renderCopyrightHeader(options));
  lines.push("using System;");
  lines.push("using System.Collections.Generic;");
  if (String(options.organizeUsing || "").trim()) {
    lines.push(String(options.organizeUsing));
  }
  lines.push("");
  lines.push(`namespace ${namespaceName}`);
  lines.push("{");
  lines.push(`    ${options.internalClass ? "internal" : "public"} class Q${moduleName}Caster : IDisposable`);
  lines.push("    {");
  lines.push("");
  lines.push("        //------------------------------------------------------------------------------------------------------------------------");
  lines.push("");
  lines.push("        private bool mFinalyzed = false;");
  lines.push("        // --");
  lines.push(`        private static string m${moduleLower}Channel = string.Empty;`);
  lines.push(`        private static int m${moduleLower}Ttl = 0;`);
  lines.push("");
  lines.push("        //------------------------------------------------------------------------------------------------------------------------");
  lines.push("");
  lines.push("        #region Class Construction and Destruction");
  lines.push("");
  lines.push(`        public Q${moduleName}Caster(`);
  lines.push("            )");
  lines.push("        {");
  lines.push("");
  lines.push("        }");
  lines.push("");
  lines.push("        //------------------------------------------------------------------------------------------------------------------------");
  lines.push("");
  lines.push(`        ~Q${moduleName}Caster(`);
  lines.push("           )");
  lines.push("        {");
  lines.push("            Finalyze(false);");
  lines.push("        }");
  lines.push("");
  lines.push("        //------------------------------------------------------------------------------------------------------------------------");
  lines.push("");
  lines.push("        protected void Finalyze(");
  lines.push("            bool disposing");
  lines.push("            )");
  lines.push("        {");
  lines.push("            if (!mFinalyzed)");
  lines.push("            {");
  lines.push("                if (disposing)");
  lines.push("                {");
  lines.push("");
  lines.push("                }");
  lines.push("");
  lines.push("                mFinalyzed = true;");
  lines.push("            }");
  lines.push("        }");
  lines.push("");
  lines.push("        #endregion");
  lines.push("");
  lines.push("        //------------------------------------------------------------------------------------------------------------------------");
  lines.push("");
  lines.push("        #region IDisposable 멤버");
  lines.push("");
  lines.push("        public void Dispose(");
  lines.push("            )");
  lines.push("        {");
  lines.push("            Finalyze(true);");
  lines.push("            GC.SuppressFinalize(this);");
  lines.push("        }");
  lines.push("");
  lines.push("        #endregion");
  lines.push("");
  lines.push("        //------------------------------------------------------------------------------------------------------------------------");
  lines.push("");
  lines.push("        #region Properties");
  lines.push("");
  lines.push(`        public static string ${moduleUpper}Channel`);
  lines.push("        {");
  lines.push("            get");
  lines.push("            {");
  lines.push("                try");
  lines.push("                {");
  lines.push(`                    return m${moduleLower}Channel;`);
  lines.push("                }");
  lines.push("                catch (Exception ex)");
  lines.push("                {");
  lines.push("                    QDiagnostics.Throw(ex);");
  lines.push("                }");
  lines.push("                finally");
  lines.push("                {");
  lines.push("");
  lines.push("                }");
  lines.push("                return null;");
  lines.push("           }");
  lines.push("");
  lines.push("            set");
  lines.push("            {");
  lines.push("                try");
  lines.push("                {");
  lines.push(`                    m${moduleLower}Channel = value;`);
  lines.push("                }");
  lines.push("                catch (Exception ex)");
  lines.push("                {");
  lines.push("                    QDiagnostics.Throw(ex);");
  lines.push("                }");
  lines.push("                finally");
  lines.push("                {");
  lines.push("");
  lines.push("                }");
  lines.push("            }");
  lines.push("        }");
  lines.push("");
  lines.push("        //------------------------------------------------------------------------------------------------------------------------");
  lines.push("");
  lines.push(`        public static int ${moduleUpper}Ttl`);
  lines.push("        {");
  lines.push("            get");
  lines.push("            {");
  lines.push("                try");
  lines.push("                {");
  lines.push(`                    return m${moduleLower}Ttl;`);
  lines.push("                }");
  lines.push("                catch (Exception ex)");
  lines.push("                {");
  lines.push("                    QDiagnostics.Throw(ex);");
  lines.push("                }");
  lines.push("                finally");
  lines.push("                {");
  lines.push("");
  lines.push("                }");
  lines.push("                return 0;");
  lines.push("           }");
  lines.push("");
  lines.push("            set");
  lines.push("            {");
  lines.push("                try");
  lines.push("                {");
  lines.push(`                    m${moduleLower}Ttl = value;`);
  lines.push("                }");
  lines.push("                catch (Exception ex)");
  lines.push("                {");
  lines.push("                    QDiagnostics.Throw(ex);");
  lines.push("                }");
  lines.push("                finally");
  lines.push("                {");
  lines.push("");
  lines.push("                }");
  lines.push("            }");
  lines.push("        }");
  lines.push("");
  lines.push("        #endregion");
  lines.push("");
  lines.push("        //------------------------------------------------------------------------------------------------------------------------");
  lines.push("");
  lines.push("        #region Methods");
  lines.push("");

  functions.forEach((item, index) => {
    if (index > 0) {
      lines.push("        //------------------------------------------------------------------------------------------------------------------------");
      lines.push("");
    }

    lines.push(`        public static void ${item.functionName}(`);
    lines.push("            QIMessageBus instance,");
    if (item.deliveryMode === "REQUEST") {
      lines.push("            QXNode qXNodeIn,");
      lines.push("            ref QXNode qXNodeOut");
    } else {
      lines.push("            QXNode qXNodeIn");
    }
    lines.push("            )");
    lines.push("        {");
    lines.push("            try");
    lines.push("            {");
    if (item.deliveryMode === "REQUEST") {
      lines.push(`                ${item.functionName}(instance, qXNodeIn, ref qXNodeOut, "", 0);`);
    } else {
      lines.push(`                ${item.functionName}(instance, qXNodeIn, "", 0);`);
    }
    lines.push("            }");
    lines.push("            catch (Exception ex)");
    lines.push("            {");
    lines.push("                QDiagnostics.Throw(ex);");
    lines.push("            }");
    lines.push("            finally");
    lines.push("            {");
    lines.push("");
    lines.push("            }");
    lines.push("        }");
    lines.push("");
    lines.push("        //------------------------------------------------------------------------------------------------------------------------");
    lines.push("");

    lines.push(`        public static void ${item.functionName}(`);
    lines.push("            QIMessageBus instance,");
    lines.push("            QXNode qXNodeIn,");
    if (item.deliveryMode === "REQUEST") {
      lines.push("            ref QXNode qXNodeOut,");
    }
    lines.push("            string channel,");
    lines.push("            int ttl");
    lines.push("            )");
    lines.push("        {");
    if (item.deliveryMode === "REQUEST") {
      lines.push("            object repObj = null;");
    }
    lines.push("            try");
    lines.push("            {");
    lines.push('                if (null == channel || channel.Trim().Equals(""))');
    lines.push("                {");
    lines.push(`                    if (null == m${moduleLower}Channel || m${moduleLower}Channel.Trim().Equals(""))`);
    lines.push("                    {");
    lines.push("                        QDiagnostics.Throw(QH101.INVALID_CHANNEL);");
    lines.push("                    }");
    lines.push(`                    channel = m${moduleLower}Channel;`);
    lines.push("                }");
    lines.push(`                ttl = (ttl <= 0 ? m${moduleLower}Ttl : ttl);`);
    lines.push("");

    if (item.deliveryMode === "REQUEST") {
      lines.push("                repObj = instance.SendRequest(");
      lines.push(`                    "${moduleName}",`);
      lines.push(`                    "${item.functionName}",`);
      lines.push("                    qXNodeIn,");
      lines.push("                    channel,");
      lines.push("                    ttl,");
      lines.push(`                    ${String(item.asyncFlag || "False").toLowerCase()}`);
      lines.push("                    );");
      lines.push("");
      lines.push("                if (null == repObj)");
      lines.push("                {");
      lines.push("                    QDiagnostics.Throw(QH101.INVALID_MESSAGE);");
      lines.push("                }");
      lines.push("");
      lines.push("                if (repObj is QXNode)");
      lines.push("                {");
      lines.push("                    qXNodeOut = (QXNode)repObj;");
      lines.push("                }");
      lines.push("                else");
      lines.push("                {");
      lines.push("                    QXDocument tempXDoc = new QXDocument();");
      lines.push("                    tempXDoc.LoadXml((string)repObj);");
      lines.push("                    qXNodeOut = tempXDoc.qFirstChild;");
      lines.push("                    tempXDoc = null;");
      lines.push("                }");
    } else if (item.deliveryMode === "UNICAST") {
      if (item.guaranteed === "True") {
        lines.push("                instance.SendGuaranteedUnicast(");
      } else {
        lines.push("                instance.SendUnicast(");
      }
      lines.push(`                    "${moduleName}",`);
      lines.push(`                    "${item.functionName}",`);
      lines.push("                    qXNodeIn,");
      lines.push("                    channel,");
      lines.push("                    ttl");
      lines.push("                    );");
    } else {
      if (item.guaranteed === "True") {
        lines.push("                instance.SendGuaranteedMulticast(");
      } else {
        lines.push("                instance.SendMulticast(");
      }
      lines.push(`                    "${moduleName}",`);
      lines.push(`                    "${item.functionName}",`);
      lines.push("                    qXNodeIn,");
      lines.push("                    channel,");
      lines.push("                    ttl");
      lines.push("                    );");
    }

    lines.push("            }");
    lines.push("            catch (Exception ex)");
    lines.push("            {");
    lines.push("                QDiagnostics.Throw(ex);");
    lines.push("            }");
    lines.push("            finally");
    lines.push("            {");
    lines.push("");
    lines.push("            }");
    lines.push("        }");
    lines.push("");
  });

  lines.push("        #endregion");
  lines.push("");
  lines.push("        //------------------------------------------------------------------------------------------------------------------------");
  lines.push("");
  lines.push("    }   // Class end");
  lines.push("}   // Namespace end");
  return lines.join("\r\n");
}

function renderSkeleton(moduleName, namespaceName, options, functions) {
  const lines = [];
  lines.push(...renderCopyrightHeader(options));
  lines.push("using System;");
  lines.push("using System.Collections.Generic;");
  if (String(options.organizeUsing || "").trim()) {
    lines.push(String(options.organizeUsing));
  }
  lines.push("");
  lines.push(`namespace ${namespaceName}`);
  lines.push("{");
  lines.push(`    ${options.internalClass ? "internal" : "public"} class Q${moduleName}Skeleton : Q${moduleName}Tuner`);
  lines.push("    {");
  lines.push("");
  lines.push("        //------------------------------------------------------------------------------------------------------------------------");
  lines.push("");
  lines.push("        private bool mFinalyzed = false;");
  lines.push("");
  lines.push("        //------------------------------------------------------------------------------------------------------------------------");
  lines.push("");
  lines.push("        #region Class Construction and Destruction");
  lines.push("");
  lines.push(`        public Q${moduleName}Skeleton(`);
  lines.push("            QServiceServerJob qServerJobFlag,");
  lines.push("            QIMessageBus messageBus");
  lines.push("            ) : base(qServerJobFlag, messageBus)");
  lines.push("        {");
  lines.push("");
  lines.push("        }");
  lines.push("");
  lines.push("        //------------------------------------------------------------------------------------------------------------------------");
  lines.push("");
  lines.push(`        ~Q${moduleName}Skeleton(`);
  lines.push("           )");
  lines.push("        {");
  lines.push("            Finalyze(false);");
  lines.push("        }");
  lines.push("");
  lines.push("        //------------------------------------------------------------------------------------------------------------------------");
  lines.push("");
  lines.push("        protected override void Finalyze(");
  lines.push("            bool disposing");
  lines.push("            )");
  lines.push("        {");
  lines.push("            if (!mFinalyzed)");
  lines.push("            {");
  lines.push("                if (disposing)");
  lines.push("                {");
  lines.push("");
  lines.push("                }");
  lines.push("");
  lines.push("                mFinalyzed = true;");
  lines.push("");
  lines.push("                // --");
  lines.push("");
  lines.push("                base.Finalyze(disposing);");
  lines.push("            }");
  lines.push("        }");
  lines.push("");
  lines.push("        #endregion");
  lines.push("");
  lines.push("        //------------------------------------------------------------------------------------------------------------------------");
  lines.push("");
  lines.push("        #region Properties");
  lines.push("");
  lines.push("        #endregion");
  lines.push("");
  lines.push("        //------------------------------------------------------------------------------------------------------------------------");
  lines.push("");
  lines.push("        #region Methods");
  lines.push("");

  functions.forEach((item, index) => {
    if (index > 0) {
      lines.push("        //------------------------------------------------------------------------------------------------------------------------");
      lines.push("");
    }

    lines.push(`        public override void ${item.functionName}(`);
    if (item.deliveryMode === "REQUEST") {
      lines.push("            QXNode qXNodeIn,");
      lines.push("            ref QXNode qXNodeOut");
    } else {
      lines.push("            QXNode qXNodeIn");
    }
    lines.push("            )");
    lines.push("        {");
    lines.push("            try");
    lines.push("            {");
    lines.push("");
    lines.push("            }");
    lines.push("            catch (Exception ex)");
    lines.push("            {");
    lines.push("                QDiagnostics.Throw(ex);");
    lines.push("            }");
    lines.push("            finally");
    lines.push("            {");
    lines.push("");
    lines.push("            }");
    lines.push("        }");
    lines.push("");
  });

  lines.push("        #endregion");
  lines.push("");
  lines.push("        //------------------------------------------------------------------------------------------------------------------------");
  lines.push("");
  lines.push("    }   // Class end");
  lines.push("}   // Namespace end");
  return lines.join("\r\n");
}

function renderTuner(moduleName, namespaceName, options, functions) {
  const lines = [];
  lines.push(...renderCopyrightHeader(options));
  lines.push("using System;");
  lines.push("using System.Collections.Generic;");
  lines.push("using System.Linq;");
  lines.push("using System.Text;");
  lines.push("using System.Data;");
  if (String(options.organizeUsing || "").trim()) {
    lines.push(String(options.organizeUsing));
  }
  lines.push("");
  lines.push(`namespace ${namespaceName}`);
  lines.push("{");
  lines.push(`    ${options.internalClass ? "internal" : "public"} abstract class Q${moduleName}Tuner : QIMessageBusDispatcher, IDisposable`);
  lines.push("    {");
  lines.push("");
  lines.push("        //------------------------------------------------------------------------------------------------------------------------");
  lines.push("");
  lines.push("        private bool mFinalyzed = false;");
  lines.push("        // --");
  lines.push("        private QServiceServerJob mServerJobFlag = null;");
  lines.push("        private QIMessageBus mMessageBus = null;");
  lines.push("");
  lines.push("        //------------------------------------------------------------------------------------------------------------------------");
  lines.push("");
  lines.push("        #region Class Construction and Destruction");
  lines.push("");
  lines.push(`        public Q${moduleName}Tuner(`);
  lines.push("            QServiceServerJob qServerJobFlag,");
  lines.push("            QIMessageBus messageBus");
  lines.push("            )");
  lines.push("        {");
  lines.push("            mServerJobFlag = qServerJobFlag;");
  lines.push("            mMessageBus = messageBus;");
  lines.push("        }");
  lines.push("");
  lines.push("        //------------------------------------------------------------------------------------------------------------------------");
  lines.push("");
  lines.push(`        ~Q${moduleName}Tuner(`);
  lines.push("           )");
  lines.push("        {");
  lines.push("            Finalyze(false);");
  lines.push("        }");
  lines.push("");
  lines.push("        //------------------------------------------------------------------------------------------------------------------------");
  lines.push("");
  lines.push("        protected virtual void Finalyze(");
  lines.push("            bool disposing");
  lines.push("            )");
  lines.push("        {");
  lines.push("            if (!mFinalyzed)");
  lines.push("            {");
  lines.push("                if (disposing)");
  lines.push("                {");
  lines.push("                    mServerJobFlag = null;");
  lines.push("                    // --");
  lines.push("                    mMessageBus.Dispose();");
  lines.push("                    mMessageBus = null;");
  lines.push("                }");
  lines.push("");
  lines.push("                mFinalyzed = true;");
  lines.push("            }");
  lines.push("        }");
  lines.push("");
  lines.push("        #endregion");
  lines.push("");
  lines.push("        //------------------------------------------------------------------------------------------------------------------------");
  lines.push("");
  lines.push("        #region IDisposable member");
  lines.push("");
  lines.push("        public void Dispose(");
  lines.push("            )");
  lines.push("        {");
  lines.push("            Finalyze(true);");
  lines.push("            GC.SuppressFinalize(this);");
  lines.push("        }");
  lines.push("");
  lines.push("        #endregion");
  lines.push("");
  lines.push("        //------------------------------------------------------------------------------------------------------------------------");
  lines.push("");
  lines.push("        #region Properties");
  lines.push("");
  lines.push("        #endregion");
  lines.push("");
  lines.push("        //------------------------------------------------------------------------------------------------------------------------");
  lines.push("");
  lines.push("        #region QIMessageBusDispatcher member");
  lines.push("");
  lines.push("        public Exception dispatch(");
  lines.push("            QMessageBusDataReceivedArgs e");
  lines.push("            )");
  lines.push("        {");
  lines.push("            try");
  lines.push("            {");
  lines.push("                if (mServerJobFlag != null)");
  lines.push("                    mServerJobFlag.Running = true;");
  lines.push("");
  lines.push("                switch (e.Operation)");
  lines.push("                {");
  functions.forEach((item) => {
    lines.push(`                case "${item.functionName}":`);
    lines.push(`                    recv_${item.functionName}(e);`);
    lines.push("                    break;");
    lines.push("");
  });
  lines.push("                    default:");
  lines.push("                        if (e.IsRequest)");
  lines.push("                        {");
  lines.push('                            e.sendReply("-23", string.Format("Unexpected Operation!(Operation:{0})", e.Operation));');
  lines.push("                        }");
  lines.push("                        // --");
  lines.push("                        QDiagnostics.Throw (");
  lines.push('                            string.Format("Unexpected Operation!(Operation:{0})", e.Operation)');
  lines.push("                           );");
  lines.push("                        break;");
  lines.push("            }");
  lines.push("            }");
  lines.push("            catch (Exception ex)");
  lines.push("            {");
  lines.push("                QDiagnostics.Throw(ex);");
  lines.push("            }");
  lines.push("            finally");
  lines.push("            {");
  lines.push("                if (mServerJobFlag != null)");
  lines.push("                    mServerJobFlag.Running = false;");
  lines.push("            }");
  lines.push("            return null;");
  lines.push("        }");
  lines.push("");
  lines.push("        #endregion");
  lines.push("");
  lines.push("        //------------------------------------------------------------------------------------------------------------------------");
  lines.push("");
  lines.push("        #region Methods");
  lines.push("");

  functions.forEach((item) => {
    lines.push(`        public abstract void ${item.functionName}(`);
    if (item.deliveryMode === "REQUEST") {
      lines.push("            QXNode qXNodeIn,");
      lines.push("            ref QXNode qXNodeOut");
    } else {
      lines.push("            QXNode qXNodeIn");
    }
    lines.push("            );");
    lines.push("");
    lines.push("        //------------------------------------------------------------------------------------------------------------------------");
    lines.push("");
    lines.push(`        private void recv_${item.functionName}(`);
    lines.push("            QMessageBusDataReceivedArgs e");
    lines.push("            )");
    lines.push("        {");
    lines.push("            QXNode qXNodeIn = null;");
    if (item.deliveryMode === "REQUEST") {
      lines.push("            QXNode qXNodeOut = null;");
    }
    lines.push("");
    lines.push("            try");
    lines.push("            {");
    lines.push("                qXNodeIn = e.DataToXmlNode;");
    if (item.deliveryMode === "REQUEST") {
      lines.push(`                ${item.functionName}(qXNodeIn, ref qXNodeOut); /* Call User Procedure */`);
      lines.push("");
      lines.push("                if (e.IsRequest) /* Just RequestReply */");
      lines.push("                {");
      lines.push("                    e.sendReply(qXNodeOut.OuterXml);");
      lines.push("                }");
    } else {
      lines.push(`                ${item.functionName}(qXNodeIn); /* Call User Procedure */`);
    }
    lines.push("            }");
    lines.push("            catch (Exception ex)");
    lines.push("            {");
    lines.push("                QDiagnostics.Throw(ex);");
    lines.push("            }");
    lines.push("            finally");
    lines.push("            {");
    lines.push("                qXNodeIn = null;");
    if (item.deliveryMode === "REQUEST") {
      lines.push("                qXNodeOut = null;");
    }
    lines.push("            }");
    lines.push("        }");
    lines.push("");
  });

  lines.push("        #endregion");
  lines.push("");
  lines.push("        //------------------------------------------------------------------------------------------------------------------------");
  lines.push("");
  lines.push("    }   // Class end");
  lines.push("}   // Namespace end");
  return lines.join("\r\n");
}

function appendElement(lines, elementNode, baseSpace) {
  const elementName = attr(elementNode, ATTRS.name, "");
  const tagName = attr(elementNode, ATTRS.tag, "") || elementName;

  lines.push(`${baseSpace}public const string Ele${elementName} = "${tagName}";`);
  lines.push("");
  lines.push(`${baseSpace}// --`);
  lines.push("");

  const attributes = elementChildrenByTag(elementNode, TAGS.attribute);
  attributes.forEach((attributeNode) => {
    const attributeName = attr(attributeNode, ATTRS.name, "");
    const attributeTag = attr(attributeNode, ATTRS.tag, "") || attributeName;
    lines.push(`${baseSpace}public const string Atr${attributeName} = "${attributeTag}";`);
  });

  lines.push("");
  lines.push(`${baseSpace}// --`);
  lines.push("");

  attributes.forEach((attributeNode) => {
    const attributeName = attr(attributeNode, ATTRS.name, "");
    const defaultValue = attr(attributeNode, ATTRS.defaultValue, "");
    lines.push(`${baseSpace}public const string Val${attributeName} = "${defaultValue}";`);
  });
}

function appendSubElement(lines, parentNode, baseSpace) {
  const children = elementChildrenByTag(parentNode, TAGS.element);
  children.forEach((childNode) => {
    const name = attr(childNode, ATTRS.name, "");
    lines.push("");
    lines.push(`${baseSpace}// --`);
    lines.push("");
    lines.push(`${baseSpace}public static class Q${name}`);
    lines.push(`${baseSpace}{`);
    const nextSpace = `${baseSpace}    `;
    appendElement(lines, childNode, nextSpace);
    appendSubElement(lines, childNode, nextSpace);
    lines.push(`${baseSpace}}`);
  });
}

function collectFunctions(namespaceNode) {
  const list = [];
  const groups = elementChildrenByTag(namespaceNode, TAGS.group);
  groups.forEach((groupNode) => {
    elementChildren(groupNode).forEach((childNode) => {
      if (childNode.tagName !== TAGS.function) return;
      list.push({
        functionName: attr(childNode, ATTRS.name, ""),
        deliveryMode: attr(childNode, ATTRS.deliveryMode, DEFAULTS.deliveryMode),
        asyncFlag: attr(childNode, ATTRS.async, DEFAULTS.async),
        guaranteed: attr(childNode, ATTRS.guaranteed, DEFAULTS.guaranteed),
      });
    });
  });
  return list;
}

function renderSimpleHeader(options) {
  return [
    "/*----------------------------------------------------------------------------------------------------------",
    `--  Description     : ${String(options.description || "")}`,
    `--  History         : Created by ${String(options.creator || "")} at ${today()}`,
    "----------------------------------------------------------------------------------------------------------*/",
  ];
}

function renderCopyrightHeader(options) {
  return [
    "/*----------------------------------------------------------------------------------------------------------",
    ...COPYRIGHT_BLOCK,
    "--",
    `--  Description     : ${String(options.description || "")}`,
    `--  History         : Created by ${String(options.creator || "")} at ${today()}`,
    "----------------------------------------------------------------------------------------------------------*/",
  ];
}

function normalizeOptions(options) {
  return {
    outputPath: String(options?.outputPath || "").trim(),
    creator: String(options?.creator || ""),
    description: String(options?.description || ""),
    organizeUsing: String(options?.organizeUsing || ""),
    generateParameter: toBool(options?.generateParameter),
    generateFunction: toBool(options?.generateFunction),
    internalClass: toBool(options?.internalClass),
  };
}

function today() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

async function writeText(filePath, content) {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, content, "utf8");
}

function level2Id(namespaceIndex, groupIndex, level2Index) {
  return `l2:${namespaceIndex}.${groupIndex}.${level2Index}`;
}

function toBool(value) {
  if (typeof value === "boolean") return value;
  const normalized = String(value || "").trim().toLowerCase();
  return ["true", "1", "yes", "y", "on"].includes(normalized);
}

function attr(node, key, fallback = "") {
  const value = node?.getAttribute?.(key);
  if (value == null) return fallback;
  return String(value);
}

function elementChildren(node) {
  return Array.from(node?.childNodes || []).filter((child) => child.nodeType === 1);
}

function elementChildrenByTag(node, tagName) {
  return elementChildren(node).filter((child) => child.tagName === tagName);
}
