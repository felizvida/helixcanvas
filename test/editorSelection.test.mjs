import test from "node:test";
import assert from "node:assert/strict";

import {
  alignSelectedNodes,
  arrangeSelectedNodes,
  createConnectorTransformSnapshot,
  createNodeSelection,
  createTransformOriginSnapshot,
  distributeSelectedNodes,
  findAlignmentGuides,
  fitConnectorsToBounds,
  flipSelectedNodes,
  flipConnectors,
  fitSelectedNodesToBounds,
  getMarqueeRect,
  getMarqueeSelectionIds,
  getNodeBounds,
  isNodeSelected,
  matchSelectedNodeSize,
  resizeConnectors,
  resizeSelectedNodes,
  reorderSelectedNodes,
  rotateConnectorsBy,
  rotateSelectedNodes,
  rotateSelectedNodesBy,
  translateConnectorsBy,
} from "../src/lib/editorSelection.js";

function roundedPoint(point) {
  return {
    x: Math.round(point.x),
    y: Math.round(point.y),
  };
}

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

test("arrangeSelectedNodes creates an evenly spaced row around the selection center", () => {
  const nodes = arrangeSelectedNodes(
    [
      { id: "a", type: "shape", x: 100, y: 100, w: 80, h: 40 },
      { id: "b", type: "shape", x: 300, y: 180, w: 80, h: 40 },
      { id: "c", type: "shape", x: 500, y: 120, w: 80, h: 40 },
    ],
    ["a", "b", "c"],
    "row",
    { gap: 40 },
  );

  assert.deepEqual(
    nodes.map((node) => ({ id: node.id, x: node.x, y: node.y })),
    [
      { id: "a", x: 180, y: 140 },
      { id: "b", x: 300, y: 140 },
      { id: "c", x: 420, y: 140 },
    ],
  );
});

test("arrangeSelectedNodes creates a vertical column sorted by current y position", () => {
  const nodes = arrangeSelectedNodes(
    [
      { id: "a", type: "shape", x: 280, y: 220, w: 80, h: 40 },
      { id: "b", type: "shape", x: 100, y: 100, w: 80, h: 40 },
      { id: "c", type: "shape", x: 460, y: 340, w: 80, h: 40 },
    ],
    ["a", "b", "c"],
    "column",
    { gap: 20 },
  );

  assert.deepEqual(
    nodes.map((node) => ({ id: node.id, x: node.x, y: node.y })),
    [
      { id: "a", x: 280, y: 220 },
      { id: "b", x: 280, y: 160 },
      { id: "c", x: 280, y: 280 },
    ],
  );
});

test("arrangeSelectedNodes creates a radial layout around the selection center", () => {
  const nodes = arrangeSelectedNodes(
    [
      { id: "a", type: "shape", x: 160, y: 160, w: 40, h: 40 },
      { id: "b", type: "shape", x: 240, y: 160, w: 40, h: 40 },
      { id: "c", type: "shape", x: 240, y: 240, w: 40, h: 40 },
      { id: "d", type: "shape", x: 160, y: 240, w: 40, h: 40 },
    ],
    ["a", "b", "c", "d"],
    "radial",
    { radius: 80 },
  );

  assert.deepEqual(
    nodes.map((node) => ({ id: node.id, x: Math.round(node.x), y: Math.round(node.y) })),
    [
      { id: "a", x: 200, y: 120 },
      { id: "b", x: 280, y: 200 },
      { id: "c", x: 200, y: 280 },
      { id: "d", x: 120, y: 200 },
    ],
  );
});

test("arrangeSelectedNodes creates a compact grid sorted by reading order", () => {
  const nodes = arrangeSelectedNodes(
    [
      { id: "a", type: "shape", x: 100, y: 100, w: 60, h: 40 },
      { id: "b", type: "shape", x: 220, y: 100, w: 80, h: 40 },
      { id: "c", type: "shape", x: 100, y: 220, w: 60, h: 60 },
      { id: "d", type: "shape", x: 220, y: 220, w: 80, h: 60 },
    ],
    ["a", "b", "c", "d"],
    "grid",
    { columns: 2, gap: 20 },
  );

  assert.deepEqual(
    nodes.map((node) => ({ id: node.id, x: node.x, y: node.y })),
    [
      { id: "a", x: 120, y: 130 },
      { id: "b", x: 210, y: 130 },
      { id: "c", x: 120, y: 200 },
      { id: "d", x: 210, y: 200 },
    ],
  );
});

test("reorderSelectedNodes moves sparse selections forward and backward one layer", () => {
  const nodes = [
    { id: "a" },
    { id: "b" },
    { id: "c" },
    { id: "d" },
  ];

  assert.deepEqual(
    reorderSelectedNodes(nodes, ["b"], "forward").map((node) => node.id),
    ["a", "c", "b", "d"],
  );
  assert.deepEqual(
    reorderSelectedNodes(nodes, ["c"], "backward").map((node) => node.id),
    ["a", "c", "b", "d"],
  );
});

test("reorderSelectedNodes sends selections to front and back while preserving internal order", () => {
  const nodes = [
    { id: "a" },
    { id: "b" },
    { id: "c" },
    { id: "d" },
  ];

  assert.deepEqual(
    reorderSelectedNodes(nodes, ["b", "d"], "front").map((node) => node.id),
    ["a", "c", "b", "d"],
  );
  assert.deepEqual(
    reorderSelectedNodes(nodes, ["b", "d"], "back").map((node) => node.id),
    ["b", "d", "a", "c"],
  );
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

test("resizeSelectedNodes scales a multi-node selection from a corner handle", () => {
  const nodes = [
    { id: "a", type: "shape", x: 100, y: 100, w: 100, h: 50 },
    { id: "b", type: "shape", x: 250, y: 150, w: 50, h: 50 },
  ];
  const snapshot = createTransformOriginSnapshot(nodes, ["a", "b"]);
  const resized = resizeSelectedNodes(
    nodes,
    ["a", "b"],
    snapshot.nodes,
    snapshot.bounds,
    "se",
    { x: 500, y: 300 },
    { preserveAspect: false },
  );

  assert.equal(resized[0].x, 100);
  assert.equal(resized[0].y, 100);
  assert.equal(resized[0].w, 200);
  assert.equal(resized[0].h, 100);
  assert.equal(resized[1].x, 400);
  assert.equal(resized[1].y, 200);
});

test("rotateSelectedNodes rotates objects around the combined selection center", () => {
  const nodes = [
    { id: "a", type: "shape", x: 100, y: 100, w: 40, h: 40, rotation: 0 },
    { id: "b", type: "shape", x: 180, y: 100, w: 40, h: 40, rotation: 0 },
  ];
  const snapshot = createTransformOriginSnapshot(nodes, ["a", "b"]);
  const rotated = rotateSelectedNodes(
    nodes,
    ["a", "b"],
    snapshot.nodes,
    snapshot.bounds,
    { x: 160, y: 60 },
    { x: 200, y: 120 },
    { snapDegrees: 90 },
  );

  assert.equal(rotated[0].rotation, 90);
  assert.equal(rotated[1].rotation, 90);
  assert.equal(rotated[0].x, 140);
  assert.equal(rotated[0].y, 60);
  assert.equal(rotated[1].x, 140);
  assert.equal(rotated[1].y, 140);
});

test("flipSelectedNodes mirrors positions and toggles flip metadata", () => {
  const nodes = [
    { id: "a", type: "shape", x: 100, y: 100, w: 40, h: 40 },
    { id: "b", type: "shape", x: 180, y: 100, w: 40, h: 40 },
  ];
  const flipped = flipSelectedNodes(nodes, ["a", "b"], "horizontal");

  assert.equal(flipped[0].x, 180);
  assert.equal(flipped[1].x, 100);
  assert.equal(flipped[0].flipX, true);
  assert.equal(flipped[1].flipX, true);
});

test("rotateSelectedNodesBy applies a fixed rotation delta", () => {
  const nodes = rotateSelectedNodesBy(
    [{ id: "a", type: "shape", x: 0, y: 0, w: 10, h: 10, rotation: 170 }],
    ["a"],
    30,
  );

  assert.equal(nodes[0].rotation, -160);
});

test("rotateSelectedNodesBy rotates multi-node layouts around the selection center", () => {
  const nodes = rotateSelectedNodesBy(
    [
      { id: "a", type: "shape", x: 100, y: 100, w: 40, h: 40, rotation: 0 },
      { id: "b", type: "shape", x: 180, y: 100, w: 40, h: 40, rotation: 0 },
    ],
    ["a", "b"],
    90,
  );

  assert.equal(nodes[0].rotation, 90);
  assert.equal(nodes[1].rotation, 90);
  assert.equal(Math.round(nodes[0].x), 140);
  assert.equal(Math.round(nodes[0].y), 60);
  assert.equal(Math.round(nodes[1].x), 140);
  assert.equal(Math.round(nodes[1].y), 140);
});

test("matchSelectedNodeSize copies reference dimensions to the rest of the selection", () => {
  const nodes = matchSelectedNodeSize(
    [
      { id: "a", type: "shape", x: 100, y: 100, w: 120, h: 70 },
      { id: "b", type: "shape", x: 240, y: 100, w: 60, h: 40 },
    ],
    ["a", "b"],
    "both",
  );

  assert.equal(nodes[1].w, 120);
  assert.equal(nodes[1].h, 70);
});

test("fitSelectedNodesToBounds scales a selection into a padded target", () => {
  const nodes = fitSelectedNodesToBounds(
    [{ id: "a", type: "shape", x: 100, y: 100, w: 100, h: 50 }],
    ["a"],
    { left: 0, top: 0, width: 300, height: 300 },
    { padding: 50 },
  );

  assert.equal(nodes[0].w, 200);
  assert.equal(nodes[0].h, 100);
  assert.equal(nodes[0].x, 50);
  assert.equal(nodes[0].y, 100);
});

test("connector transform snapshots capture enclosed graph arrows only", () => {
  const snapshot = createConnectorTransformSnapshot(
    [
      { id: "inside", from: { x: 120, y: 150 }, to: { x: 180, y: 150 } },
      { id: "outside", from: { x: 10, y: 150 }, to: { x: 180, y: 150 } },
    ],
    { left: 100, top: 100, right: 200, bottom: 200, width: 100, height: 100 },
  );

  assert.deepEqual(snapshot.ids, ["inside"]);
  assert.deepEqual(snapshot.connectors.inside.from, { x: 120, y: 150 });
});

test("resizeConnectors scales enclosed connector endpoints with the selected graph", () => {
  const connectors = [{ id: "c", from: { x: 120, y: 150 }, to: { x: 180, y: 150 } }];
  const bounds = { left: 100, top: 100, right: 200, bottom: 200, width: 100, height: 100 };
  const snapshot = createConnectorTransformSnapshot(connectors, bounds);
  const resized = resizeConnectors(
    connectors,
    snapshot.ids,
    snapshot.connectors,
    bounds,
    "se",
    { x: 300, y: 300 },
  );

  assert.deepEqual(roundedPoint(resized[0].from), { x: 140, y: 200 });
  assert.deepEqual(roundedPoint(resized[0].to), { x: 260, y: 200 });
});

test("rotateConnectorsBy and flipConnectors transform graph arrows around selection bounds", () => {
  const connectors = [{ id: "c", from: { x: 120, y: 150 }, to: { x: 180, y: 150 } }];
  const bounds = { left: 100, top: 100, right: 200, bottom: 200, width: 100, height: 100 };
  const snapshot = createConnectorTransformSnapshot(connectors, bounds);
  const rotated = rotateConnectorsBy(connectors, snapshot.ids, snapshot.connectors, bounds, 90);
  const flipped = flipConnectors(connectors, snapshot.ids, snapshot.connectors, bounds, "horizontal");

  assert.deepEqual(roundedPoint(rotated[0].from), { x: 150, y: 120 });
  assert.deepEqual(roundedPoint(rotated[0].to), { x: 150, y: 180 });
  assert.deepEqual(roundedPoint(flipped[0].from), { x: 180, y: 150 });
  assert.deepEqual(roundedPoint(flipped[0].to), { x: 120, y: 150 });
});

test("translateConnectorsBy and fitConnectorsToBounds keep arrows attached to transformed graphs", () => {
  const connectors = [{ id: "c", from: { x: 120, y: 150 }, to: { x: 180, y: 150 } }];
  const bounds = { left: 100, top: 100, right: 200, bottom: 200, width: 100, height: 100 };
  const snapshot = createConnectorTransformSnapshot(connectors, bounds);
  const translated = translateConnectorsBy(connectors, snapshot.ids, snapshot.connectors, 40, -20);
  const fitted = fitConnectorsToBounds(
    connectors,
    snapshot.ids,
    snapshot.connectors,
    bounds,
    { left: 0, top: 0, width: 400, height: 200 },
    { padding: 50 },
  );

  assert.deepEqual(roundedPoint(translated[0].from), { x: 160, y: 130 });
  assert.deepEqual(roundedPoint(translated[0].to), { x: 220, y: 130 });
  assert.deepEqual(roundedPoint(fitted[0].from), { x: 170, y: 100 });
  assert.deepEqual(roundedPoint(fitted[0].to), { x: 230, y: 100 });
});
