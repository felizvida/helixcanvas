import test from "node:test";
import assert from "node:assert/strict";

import { compareProjects } from "../src/lib/projectCompare.js";

test("compareProjects reports changed, added, and removed scene items", () => {
  const summary = compareProjects(
    {
      nodes: [
        { id: "node-a", type: "text", text: "Updated title", x: 10, y: 20, w: 200 },
        { id: "node-b", type: "shape", title: "New callout", x: 80, y: 90, w: 140, h: 60 },
      ],
      connectors: [
        {
          id: "connector-a",
          from: { x: 20, y: 20 },
          to: { x: 120, y: 20 },
          kind: "inhibition",
          route: "elbow",
          label: "blocks",
        },
      ],
      comments: [{ id: "comment-a", body: "Clarify the timing" }],
    },
    {
      nodes: [
        { id: "node-a", type: "text", text: "Original title", x: 10, y: 20, w: 200 },
        { id: "node-c", type: "shape", title: "Old card", x: 140, y: 150, w: 120, h: 60 },
      ],
      connectors: [
        {
          id: "connector-a",
          from: { x: 20, y: 20 },
          to: { x: 120, y: 20 },
          kind: "activation",
          route: "straight",
          label: "",
        },
      ],
      comments: [],
    },
  );

  assert.deepEqual(summary.counts.deltas, {
    nodes: 0,
    connectors: 0,
    comments: 1,
  });
  assert.deepEqual(summary.changedNodes, ["Updated title"]);
  assert.deepEqual(summary.addedNodes, ["New callout"]);
  assert.deepEqual(summary.removedNodes, ["Old card"]);
  assert.deepEqual(summary.changedConnectors, ["blocks"]);
  assert.deepEqual(summary.addedComments, ["Clarify the timing"]);
});
