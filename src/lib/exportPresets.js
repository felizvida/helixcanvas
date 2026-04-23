export const EXPORT_PRESETS = [
  {
    id: "custom",
    title: "Custom",
    description: "Keep the current board size and export settings.",
    board: null,
    scale: null,
    transparent: null,
  },
  {
    id: "manuscript",
    title: "Manuscript figure",
    description: "Balanced board for papers and graphical abstracts with opaque background.",
    board: {
      width: 1600,
      height: 1200,
    },
    scale: 2,
    transparent: false,
  },
  {
    id: "slides",
    title: "Slides",
    description: "Widescreen deck target with transparent raster defaults for presentation layouts.",
    board: {
      width: 1920,
      height: 1080,
    },
    scale: 2,
    transparent: true,
  },
  {
    id: "poster",
    title: "Poster panel",
    description: "Higher-density landscape board for poster figures and large-format export.",
    board: {
      width: 2400,
      height: 1350,
    },
    scale: 3,
    transparent: false,
  },
];

export function getExportPreset(presetId) {
  return EXPORT_PRESETS.find((preset) => preset.id === presetId) ?? EXPORT_PRESETS[0];
}

export function applyExportPreset(project, presetIdOrPreset) {
  const preset =
    typeof presetIdOrPreset === "object" && presetIdOrPreset?.id
      ? presetIdOrPreset
      : getExportPreset(presetIdOrPreset);

  if (!preset.board) {
    return {
      ...project,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    ...project,
    board: {
      ...project.board,
      ...preset.board,
    },
    updatedAt: new Date().toISOString(),
  };
}
