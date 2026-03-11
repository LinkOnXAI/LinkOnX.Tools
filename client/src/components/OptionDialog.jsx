import "./OptionDialog.css";
import { useState } from "react";

export function OptionDialog({
  initialTreeFont,
  initialTreeSize,
  initialPropFont,
  initialPropSize,
  initialThemePreset,
  onApply,
  onCancel,
}) {
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
  const [themePreset, setThemePreset] = useState(initialThemePreset);

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
          <div className="option-theme-presets">
            <button
              type="button"
              className={`option-theme-btn ${themePreset === "white" ? "active" : ""}`}
              onClick={() => setThemePreset("white")}
            >
              White Theme
            </button>
            <button
              type="button"
              className={`option-theme-btn ${themePreset === "dark" ? "active" : ""}`}
              onClick={() => setThemePreset("dark")}
            >
              Dark Theme
            </button>
          </div>

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
                themePreset,
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
