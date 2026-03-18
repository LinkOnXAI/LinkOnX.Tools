import "./OptionDialog.css";
import { useState } from "react";

export function OptionDialog({
  initialTreeFont,
  initialTreeSize,
  initialPropFont,
  initialPropSize,
  initialThemePreset,
  themePresets,
  initialShowTreeDepthGuide,
  onApply,
  onCancel,
}) {
  const availableThemePresets = Array.isArray(themePresets) && themePresets.length > 0
    ? themePresets
    : ["white", "dark"];

  const normalizeThemePreset = (rawPreset) => {
    const value = String(rawPreset || "").trim().toLowerCase();
    if (availableThemePresets.includes(value)) return value;
    return availableThemePresets[0];
  };

  const formatThemePresetLabel = (preset) => {
    const known = {
      white: "Basic",
      dark: "Dark",
      vs2010: "VS2010",
      sevenclassic: "Seven Classic",
      office2013gray: "Office 2013 Light Gray",
      office2019darkgray: "Office 2019 Dark Gray",
    };
    if (known[preset]) return known[preset];
    if (!preset) return "Basic";
    return preset;
  };

  const fontOptions = Array.from(
    new Set(
      [
        "Pretendard",
        "Inter",
        "Noto Sans KR",
        "Noto Sans",
        "Nanum Gothic",
        "Malgun Gothic",
        "Segoe UI",
        "Arial",
        "Helvetica",
        "Roboto",
        "Times New Roman",
        "Courier New",
        "Consolas",
        "Monaco",
        "system-ui",
        initialTreeFont,
        initialPropFont,
      ].filter(Boolean),
    ),
  );

  const [treeFont, setTreeFont] = useState(initialTreeFont);
  const [treeSize, setTreeSize] = useState(initialTreeSize);
  const [propFont, setPropFont] = useState(initialPropFont);
  const [propSize, setPropSize] = useState(initialPropSize);
  const [themePreset, setThemePreset] = useState(() => normalizeThemePreset(initialThemePreset));
  const [showTreeDepthGuide, setShowTreeDepthGuide] = useState(Boolean(initialShowTreeDepthGuide));

  const normalizeSize = (raw, fallback) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(8, Math.min(32, parsed));
  };

  return (
    <div className="option-backdrop">
      <div className="option-dialog">
        <h3>Options</h3>
        <div className="option-grid">
          <label>Theme Preset</label>
          <select value={themePreset} onChange={(event) => setThemePreset(event.target.value)}>
            {availableThemePresets.map((preset) => (
              <option key={preset} value={preset}>
                {formatThemePresetLabel(preset)}
              </option>
            ))}
          </select>

          <label>Tree Font</label>
          <select value={treeFont} onChange={(event) => setTreeFont(event.target.value)}>
            {fontOptions.map((fontName) => (
              <option key={fontName} value={fontName}>
                {fontName}
              </option>
            ))}
          </select>

          <label>Tree Size</label>
          <input
            type="number"
            value={treeSize}
            min={8}
            max={32}
            onChange={(event) => setTreeSize(normalizeSize(event.target.value, initialTreeSize))}
          />

          <label>Property Label Font</label>
          <select value={propFont} onChange={(event) => setPropFont(event.target.value)}>
            {fontOptions.map((fontName) => (
              <option key={fontName} value={fontName}>
                {fontName}
              </option>
            ))}
          </select>

          <label>Property Label Size</label>
          <input
            type="number"
            value={propSize}
            min={8}
            max={32}
            onChange={(event) => setPropSize(normalizeSize(event.target.value, initialPropSize))}
          />

          <label>Tree Guide Line</label>
          <label className="option-checkbox-field">
            <input
              type="checkbox"
              checked={showTreeDepthGuide}
              onChange={(event) => setShowTreeDepthGuide(event.target.checked)}
            />
            Show pseudo-element guide
          </label>
        </div>

        <div className="option-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button
            type="button"
            className="primary"
            onClick={() =>
              onApply({
                treeFont,
                treeSize: normalizeSize(treeSize, initialTreeSize),
                propFont,
                propSize: normalizeSize(propSize, initialPropSize),
                themePreset: normalizeThemePreset(themePreset),
                showTreeDepthGuide,
              })
            }
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
