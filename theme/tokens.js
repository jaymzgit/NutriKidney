/**
 * NutriKidney design tokens — the single source of truth for the UI.
 *
 * Consumed by:
 *  - tailwind.config.js → class names (bg-card, text-body, rounded-md …) and
 *    the light/dark CSS variables behind every colour class.
 *  - lib/theme.tsx      → raw values for places className can't reach
 *    (icon colours, SVG, navigation options, shadows).
 *
 * Designed for older adults with CKD: every text/background pair below is
 * WCAG AA or better (most are AAA ≥ 7:1), input borders are ≥ 3:1, and the
 * type scale never goes below 14px.
 *
 * Kept as CommonJS so tailwind.config.js can require() it directly.
 */

const palettes = {
  light: {
    background: "#FFFFFF", // 60% — clean white canvas
    card: "#FFFFFF", // cards lift off the canvas with shadow + hairline
    muted: "#F7F7F7", // quiet surfaces: inputs, tiles, tracks
    foreground: "#222222", // 30% — primary text (15.9:1)
    mutedForeground: "#5E5E5E", // secondary text (6.5:1)
    border: "#EBEBEB", // hairline edges
    input: "#8C8C8C", // form control edges (3.4:1)
    primary: "#0B6E4F", // 10% — brand / actions (6.3:1)
    primaryForeground: "#FFFFFF",
    primarySoft: "#E8F4EE",
    caution: "#8A4B00",
    cautionSoft: "#FFF4E0",
    danger: "#B42318",
    dangerForeground: "#FFFFFF",
    dangerSoft: "#FEF0EF",
    info: "#1D5FA8",
    infoSoft: "#EAF2FB",
    shadow: "#000000",
  },
  dark: {
    background: "#121212",
    card: "#1E1E1E",
    muted: "#2A2A2A",
    foreground: "#F2F2F2",
    mutedForeground: "#B0B0B0",
    border: "#333333",
    input: "#7A7A7A",
    primary: "#5DCB98",
    primaryForeground: "#07170F",
    primarySoft: "#17312A",
    caution: "#F7BE5C",
    cautionSoft: "#352812",
    danger: "#FF9C94",
    dangerForeground: "#2A0907",
    dangerSoft: "#3A1A18",
    info: "#8CBDF2",
    infoSoft: "#16283D",
    shadow: "#000000",
  },
};

/** Fixed colours that don't follow the theme (camera UI sits on a live photo). */
const fixed = {
  white: "#FFFFFF",
  black: "#000000",
  scrim: "rgba(0,0,0,0.55)",
  scrimLight: "rgba(0,0,0,0.35)",
  // Distinct hues for detection boxes drawn over meal photos.
  detection: ["#0F6A47", "#B7791F", "#1E5A9E", "#A8201A", "#6D28D9", "#BE185D", "#047857", "#C2410C"],
};

/**
 * Type scale — max 4 sizes, 2 weights. [fontSize, lineHeight, letterSpacing] in px.
 * Modern/Airbnb-like: compact body, big tight headlines, semibold (not heavy) emphasis.
 * Still never below 14px for older readers.
 */
const fontSize = {
  caption: [14, 20, 0],
  body: [16, 24, 0],
  title: [20, 26, -0.2],
  display: [28, 34, -0.5],
};

const fontWeight = /** @type {const} */ ({ normal: "400", bold: "600" });

/** 8-point grid. */
const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

const radius = { sm: 12, md: 16, lg: 24 };

/** Minimum touch target (pt) — above the 44pt guideline for older hands. */
const touch = 48;

/**
 * px per rem at 100% text size. Tailwind spacing (p-4, h-12 …) and the type
 * scale are in rem, so the Text size setting scales both together.
 */
const remBase = 14;

/** Options for Profile → Display → Text size. */
const textScales = [
  { value: 0.9, label: "Smaller" },
  { value: 1, label: "Default" },
  { value: 1.15, label: "Larger" },
  { value: 1.3, label: "Largest" },
];

module.exports = { palettes, fixed, fontSize, fontWeight, space, radius, touch, remBase, textScales };
