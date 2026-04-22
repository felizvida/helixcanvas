import test from "node:test";
import assert from "node:assert/strict";

import {
  buildConnectorArrowHead,
  buildConnectorGeometry,
  buildConnectorInhibitionBar,
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
