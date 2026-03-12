import "./ToolsManual.css";

const BASE_PATH = normalizeBasePath(import.meta.env.BASE_URL || "/");

const MANUAL_SECTIONS = [
  {
    id: "queryDeveloper",
    title: "Query Developer",
    image: "manual/screenshots/query-developer-overview.png",
    description: "Use this screen to manage .qsf tree nodes and related properties/SQL.",
    points: [
      "Ribbon: move between Home, Declaration, Development and session actions.",
      "System panel: select target system file and use download button.",
      "TreeView: expand/collapse and select node to open detail editor.",
      "Properties / SQL Editor: edit values and apply changes to server file.",
    ],
    buttonGroups: [
      {
        title: "Main Buttons",
        items: [
          { name: "Refresh", iconClass: "tools-manual-icon-refresh", description: "Reload system file list and current tree data." },
          { name: "Download (.qsf)", iconClass: "system-download-icon", description: "Download selected system .qsf file." },
        ],
      },
      {
        title: "Tree Search Buttons",
        items: [
          {
            name: "Search Toggle",
            iconClass: "tree-search-icon tree-search-icon-magnify",
            description: "Expand or collapse search toolbar in tree area.",
          },
          { name: "Case (Aa)", iconText: "Aa", description: "Toggle case-sensitive search." },
          { name: "Search", iconClass: "tree-search-icon tree-search-icon-magnify", description: "Run tree search by Name / Description." },
          { name: "Previous", iconClass: "tree-search-icon tree-search-icon-up", description: "Move to previous matched node." },
          { name: "Next", iconClass: "tree-search-icon tree-search-icon-down", description: "Move to next matched node." },
        ],
      },
      {
        title: "Property / SQL Buttons",
        items: [
          { name: "Properties Update", iconClass: "prop-update-icon", description: "Save changed property values to server qsf file." },
          {
            name: "Properties Collapse/Expand",
            iconClass: "prop-toggle-icon expanded",
            description: "Hide or show Properties area.",
          },
          { name: "SQL Update", iconClass: "prop-update-icon", description: "Save SQL text of selected DB provider to server qsf file." },
          { name: "DB Provider Buttons", iconImage: "icons/db/mssql.svg", description: "Switch SQL editor tab by DB type." },
          { name: "SQL Dialog Open", iconClass: "sql-dialog-open-icon", description: "Open SQL editor in dialog window." },
          { name: "SQL Dialog Close", iconClass: "sql-dialog-close-icon", description: "Close SQL dialog and return to main view." },
        ],
      },
    ],
    popupMenuItems: [
      { name: "Expand", iconClass: "tree-context-item-icon tree-context-icon-expand", description: "Expand selected node when child nodes exist." },
      { name: "Collapse", iconClass: "tree-context-item-icon tree-context-icon-collapse", description: "Collapse selected node when node is expanded." },
      { name: "Copy", iconClass: "tree-context-item-icon tree-context-icon-copy", description: "Copy current node as outerXML into QBEX_{ObjectType} clipboard key." },
      { name: "Paste", iconClass: "tree-context-item-icon tree-context-icon-paste", description: "Paste copied node. Same type: insert after. Parent type: append child." },
      { name: "Delete", iconClass: "tree-context-item-icon tree-context-icon-delete", description: "Delete selected node. Disabled when node has child nodes." },
      { name: "Append Child", iconClass: "tree-context-item-icon tree-context-icon-append", description: "Append child node. System->Module, Module->Function, Function->SQL Code." },
      { name: "Insert Before", iconClass: "tree-context-item-icon tree-context-icon-insert-before", description: "Insert same object type before selected node (except System)." },
      { name: "Insert After", iconClass: "tree-context-item-icon tree-context-icon-insert-after", description: "Insert same object type after selected node (except System)." },
    ],
  },
  {
    id: "menuEditor",
    title: "Menu Editor",
    image: "manual/screenshots/menu-editor-overview.png",
    description: "Create and maintain .mnu menu structures with toolbar actions.",
    points: [
      "Toolbar buttons: New, Open, Save.",
      "Tree area: browse menu hierarchy and select node.",
      "Properties area: edit selected menu node attributes.",
      "Current file badge: shows active .mnu file name.",
    ],
  },
  {
    id: "languageEditor",
    title: "Language Editor",
    image: "manual/screenshots/language-editor-overview.png",
    description: "Language module entry point from Ribbon and Home shortcuts.",
    points: [
      "Open from Home > Declaration > Language or Ribbon Declaration group.",
      "Current build shows placeholder page for Language module integration.",
      "Use this screen position and menu path for future language maintenance workflow.",
    ],
  },
  {
    id: "clientConfigEditor",
    title: "Client Config Editor",
    image: "manual/screenshots/client-config-editor-overview.png",
    description: "Client Config module entry point from Declaration menu path.",
    points: [
      "Open from Home > Declaration > Client Config or Ribbon Declaration group.",
      "Current build shows placeholder page for Client Config module integration.",
      "Use this location for future client option/configuration management.",
    ],
  },
  {
    id: "codeGenerator",
    title: "Code Generator",
    image: "manual/screenshots/code-generator-overview.png",
    description: "Code Generator module entry point from Development menu path.",
    points: [
      "Open from Home > Development > Code Generator or Ribbon Development group.",
      "Current build shows placeholder page for Code Generator module integration.",
      "Use this location for future code generation actions and output management.",
    ],
  },
];

export function ToolsManual() {
  return (
    <section className="panel tools-manual">
      <header className="tools-manual-hero">
        <p className="tools-manual-kicker">LinkOnX Tools</p>
        <h2>User Manual</h2>
        <p className="tools-manual-subtext">
          Screen capture based guide by buttons and menu paths.
        </p>
      </header>

      <div className="tools-manual-sections">
        {MANUAL_SECTIONS.map((section, index) => (
          <article key={section.id} className="tools-manual-section">
            <h3>{index + 1}. {section.title}</h3>
            <div className="tools-manual-shot">
              <img src={buildManualPath(section.image)} alt={`${section.title} screen capture`} loading="lazy" />
            </div>
            <div className="tools-manual-desc">
              <p>{section.description}</p>
              <ul>
                {section.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>

              {section.buttonGroups?.length ? (
                <div className="tools-manual-feature-block">
                  <h4>Buttons</h4>
                  {section.buttonGroups.map((group) => (
                    <div key={group.title} className="tools-manual-feature-group">
                      <h5>{group.title}</h5>
                      <table className="tools-manual-table" aria-label={`${section.title} ${group.title}`}>
                        <thead>
                          <tr>
                            <th>Button</th>
                            <th>Function</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.items.map((item) => (
                            <tr key={`${group.title}-${item.name}`}>
                              <td>
                                <span className="tools-manual-item-name">
                                  <span className="tools-manual-inline-icon-box" aria-hidden="true">
                                    {renderManualIcon(item)}
                                  </span>
                                  <span>{item.name}</span>
                                </span>
                              </td>
                              <td>{item.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              ) : null}

              {section.popupMenuItems?.length ? (
                <div className="tools-manual-feature-block">
                  <h4>Popup Menu</h4>
                  <table className="tools-manual-table" aria-label={`${section.title} Popup Menu`}>
                    <thead>
                      <tr>
                        <th>Menu</th>
                        <th>Function</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.popupMenuItems.map((item) => (
                        <tr key={item.name}>
                          <td>
                            <span className="tools-manual-item-name">
                              <span className="tools-manual-inline-icon-box" aria-hidden="true">
                                {renderManualIcon(item)}
                              </span>
                              <span>{item.name}</span>
                            </span>
                          </td>
                          <td>{item.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function buildManualPath(pathText) {
  const normalizedPath = String(pathText || "").replace(/^\/+/, "");
  return `${BASE_PATH}${normalizedPath}`;
}

function normalizeBasePath(baseUrl) {
  const raw = String(baseUrl || "/").trim();
  if (!raw) return "/";
  let normalized = raw.startsWith("/") ? raw : `/${raw}`;
  if (!normalized.endsWith("/")) normalized += "/";
  return normalized;
}

function renderManualIcon(item) {
  const iconClass = String(item?.iconClass || "").trim();
  const iconImage = String(item?.iconImage || "").trim();
  const iconText = String(item?.iconText || "").trim();

  if (iconImage) {
    return <img src={buildManualPath(iconImage)} alt="" className="tools-manual-inline-icon-image" />;
  }

  if (iconClass) {
    return <span className={iconClass} />;
  }

  if (iconText) {
    return <span className="tools-manual-inline-icon-text">{iconText}</span>;
  }

  return <span className="tools-manual-inline-icon-fallback" />;
}
