import test from "node:test";
import assert from "node:assert/strict";

import { applyFigureTheme, FIGURE_THEMES } from "../src/lib/figureThemes.js";

test("applyFigureTheme updates the board, palette, and theme id", () => {
  const project = {
    board: { width: 1400, height: 900, background: "#f7f2ea" },
    palette: {
      background: "#f7f2ea",
      accent: "#0f766e",
      accentSoft: "#d8f0ee",
      ink: "#12232e",
      coral: "#ea8060",
      olive: "#90a85f",
      gold: "#b9853e",
      muted: "#51606d",
    },
    nodes: [
      {
        id: "shape-1",
        type: "shape",
        shape: "card",
        fill: "#d8f0ee",
        stroke: "#0f766e",
        color: "#12232e",
      },
      {
        id: "text-1",
        type: "text",
        text: "Title",
        fontWeight: 800,
        color: "#12232e",
      },
    ],
    connectors: [
      {
        id: "connector-1",
        kind: "activation",
        stroke: "#0f766e",
        from: { x: 0, y: 0 },
        to: { x: 10, y: 10 },
      },
    ],
  };

  const themed = applyFigureTheme(project, "clinical-coral");

  assert.equal(themed.palette.themeId, "clinical-coral");
  assert.equal(themed.board.background, FIGURE_THEMES.find((theme) => theme.id === "clinical-coral").palette.background);
  assert.equal(themed.nodes[0].stroke, FIGURE_THEMES.find((theme) => theme.id === "clinical-coral").palette.accent);
  assert.equal(themed.connectors[0].stroke, FIGURE_THEMES.find((theme) => theme.id === "clinical-coral").palette.accent);
});
