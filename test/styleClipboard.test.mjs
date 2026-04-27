import test from "node:test";
import assert from "node:assert/strict";

import {
  applyConnectorStyleSnapshot,
  applyNodeStyleSnapshot,
  createConnectorStyleSnapshot,
  createNodeStyleSnapshot,
} from "../src/lib/styleClipboard.js";

test("createNodeStyleSnapshot captures portable layer styling without undefined fields", () => {
  const snapshot = createNodeStyleSnapshot({
    id: "cell",
    title: "T cell",
    type: "shape",
    fill: "#f5efe6",
    stroke: "#2e5f73",
    opacity: 0.82,
    effect: "halo",
    cropX: undefined,
  });

  assert.equal(snapshot.kind, "node-style");
  assert.equal(snapshot.sourceLabel, "T cell");
  assert.deepEqual(snapshot.patch, {
    fill: "#f5efe6",
    stroke: "#2e5f73",
    opacity: 0.82,
    effect: "halo",
  });
});

test("applyNodeStyleSnapshot paints selected unlocked layers and preserves locked layers", () => {
  const snapshot = createNodeStyleSnapshot({
    id: "source",
    fill: "#0f4c5c",
    stroke: "#f4a261",
    strokeWidth: 3,
    effect: "lifted",
  });
  const nodes = applyNodeStyleSnapshot(
    [
      { id: "a", fill: "#ffffff", stroke: "#111111", locked: false },
      { id: "b", fill: "#eeeeee", stroke: "#222222", locked: true },
      { id: "c", fill: "#dddddd", stroke: "#333333" },
    ],
    ["a", "b"],
    snapshot,
  );

  assert.equal(nodes[0].fill, "#0f4c5c");
  assert.equal(nodes[0].strokeWidth, 3);
  assert.equal(nodes[0].effect, "lifted");
  assert.equal(nodes[1].fill, "#eeeeee");
  assert.equal(nodes[1].stroke, "#222222");
  assert.equal(nodes[2].fill, "#dddddd");
});

test("applyConnectorStyleSnapshot transfers connector route and stroke styling", () => {
  const snapshot = createConnectorStyleSnapshot({
    id: "source-link",
    label: "MAPK signal",
    stroke: "#d94f30",
    strokeWidth: 5,
    kind: "activation",
    route: "curve",
    lineStyle: "dashed",
    curveBend: 42,
  });
  const connectors = applyConnectorStyleSnapshot(
    [
      { id: "link-a", stroke: "#333333", route: "straight" },
      { id: "link-b", stroke: "#444444", route: "elbow" },
    ],
    "link-b",
    snapshot,
  );

  assert.equal(snapshot.sourceLabel, "MAPK signal");
  assert.equal(connectors[0].stroke, "#333333");
  assert.equal(connectors[1].stroke, "#d94f30");
  assert.equal(connectors[1].strokeWidth, 5);
  assert.equal(connectors[1].route, "curve");
  assert.equal(connectors[1].lineStyle, "dashed");
  assert.equal(connectors[1].curveBend, 42);
});
