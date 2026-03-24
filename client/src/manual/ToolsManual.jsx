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
          { name: "Download", iconClass: "system-download-icon", description: "Download selected system .qsf file." },
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
    description: "Use this screen to create and maintain .mnu menu trees with icon-based node rows and property editing.",
    points: [
      "Menu path: Home > Declaration > Menu Editor or Ribbon Declaration > Menu Editor.",
      "Toolbar: create new file, open existing .mnu file, and save current edits.",
      "Tree panel: search by Name / Caption and move between matched nodes.",
      "Tree interaction: use Arrow Up/Down to move rows and Arrow Left/Right to collapse or expand selected node.",
      "Tree interaction: double-click node to expand/collapse and use Delete key to run Remove on selected node.",
      "Properties panel: edit selected node attributes",
    ],
    buttonGroups: [
      {
        title: "Main Buttons",
        items: [
          { name: "New", iconImage: "icons/menuEditor/new_16x16.png", description: "Create a blank menu tree with default LinkOnMenu root." },
          { name: "Open", iconImage: "icons/menuEditor/open_16x16.png", description: "Open and load local .mnu file into tree and properties." },
          { name: "Save", iconImage: "icons/menuEditor/save_16x16.png", description: "Save current menu XML to selected file." },
        ],
      },
      {
        title: "Tree Search Buttons",
        items: [
          { name: "Search", iconClass: "tree-search-icon tree-search-icon-magnify", description: "Run tree search by Name / Caption text." },
          { name: "Previous", iconClass: "tree-search-icon tree-search-icon-up", description: "Move to previous matched node." },
          { name: "Next", iconClass: "tree-search-icon tree-search-icon-down", description: "Move to next matched node." },
        ],
      },
      {
        title: "Property Buttons",
        items: [
          { name: "Image Select", iconText: "...", description: "Select image file for Image(16x16) / Large Image(32x32) property fields." },
        ],
      },
    ],
    popupMenuTitle: "Popup Menu",
    popupMenuItems: [
      { name: "Expand", iconClass: "tree-context-item-icon tree-context-icon-expand", description: "Expand selected node when child nodes exist." },
      { name: "Collapse", iconClass: "tree-context-item-icon tree-context-icon-collapse", description: "Collapse selected node when node is expanded." },
      { name: "Copy", iconClass: "tree-context-item-icon tree-context-icon-copy", description: "Copy selected node to Menu Editor clipboard." },
      { name: "Cut", iconClass: "tree-context-item-icon tree-context-icon-cut", description: "Copy selected node to clipboard, then remove it from tree." },
      { name: "Paste Sibling", iconClass: "tree-context-item-icon tree-context-icon-paste", description: "Paste clipboard node as sibling after selected node (same type only)." },
      { name: "Paste Child", iconClass: "tree-context-item-icon tree-context-icon-paste", description: "Paste clipboard node as child (MNU->MSY, MSY->MIT, MIT->MIT/PIT by rule)." },
      { name: "Paste Popup Menus", iconClass: "tree-context-item-icon tree-context-icon-paste", description: "On MIT node, paste PIT children from copied MIT node." },
      { name: "Move Up", iconClass: "tree-context-item-icon tree-context-icon-move-up", description: "Move selected node one step up among siblings." },
      { name: "Move Down", iconClass: "tree-context-item-icon tree-context-icon-move-down", description: "Move selected node one step down among siblings." },
      { name: "Remove", iconClass: "tree-context-item-icon tree-context-icon-delete", description: "Remove selected node (same behavior as keyboard Delete key)." },
      { name: "Remove Popup Menus", iconClass: "tree-context-item-icon tree-context-icon-delete", description: "On MIT node, remove all child PIT nodes." },
      { name: "Insert Before Menu Item", iconClass: "tree-context-item-icon tree-context-icon-insert-before", description: "Insert same-type node before selected node." },
      { name: "Insert After Menu Item", iconClass: "tree-context-item-icon tree-context-icon-insert-after", description: "Insert same-type node after selected node." },
      { name: "Append Popup Menu Item", iconClass: "tree-context-item-icon tree-context-icon-append", description: "On MIT node, append new PIT node (enabled when child MIT does not exist)." },
    ],
  },
  {
    id: "languageEditor",
    title: "Language",
    images: [
      {
        src: "manual/screenshots/language-editor-caption-overview.png",
        alt: "Language Editor Caption tab screen capture",
      },
      {
        src: "manual/screenshots/language-editor-message-overview.png",
        alt: "Language Editor Message tab screen capture",
      },
    ],
    description: "Use this screen to create and maintain .lng language files (Caption / Message).",
    points: [
      "Menu path: Home > Declaration > Language or Ribbon Declaration > Language.",
      "Toolbar: new/open/save/save-as and quick actions for Goto Error / Gen Enum.",
      "Tabs: switch between Caption and Message lists with column headers (Caption: DEF/ENG, Message: Message ID/DEF/ENG).",
      "Row icons: caption rows show ToolLanguage icon and message rows show ToolMessage icon in first column.",
      "Find: moves focus to the first matched row and aligns the matched row to the top visible area.",
      "Properties panel: edit selected row values and use header buttons to Update / Delete.",
    ],
    buttonGroups: [
      {
        title: "Main Buttons",
        items: [
          { name: "New", iconImage: "icons/menuEditor/new_16x16.png", description: "Create new blank language file data." },
          { name: "Open", iconImage: "icons/menuEditor/open_16x16.png", description: "Open and load local .lng file." },
          { name: "Save", iconImage: "icons/menuEditor/save_16x16.png", description: "Save current language data to file." },
          { name: "Save As", iconImage: "icons/languageEditor/saveas_16x16.png", description: "Save current data as a new .lng file." },
          { name: "Goto Error", iconImage: "icons/languageEditor/ToolGotoError.png", description: "Move through duplicate key entries (Caption DEF / Message MID) in sequence." },
          { name: "Gen Enum", iconImage: "icons/languageEditor/ToolEnumGenerate.png", description: "Generate QMessageId enum text from Message rows and copy it to clipboard." },
        ],
      },
      {
        title: "Tree Search Buttons",
        items: [
          { name: "Find", iconText: "Find", description: "Run tree search by ID/default/description text." },
          { name: "Previous", iconClass: "tree-search-icon tree-search-icon-up", description: "Move to previous matched row." },
          { name: "Next", iconClass: "tree-search-icon tree-search-icon-down", description: "Move to next matched row." },
        ],
      },
      {
        title: "Properties Header Buttons",
        items: [
          { name: "Update", iconImage: "icons/languageEditor/ToolCheck.png", description: "Apply current property edits to selected Caption/Message row. Create a new value when the same value already exists." },
          { name: "Delete", iconImage: "icons/languageEditor/ToolRemove.png", description: "Delete selected Caption/Message row." },
        ],
      },
    ],
  },
  {
    id: "clientConfigEditor",
    title: "Client Config",
    images: [
      {
        src: "manual/screenshots/client-config-client-overview.png",
        alt: "Client Config Editor Client Configuration tab screen capture",
      },
      {
        src: "manual/screenshots/client-config-site-overview.png",
        alt: "Client Config Editor Site Configuration tab screen capture",
      },
    ],
    description: "Use this screen to create/open/save .cfg files and manage Client/Site configuration values.",
    points: [
      "Menu path: Home > Declaration > Client Config or Ribbon Declaration > Client Config.",
      "Toolbar: create new .cfg file, open existing file, and save/save-as current data.",
      "Main tabs: switch between Client Configuration and Site Configuration.",
      "Client Configuration: choose category (Default / Log / Application update) and edit grouped properties.",
      "Application update: Network Deployed default is No, and URL/period fields are shown only when Yes is selected.",
      "Site Configuration: select site row, edit BIS/EMS/RMS/DTS/DLS/WMS/EES/RPS values, then apply with Update/Delete.",
    ],
    buttonGroups: [
      {
        title: "Main Buttons",
        items: [
          { name: "New", iconImage: "icons/menuEditor/new_16x16.png", description: "Create default LinkOnClient.cfg document data." },
          { name: "Open", iconImage: "icons/menuEditor/open_16x16.png", description: "Open and load local .cfg file." },
          { name: "Save", iconImage: "icons/menuEditor/save_16x16.png", description: "Save current configuration to current file." },
          { name: "Save As", iconImage: "icons/clientConfig/saveall_16x16.png", description: "Save current configuration to new file name." },
        ],
      },
      {
        title: "Main Tab Buttons",
        items: [
          { name: "Client Configuration", iconText: "C", description: "Edit default client options such as language, font, skin, log, security, and update settings." },
          { name: "Site Configuration", iconText: "S", description: "Edit site rows and service configuration values (middleware/channel/ftp and related fields) by tab." },
        ],
      },
      {
        title: "Site Action Buttons",
        items: [
          { name: "Update", iconImage: "icons/languageEditor/ToolCheck.png", description: "Create or update selected site row with current form values. Create a new value when the same value already exists." },
          { name: "Delete", iconImage: "icons/languageEditor/ToolRemove.png", description: "Delete currently selected site row." },
        ],
      },
    ],
  },
  {
    id: "codeGenerator",
    title: "Code Generator",
    image: "manual/screenshots/code-generator-home-overview.png",
    description: "Use this screen to open .gen source file, inspect generator tree, and run code generation with options.",
    points: [
      "Menu path: Home > Development > Code Generator or Ribbon Development > Code Generator.",
      "Preview area: module screen preview image is shown in the Home dashboard card.",
      "Top toolbar: open .gen file and start generation flow from option dialog.",
      "Search bar: type keyword, move Previous/Next result, and check match count.",
      "Tree panel: expand/collapse nodes, select target node, and check level-2 Parameter/Function nodes for generation scope.",
      "Option dialog: configure Output Path, Creator, Description, Organize Using and generation flags before running.",
      "Result flow: generation banner appears and output folder can be opened after generation is completed.",
    ],
    buttonGroups: [
      {
        title: "Main Buttons",
        items: [
          { name: "Open", iconImage: "icons/codeGenerator/open_16x16.png", description: "Open local .gen file and load parsed tree data." },
          { name: "Generate", iconImage: "icons/codeGenerator/Execute.png", description: "Open Code Generate Option dialog and run generation with selected options." },
        ],
      },
      {
        title: "Tree Search Buttons",
        items: [
          { name: "Search", iconText: "Search", description: "Filter tree nodes by label text with live matching." },
          { name: "Previous", iconClass: "tree-search-icon tree-search-icon-up", description: "Move to previous matched node." },
          { name: "Next", iconClass: "tree-search-icon tree-search-icon-down", description: "Move to next matched node." },
          { name: "Match Count", iconText: "0/0", description: "Show current match index and total result count." },
        ],
      },
      {
        title: "Code Generate Option",
        items: [
          { name: "Output Path", iconText: "Path", description: "Set output folder for generated files." },
          { name: "Creator", iconText: "C", description: "Set creator metadata text written to generated output." },
          { name: "Description", iconText: "D", description: "Set description metadata text for generated output." },
          { name: "Organize Using", iconText: "U", description: "Set namespace/import organizing text used during generation." },
          { name: "Generate Parameter", iconText: "P", description: "Toggle parameter generation option." },
          { name: "Generate Function", iconText: "F", description: "Toggle function generation option." },
          { name: "Internal Class", iconText: "I", description: "Toggle internal class generation option." },
          { name: "OK", iconText: "OK", description: "Execute code generation with current options." },
          { name: "Cancel", iconText: "X", description: "Close option dialog without generation." },
        ],
      },
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
            {Array.isArray(section.images) && section.images.length > 0 ? (
              <div className="tools-manual-shot-stack">
                {section.images.map((item, imageIndex) => (
                  <div key={`${section.id}-image-${imageIndex}`} className="tools-manual-shot">
                    <img
                      src={buildManualPath(item.src)}
                      alt={item.alt || `${section.title} screen capture ${imageIndex + 1}`}
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="tools-manual-shot">
                <img src={buildManualPath(section.image)} alt={`${section.title} screen capture`} loading="lazy" />
              </div>
            )}
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

              {section.menuItems?.length ? (
                <div className="tools-manual-feature-block">
                  <h4>{section.menuTitle || "Menu"}</h4>
                  <table className="tools-manual-table" aria-label={`${section.title} ${section.menuTitle || "Menu"}`}>
                    <thead>
                      <tr>
                        <th>Menu</th>
                        <th>Function</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.menuItems.map((item) => (
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

              {section.popupMenuItems?.length ? (
                <div className="tools-manual-feature-block">
                  <h4>{section.popupMenuTitle || "Popup Menu"}</h4>
                  <table className="tools-manual-table" aria-label={`${section.title} ${section.popupMenuTitle || "Popup Menu"}`}>
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
