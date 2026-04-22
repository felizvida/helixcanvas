export const FONT_FAMILIES = [
  {
    id: "sans",
    label: "Studio Sans",
    stack: '"Avenir Next", "Segoe UI", sans-serif',
  },
  {
    id: "serif",
    label: "Editorial Serif",
    stack: '"Iowan Old Style", "Palatino Linotype", Georgia, serif',
  },
  {
    id: "grotesk",
    label: "Research Grotesk",
    stack: '"IBM Plex Sans", "Avenir Next", "Segoe UI", sans-serif',
  },
  {
    id: "mono",
    label: "Lab Mono",
    stack: '"SF Mono", "IBM Plex Mono", "Consolas", monospace',
  },
];

const FONT_STACK_BY_ID = Object.fromEntries(
  FONT_FAMILIES.map((fontFamily) => [fontFamily.id, fontFamily.stack]),
);

export function getFontFamilyStack(fontFamilyId = "sans") {
  return FONT_STACK_BY_ID[fontFamilyId] ?? FONT_STACK_BY_ID.sans;
}
