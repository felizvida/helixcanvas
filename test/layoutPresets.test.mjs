import test from "node:test";
import assert from "node:assert/strict";

import {
  PANEL_LAYOUT_PRESETS,
  buildPanelLayout,
  getPanelCellCount,
  placeNodesIntoPanelLayout,
} from "../src/lib/layoutPresets.js";

function createId(prefix) {
  createId.counter += 1;
  return `${prefix}-${createId.counter}`;
}

createId.counter = 0;

test("buildPanelLayout creates grouped panel frames and labels for a preset", () => {
  const layout = buildPanelLayout(
    "panels-2x2",
    { width: 1400, height: 900 },
    { accent: "#0f766e" },
    createId,
  );

  assert.equal(layout.preset.id, "panels-2x2");
  assert.equal(layout.cells.length, 4);
  assert.equal(layout.nodes.length, 8);
  assert.equal(layout.nodes[0].role, "panel-frame");
  assert.equal(layout.nodes[1].role, "panel-label");
  assert.equal(layout.nodes[0].groupId, layout.nodes[1].groupId);
});

test("placeNodesIntoPanelLayout centers and scales selected nodes into cells", () => {
  const layout = buildPanelLayout(
    "panels-1x2",
    { width: 1400, height: 900 },
    { accent: "#0f766e" },
    createId,
  );

  const result = placeNodesIntoPanelLayout(
    [
      { id: "asset-a", type: "asset", x: 120, y: 120, w: 420, h: 320 },
      { id: "shape-b", type: "shape", x: 560, y: 180, w: 320, h: 260 },
    ],
    ["asset-a", "shape-b"],
    layout.cells,
  );

  assert.equal(result[0].x > layout.cells[0].x, true);
  assert.equal(result[0].y > layout.cells[0].y, true);
  assert.equal(result[0].w <= layout.cells[0].w - 44, true);
  assert.equal(result[1].x > layout.cells[1].x, true);
  assert.equal(result[1].h <= layout.cells[1].h - 52, true);
});

test("placeNodesIntoPanelLayout constrains text width within a panel cell", () => {
  const layout = buildPanelLayout(
    "panels-1x3",
    { width: 1400, height: 900 },
    { accent: "#0f766e" },
    createId,
  );

  const [textNode] = placeNodesIntoPanelLayout(
    [
      { id: "text-a", type: "text", x: 220, y: 160, w: 520, fontSize: 28, text: "Panel note" },
    ],
    ["text-a"],
    layout.cells,
  );

  assert.equal(textNode.w <= layout.cells[0].w - 44, true);
  assert.equal(textNode.x >= layout.cells[0].x, true);
});

test("panel presets report the expected slot counts", () => {
  const counts = Object.fromEntries(PANEL_LAYOUT_PRESETS.map((preset) => [preset.id, getPanelCellCount(preset.id)]));

  assert.deepEqual(counts, {
    "panels-1x2": 2,
    "panels-1x3": 3,
    "panels-2x2": 4,
  });
});

