import test from "node:test";
import assert from "node:assert/strict";

import {
  alignSelectedNodes,
  createNodeSelection,
  distributeSelectedNodes,
  findAlignmentGuides,
  getMarqueeRect,
  getMarqueeSelectionIds,
  getNodeBounds,
  isNodeSelected,
} from "../src/lib/editorSelection.js";

test("createNodeSelection deduplicates ids and preserves order", () => {
  const selection = createNodeSelection(["node-a", "node-b", "node-a"]);

  assert.deepEqual(selection, {
    kind: "nodes",
    ids: ["node-a", "node-b"],
  });
});

test("isNodeSelected checks membership in a node selection", () => {
  const selection = createNodeSelection(["node-a", "node-b"]);

  assert.equal(isNodeSelected(selection, "node-b"), true);
  assert.equal(isNodeSelected(selection, "node-c"), false);
});

test("getNodeBounds estimates top and height for text nodes", () => {
  const bounds = getNodeBounds({
    id: "note",
    type: "text",
    x: 80,
    y: 140,
    w: 200,
    fontSize: 20,
  });

  assert.equal(bounds.left, 80);
  assert.equal(bounds.right, 280);
  assert.ok(bounds.top < 140);
  assert.ok(bounds.height > 20);
});

test("getMarqueeSelectionIds returns visible intersecting nodes", () => {
  const rect = getMarqueeRect({ x: 80, y: 80 }, { x: 260, y: 260 });
  const ids = getMarqueeSelectionIds(
    [
      { id: "shape-a", type: "shape", x: 96, y: 96, w: 120, h: 90 },
      { id: "shape-b", type: "shape", x: 320, y: 96, w: 120, h: 90 },
      { id: "text-hidden", type: "text", x: 110, y: 220, w: 150, fontSize: 18, hidden: true },
    ],
    rect,
  );

  assert.deepEqual(ids, ["shape-a"]);
});

test("alignSelectedNodes aligns selected nodes to the leftmost position", () => {
  const nodes = alignSelectedNodes(
    [
      { id: "shape-a", type: "shape", x: 100, y: 100, w: 90, h: 60 },
      { id: "shape-b", type: "shape", x: 240, y: 160, w: 120, h: 60 },
    ],
    ["shape-a", "shape-b"],
    "left",
  );

  assert.equal(nodes[0].x, 100);
  assert.equal(nodes[1].x, 100);
});

test("distributeSelectedNodes spaces middle nodes evenly across a span", () => {
  const nodes = distributeSelectedNodes(
    [
      { id: "a", type: "shape", x: 100, y: 120, w: 80, h: 60 },
      { id: "b", type: "shape", x: 160, y: 120, w: 80, h: 60 },
      { id: "c", type: "shape", x: 360, y: 120, w: 80, h: 60 },
    ],
    ["a", "b", "c"],
    "horizontal",
  );

  assert.equal(nodes[0].x, 100);
  assert.equal(nodes[2].x, 360);
  assert.equal(nodes[1].x, 230);
});

test("findAlignmentGuides snaps a moving selection onto a nearby center line", () => {
  const result = findAlignmentGuides(
    [
      { id: "target", type: "shape", x: 200, y: 120, w: 80, h: 80 },
      { id: "moving", type: "shape", x: 204, y: 220, w: 80, h: 80 },
    ],
    ["moving"],
    {
      moving: { x: 204, y: 220 },
    },
    0,
    0,
    8,
  );

  assert.equal(result.adjustedDeltaX, -4);
  assert.equal(result.adjustedDeltaY, 0);
  assert.deepEqual(result.guides, [
    {
      orientation: "vertical",
      x: 200,
      start: 120,
      end: 300,
    },
  ]);
});
