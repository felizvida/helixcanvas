import test from "node:test";
import assert from "node:assert/strict";

import {
  createSceneClipboard,
  instantiateSceneClipboard,
  removeSelectionFromProject,
} from "../src/lib/sceneClipboard.js";

function createId(prefix) {
  createId.counter += 1;
  return `${prefix}-${createId.counter}`;
}

createId.counter = 0;

function createProject() {
  return {
    nodes: [
      { id: "egfr", type: "shape", title: "EGFR", groupId: "pathway", x: 100, y: 100, w: 120, h: 80 },
      { id: "erk", type: "shape", title: "ERK", groupId: "pathway", x: 320, y: 100, w: 120, h: 80 },
      { id: "outside", type: "shape", title: "Nucleus", x: 620, y: 100, w: 120, h: 80 },
    ],
    connectors: [
      {
        id: "egfr-erk",
        from: { x: 220, y: 140 },
        to: { x: 320, y: 140 },
        fromAnchor: { nodeId: "egfr", side: "right" },
        toAnchor: { nodeId: "erk", side: "left" },
        route: "curve",
        curveBend: 36,
      },
      {
        id: "erk-outside",
        from: { x: 440, y: 140 },
        to: { x: 620, y: 140 },
        fromAnchor: { nodeId: "erk", side: "right" },
        toAnchor: { nodeId: "outside", side: "left" },
      },
    ],
    comments: [
      { id: "comment-egfr", nodeId: "egfr", x: 204, y: 84, body: "Check receptor state" },
      { id: "comment-board", nodeId: null, x: 40, y: 40, body: "Board note" },
    ],
  };
}

test("createSceneClipboard captures selected nodes with internal connectors and comments", () => {
  const fragment = createSceneClipboard(createProject(), {
    kind: "nodes",
    ids: ["egfr", "erk"],
  });

  assert.equal(fragment.sourceLabel, "2 layers");
  assert.deepEqual(
    fragment.nodes.map((node) => ({ id: node.id, x: node.x, y: node.y })),
    [
      { id: "egfr", x: 0, y: 0 },
      { id: "erk", x: 220, y: 0 },
    ],
  );
  assert.deepEqual(fragment.connectors.map((connector) => connector.id), ["egfr-erk"]);
  assert.equal(fragment.connectors[0].from.x, 120);
  assert.equal(fragment.comments[0].id, "comment-egfr");
  assert.equal(fragment.comments[0].x, 104);
});

test("instantiateSceneClipboard remaps ids, group ids, anchors, and locked state", () => {
  const fragment = createSceneClipboard(createProject(), {
    kind: "nodes",
    ids: ["egfr", "erk"],
  });
  const instance = instantiateSceneClipboard(fragment, {
    createId,
    position: { x: 500, y: 260 },
    createdAt: "2026-04-24T12:00:00.000Z",
  });

  assert.equal(instance.nodes.length, 2);
  assert.equal(instance.nodes[0].id, "node-1");
  assert.equal(instance.nodes[1].id, "node-3");
  assert.equal(instance.nodes[0].groupId, instance.nodes[1].groupId);
  assert.equal(instance.nodes[0].x, 500);
  assert.equal(instance.nodes[1].x, 720);
  assert.equal(instance.nodes[0].locked, false);
  assert.equal(instance.connectors[0].id, "connector-4");
  assert.deepEqual(instance.connectors[0].fromAnchor, { nodeId: "node-1", side: "right" });
  assert.deepEqual(instance.connectors[0].toAnchor, { nodeId: "node-3", side: "left" });
  assert.equal(instance.comments[0].nodeId, "node-1");
  assert.equal(instance.comments[0].createdAt, "2026-04-24T12:00:00.000Z");
});

test("createSceneClipboard can copy and paste a connector alone with detached anchors", () => {
  const fragment = createSceneClipboard(createProject(), {
    kind: "connector",
    id: "egfr-erk",
  });
  const instance = instantiateSceneClipboard(fragment, {
    createId,
    position: { x: 40, y: 60 },
  });

  assert.equal(instance.nodes.length, 0);
  assert.equal(instance.connectors.length, 1);
  assert.equal(instance.connectors[0].from.x, 40);
  assert.equal(instance.connectors[0].to.x, 140);
  assert.equal(instance.connectors[0].fromAnchor, null);
  assert.equal(instance.connectors[0].toAnchor, null);
});

test("removeSelectionFromProject deletes selected nodes and attached connectors only", () => {
  const next = removeSelectionFromProject(createProject(), {
    kind: "nodes",
    ids: ["egfr"],
  });

  assert.deepEqual(next.nodes.map((node) => node.id), ["erk", "outside"]);
  assert.deepEqual(next.connectors.map((connector) => connector.id), ["erk-outside"]);
  assert.deepEqual(next.comments.map((comment) => comment.id), ["comment-board"]);
});
