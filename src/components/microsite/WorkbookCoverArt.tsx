import React from "react";

interface WorkbookCoverArtProps {
  title: string;
  subtitle?: string;
  author?: string;
  accentColor?: string;
  className?: string;
}

/**
 * SVG-rendered "workbook" cover. No external image asset required.
 * Designed to visually pair with a real book cover.
 */
export function WorkbookCoverArt({
  title,
  subtitle,
  author,
  accentColor = "#C9A24A",
  className = "",
}: WorkbookCoverArtProps) {
  const titleLen = (title || "").length;
  const titleSize = titleLen > 40 ? 28 : titleLen > 24 ? 34 : 42;

  return (
    <div className={`relative ${className}`} style={{ aspectRatio: "3 / 4" }}>
      <svg
        viewBox="0 0 300 400"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full rounded-lg shadow-2xl"
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id="wbBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1a1f2e" />
            <stop offset="100%" stopColor="#0d1119" />
          </linearGradient>
          <linearGradient id="wbSpine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#000" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </linearGradient>
          <pattern id="wbDots" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill={accentColor} fillOpacity="0.08" />
          </pattern>
        </defs>

        <rect width="300" height="400" fill="url(#wbBg)" rx="6" />
        <rect width="300" height="400" fill="url(#wbDots)" rx="6" />
        <rect x="0" y="0" width="22" height="400" fill="url(#wbSpine)" />

        <rect x="36" y="34" width="60" height="3" fill={accentColor} />
        <text
          x="36" y="58"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontSize="9" fontWeight="700" letterSpacing="2.5"
          fill={accentColor}
        >
          COMPANION WORKBOOK
        </text>

        <g opacity="0.18">
          <circle cx="240" cy="90" r="38" fill="none" stroke={accentColor} strokeWidth="1" />
          <circle cx="240" cy="90" r="26" fill="none" stroke={accentColor} strokeWidth="1" />
          <circle cx="240" cy="90" r="14" fill="none" stroke={accentColor} strokeWidth="1" />
        </g>

        <foreignObject x="34" y="150" width="232" height="160">
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: `${titleSize}px`,
              fontWeight: 700,
              lineHeight: 1.05,
              color: "#f5f1e6",
              letterSpacing: "-0.5px",
            }}
          >
            {title}
          </div>
        </foreignObject>

        <line x1="36" y1="320" x2="100" y2="320" stroke={accentColor} strokeWidth="1.2" />

        {subtitle && (
          <foreignObject x="34" y="328" width="232" height="40">
            <div
              xmlns="http://www.w3.org/1999/xhtml"
              style={{
                fontFamily: "Georgia, serif",
                fontSize: "11px",
                fontStyle: "italic",
                color: "#cfc7b3",
                lineHeight: 1.3,
              }}
            >
              {subtitle}
            </div>
          </foreignObject>
        )}

        {author && (
          <text
            x="36" y="378"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fontSize="10" fontWeight="600" letterSpacing="1.5"
            fill="#f5f1e6" opacity="0.85"
          >
            {author.toUpperCase()}
          </text>
        )}

        <rect x="0" y="395" width="300" height="5" fill={accentColor} opacity="0.85" />
      </svg>
    </div>
  );
}
