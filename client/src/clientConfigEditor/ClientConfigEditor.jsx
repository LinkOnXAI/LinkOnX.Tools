import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./ClientConfigEditor.css";

const APP_BASE_PATH = normalizeBasePath(import.meta.env.BASE_URL || "/");
const NEW_ICON_SRC = buildClientPath("icons/menuEditor/new_16x16.png");
const OPEN_ICON_SRC = buildClientPath("icons/menuEditor/open_16x16.png");
const SAVE_ICON_SRC = buildClientPath("icons/menuEditor/save_16x16.png");
const SAVE_AS_ICON_SRC = buildClientPath("icons/clientConfig/saveall_16x16.png");
const UPDATE_ICON_SRC = buildClientPath("icons/languageEditor/ToolCheck.png");
const DELETE_ICON_SRC = buildClientPath("icons/languageEditor/ToolRemove.png");

const YES_NO_OPTIONS = ["Yes", "No"];
const BOOL_OPTIONS = ["True", "False"];
const LANGUAGE_OPTIONS = ["DEF", "ENG", "KOR", "CHN"];
const FIND_BEHAVIOR_OPTIONS = ["Search", "Find", "Filter"];
const MESSAGE_BROKER_OPTIONS = ["ActiveMQ", "Highway101"];

const ROOT_META_ATTR_ORDER = ["QF", "QV", "QC", "QU", "QD", "QS"];
const SITE_FIELD_ALIASES = { site: ["SIT"], factory: ["FAB"], description: ["DEC"] };
const CLIENT_CATEGORIES = [
  { id: "general", label: "Default" },
  { id: "log", label: "Log" },
  { id: "appUpdate", label: "Application Update" },
];
const CLIENT_GROUPS = {
  general: [
    { title: "[01] Language", fields: [{ key: "language", label: "Language", type: "enum", options: LANGUAGE_OPTIONS, aliases: ["LNG", "LAN"], defaultValue: "DEF" }] },
    { title: "[02] Font", fields: [{ key: "fontName", label: "Font Name", type: "text", aliases: ["FNM", "FON"], defaultValue: "Verdana" }, { key: "fontSize", label: "Font Size", type: "number", aliases: ["FSZ", "FOS"], defaultValue: "8.25" }] },
    { title: "[03] Skin", fields: [{ key: "skinName", label: "Skin Name", type: "text", aliases: ["SKN"], defaultValue: "Basic" }] },
    { title: "[04] Debug Log", fields: [{ key: "debugLogFileSubfix", label: "File Subfix", type: "text", aliases: ["DLS", "DLSF"], defaultValue: "QClient" }, { key: "debugLogFileKeepingPeriod", label: "File Keeping Period (Day)", type: "number", aliases: ["DLK", "DLKP"], defaultValue: "30" }] },
    { title: "[05] Addition", fields: [{ key: "defaultSearchPeriod", label: "Default Search Period", type: "number", aliases: ["DSP"], defaultValue: "7" }, { key: "findBehavior", label: "Find Behavior", type: "enum", options: FIND_BEHAVIOR_OPTIONS, aliases: ["FBH", "FBD"], defaultValue: "Search" }, { key: "alertEnable", label: "Alert Enable", type: "bool", options: BOOL_OPTIONS, aliases: ["ALE"], defaultValue: "True" }] },
    { title: "[06] Security", fields: [{ key: "usedScreenLock", label: "Used Screen Lock", type: "yesNo", options: YES_NO_OPTIONS, aliases: ["SCL", "USL"], defaultValue: "No" }, { key: "screenInactivityTimeout", label: "Inactivity Timeout", type: "number", aliases: ["SCTO", "SITM"], defaultValue: "10", visibleWhen: (ctx) => ctx.usedScreenLock === "Yes" }] },
  ],
  log: [{ title: "[01] Color", fields: [{ key: "flowFontColor", label: "Flow", type: "text", aliases: ["FFC"], defaultValue: "Black" }, { key: "commentFontColor", label: "Comment", type: "text", aliases: ["CFC"], defaultValue: "DarkGreen" }, { key: "messageReceivedFontColor", label: "Received", type: "text", aliases: ["RFC"], defaultValue: "DarkRed" }, { key: "messageSentFontColor", label: "Sent", type: "text", aliases: ["SFC"], defaultValue: "Blue" }] }],
  appUpdate: [{ title: "[01] Client Update", fields: [{ key: "isNetworkDeployed", label: "Network Deployed", type: "yesNo", options: YES_NO_OPTIONS, aliases: ["NDPLY"], defaultValue: "No" }, { key: "appUrl", label: "Application URL", type: "text", aliases: ["APUR", "UDU", "PURL"], defaultValue: "", visibleWhen: (ctx) => ctx.isNetworkDeployed === "Yes" }, { key: "updateCheckPeriod", label: "Update Check Period (min)", type: "number", aliases: ["UCKP", "UCP"], defaultValue: "0", visibleWhen: (ctx) => ctx.isNetworkDeployed === "Yes" }] }],
};
const FTP_VISIBLE = (values) => normalizeBoolValue(values.ftpAnonymous, "True") === "False";
const makeTab = (id, alias, defaults = {}) => ({
  id,
  label: id,
  groups: [
    { title: "[01] Middleware", fields: [{ key: "messageBroker", label: "Message Broker", type: "enum", options: MESSAGE_BROKER_OPTIONS, aliases: [alias.mb], defaultValue: "ActiveMQ" }, { key: "connectionString", label: "Connection String", type: "text", aliases: [alias.cs], defaultValue: defaults.cs ?? "tcp://localhost:61616" }, { key: "timeout", label: "Timeout (sec)", type: "number", aliases: [alias.tc], defaultValue: defaults.tc ?? "30000" }] },
    { title: "[02] Channel", fields: [{ key: "tuneChannelId", label: "Tune Channel", type: "text", aliases: [alias.ti], defaultValue: defaults.ti ?? "" }, { key: "castChannelId", label: "Cast Channel", type: "text", aliases: [alias.cc], defaultValue: defaults.cc ?? "" }] },
    {
      title: "[03] Ftp",
      fields: [
        { key: "ftpIp", label: "IP", type: "text", aliases: [alias.fi], defaultValue: defaults.fi ?? "localhost" },
        { key: "ftpAnonymous", label: "Used Anonymous", type: "bool", options: BOOL_OPTIONS, aliases: [alias.ua], defaultValue: "True" },
        { key: "ftpUserId", label: "User ID", type: "text", aliases: [alias.fu], defaultValue: defaults.fu ?? "anonymous", visibleWhen: FTP_VISIBLE },
        { key: "ftpPassword", label: "Password", type: "password", aliases: [alias.fp], defaultValue: "", visibleWhen: FTP_VISIBLE },
      ],
    },
  ],
});

const SITE_TABS = [
  {
    id: "BIS",
    label: "BIS",
    groups: [
      { title: "[01] Middleware", fields: [{ key: "messageBroker", label: "Message Broker", type: "enum", options: MESSAGE_BROKER_OPTIONS, aliases: ["BSMB"], defaultValue: "ActiveMQ" }, { key: "connectionString", label: "Connection String", type: "text", aliases: ["BSCS"], defaultValue: "tcp://localhost:61616" }, { key: "timeout", label: "Timeout (sec)", type: "number", aliases: ["BSTO"], defaultValue: "30000" }] },
      { title: "[02] Channel", fields: [{ key: "tuneChannelId", label: "Tune Channel", type: "text", aliases: ["BSTC"], defaultValue: "/LON/BISLOC" }, { key: "castChannelId", label: "Cast Channel", type: "text", aliases: ["BSCC"], defaultValue: "/LON/LOCBIS" }] },
      { title: "[03] User Validation", fields: [{ key: "externalUserValidation", label: "External User Validation", type: "bool", options: BOOL_OPTIONS, aliases: ["BSUV"], defaultValue: "False" }] },
      {
        title: "[04] Ftp",
        fields: [
          { key: "ftpIp", label: "IP", type: "text", aliases: ["BSFI"], defaultValue: "localhost" },
          { key: "ftpAnonymous", label: "Used Anonymous", type: "bool", options: BOOL_OPTIONS, aliases: ["BSUA"], defaultValue: "True" },
          { key: "ftpUserId", label: "User ID", type: "text", aliases: ["BSFU"], defaultValue: "anonymous", visibleWhen: FTP_VISIBLE },
          { key: "ftpPassword", label: "Password", type: "password", aliases: ["BSFP"], defaultValue: "", visibleWhen: FTP_VISIBLE },
        ],
      },
    ],
  },
  makeTab("EMS", { mb: "EMB", cs: "ECS", tc: "ETO", ti: "ETC", cc: "ECC", fi: "EFI", ua: "EUA", fu: "EFU", fp: "EFP" }, { ti: "/LON/EMSLOC", cc: "/LON/LOCEMS" }),
  makeTab("RMS", { mb: "RMB", cs: "RCS", tc: "RTO", ti: "RTC", cc: "RCC", fi: "RFI", ua: "RUA", fu: "RFU", fp: "RFP" }, { ti: "/LON/RMSLOC", cc: "/LON/LOCRMS" }),
  makeTab("DTS", { mb: "DMB", cs: "DCS", tc: "DTO", ti: "DTC", cc: "DCC", fi: "DFI", ua: "DUA", fu: "DFU", fp: "DFP" }, { ti: "/LON/DTSLOC", cc: "/LON/LOCDTS" }),
  makeTab("DLS", { mb: "DLMB", cs: "DLCS", tc: "DLTO", ti: "DLTC", cc: "DLCC", fi: "DLFI", ua: "DLUA", fu: "DLFU", fp: "DLFP" }, { ti: "/LON/DLSLOC", cc: "/LON/LOCDLS" }),
  makeTab("WMS", { mb: "WMMB", cs: "WMCS", tc: "WMTO", ti: "WMTC", cc: "WMCC", fi: "WMFI", ua: "WMUA", fu: "WMFU", fp: "WMFP" }, { ti: "/LON/WMSLOC", cc: "/LON/LOCWMS" }),
  {
    id: "EES",
    label: "EES",
    groups: [
      { title: "[01] Middleware", fields: [{ key: "messageBroker", label: "Message Broker", type: "enum", options: MESSAGE_BROKER_OPTIONS, aliases: ["EEMB", "NMB"], defaultValue: "ActiveMQ" }, { key: "connectionString", label: "Connection String", type: "text", aliases: ["EECS", "NCS"], defaultValue: "tcp://localhost:61616" }, { key: "timeout", label: "Timeout (sec)", type: "number", aliases: ["EETO", "NTC"], defaultValue: "30000" }] },
      { title: "[02] Mns", fields: [{ key: "mnsTuneChannelId", label: "Mns Tune Channel", type: "text", aliases: ["EETC", "MNS1"], defaultValue: "/NON/MNSNOC" }, { key: "mnsCastChannelId", label: "Mns Cast Channel", type: "text", aliases: ["EECC", "MNS2"], defaultValue: "/NON/NOCMNS" }] },
      { title: "[03] Nds", fields: [{ key: "ndsTuneChannelId", label: "Nds Tune Channel", type: "text", aliases: ["NDTC", "NDS1"], defaultValue: "/NON/NDSNOC" }, { key: "ndsCastChannelId", label: "Nds Cast Channel", type: "text", aliases: ["NDCC", "NDS2"], defaultValue: "/NON/NOCNDS" }] },
      {
        title: "[04] Ftp",
        fields: [
          { key: "ftpIp", label: "IP", type: "text", aliases: ["EEFI"], defaultValue: "localhost" },
          { key: "ftpAnonymous", label: "Used Anonymous", type: "bool", options: BOOL_OPTIONS, aliases: ["EEUA"], defaultValue: "True" },
          { key: "ftpUserId", label: "User ID", type: "text", aliases: ["EEFU"], defaultValue: "anonymous", visibleWhen: FTP_VISIBLE },
          { key: "ftpPassword", label: "Password", type: "password", aliases: ["EEFP"], defaultValue: "", visibleWhen: FTP_VISIBLE },
        ],
      },
    ],
  },
  makeTab("RPS", { mb: "RP0", cs: "RP1", tc: "RP2", ti: "RP3", cc: "RP4", fi: "RP5", ua: "RP6", fu: "RP7", fp: "RP8" }, { ti: "/LON/RPSLOC", cc: "/LON/LOCRPS" }),
];

const CLIENT_ATTR_ORDER = buildClientAttrOrder();
const SITE_ATTR_ORDER = buildSiteAttrOrder();
const CLIENT_FIELDS = collectFields(CLIENT_GROUPS);
const SITE_FIELDS = collectFields(SITE_TABS);
const EXTRA_OPT_BOOL_ALIASES = ["CIS"];
let SITE_ROW_COUNTER = 1;

export function ClientConfigEditor() {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileHandle, setFileHandle] = useState(null);
  const [cfgDoc, setCfgDoc] = useState(null);
  const [siteDraft, setSiteDraft] = useState(() => createEmptySiteDraft());
  const [isDirty, setIsDirty] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [activeMainTab, setActiveMainTab] = useState("client");
  const [activeClientCategory, setActiveClientCategory] = useState("general");
  const [activeSiteTab, setActiveSiteTab] = useState("BIS");

  const hasDocument = Boolean(cfgDoc);
  const selectedSiteRow = useMemo(() => (cfgDoc?.siteRows || []).find((row) => row.id === cfgDoc?.selectedSiteId) || null, [cfgDoc?.selectedSiteId, cfgDoc?.siteRows]);
  const activeClientGroups = useMemo(() => (hasDocument ? (CLIENT_GROUPS[activeClientCategory] || []) : []), [activeClientCategory, hasDocument]);
  const activeSiteDef = useMemo(() => SITE_TABS.find((tab) => tab.id === activeSiteTab) || SITE_TABS[0], [activeSiteTab]);
  const clientCtx = useMemo(() => ({ usedScreenLock: normalizeYesNoValue(getValueByAliases(cfgDoc?.optAttrs, ["SCL", "USL"], "No"), "No"), isNetworkDeployed: normalizeYesNoValue(getValueByAliases(cfgDoc?.optAttrs, ["NDPLY"], "No"), "No") }), [cfgDoc?.optAttrs]);
  useEffect(() => {
    if (!cfgDoc) {
      setSiteDraft(createEmptySiteDraft());
      return;
    }
    if (!cfgDoc.siteRows.length) {
      if (cfgDoc.selectedSiteId) setCfgDoc((prev) => (prev ? { ...prev, selectedSiteId: "" } : prev));
      setSiteDraft(createEmptySiteDraft());
      return;
    }
    const exists = cfgDoc.siteRows.some((row) => row.id === cfgDoc.selectedSiteId);
    if (!exists) {
      setCfgDoc((prev) => (prev ? { ...prev, selectedSiteId: prev.siteRows[0]?.id || "" } : prev));
      return;
    }
    if (selectedSiteRow) setSiteDraft(createDraftFromSiteAttrs(selectedSiteRow.attrs));
  }, [cfgDoc?.selectedSiteId, cfgDoc?.siteRows, selectedSiteRow]);

  const onCreate = useCallback(() => {
    setCfgDoc(createDefaultDoc(new Date()));
    setSiteDraft(createEmptySiteDraft());
    setSelectedFile({ name: "LinkOnClient.cfg" });
    setFileHandle(null);
    setActiveMainTab("client");
    setActiveClientCategory("general");
    setActiveSiteTab("BIS");
    setIsDirty(false);
    setErrorText("");
  }, []);

  const onLoad = useCallback(async (file, nextHandle = null) => {
    if (!file) return;
    if (!/\.cfg$/i.test(String(file.name || ""))) {
      setErrorText("Please select a file with the .cfg extension.");
      return;
    }
    try {
      const parsed = parseClientConfigXml(await file.text());
      setCfgDoc(parsed);
      setSelectedFile({ name: ensureConfigFileName(file.name || "LinkOnClient.cfg") });
      setFileHandle(nextHandle);
      setActiveMainTab("client");
      setActiveClientCategory("general");
      setActiveSiteTab("BIS");
      setIsDirty(false);
      setErrorText("");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Failed to parse .cfg file.");
    }
  }, []);

  const onOpen = useCallback(async () => {
    if (supportsFileSystemAccess()) {
      try {
        const [handle] = await window.showOpenFilePicker({ multiple: false, excludeAcceptAllOption: true, types: [{ description: "Client Config Files", accept: { "application/xml": [".cfg"] } }] });
        if (!handle) return;
        await onLoad(await handle.getFile(), handle);
      } catch (error) {
        if (isAbortError(error)) return;
        setErrorText(error instanceof Error ? error.message : "Failed to open .cfg file.");
      }
      return;
    }
    const input = fileInputRef.current;
    if (!input) return;
    input.value = "";
    input.click();
  }, [onLoad]);

  const onSave = useCallback(async (forceSaveAs = false) => {
    if (!cfgDoc) return;
    try {
      const built = buildClientConfigXml(cfgDoc);
      let nextHandle = fileHandle;
      let nextName = ensureConfigFileName(selectedFile?.name || "LinkOnClient.cfg");
      if (supportsFileSystemAccess()) {
        if (forceSaveAs || !nextHandle) nextHandle = await window.showSaveFilePicker({ suggestedName: nextName, excludeAcceptAllOption: true, types: [{ description: "Client Config Files", accept: { "application/xml": [".cfg"] } }] });
        const writable = await nextHandle.createWritable();
        await writable.write(built.xmlText);
        await writable.close();
        nextName = ensureConfigFileName(nextHandle.name || nextName);
        setFileHandle(nextHandle);
      } else {
        if (forceSaveAs || !selectedFile?.name) nextName = ensureConfigFileName(window.prompt("Save file name", nextName) || nextName);
        downloadConfigFile(nextName, built.xmlText);
        setFileHandle(null);
      }
      setCfgDoc(built.nextDoc);
      setSelectedFile({ name: nextName });
      setIsDirty(false);
      setErrorText("");
    } catch (error) {
      if (isAbortError(error)) return;
      setErrorText(error instanceof Error ? error.message : "Failed to save .cfg file.");
    }
  }, [cfgDoc, fileHandle, selectedFile]);
  const onClientValue = useCallback((field, value) => {
    if (!cfgDoc) return;
    setCfgDoc((prev) => {
      if (!prev) return prev;
      const optAttrs = { ...(prev.optAttrs || {}) };
      const normalizedValue = normalizeFieldValue(field, value);
      setValueByAliases(optAttrs, field.aliases || [], normalizedValue);
      if (String(field?.key || "") === "isNetworkDeployed") {
        syncNetworkDeployAliases(optAttrs);
      }
      return { ...prev, optAttrs };
    });
    setIsDirty(true);
    setErrorText("");
  }, []);

  const onUpdateSite = useCallback(() => {
    if (!cfgDoc) return;
    const site = String(siteDraft.site || "").trim();
    const factory = String(siteDraft.factory || "").trim();
    if (!site) return setErrorText("Site is required.");
    if (!factory) return setErrorText("Factory is required.");
    setCfgDoc((prev) => {
      if (!prev) return prev;
      const matched = prev.siteRows.find((row) => normalizeSiteKey(getSiteValue(row.attrs, "site")) === normalizeSiteKey(site)) || null;
      const targetId = matched ? matched.id : createSiteRowId();
      const attrs = { ...(matched?.attrs || {}) };
      setValueByAliases(attrs, SITE_FIELD_ALIASES.site, site);
      setValueByAliases(attrs, SITE_FIELD_ALIASES.factory, factory);
      setValueByAliases(attrs, SITE_FIELD_ALIASES.description, String(siteDraft.description || "").trim());
      for (const tab of SITE_TABS) {
        const values = siteDraft.services?.[tab.id] || {};
        for (const group of tab.groups || []) for (const field of group.fields || []) {
          const normalized = normalizeFieldValue(field, values[field.key]);
          const isPassword = String(field?.type || "").toLowerCase() === "password";
          const hasExistingPassword = isPassword && (field.aliases || []).some((alias) => {
            if (!Object.prototype.hasOwnProperty.call(attrs, alias)) return false;
            return String(attrs[alias] ?? "").trim().length > 0;
          });
          if (isPassword && !String(normalized ?? "").trim() && hasExistingPassword) {
            continue;
          }
          setValueByAliases(attrs, field.aliases || [], normalized);
        }
      }
      let siteRows = prev.siteRows.map((row) => (row.id === targetId ? { ...row, attrs } : row));
      if (!matched) siteRows = [...siteRows, { id: targetId, attrs }];
      return { ...prev, siteRows, selectedSiteId: targetId, referenceSiteAttrs: { ...attrs } };
    });
    setIsDirty(true);
    setErrorText("");
  }, [siteDraft]);

  const onDeleteSite = useCallback(() => {
    if (!cfgDoc) return;
    if (!selectedSiteRow) return;
    setCfgDoc((prev) => {
      if (!prev) return prev;
      const siteRows = prev.siteRows.filter((row) => row.id !== selectedSiteRow.id);
      const next = siteRows[0] || null;
      return { ...prev, siteRows, selectedSiteId: next?.id || "", referenceSiteAttrs: next ? { ...(next.attrs || {}) } : {} };
    });
    setIsDirty(true);
    setErrorText("");
  }, [selectedSiteRow]);

  return (
    <section className="panel ClientConfigEditor-panel">
      <input ref={fileInputRef} type="file" accept=".cfg" className="ClientConfigEditor-hidden-file-input" onChange={(event) => { const file = event.target?.files?.[0]; if (file) void onLoad(file, null); }} />
      <div className="ClientConfigEditor-file-actions-wrap">
        <div className="ClientConfigEditor-file-actions">
          <button type="button" className="ClientConfigEditor-file-action-btn" onClick={onCreate} title="New"><img src={NEW_ICON_SRC} alt="New" /></button>
          <button type="button" className="ClientConfigEditor-file-action-btn" onClick={onOpen} title="Open"><img src={OPEN_ICON_SRC} alt="Open" /></button>
          <button type="button" className="ClientConfigEditor-file-action-btn" onClick={() => void onSave(false)} title="Save" disabled={!hasDocument}><img src={SAVE_ICON_SRC} alt="Save" /></button>
          <button type="button" className="ClientConfigEditor-file-action-btn" onClick={() => void onSave(true)} title="Save As" disabled={!hasDocument}><img src={SAVE_AS_ICON_SRC} alt="Save As" /></button>
        </div>
        <p className="ClientConfigEditor-inline-file-name">{selectedFile?.name ? `${selectedFile.name}${isDirty ? " *" : ""}` : ""}</p>
      </div>
      {errorText ? <p className="error-text ClientConfigEditor-inline-error">{errorText}</p> : null}
      <div className="ClientConfigEditor-toolbar-splitter" aria-hidden="true" />

      <div className="ClientConfigEditor-main-tabs" role="tablist" aria-label="Client Config Main Tabs">
        <button type="button" className={`ClientConfigEditor-main-tab-btn${activeMainTab === "client" ? " active" : ""}`} onClick={() => setActiveMainTab("client")}>Client Configuration</button>
        <button type="button" className={`ClientConfigEditor-main-tab-btn${activeMainTab === "site" ? " active" : ""}`} onClick={() => setActiveMainTab("site")}>Site Configuration</button>
      </div>
      <div className="ClientConfigEditor-main-content">
        {activeMainTab === "client" ? (
          <div className="ClientConfigEditor-client-layout">
            <section className="ClientConfigEditor-left-panel"><div className="ClientConfigEditor-list-head">Category</div><div className="ClientConfigEditor-list-scroll">{(hasDocument ? CLIENT_CATEGORIES : []).map((row) => <button key={row.id} type="button" className={`ClientConfigEditor-list-row${activeClientCategory === row.id ? " active" : ""}`} onClick={() => setActiveClientCategory(row.id)}>{row.label}</button>)}</div></section>
            <section className="ClientConfigEditor-prop-panel ClientConfigEditor-client-prop-panel">{hasDocument ? <><div className="ClientConfigEditor-prop-head"><h3>Properties</h3></div><div className="ClientConfigEditor-prop-scroll">{activeClientGroups.map((group) => <section key={group.title} className="ClientConfigEditor-prop-group"><h4 className="ClientConfigEditor-prop-category">{group.title}</h4>{group.fields.filter((field) => (typeof field.visibleWhen === "function" ? field.visibleWhen(clientCtx) : true)).map((field) => <PropertyRow key={field.key} field={field} value={normalizeFieldValue(field, getValueByAliases(cfgDoc?.optAttrs, field.aliases, field.defaultValue ?? ""))} onChange={(value) => onClientValue(field, value)} />)}</section>)}</div></> : <div className="ClientConfigEditor-empty-panel" />}</section>
          </div>
        ) : (
          <div className="ClientConfigEditor-site-layout">
            <section className="ClientConfigEditor-left-panel"><div className="ClientConfigEditor-list-head ClientConfigEditor-site-grid-head"><span>Site</span><span>Factory</span><span>Description</span></div><div className="ClientConfigEditor-site-grid-scroll">{hasDocument && (cfgDoc?.siteRows || []).length ? (cfgDoc?.siteRows || []).map((row) => <button key={row.id} type="button" className={`ClientConfigEditor-site-grid-row${cfgDoc?.selectedSiteId === row.id ? " active" : ""}`} onClick={() => setCfgDoc((prev) => (prev ? { ...prev, selectedSiteId: row.id } : prev))}><span>{getSiteValue(row.attrs, "site") || "-"}</span><span>{getSiteValue(row.attrs, "factory") || "-"}</span><span>{getSiteValue(row.attrs, "description") || "-"}</span></button>) : <div className="ClientConfigEditor-site-grid-empty" />}</div></section>
            <section className="ClientConfigEditor-prop-panel ClientConfigEditor-site-prop-panel">
              {hasDocument ? (
                <>
                  <div className="ClientConfigEditor-site-actions"><button type="button" className="ClientConfigEditor-icon-btn" onClick={onUpdateSite} title="Update"><img src={UPDATE_ICON_SRC} alt="Update" /></button><button type="button" className="ClientConfigEditor-icon-btn" onClick={onDeleteSite} title="Delete" disabled={!selectedSiteRow}><img src={DELETE_ICON_SRC} alt="Delete" /></button></div>
                  <div className="ClientConfigEditor-separator" />
                  <div className="ClientConfigEditor-site-fields"><label className="ClientConfigEditor-site-field-row"><span>Site</span><input value={siteDraft.site} onChange={(event) => setSiteDraft((prev) => ({ ...prev, site: event.target.value }))} spellCheck={false} /></label><label className="ClientConfigEditor-site-field-row"><span>Factory</span><input value={siteDraft.factory} onChange={(event) => setSiteDraft((prev) => ({ ...prev, factory: event.target.value }))} spellCheck={false} /></label><label className="ClientConfigEditor-site-field-row"><span>Description</span><input value={siteDraft.description} onChange={(event) => setSiteDraft((prev) => ({ ...prev, description: event.target.value }))} spellCheck={false} /></label></div>
                  <div className="ClientConfigEditor-separator" />
                  <div className="ClientConfigEditor-site-tabs" role="tablist" aria-label="Site Tabs">{SITE_TABS.map((tab) => <button key={tab.id} type="button" className={`ClientConfigEditor-site-tab-btn${activeSiteTab === tab.id ? " active" : ""}`} onClick={() => setActiveSiteTab(tab.id)}>{tab.label}</button>)}</div>
                  <div className="ClientConfigEditor-prop-scroll">{(activeSiteDef.groups || []).map((group) => { const tabValues = siteDraft.services?.[activeSiteDef.id] || {}; return <section key={`${activeSiteDef.id}-${group.title}`} className="ClientConfigEditor-prop-group"><h4 className="ClientConfigEditor-prop-category">{group.title}</h4>{group.fields.filter((field) => (typeof field.visibleWhen === "function" ? field.visibleWhen(tabValues) : true)).map((field) => <PropertyRow key={`${activeSiteDef.id}-${field.key}`} field={field} value={normalizeFieldValue(field, tabValues[field.key] ?? field.defaultValue ?? "")} onChange={(value) => setSiteDraft((prev) => ({ ...prev, services: { ...(prev.services || {}), [activeSiteDef.id]: { ...(prev.services?.[activeSiteDef.id] || {}), [field.key]: normalizeFieldValue(field, value) } } }))} />)}</section>; })}</div>
                </>
              ) : <div className="ClientConfigEditor-empty-panel" />}
            </section>
          </div>
        )}
      </div>
    </section>
  );
}

function PropertyRow({ field, value, onChange }) {
  const type = String(field.type || "text").toLowerCase();
  const options = field.options || [];
  return (
    <label className="ClientConfigEditor-prop-row">
      <span className="ClientConfigEditor-prop-label">{field.label}</span>
      {type === "enum" || type === "yesno" || type === "bool" ? (
        <select className="ClientConfigEditor-prop-input" value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={`${field.key}-${option}`} value={option}>{option}</option>)}</select>
      ) : (
        <input className="ClientConfigEditor-prop-input" type={type === "number" ? "number" : (type === "password" ? "password" : "text")} step={type === "number" ? "any" : undefined} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} spellCheck={false} />
      )}
    </label>
  );
}
function createDefaultDoc(dateLike) {
  const stamp = formatStamp(dateLike);
  const optAttrs = buildDefaultOptAttrs();
  syncNetworkDeployAliases(optAttrs);
  return { metaAttrs: { QF: "CFG", QV: "1.0.0.1", QC: stamp, QU: stamp, QD: "LinkOn Client File" }, optAttrs, referenceSiteAttrs: {}, siteRows: [], selectedSiteId: "" };
}

function buildDefaultOptAttrs() {
  const attrs = {};
  for (const section of Object.keys(CLIENT_GROUPS)) {
    for (const group of CLIENT_GROUPS[section] || []) for (const field of group.fields || []) setValueByAliases(attrs, field.aliases || [], normalizeFieldValue(field, field.defaultValue));
  }
  return attrs;
}

function createEmptySiteDraft() {
  const services = {};
  for (const tab of SITE_TABS) {
    const values = {};
    for (const group of tab.groups || []) for (const field of group.fields || []) values[field.key] = normalizeFieldValue(field, field.defaultValue ?? "");
    services[tab.id] = values;
  }
  return { site: "", factory: "", description: "", services };
}

function createDraftFromSiteAttrs(attrs) {
  const draft = createEmptySiteDraft();
  draft.site = getValueByAliases(attrs, SITE_FIELD_ALIASES.site, "");
  draft.factory = getValueByAliases(attrs, SITE_FIELD_ALIASES.factory, "");
  draft.description = getValueByAliases(attrs, SITE_FIELD_ALIASES.description, "");
  for (const tab of SITE_TABS) {
    const values = { ...(draft.services[tab.id] || {}) };
    for (const group of tab.groups || []) for (const field of group.fields || []) {
      if (String(field?.type || "").toLowerCase() === "password") {
        values[field.key] = "";
      } else {
        values[field.key] = normalizeFieldValue(field, getValueByAliases(attrs, field.aliases, field.defaultValue ?? ""));
      }
    }
    draft.services[tab.id] = values;
  }
  return draft;
}

function parseClientConfigXml(xmlText) {
  const xml = new DOMParser().parseFromString(String(xmlText || ""), "application/xml");
  if (xml.getElementsByTagName("parsererror")[0]) throw new Error("Invalid .cfg XML format.");
  const root = xml.documentElement;
  if (!root || root.tagName !== "Q") throw new Error("Client config file must include a Q root element.");
  const opt = findChild(root, "OPT");
  if (!opt) throw new Error("OPT node not found in selected file.");

  const metaAttrs = readAttrs(root);
  const optAttrs = readAttrs(opt);
  syncNetworkDeployAliases(optAttrs);
  const rsoAttrs = readAttrs(findChild(opt, "RSO"));
  normalizeLegacySiteAttrs(rsoAttrs);
  const siteRows = findChildren(findChild(opt, "SOL"), "SOP").map((sop) => {
    const attrs = readAttrs(sop);
    normalizeLegacySiteAttrs(attrs);
    return { id: createSiteRowId(), attrs };
  });
  const selectedKey = getValueByAliases(rsoAttrs, SITE_FIELD_ALIASES.site, "");
  const selected = siteRows.find((row) => normalizeSiteKey(getSiteValue(row.attrs, "site")) === normalizeSiteKey(selectedKey));

  return {
    metaAttrs,
    optAttrs,
    referenceSiteAttrs: Object.keys(rsoAttrs).length ? rsoAttrs : (selected ? { ...(selected.attrs || {}) } : {}),
    siteRows,
    selectedSiteId: selected?.id || siteRows[0]?.id || "",
  };
}

function buildClientConfigXml(cfgDoc) {
  const now = new Date();
  const metaAttrs = { ...(cfgDoc?.metaAttrs || {}), QF: firstNonEmpty(cfgDoc?.metaAttrs?.QF, "CFG"), QV: firstNonEmpty(cfgDoc?.metaAttrs?.QV, "1.0.0.1"), QD: firstNonEmpty(cfgDoc?.metaAttrs?.QD, "LinkOn Client File") };
  if (!String(metaAttrs.QC || "").trim()) metaAttrs.QC = formatStamp(now);
  metaAttrs.QU = formatStamp(now);
  const optAttrs = { ...(cfgDoc?.optAttrs || {}) };
  syncNetworkDeployAliases(optAttrs);
  const siteRows = (cfgDoc?.siteRows || []).map((row) => ({ id: row.id, attrs: { ...(row.attrs || {}) } }));
  const selected = siteRows.find((row) => row.id === cfgDoc?.selectedSiteId) || siteRows[0] || null;
  const rsoAttrs = Object.keys(cfgDoc?.referenceSiteAttrs || {}).length ? { ...(cfgDoc.referenceSiteAttrs || {}) } : (selected ? { ...(selected.attrs || {}) } : {});

  normalizeLegacySiteAttrs(rsoAttrs);
  for (const row of siteRows) normalizeLegacySiteAttrs(row.attrs);
  normalizeAttrsForSave(optAttrs, CLIENT_FIELDS);
  normalizeExtraBoolAliases(optAttrs, EXTRA_OPT_BOOL_ALIASES);
  normalizeAttrsForSave(rsoAttrs, SITE_FIELDS);
  for (const row of siteRows) normalizeAttrsForSave(row.attrs, SITE_FIELDS);

  const lines = [
    "<?xml version=\"1.0\"?>",
    `<Q${sp(writeAttrs(metaAttrs, ROOT_META_ATTR_ORDER))}>`,
    `  <OPT${sp(writeAttrs(optAttrs, CLIENT_ATTR_ORDER))}>`,
    `    <RSO${sp(writeAttrs(rsoAttrs, SITE_ATTR_ORDER))} />`,
    "    <SOL>",
    ...siteRows.map((row) => `      <SOP${sp(writeAttrs(row.attrs, SITE_ATTR_ORDER))} />`),
    "    </SOL>",
    "    <RPO />",
    "  </OPT>",
    "</Q>",
  ];

  return { xmlText: lines.join("\n"), nextDoc: { ...cfgDoc, metaAttrs, optAttrs, referenceSiteAttrs: rsoAttrs, siteRows, selectedSiteId: selected?.id || "" } };
}
function findChild(parent, tag) { if (!parent) return null; const target = String(tag || "").toUpperCase(); for (const child of Array.from(parent.children || [])) if (String(child.tagName || "").toUpperCase() === target) return child; return null; }
function findChildren(parent, tag) { if (!parent) return []; const target = String(tag || "").toUpperCase(); return Array.from(parent.children || []).filter((child) => String(child.tagName || "").toUpperCase() === target); }
function readAttrs(element) { const attrs = {}; for (const attr of Array.from(element?.attributes || [])) attrs[attr.name] = String(attr.value ?? ""); return attrs; }
function writeAttrs(attrs, order = []) { const src = attrs || {}; const keys = Object.keys(src).filter((key) => String(src[key] ?? "").length > 0); const rank = new Map(); order.forEach((key, idx) => rank.set(String(key || ""), idx)); keys.sort((a, b) => ((rank.has(a) ? rank.get(a) : Number.MAX_SAFE_INTEGER) - (rank.has(b) ? rank.get(b) : Number.MAX_SAFE_INTEGER)) || String(a).localeCompare(String(b))); return keys.map((key) => `${key}="${escapeXml(src[key])}"`).join(" "); }
function sp(text) { return text ? ` ${text}` : ""; }
function escapeXml(value) { return String(value ?? "").replace(/&/g, "&amp;").replace(/\"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function createSiteRowId() { const id = `site-${SITE_ROW_COUNTER}`; SITE_ROW_COUNTER += 1; return id; }
function getValueByAliases(attrs, aliases, fallback = "") {
  const src = attrs || {};
  let firstExistingAlias = "";
  for (const alias of aliases || []) {
    if (!Object.prototype.hasOwnProperty.call(src, alias)) continue;
    if (!firstExistingAlias) firstExistingAlias = alias;
    const text = String(src[alias] ?? "");
    if (text.trim()) return text;
  }
  if (firstExistingAlias) return String(src[firstExistingAlias] ?? "");
  return String(fallback ?? "");
}
function setValueByAliases(attrs, aliases, value) { if (!attrs || !aliases?.length) return; const existing = aliases.find((alias) => Object.prototype.hasOwnProperty.call(attrs, alias)); attrs[existing || aliases[0]] = String(value ?? ""); }
function getSiteValue(attrs, fieldName) { const key = String(fieldName || "").toLowerCase(); return getValueByAliases(attrs, SITE_FIELD_ALIASES[key] || [], ""); }
function normalizeSiteKey(value) { return String(value ?? "").trim().toUpperCase(); }
function collectFields(source) {
  const fields = [];
  if (Array.isArray(source)) {
    for (const tab of source) for (const group of tab.groups || []) for (const field of group.fields || []) fields.push(field);
    return fields;
  }
  for (const section of Object.keys(source || {})) for (const group of source[section] || []) for (const field of group.fields || []) fields.push(field);
  return fields;
}
function hasAttr(attrs, key) { return Object.prototype.hasOwnProperty.call(attrs || {}, key); }
function isBooleanText(value) { const text = String(value ?? "").trim().toLowerCase(); return text === "true" || text === "false"; }
function isNumericText(value) { return /^-?\d+(\.\d+)?$/.test(String(value ?? "").trim()); }
function normalizeLegacySiteAttrs(attrs) {
  if (!attrs) return;

  // Previous web builds wrote legacy RPS aliases. Convert to canonical ones.
  if (hasAttr(attrs, "RPUA")) {
    attrs.RP6 = normalizeBoolValue(attrs.RPUA, "True");
    delete attrs.RPUA;
  }
  if (hasAttr(attrs, "RPFU") && (!hasAttr(attrs, "RP7") || !String(attrs.RP7 || "").trim())) {
    attrs.RP7 = String(attrs.RPFU ?? "");
    delete attrs.RPFU;
  }
  if (hasAttr(attrs, "RPFP") && (!hasAttr(attrs, "RP8") || !String(attrs.RP8 || "").trim())) {
    attrs.RP8 = String(attrs.RPFP ?? "");
    delete attrs.RPFP;
  }

  // If RP6 contains a numeric timeout (legacy bug), move it to RP2 and reset RP6 to a valid boolean.
  if (hasAttr(attrs, "RP6") && !isBooleanText(attrs.RP6)) {
    if ((!hasAttr(attrs, "RP2") || !String(attrs.RP2 || "").trim()) && isNumericText(attrs.RP6)) attrs.RP2 = String(attrs.RP6 ?? "");
    attrs.RP6 = "True";
  }

  // Legacy tune aliases.
  if (hasAttr(attrs, "ETI") && (!hasAttr(attrs, "ETC") || !String(attrs.ETC || "").trim())) attrs.ETC = String(attrs.ETI ?? "");
  if (hasAttr(attrs, "RTI") && (!hasAttr(attrs, "RTC") || !String(attrs.RTC || "").trim())) attrs.RTC = String(attrs.RTI ?? "");
  if (hasAttr(attrs, "DTI") && (!hasAttr(attrs, "DTC") || !String(attrs.DTC || "").trim())) attrs.DTC = String(attrs.DTI ?? "");
  if (hasAttr(attrs, "DLTI") && (!hasAttr(attrs, "DLTC") || !String(attrs.DLTC || "").trim())) attrs.DLTC = String(attrs.DLTI ?? "");
  if (hasAttr(attrs, "WMTI") && (!hasAttr(attrs, "WMTC") || !String(attrs.WMTC || "").trim())) attrs.WMTC = String(attrs.WMTI ?? "");

  // Legacy timeout values were accidentally stored in tune aliases.
  migrateLegacyTimeout(attrs, "BSTC", "BSTO");
  migrateLegacyTimeout(attrs, "ETC", "ETO");
  migrateLegacyTimeout(attrs, "RTC", "RTO");
  migrateLegacyTimeout(attrs, "DTC", "DTO");
  migrateLegacyTimeout(attrs, "DLTC", "DLTO");
  migrateLegacyTimeout(attrs, "WMTC", "WMTO");
}
function migrateLegacyTimeout(attrs, tuneAlias, timeoutAlias) {
  if (!attrs || !hasAttr(attrs, tuneAlias)) return;
  const tuneValue = String(attrs[tuneAlias] ?? "").trim();
  if (!tuneValue || !isNumericText(tuneValue)) return;
  if (!hasAttr(attrs, timeoutAlias) || !String(attrs[timeoutAlias] ?? "").trim()) attrs[timeoutAlias] = tuneValue;
  attrs[tuneAlias] = "";
}
function normalizeAttrsForSave(attrs, fields) {
  if (!attrs) return;
  for (const field of fields || []) {
    const type = String(field?.type || "").toLowerCase();
    if (type !== "bool" && type !== "yesno") continue;
    const aliases = field.aliases || [];
    for (const alias of aliases) {
      if (!Object.prototype.hasOwnProperty.call(attrs, alias)) continue;
      attrs[alias] = type === "bool"
        ? normalizeBoolValue(attrs[alias], normalizeBoolValue(field.defaultValue ?? "False", "False"))
        : normalizeYesNoValue(attrs[alias], normalizeYesNoValue(field.defaultValue ?? "No", "No"));
    }
  }
}
function normalizeExtraBoolAliases(attrs, aliases) {
  if (!attrs) return;
  for (const alias of aliases || []) {
    if (!Object.prototype.hasOwnProperty.call(attrs, alias)) continue;
    attrs[alias] = normalizeBoolValue(attrs[alias], "False");
  }
}
function syncNetworkDeployAliases(attrs) {
  if (!attrs) return;
  const normalized = normalizeYesNoValue(getValueByAliases(attrs, ["NDPLY"], "No"), "No");
  attrs.NDPLY = normalized;
  attrs.AUD = normalized;
}
function normalizeFieldValue(field, value) { const type = String(field?.type || "text").toLowerCase(); const fallback = field?.defaultValue ?? ""; if (type === "yesno") return normalizeYesNoValue(value, normalizeYesNoValue(fallback, "No")); if (type === "bool") return normalizeBoolValue(value, normalizeBoolValue(fallback, "False")); const text = String(value ?? "").trim(); return text || String(fallback ?? ""); }
function normalizeYesNoValue(value, fallback = "No") { const text = String(value ?? "").trim().toLowerCase(); if (!text) return fallback; if (["yes", "y", "true", "t", "1"].includes(text)) return "Yes"; if (["no", "n", "false", "f", "0"].includes(text)) return "No"; return fallback; }
function normalizeBoolValue(value, fallback = "False") { const text = String(value ?? "").trim().toLowerCase(); if (!text) return fallback; if (["true", "t", "yes", "y", "1"].includes(text)) return "True"; if (["false", "f", "no", "n", "0"].includes(text)) return "False"; return fallback; }
function buildClientAttrOrder() { const order = []; const used = new Set(); const push = (key) => { const text = String(key || "").trim(); if (!text || used.has(text)) return; used.add(text); order.push(text); }; ["USR", "CIS", "SKN", "FFC", "SFC", "AUD", "APUR", "UCKP", "PURL", "UDU", "UCP", "NDPLY"].forEach(push); for (const section of Object.keys(CLIENT_GROUPS)) for (const group of CLIENT_GROUPS[section] || []) for (const field of group.fields || []) for (const alias of field.aliases || []) push(alias); return order; }
function buildSiteAttrOrder() { const order = []; const used = new Set(); const push = (key) => { const text = String(key || "").trim(); if (!text || used.has(text)) return; used.add(text); order.push(text); }; Object.values(SITE_FIELD_ALIASES).forEach((aliases) => aliases.forEach(push)); for (const tab of SITE_TABS) for (const group of tab.groups || []) for (const field of group.fields || []) for (const alias of field.aliases || []) push(alias); return order; }
function formatStamp(dateLike) { const d = dateLike instanceof Date ? dateLike : new Date(dateLike); const p2 = (v) => String(v).padStart(2, "0"); const p3 = (v) => String(v).padStart(3, "0"); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}.${p3(d.getMilliseconds())}`; }
function firstNonEmpty(...values) { for (const value of values) { const text = String(value ?? "").trim(); if (text) return text; } return ""; }
function buildClientPath(pathText) { const normalizedPath = String(pathText || "").replace(/^\/+/, ""); return `${APP_BASE_PATH}${normalizedPath}`; }
function normalizeBasePath(baseUrl) { const raw = String(baseUrl || "/").trim(); if (!raw) return "/"; let normalized = raw.startsWith("/") ? raw : `/${raw}`; if (!normalized.endsWith("/")) normalized += "/"; return normalized; }
function ensureConfigFileName(fileName) { const text = String(fileName ?? "").trim() || "LinkOnClient.cfg"; return /\.cfg$/i.test(text) ? text : `${text}.cfg`; }
function supportsFileSystemAccess() { return typeof window !== "undefined" && typeof window.showOpenFilePicker === "function" && typeof window.showSaveFilePicker === "function"; }
function isAbortError(error) { return error && String(error?.name || "") === "AbortError"; }
function downloadConfigFile(fileName, text) { const blob = new Blob([String(text ?? "")], { type: "application/xml;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = ensureConfigFileName(fileName); document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }
