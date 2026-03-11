import "./RibbonBar.css";
import { useMemo, useState } from "react";
import { RibbonIcon } from "./RibbonIcon";

export function RibbonBar({ sections, sessionLabel = "", quickActions = [] }) {
  const initial = useMemo(() => {
    const map = {};
    sections.forEach((section) => {
      map[section.title] = Boolean(section.collapsible && section.defaultCollapsed);
    });
    return map;
  }, [sections]);

  const [collapsed, setCollapsed] = useState(initial);
  const [allCollapsed, setAllCollapsed] = useState(false);

  const toggle = (title) => {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const renderButton = (button, key, compact = false) => {
    const classSuffix = String(button.label || "").toLowerCase().replace(/\s+/g, "-");
    const buttonClass = compact ? `toolbar-btn toolbar-btn-${classSuffix}` : `ribbon-btn ribbon-btn-${classSuffix}`;
    return (
      <button key={key} className={buttonClass} onClick={button.onClick} disabled={button.disabled} title={button.label} aria-label={button.label}>
        <div className="icon">
          <RibbonIcon label={button.label} fallback={button.icon} />
        </div>
        {!compact && <div className="label">{button.label}</div>}
      </button>
    );
  };

  const renderQuickButton = (button, key) => {
    const classSuffix = String(button.label || "").toLowerCase().replace(/\s+/g, "-");
    return (
      <button
        key={key}
        className={`ribbon-btn ribbon-quick-btn ribbon-quick-btn-${classSuffix}`}
        onClick={button.onClick}
        disabled={button.disabled}
        title={button.label}
        aria-label={button.label}
      >
        <div className="icon">
          <RibbonIcon label={button.label} fallback={button.icon} />
        </div>
        <div className="label">{button.label}</div>
      </button>
    );
  };

  return (
    <div className={`ribbon ${allCollapsed ? "ribbon-collapsed" : ""}`}>
      <div className={`ribbon-body ${allCollapsed ? "collapsed" : ""}`}>
        {allCollapsed
          ? sections.map((section, sectionIndex) => (
              <div key={`toolbar-${section.title}-${sectionIndex}`} className="toolbar-group">
                <div className="toolbar-group-title">{section.title}</div>
                <div className="toolbar-buttons">
                  {section.buttons.map((button, buttonIndex) =>
                    renderButton(button, `toolbar-${section.title}-${button.label}-${buttonIndex}`, true),
                  )}
                </div>
              </div>
            ))
          : sections.map((section, sectionIndex) => (
              <div key={`ribbon-${section.title}-${sectionIndex}`} className={`ribbon-section ${collapsed[section.title] ? "collapsed" : ""}`}>
                <div className="section-header">
                  <div className="section-title">{section.title}</div>
                  {section.collapsible && (
                    <button
                      type="button"
                      className={`collapse-btn ${collapsed[section.title] ? "collapsed" : "expanded"}`}
                      onClick={() => toggle(section.title)}
                      aria-label="toggle section"
                      title={collapsed[section.title] ? "Expand" : "Collapse"}
                    />
                  )}
                </div>
                {!collapsed[section.title] && (
                  <div className="ribbon-buttons">
                    {section.buttons.map((button, buttonIndex) =>
                      renderButton(button, `ribbon-${section.title}-${button.label}-${buttonIndex}`),
                    )}
                  </div>
                )}
              </div>
            ))}
      </div>
      <div className="ribbon-right">
        {sessionLabel && (
          <span className="ribbon-user-chip" title={sessionLabel}>
            <span className="ribbon-user-icon" aria-hidden="true">
              <RibbonIcon label="User" fallback="U" />
            </span>
            {sessionLabel}
          </span>
        )}
        <div className="ribbon-right-actions">
          {quickActions.map((button, index) =>
            allCollapsed
              ? renderButton(button, `quick-toolbar-${button.label}-${index}`, true)
              : renderQuickButton(button, `quick-${button.label}-${index}`),
          )}
        </div>
      </div>
      <button
        type="button"
        className={`ribbon-toggle-all ${allCollapsed ? "collapsed" : "expanded"}`}
        onClick={() => setAllCollapsed((prev) => !prev)}
        aria-label="toggle ribbon"
        title={allCollapsed ? "Expand ribbon" : "Collapse ribbon"}
      />
    </div>
  );
}
