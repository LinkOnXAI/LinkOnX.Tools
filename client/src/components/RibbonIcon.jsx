export function RibbonIcon({ label, fallback }) {
  const key = String(label || "").toLowerCase().replace(/\s+/g, "");
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  const manualBookIcon = (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6.5A2.5 2.5 0 016.5 4H12v16H6.5A2.5 2.5 0 004 22z" {...common} />
      <path d="M20 6.5A2.5 2.5 0 0017.5 4H12v16h5.5A2.5 2.5 0 0120 22z" {...common} />
      <path d="M8 8h2M8 12h2M14 8h2M14 12h2" {...common} />
    </svg>
  );

  const iconByKey = {
    new: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3h8l4 4v14H6z" {...common} />
        <path d="M14 3v5h5" {...common} />
        <path d="M12 10v8M8 14h8" {...common} />
      </svg>
    ),
    open: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 7h7l2 2h9v10H3z" {...common} />
        <path d="M3 7V5h7l2 2" {...common} />
      </svg>
    ),
    home: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 11l8-7 8 7" {...common} />
        <path d="M6 10v9h12v-9" {...common} />
        <path d="M10 19v-5h4v5" {...common} />
      </svg>
    ),
    save: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 4h13l3 3v13H4z" {...common} />
        <path d="M8 4v6h8V4M8 20v-6h8v6" {...common} />
      </svg>
    ),
    refresh: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 6v5h-5" {...common} />
        <path d="M4 18v-5h5" {...common} />
        <path d="M7.5 9A7 7 0 0120 11M16.5 15A7 7 0 014 13" {...common} />
      </svg>
    ),
    logout: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10 4H5v16h5" {...common} />
        <path d="M14 8l5 4-5 4" {...common} />
        <path d="M8 12h11" {...common} />
      </svg>
    ),
    user: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="3.5" {...common} />
        <path d="M5 19c0-3.4 3.1-6 7-6s7 2.6 7 6" {...common} />
      </svg>
    ),
    saveas: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 4h13l3 3v13H4z" {...common} />
        <path d="M8 4v6h8V4M8 20v-6h8v6" {...common} />
        <path d="M15.5 14.5l4-4M17 19h4v-4" {...common} />
      </svg>
    ),
    option: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h16" {...common} />
        <circle cx="9" cy="7" r="2" {...common} />
        <circle cx="15" cy="12" r="2" {...common} />
        <circle cx="11" cy="17" r="2" {...common} />
      </svg>
    ),
    message: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="6" width="16" height="12" rx="2" {...common} />
        <path d="M4 8l8 6 8-6" {...common} />
      </svg>
    ),
    flow: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="6" cy="6" r="2" {...common} />
        <circle cx="18" cy="6" r="2" {...common} />
        <circle cx="12" cy="18" r="2" {...common} />
        <path d="M8 6h8M7.5 7.5l3.5 8M16.5 7.5l-3.5 8" {...common} />
      </svg>
    ),
    language: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 18h6M7 6v12M4 12h6M13 8h7M16.5 8v10M13.5 18h6" {...common} />
      </svg>
    ),
    codegenerator: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" {...common} />
      </svg>
    ),
    querydeveloper: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <ellipse cx="8" cy="7" rx="4" ry="2" {...common} />
        <path d="M4 7v5c0 1.1 1.8 2 4 2s4-.9 4-2V7M16 6v12M12.5 9h7M12.5 15h7" {...common} />
      </svg>
    ),
    menueditor: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 7h14M5 12h14M5 17h14" {...common} />
        <circle cx="8" cy="7" r="1.2" {...common} />
        <circle cx="8" cy="12" r="1.2" {...common} />
        <circle cx="8" cy="17" r="1.2" {...common} />
      </svg>
    ),
    clientconfig: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="2" {...common} />
        <path d="M8 9h8M8 13h8M8 17h5" {...common} />
      </svg>
    ),
    manual: manualBookIcon,
    usermanual: manualBookIcon,
    laboratory: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 4h6M10 4v4l-5 8a3 3 0 002.6 4.5h8.8A3 3 0 0019 16l-5-8V4" {...common} />
        <path d="M8.3 14h7.4" {...common} />
      </svg>
    ),
  };

  const icon = iconByKey[key];
  if (icon) return icon;
  return <span className="icon-fallback">{fallback || "?"}</span>;
}
