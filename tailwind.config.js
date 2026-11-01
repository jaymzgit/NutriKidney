const tokens = require("./theme/tokens");

// "#0F6A47" → "15 106 71" so colours work with opacity modifiers (bg-primary/10).
const toRgb = (hex) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(" ");

const kebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const colorVars = (palette) =>
  Object.fromEntries(
    Object.entries(palette).map(([k, v]) => [`--color-${kebab(k)}`, toRgb(v)])
  );

const colors = Object.fromEntries(
  Object.keys(tokens.palettes.light).map((k) => [
    kebab(k),
    `rgb(var(--color-${kebab(k)}) / <alpha-value>)`,
  ])
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    // Replaced (not extended) so only the token scale is available.
    fontSize: Object.fromEntries(
      // In rem (not px) so the Text size setting can scale them at runtime.
      Object.entries(tokens.fontSize).map(([k, [size, lh, ls]]) => [
        k,
        [
          `${size / tokens.remBase}rem`,
          { lineHeight: `${lh / tokens.remBase}rem`, letterSpacing: `${ls}px` },
        ],
      ])
    ),
    fontWeight: tokens.fontWeight,
    extend: {
      colors,
      borderRadius: Object.fromEntries(
        Object.entries(tokens.radius).map(([k, v]) => [k, `${v}px`])
      ),
      minHeight: { touch: `${tokens.touch}px` },
      minWidth: { touch: `${tokens.touch}px` },
    },
  },
  plugins: [
    ({ addBase }) =>
      addBase({
        ":root": colorVars(tokens.palettes.light),
        ".dark:root": colorVars(tokens.palettes.dark),
      }),
  ],
};
