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
      stitchbasic: "Stitch Basic",
      stitchdark: "Stitch Dark",
      stitchpalette: "Stitch Palette",
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
  const [treeSizeInput, setTreeSizeInput] = useState(String(initialTreeSize ?? ""));
  const [propFont, setPropFont] = useState(initialPropFont);
  const [propSizeInput, setPropSizeInput] = useState(String(initialPropSize ?? ""));
  const [themePreset, setThemePreset] = useState(() => normalizeThemePreset(initialThemePreset));
  const [showTreeDepthGuide, setShowTreeDepthGuide] = useState(Boolean(initialShowTreeDepthGuide));

  const normalizeSizeForApply = (raw, fallback) => {
    const text = String(raw ?? "").trim();
    if (!text) return fallback;
    const parsed = Number(text);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(8, Math.min(32, parsed));
  };

  return (
    <div className="option-backdrop">
      <div className="option-dialog">
        <div className="option-header">
          <h3>Options</h3>
          <button
            type="button"
            className="option-close-btn"
            onClick={onCancel}
            aria-label="Close options dialog"
          />
        </div>
        <div className="option-grid">
          <label>Theme Setting</label>
          <select value={themePreset} onChange={(event) => setThemePreset(event.target.value)}>
            {availableThemePresets.map((preset) => (
              <option key={preset} value={preset}>
                {formatThemePresetLabel(preset)}
              </option>
            ))}
          </select>
          <p className="option-field-help">
          </p>

          <label>DataGrid Font</label>
          <select value={treeFont} onChange={(event) => setTreeFont(event.target.value)}>
            {fontOptions.map((fontName) => (
              <option key={fontName} value={fontName}>
                {fontName}
              </option>
            ))}
          </select>
          <p className="option-field-help">
          </p>

          <label>DataGrid Font Size</label>
          <input
            type="number"
            value={treeSizeInput}
            min={8}
            max={32}
            onChange={(event) => setTreeSizeInput(event.target.value)}
          />
          <p className="option-field-help">
          </p>

          <label>Property Font</label>
          <select value={propFont} onChange={(event) => setPropFont(event.target.value)}>
            {fontOptions.map((fontName) => (
              <option key={fontName} value={fontName}>
                {fontName}
              </option>
            ))}
          </select>
          <p className="option-field-help">
          </p>

          <label>Property Font Size</label>
          <input
            type="number"
            value={propSizeInput}
            min={8}
            max={32}
            onChange={(event) => setPropSizeInput(event.target.value)}
          />
          <p className="option-field-help">
          </p>

          <label>Tree Guide Lines</label>
          <label className="option-checkbox-field">
            <input
              type="checkbox"
              checked={showTreeDepthGuide}
              onChange={(event) => setShowTreeDepthGuide(event.target.checked)}
            />
            
          </label>
          <p className="option-field-help">
          </p>
        </div>

        <div className="option-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button
            type="button"
            className="primary"
            onClick={() =>
              onApply({
                treeFont,
                treeSize: normalizeSizeForApply(treeSizeInput, initialTreeSize),
                propFont,
                propSize: normalizeSizeForApply(propSizeInput, initialPropSize),
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
