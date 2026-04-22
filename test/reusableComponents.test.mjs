import test from "node:test";
import assert from "node:assert/strict";

import {
  createReusableComponent,
  instantiateReusableComponent,
  pushReusableComponent,
  removeReusableComponent,
} from "../src/lib/reusableComponents.js";

function createId(prefix) {
  createId.counter += 1;
  return `${prefix}-${createId.counter}`;
}

createId.counter = 0;

test("createReusableComponent normalizes nodes relative to the top-left anchor", () => {
  const component = createReusableComponent(
    [
      { id: "a", type: "shape", x: 180, y: 220, w: 120, h: 80 },
      { id: "b", type: "text", x: 260, y: 300, w: 180, text: "Label" },
    ],
    {
      id: "component-1",
      createdAt: "2026-04-22T13:00:00.000Z",
      label: "Pathway cluster",
    },
  );

  assert.equal(component.id, "component-1");
  assert.equal(component.label, "Pathway cluster");
  assert.deepEqual(
    component.nodes.map((node) => ({ id: node.id, x: node.x, y: node.y })),
    [
      { id: "a", x: 0, y: 0 },
      { id: "b", x: 80, y: 80 },
    ],
  );
});

test("instantiateReusableComponent assigns fresh ids and group ids at a new position", () => {
  const instances = instantiateReusableComponent(
    {
      id: "component-1",
      label: "Legend block",
      nodes: [
        { id: "node-a", type: "shape", groupId: "legend-group", x: 0, y: 0, w: 120, h: 72 },
        { id: "node-b", type: "text", groupId: "legend-group", x: 18, y: 48, w: 180, text: "Legend" },
      ],
    },
    {
      createId,
      position: { x: 420, y: 300 },
    },
  );

  assert.equal(instances[0].id.startsWith("node-"), true);
  assert.equal(instances[0].groupId.startsWith("group-"), true);
  assert.equal(instances[0].groupId, instances[1].groupId);
  assert.equal(instances[0].x, 420);
  assert.equal(instances[1].y, 348);
  assert.equal(instances[0].locked, false);
});

test("pushReusableComponent prepends and limits saved components", () => {
  const next = pushReusableComponent(
    [{ id: "old-a" }, { id: "old-b" }],
    { id: "new" },
    2,
  );

  assert.deepEqual(next, [{ id: "new" }, { id: "old-a" }]);
});

test("removeReusableComponent deletes the chosen saved component", () => {
  const next = removeReusableComponent(
    [{ id: "component-a" }, { id: "component-b" }],
    "component-a",
  );

  assert.deepEqual(next, [{ id: "component-b" }]);
});

