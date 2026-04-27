import test from "node:test";
import assert from "node:assert/strict";

import {
  buildConnectorArrowHead,
  buildConnectorGeometry,
  buildConnectorInhibitionBar,
  createConnectorDraftBetweenNodes,
  createConnectorDraftFromNode,
  findNearestNodeAnchor,
  getConnectorCurveBendFromPoint,
  getConnectorStrokeDasharray,
  resolveConnectorAnchors,
} from "../src/lib/connectors.js";

test("buildConnectorGeometry creates an elbow route with a stable label anchor", () => {
  const geometry = buildConnectorGeometry({
    from: { x: 60, y: 80 },
    to: { x: 220, y: 180 },
    route: "elbow",
  });

  assert.equal(geometry.route, "elbow");
  assert.equal(geometry.points.length, 4);
  assert.equal(geometry.path, "M 60 80 L 140 80 L 140 180 L 220 180");
  assert.deepEqual(geometry.label, { x: 140, y: 118 });
});

test("buildConnectorGeometry creates curved routes with bend controls", () => {
  const geometry = buildConnectorGeometry({
    from: { x: 40, y: 100 },
    to: { x: 220, y: 100 },
    route: "curve",
    curveBend: 50,
  });

  assert.equal(geometry.route, "curve");
  assert.match(geometry.path, /^M 40 100 C /);
  assert.equal(geometry.points.length, 4);
  assert.ok(geometry.controls.c1.y > 100);
  assert.ok(geometry.controls.c2.y > 100);
  assert.ok(geometry.curveHandle.y > 100);
  assert.deepEqual(geometry.endSegment.to, { x: 220, y: 100 });
});

test("getConnectorCurveBendFromPoint converts an on-canvas handle to bend strength", () => {
  const connector = {
    from: { x: 40, y: 100 },
    to: { x: 220, y: 100 },
    route: "curve",
  };
  const geometry = buildConnectorGeometry({ ...connector, curveBend: 50 });

  assert.equal(getConnectorCurveBendFromPoint(connector, geometry.curveHandle), 50);
  assert.equal(getConnectorCurveBendFromPoint(connector, { x: 130, y: -200 }), -100);
});

test("buildConnectorArrowHead returns three polygon points at the connector tip", () => {
  const arrow = buildConnectorArrowHead({
    from: { x: 40, y: 100 },
    to: { x: 120, y: 100 },
  });

  assert.equal(arrow, "120,100 106,105 106,95");
});

test("buildConnectorInhibitionBar returns a perpendicular cap at the connector end", () => {
  const bar = buildConnectorInhibitionBar({
    from: { x: 160, y: 40 },
    to: { x: 160, y: 120 },
  });

  assert.deepEqual(bar, {
    x1: 154,
    y1: 120,
    x2: 166,
    y2: 120,
  });
});

test("getConnectorStrokeDasharray maps connector line styles to SVG dash arrays", () => {
  assert.equal(getConnectorStrokeDasharray({ lineStyle: "solid", strokeWidth: 4 }), "");
  assert.equal(getConnectorStrokeDasharray({ lineStyle: "dashed", strokeWidth: 4 }), "12 8");
  assert.equal(getConnectorStrokeDasharray({ lineStyle: "dotted", strokeWidth: 5 }), "0 11");
});

test("findNearestNodeAnchor snaps connector handles to nearby layer edges", () => {
  const anchor = findNearestNodeAnchor(
    { x: 198, y: 150 },
    [{ id: "erk", type: "shape", title: "ERK", x: 100, y: 100, w: 100, h: 80 }],
  );

  assert.equal(anchor.nodeId, "erk");
  assert.equal(anchor.side, "right");
  assert.deepEqual(anchor.point, { x: 200, y: 140 });
});

test("resolveConnectorAnchors renders anchored endpoints from current node bounds", () => {
  const connector = resolveConnectorAnchors(
    {
      from: { x: 0, y: 0 },
      to: { x: 300, y: 140 },
      fromAnchor: { nodeId: "egfr", side: "right" },
      route: "straight",
    },
    [{ id: "egfr", type: "shape", title: "EGFR", x: 100, y: 100, w: 100, h: 80 }],
  );

  assert.deepEqual(connector.from, { x: 200, y: 140 });
  assert.deepEqual(connector.to, { x: 300, y: 140 });
});

test("createConnectorDraftBetweenNodes anchors a new connector between selected layers", () => {
  const connector = createConnectorDraftBetweenNodes(
    { id: "egfr", type: "shape", title: "EGFR", x: 100, y: 100, w: 120, h: 80 },
    { id: "erk", type: "shape", title: "ERK", x: 320, y: 100, w: 120, h: 80 },
    { id: "connector-1", stroke: "#0f766e" },
  );

  assert.equal(connector.id, "connector-1");
  assert.equal(connector.route, "curve");
  assert.equal(connector.stroke, "#0f766e");
  assert.deepEqual(connector.fromAnchor, { nodeId: "egfr", side: "right" });
  assert.deepEqual(connector.toAnchor, { nodeId: "erk", side: "left" });
  assert.deepEqual(connector.from, { x: 220, y: 140 });
  assert.deepEqual(connector.to, { x: 320, y: 140 });
});

test("createConnectorDraftFromNode starts a free connector from the selected layer edge", () => {
  const connector = createConnectorDraftFromNode(
    { id: "cell", type: "shape", title: "Cell", x: 80, y: 120, w: 160, h: 100 },
    { id: "connector-2" },
  );

  assert.deepEqual(connector.fromAnchor, { nodeId: "cell", side: "right" });
  assert.deepEqual(connector.toAnchor, null);
  assert.deepEqual(connector.from, { x: 240, y: 170 });
  assert.deepEqual(connector.to, { x: 420, y: 170 });
});
