const DEFAULT_PALETTE = {
  background: "#f7f2ea",
  accent: "#0f766e",
  accentSoft: "#d8f0ee",
  ink: "#12232e",
  coral: "#ea8060",
  olive: "#90a85f",
  gold: "#b9853e",
  violet: "#7c6eb0",
  muted: "#51606d",
};

export const FIGURE_THEMES = [
  {
    id: "journal-sage",
    title: "Journal Sage",
    description: "Soft editorial green with warm paper tones for mechanism figures and clean manuscripts.",
    palette: {
      background: "#f6f2e8",
      accent: "#175f5c",
      accentSoft: "#dceee5",
      ink: "#18232b",
      coral: "#d97556",
      olive: "#7d9557",
      gold: "#b28c43",
      violet: "#7368a3",
      muted: "#53626d",
    },
  },
  {
    id: "clinical-coral",
    title: "Clinical Coral",
    description: "Crisp teal and coral contrast for translational workflows, perturbation studies, and assay figures.",
    palette: {
      background: "#faf4ef",
      accent: "#0d6d74",
      accentSoft: "#d5eef1",
      ink: "#1d2630",
      coral: "#df6d53",
      olive: "#8a9f55",
      gold: "#c39645",
      violet: "#7a6bb0",
      muted: "#5b6772",
    },
  },
  {
    id: "atlas-slate",
    title: "Atlas Slate",
    description: "Cool slate and restrained gold for systems views, timelines, and higher-density analytical figures.",
    palette: {
      background: "#f3f4f1",
      accent: "#24576a",
      accentSoft: "#d8e8ef",
      ink: "#1c2730",
      coral: "#c96f5c",
      olive: "#6f8c63",
      gold: "#a98843",
      violet: "#71689b",
      muted: "#5a6670",
    },
  },
  {
    id: "retina-dawn",
    title: "Retina Dawn",
    description: "Warm ivory with coral and ocean accents for microscopy, pathology overviews, and tissue storytelling.",
    palette: {
      background: "#fbf1ea",
      accent: "#166a7a",
      accentSoft: "#d7edf1",
      ink: "#202935",
      coral: "#d86d5a",
      olive: "#80915a",
      gold: "#bf8a45",
      violet: "#7663a2",
      muted: "#5d6876",
    },
  },
];

function resolvePalette(palette = {}) {
  return {
    ...DEFAULT_PALETTE,
    ...palette,
  };
}

function normalizeColor(value) {
  return String(value ?? "").trim().toLowerCase();
}

function createPaletteReplacementMap(previousPalette, nextPalette) {
  const previous = resolvePalette(previousPalette);
  const next = resolvePalette(nextPalette);
  const pairs = [
    [previous.background, next.background],
    [previous.accent, next.accent],
    [previous.accentSoft, next.accentSoft],
    [previous.ink, next.ink],
    [previous.coral, next.coral],
    [previous.olive, next.olive],
    [previous.gold, next.gold],
    [previous.violet, next.violet],
    [previous.muted, next.muted],
  ];

  return new Map(pairs.map(([from, to]) => [normalizeColor(from), to]));
}

function replacePaletteColor(value, replacements) {
  const direct = replacements.get(normalizeColor(value));
  return direct ?? value;
}

export function applyFigureTheme(project, themeOrPalette) {
  const theme =
    typeof themeOrPalette === "object" && themeOrPalette?.palette
      ? themeOrPalette
      : FIGURE_THEMES.find((item) => item.id === themeOrPalette);
  const nextPalette = resolvePalette(theme?.palette ?? themeOrPalette ?? {});
  const previousPalette = resolvePalette(project.palette ?? {});
  const replacements = createPaletteReplacementMap(previousPalette, nextPalette);

  const nodes = (project.nodes ?? []).map((node, index) => {
    if (node.type === "asset") {
      return node;
    }

    const nextNode = {
      ...node,
      color: replacePaletteColor(node.color, replacements),
      stroke: replacePaletteColor(node.stroke, replacements),
      fill: replacePaletteColor(node.fill, replacements),
    };

    if (node.type === "text") {
      if (node.role === "panel-label") {
        nextNode.color = nextPalette.accent;
      } else if ((node.fontWeight ?? 500) >= 700) {
        nextNode.color = replacePaletteColor(node.color, replacements) === node.color
          ? nextPalette.ink
          : nextNode.color;
      } else if (replacePaletteColor(node.color, replacements) === node.color) {
        nextNode.color = nextPalette.muted;
      }

      return nextNode;
    }

    if (node.role === "panel-frame") {
      nextNode.fill = "rgba(255, 255, 255, 0.72)";
      nextNode.stroke = nextPalette.accent;
      return nextNode;
    }

    if (node.role === "annotation-scale-bar") {
      nextNode.fill = nextPalette.ink;
      nextNode.stroke = nextPalette.ink;
      nextNode.color = nextPalette.ink;
      return nextNode;
    }

    if (node.type === "shape" && node.shape === "card") {
      if (replacePaletteColor(node.fill, replacements) === node.fill) {
        const cycle = [
          { fill: nextPalette.accentSoft, stroke: nextPalette.accent },
          { fill: "#eef5df", stroke: nextPalette.olive },
          { fill: "#fde1d6", stroke: nextPalette.coral },
          { fill: "#fff6ea", stroke: nextPalette.gold },
        ];
        const themeSlot = cycle[index % cycle.length];
        nextNode.fill = node.fill === "#ffffff" ? "#ffffff" : themeSlot.fill;
        nextNode.stroke = node.stroke === "#d7d3cb" ? "#d7d3cb" : themeSlot.stroke;
      }

      return nextNode;
    }

    return nextNode;
  });

  const connectors = (project.connectors ?? []).map((connector) => {
    let stroke = replacePaletteColor(connector.stroke, replacements);

    if (stroke === connector.stroke) {
      stroke =
        connector.kind === "inhibition"
          ? nextPalette.coral
          : connector.kind === "neutral"
            ? nextPalette.olive
            : nextPalette.accent;
    }

    return {
      ...connector,
      stroke,
    };
  });

  return {
    ...project,
    board: {
      ...project.board,
      background: nextPalette.background,
    },
    palette: {
      ...nextPalette,
      themeId: theme?.id ?? project.palette?.themeId ?? "",
    },
    nodes,
    connectors,
    updatedAt: new Date().toISOString(),
  };
}
