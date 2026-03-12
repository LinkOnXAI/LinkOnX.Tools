import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import jwt from "jsonwebtoken";
import sql from "mssql";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerQueryDeveloperRoutes } from "./queryDeveloperRoutes.js";

const serverSrcDir = path.dirname(fileURLToPath(import.meta.url));
const serverRootDir = path.resolve(serverSrcDir, "..");
loadEnvFiles([
  path.join(serverRootDir, ".env.local"),
  path.join(serverRootDir, ".env"),
  path.resolve(serverRootDir, "..", ".env.local"),
  path.resolve(serverRootDir, "..", ".env"),
  path.join(serverRootDir, ".env.example"),
]);

const app = express();

const port = Number(process.env.PORT || 3001);
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const jwtSecret = process.env.JWT_SECRET || "linkonx-tools-dev-secret";
const authCookieName = "linkonx_qd_session";
const mssqlConnectionString = String(
  process.env.MSSQL_CONNECTION_STRING ||
    "Data Source=192.168.0.111,1433;Initial Catalog=LINKON;User ID=linkon;Password=p@ssw0rd!2",
).trim();
const authUserTable = String(process.env.AUTH_USER_TABLE || "QSECUSRDEF").trim();
const qsfRootDir = path.resolve(
  String(process.env.QSF_ROOT_DIR || path.join(process.cwd(), "data", "qsf")),
);
const securityKey = loadSecurityKey();
const isProduction = String(process.env.NODE_ENV || "").trim().toLowerCase() === "production";
const loginRateLimitEnabled = isProduction
  ? parseBoolean(process.env.LOGIN_RATE_LIMIT_ENABLED, true)
  : false;
const parsedAuthUserTable = parseSchemaTable(authUserTable);

let dbPool = null;

app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

const loginLimiter = new Map();

app.get("/api/health", async (_req, res) => {
  const pool = await getDbPool();
  await pool.request().query("SELECT 1 AS ok");
  res.json({
    ok: true,
    service: "linkonx-tools-api",
    module: "query-developer",
    storage: "disk-qsf",
    db: "mssql",
    qsfRootDir,
    pid: process.pid,
    env: isProduction ? "production" : "debug",
    loginRateLimitEnabled,
  });
});

app.post("/api/auth/login", async (req, res) => {
  const loginId = String(req.body?.id ?? req.body?.username ?? "").trim();
  const password = String(req.body?.password || "");
  const factory = String(req.body?.factory ?? "").trim();
  const key = `${req.ip || "unknown"}:${factory.toUpperCase()}:${loginId.toLowerCase()}`;
  const attempt = loginLimiter.get(key);

  if (!factory || !loginId || !password) {
    return res.status(400).json({ message: "Factory, ID and password are required." });
  }

  if (
    loginRateLimitEnabled &&
    attempt &&
    attempt.count >= 5 &&
    Date.now() - attempt.updatedAt < 5 * 60 * 1000
  ) {
    return res.status(429).json({ message: "Too many login attempts. Try again later." });
  }

  const pool = await getDbPool();
  const userQuery = `
SELECT TOP (1)
  FACTORY,
  USER_ID,
  USER_NAME,
  PASSWORD,
  DELETE_FLAG,
  EXPIRE_DATE
FROM ${quotedAuthUserTable()}
WHERE LTRIM(RTRIM(USER_ID)) = @userId
  AND LTRIM(RTRIM(FACTORY)) = @factory
  AND ISNULL(NULLIF(LTRIM(RTRIM(DELETE_FLAG)), N''), N'N') NOT IN (N'Y', N'1')
`;
  const result = await pool
    .request()
    .input("userId", sql.NVarChar(20), loginId)
    .input("factory", sql.NVarChar(10), factory)
    .query(userQuery);

  if (!result.recordset?.length) {
    if (loginRateLimitEnabled) {
      loginLimiter.set(key, {
        count: attempt ? attempt.count + 1 : 1,
        updatedAt: Date.now(),
      });
    }
    return res.status(401).json({ message: "Invalid username or password." });
  }

  const account = result.recordset[0];
  if (isExpiredAccount(account.EXPIRE_DATE)) {
    return res.status(403).json({ message: "Account expired. Contact administrator." });
  }

  const encryptedInput = encryptLegacyPassword(password, securityKey);
  const dbPassword = String(account.PASSWORD || "").trim();
  const isMatched =
    constantTimeEquals(dbPassword, encryptedInput) || constantTimeEquals(dbPassword, password);

  if (!isMatched) {
    if (loginRateLimitEnabled) {
      loginLimiter.set(key, {
        count: attempt ? attempt.count + 1 : 1,
        updatedAt: Date.now(),
      });
    }
    return res.status(401).json({ message: "Invalid username or password." });
  }

  loginLimiter.delete(key);

  const userFactory = String(account.FACTORY || "").trim();
  const userId = String(account.USER_ID || loginId).trim();
  const userName = String(account.USER_NAME || userId).trim();

  const token = jwt.sign(
    {
      sub: userId,
      factory: userFactory,
      userName,
      role: "query-developer",
    },
    jwtSecret,
    { expiresIn: "8h" },
  );

  res.cookie(authCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 8 * 60 * 60 * 1000,
  });

  return res.json({
    id: userId,
    username: userId,
    userName,
    factory: userFactory,
    role: "query-developer",
  });
});

app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie(authCookieName);
  res.json({ ok: true });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({
    id: req.user.sub,
    username: req.user.sub,
    userName: req.user.userName || req.user.sub,
    factory: req.user.factory || "",
    role: req.user.role,
  });
});

app.get("/api/qsf/files", requireAuth, async (_req, res) => {
  const files = await listQsfFiles();
  res.json({ files });
});

app.get("/api/qsf/download", requireAuth, async (req, res) => {
  const fileName = safeQsfFileName(req.query.name);
  if (!fileName) {
    return res.status(400).json({ message: "Invalid qsf file name." });
  }

  const fullPath = resolveQsfPath(fileName);
  const exists = await fileExists(fullPath);
  if (!exists) {
    return res.status(404).json({ message: "qsf file not found." });
  }

  return res.download(fullPath, fileName, (error) => {
    if (!error || res.headersSent) return;
    res.status(500).json({ message: "qsf download failed." });
  });
});

app.get("/api/qsf/tree", requireAuth, async (req, res) => {
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
  if (!root) {
    return res.status(422).json({ message: "Invalid qsf xml format." });
  }

  const tree = buildElementTree(root, [], `/${root.tagName}[1]`);
  const stat = await fs.promises.stat(fullPath);

  return res.json({
    name: fileName,
    size: stat.size,
    modifiedAt: stat.mtime.toISOString(),
    tree,
  });
});

app.put("/api/qsf/node", requireAuth, async (req, res) => {
  const fileName = safeQsfFileName(req.body?.name);
  const locator = req.body?.locator;
  const value = String(req.body?.value ?? "");

  if (!fileName) {
    return res.status(400).json({ message: "Invalid qsf file name." });
  }
  if (!locator || typeof locator !== "object") {
    return res.status(400).json({ message: "Missing node locator." });
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

  let result;
  try {
    result = updateXmlNodeValue(documentNode, locator, value);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
  const serialized = new XMLSerializer().serializeToString(documentNode);

  await fs.promises.writeFile(fullPath, serialized, "utf8");
  const stat = await fs.promises.stat(fullPath);

  return res.json({
    ok: true,
    name: fileName,
    kind: result.kind,
    path: result.path,
    value,
    size: stat.size,
    modifiedAt: stat.mtime.toISOString(),
    updatedBy: req.user.sub || "unknown",
  });
});

registerQueryDeveloperRoutes({
  app,
  requireAuth,
  safeQsfFileName,
  resolveQsfPath,
  fileExists,
  parseXmlDocument,
  fs,
  XMLSerializer,
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Internal server error." });
});

await ensureQsfRootReady();

app.listen(port, () => {
console.log(`[LinkOnX.Tools API] listening on http://localhost:${port}`);
console.log(`[LinkOnX.Tools API] qsf root: ${qsfRootDir}`);
console.log(`[LinkOnX.Tools API] auth table: ${quotedAuthUserTable()}`);
});

function requireAuth(req, res, next) {
  const token = req.cookies?.[authCookieName];
  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid session." });
  }
}

async function getDbPool() {
  if (dbPool?.connected) return dbPool;
  if (dbPool && !dbPool.connected) {
    try {
      await dbPool.close();
    } catch {
      // ignore cleanup errors
    }
  }
  dbPool = await new sql.ConnectionPool(buildMssqlConfig(mssqlConnectionString)).connect();
  return dbPool;
}

async function ensureQsfRootReady() {
  await ensureQsfDirectoryExists();
}

async function listQsfFiles() {
  await ensureQsfDirectoryExists();
  const entries = await fs.promises.readdir(qsfRootDir, { withFileTypes: true });
  const qsfEntries = entries.filter((entry) => entry.isFile() && /\.qsf$/i.test(entry.name));

  const files = [];
  for (const entry of qsfEntries) {
    const fullPath = resolveQsfPath(entry.name);
    const stat = await fs.promises.stat(fullPath);
    const systemName = await readSystemNameFromQsf(fullPath);
    files.push({
      name: entry.name,
      systemName,
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
    });
  }

  files.sort((left, right) => {
    const leftKey = String(left.systemName || left.name || "");
    const rightKey = String(right.systemName || right.name || "");
    const bySystem = leftKey.localeCompare(rightKey);
    if (bySystem !== 0) return bySystem;
    return String(left.name || "").localeCompare(String(right.name || ""));
  });
  return files;
}

async function readSystemNameFromQsf(fullPath) {
  try {
    const xmlText = await fs.promises.readFile(fullPath, "utf8");
    const documentNode = parseXmlDocument(xmlText);
    const root = documentNode.documentElement;
    if (!root || root.tagName !== "Q") return "";

    const firstSystem = getElementChildren(root).find((node) => node.tagName === "S");
    if (!firstSystem) return "";

    return readAttribute(firstSystem, "N", "").trim();
  } catch {
    return "";
  }
}

async function ensureQsfDirectoryExists() {
  const exists = await directoryExists(qsfRootDir);
  if (exists) return;
  await fs.promises.mkdir(qsfRootDir, { recursive: true });
}

function parseXmlDocument(xmlText) {
  let parseError = "";
  const parser = new DOMParser({
    errorHandler: {
      warning: () => {},
      error: (message) => {
        if (!parseError) parseError = String(message || "XML parse error");
      },
      fatalError: (message) => {
        if (!parseError) parseError = String(message || "XML parse fatal error");
      },
    },
  });

  const documentNode = parser.parseFromString(String(xmlText || ""), "application/xml");
  if (parseError) {
    throw new Error(`Invalid qsf xml: ${parseError}`);
  }

  return documentNode;
}

// Query Developer core functions were moved to ./queryDeveloperCore.js

function readAttribute(elementNode, attributeName, fallback = "") {
  const value = elementNode?.getAttribute?.(attributeName);
  if (value == null) return fallback;
  return String(value);
}

function buildElementTree(elementNode, elementPath, pathLabel) {
  const currentPath = [...elementPath];
  const children = [];

  for (const attribute of Array.from(elementNode.attributes || [])) {
    const attrName = String(attribute.name || "").trim();
    if (!attrName) continue;
    children.push({
      id: buildNodeId("attribute", currentPath, attrName),
      kind: "attribute",
      label: `@${attrName}`,
      path: `${pathLabel}/@${attrName}`,
      value: String(attribute.value || ""),
      editable: true,
      locator: {
        kind: "attribute",
        elementPath: currentPath,
        attributeName: attrName,
      },
      children: [],
    });
  }

  const childElements = getElementChildren(elementNode);
  const ownText = getOwnTextValue(elementNode);
  if (ownText !== "" || childElements.length === 0) {
    children.push({
      id: buildNodeId("text", currentPath),
      kind: "text",
      label: "#text",
      path: `${pathLabel}/text()`,
      value: ownText,
      editable: true,
      locator: {
        kind: "text",
        elementPath: currentPath,
      },
      children: [],
    });
  }

  childElements.forEach((childElement, index) => {
    const childPath = [...currentPath, index];
    const childPathLabel = `${pathLabel}/${childElement.tagName}[${index + 1}]`;
    children.push(buildElementTree(childElement, childPath, childPathLabel));
  });

  return {
    id: buildNodeId("element", currentPath),
    kind: "element",
    label: elementNode.tagName,
    path: pathLabel,
    value: "",
    editable: false,
    locator: {
      kind: "element",
      elementPath: currentPath,
    },
    children,
  };
}

function updateXmlNodeValue(documentNode, rawLocator, nextValue) {
  const root = documentNode?.documentElement;
  if (!root) {
    throw new Error("Invalid qsf xml format.");
  }

  const locator = normalizeLocator(rawLocator);
  const targetElement = findElementByPath(root, locator.elementPath);

  if (locator.kind === "attribute") {
    targetElement.setAttribute(locator.attributeName, nextValue);
    return {
      kind: "attribute",
      path: `${buildPathLabel(root, locator.elementPath)}/@${locator.attributeName}`,
    };
  }

  if (locator.kind === "text") {
    setOwnTextValue(targetElement, nextValue);
    return {
      kind: "text",
      path: `${buildPathLabel(root, locator.elementPath)}/text()`,
    };
  }

  throw new Error("Only attribute/text nodes are editable.");
}

function normalizeLocator(rawLocator) {
  if (!rawLocator || typeof rawLocator !== "object") {
    throw new Error("Invalid locator.");
  }

  const kind = String(rawLocator.kind || "").trim().toLowerCase();
  if (!["text", "attribute"].includes(kind)) {
    throw new Error("Invalid locator kind.");
  }

  const rawPath = Array.isArray(rawLocator.elementPath) ? rawLocator.elementPath : [];
  const elementPath = rawPath.map((value) => Number(value));
  for (const index of elementPath) {
    if (!Number.isInteger(index) || index < 0) {
      throw new Error("Invalid locator element path.");
    }
  }

  if (kind === "attribute") {
    const attributeName = String(rawLocator.attributeName || "").trim();
    if (!/^[A-Za-z_][A-Za-z0-9_.:-]*$/.test(attributeName)) {
      throw new Error("Invalid attribute name.");
    }
    return { kind, elementPath, attributeName };
  }

  return { kind, elementPath };
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

function getOwnTextValue(elementNode) {
  const chunks = [];
  for (const childNode of Array.from(elementNode.childNodes || [])) {
    if (childNode.nodeType === 3 || childNode.nodeType === 4) {
      chunks.push(childNode.data || "");
    }
  }
  return chunks.join("");
}

function setOwnTextValue(elementNode, value) {
  const targets = [];
  for (const childNode of Array.from(elementNode.childNodes || [])) {
    if (childNode.nodeType === 3 || childNode.nodeType === 4) {
      targets.push(childNode);
    }
  }

  for (const childNode of targets) {
    elementNode.removeChild(childNode);
  }

  if (!value) return;

  const textNode = elementNode.ownerDocument.createTextNode(value);
  const firstElementChild = getElementChildren(elementNode)[0];
  if (firstElementChild) {
    elementNode.insertBefore(textNode, firstElementChild);
  } else {
    elementNode.appendChild(textNode);
  }
}

function buildNodeId(kind, elementPath, attributeName) {
  const pathText = elementPath.length ? elementPath.join(".") : "root";
  if (kind === "attribute") {
    return `a:${pathText}:${attributeName}`;
  }
  if (kind === "text") {
    return `t:${pathText}`;
  }
  return `e:${pathText}`;
}

function resolveQsfPath(fileName) {
  const fullPath = path.resolve(qsfRootDir, fileName);
  const normalizedRoot = ensureTrailingSeparator(path.resolve(qsfRootDir));
  const normalizedFull = path.resolve(fullPath);

  if (!normalizedFull.toLowerCase().startsWith(normalizedRoot.toLowerCase())) {
    throw new Error("Invalid qsf file path.");
  }

  return normalizedFull;
}

function ensureTrailingSeparator(inputPath) {
  return inputPath.endsWith(path.sep) ? inputPath : `${inputPath}${path.sep}`;
}

function safeQsfFileName(rawName) {
  const fileName = String(rawName || "").trim();
  if (!fileName) return null;
  if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\") || fileName.includes(":")) {
    return null;
  }
  if (!/^[^\\/:*?"<>|]+\.qsf$/i.test(fileName)) {
    return null;
  }
  return fileName;
}

async function fileExists(targetPath) {
  try {
    const stat = await fs.promises.stat(targetPath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function directoryExists(targetPath) {
  try {
    const stat = await fs.promises.stat(targetPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

function parseSchemaTable(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    throw new Error("AUTH_USER_TABLE environment variable is required.");
  }
  const split = normalized.split(".");
  const namePattern = /^[A-Za-z_][A-Za-z0-9_]*$/;
  if (split.length === 1) {
    if (!namePattern.test(split[0])) {
      throw new Error(`Invalid table name: ${normalized}`);
    }
    return { schema: "dbo", table: split[0] };
  }
  if (split.length !== 2 || !namePattern.test(split[0]) || !namePattern.test(split[1])) {
    throw new Error(`Invalid schema.table name: ${normalized}`);
  }
  return {
    schema: split[0],
    table: split[1],
  };
}

function quotedAuthUserTable() {
  return `[${parsedAuthUserTable.schema}].[${parsedAuthUserTable.table}]`;
}

function buildMssqlConfig(connectionString) {
  const entries = parseConnectionString(connectionString);
  const dataSource = pickFirst(entries, ["data source", "server", "address", "addr", "network address"]);
  const database = pickFirst(entries, ["initial catalog", "database"]);
  const user = pickFirst(entries, ["user id", "uid", "user"]);
  const password = pickFirst(entries, ["password", "pwd"]);

  const hostPort = parseHostAndPort(dataSource);
  if (!hostPort.server) {
    throw new Error("Invalid MSSQL connection string: server/data source is missing.");
  }

  return {
    server: hostPort.server,
    port: hostPort.port,
    database,
    user,
    password,
    options: {
      encrypt: parseBoolean(pickFirst(entries, ["encrypt"]), false),
      trustServerCertificate: parseBoolean(pickFirst(entries, ["trustservercertificate"]), true),
      enableArithAbort: true,
    },
    pool: {
      min: 0,
      max: 10,
      idleTimeoutMillis: 30000,
    },
  };
}

function parseConnectionString(raw) {
  const map = new Map();
  String(raw || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const index = part.indexOf("=");
      if (index <= 0) return;
      const key = part.slice(0, index).trim().toLowerCase();
      const value = part.slice(index + 1).trim();
      map.set(key, value);
    });
  return map;
}

function pickFirst(entries, keys) {
  for (const key of keys) {
    if (entries.has(key)) return entries.get(key);
  }
  return undefined;
}

function parseHostAndPort(dataSource) {
  const source = String(dataSource || "").trim();
  if (!source) return { server: "", port: 1433 };

  if (source.startsWith("tcp:")) {
    return parseHostAndPort(source.slice(4));
  }

  if (source.includes(",")) {
    const [server, portRaw] = source.split(",");
    return {
      server: server.trim(),
      port: Number(portRaw || 1433) || 1433,
    };
  }

  if (source.includes(":")) {
    const [server, portRaw] = source.split(":");
    return {
      server: server.trim(),
      port: Number(portRaw || 1433) || 1433,
    };
  }

  return { server: source, port: 1433 };
}

function parseBoolean(value, fallback) {
  if (value == null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;
  return fallback;
}

function encryptLegacyPassword(text, key) {
  const plainText = String(text || "");
  const passwordKey = String(key || "");
  const salt = Buffer.from(String(passwordKey.length), "ascii");
  const deriver = createPasswordDeriveBytes(passwordKey, salt, "sha1", 100);
  const secretKey = deriver.getBytes(32);
  const iv = deriver.getBytes(16);

  const cipher = crypto.createCipheriv("aes-256-cbc", secretKey, iv);
  cipher.setAutoPadding(true);
  const cryptorBytes = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  return cryptorBytes.toString("base64");
}

function createPasswordDeriveBytes(password, salt, hashName, iterations) {
  const passwordBytes = Buffer.from(String(password || ""), "utf8");
  const saltBytes = salt ? Buffer.from(salt) : null;
  const hashAlgorithm = String(hashName || "sha1").toLowerCase();
  let prefix = 0;
  let extra = null;
  let extraCount = 0;
  let baseValue = null;

  return {
    getBytes(cb) {
      let ib = 0;
      const output = Buffer.alloc(cb);

      if (!baseValue) {
        baseValue = computeBaseValue(passwordBytes, saltBytes, hashAlgorithm, iterations);
      } else if (extra) {
        ib = extra.length - extraCount;
        if (ib >= cb) {
          extra.copy(output, 0, extraCount, extraCount + cb);
          if (ib > cb) extraCount += cb;
          else extra = null;
          return output;
        }

        // Preserve .NET Framework behavior, including the historical offset bug.
        extra.copy(output, 0, ib, ib + ib);
        extra = null;
      }

      const computed = computeBytes(baseValue, cb - ib, hashAlgorithm, () => {
        const bytes = buildHashPrefix(prefix);
        prefix += 1;
        return bytes;
      });
      computed.copy(output, ib, 0, cb - ib);
      if (computed.length + ib > cb) {
        extra = computed;
        extraCount = cb - ib;
      }
      return output;
    },
  };
}

function computeBaseValue(passwordBytes, saltBytes, hashName, iterations) {
  let value = hashBuffer(hashName, [passwordBytes, saltBytes || Buffer.alloc(0)]);
  for (let i = 1; i < iterations - 1; i += 1) {
    value = hashBuffer(hashName, [value]);
  }
  return value;
}

function computeBytes(baseValue, cb, hashName, nextPrefixBytes) {
  const hashSize = hashBuffer(hashName, [Buffer.alloc(0)]).length;
  const totalLength = Math.ceil(cb / hashSize) * hashSize;
  const result = Buffer.alloc(totalLength);
  let ib = 0;
  while (ib < cb) {
    const prefix = nextPrefixBytes();
    const hash = hashBuffer(hashName, [prefix, baseValue]);
    hash.copy(result, ib, 0, hashSize);
    ib += hashSize;
  }
  return result;
}

function buildHashPrefix(prefix) {
  if (prefix <= 0) return Buffer.alloc(0);
  if (prefix > 999) {
    throw new Error("PasswordDeriveBytes_TooManyBytes");
  }
  return Buffer.from(String(prefix), "ascii");
}

function hashBuffer(hashName, buffers) {
  const hash = crypto.createHash(hashName);
  for (const part of buffers) {
    if (!part || part.length === 0) continue;
    hash.update(part);
  }
  return hash.digest();
}

function isExpiredAccount(expireDateRaw) {
  const raw = String(expireDateRaw || "").trim();
  if (!raw) return false;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) return false;

  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  const hour = digits.length >= 10 ? Number(digits.slice(8, 10)) : 23;
  const minute = digits.length >= 12 ? Number(digits.slice(10, 12)) : 59;
  const second = digits.length >= 14 ? Number(digits.slice(12, 14)) : 59;
  const milli = digits.length >= 17 ? Number(digits.slice(14, 17)) : 999;
  if ([year, month, day, hour, minute, second, milli].some((value) => Number.isNaN(value))) {
    return false;
  }

  const expiresAt = new Date(year, month - 1, day, hour, minute, second, milli);
  if (Number.isNaN(expiresAt.getTime())) return false;
  return Date.now() > expiresAt.getTime();
}

function constantTimeEquals(left, right) {
  const leftText = String(left || "");
  const rightText = String(right || "");
  const leftBytes = Buffer.from(leftText, "utf8");
  const rightBytes = Buffer.from(rightText, "utf8");
  if (leftBytes.length !== rightBytes.length) return false;
  return crypto.timingSafeEqual(leftBytes, rightBytes);
}

function loadSecurityKey() {
  const fromEnv = String(process.env.SECURITY_KEY || "").trim();
  if (fromEnv) return fromEnv;

  const keyFile = String(process.env.SECURITY_KEY_FILE || "").trim();
  if (keyFile) {
    try {
      const raw = fs.readFileSync(keyFile, "utf8");
      const loaded = String(raw || "").trim();
      if (loaded) return loaded;
    } catch (error) {
      throw new Error(`SECURITY_KEY_FILE read failed: ${error.message}`);
    }
  }

  throw new Error("Missing security key. Set SECURITY_KEY or SECURITY_KEY_FILE.");
}

function loadEnvFiles(filePaths) {
  const visited = new Set();
  for (const candidate of filePaths || []) {
    const envPath = path.resolve(String(candidate || ""));
    if (!envPath || visited.has(envPath)) continue;
    visited.add(envPath);
    if (!fs.existsSync(envPath)) continue;
    dotenv.config({ path: envPath, override: false });
  }
}
