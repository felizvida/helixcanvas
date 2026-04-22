import test from "node:test";
import assert from "node:assert/strict";

import {
  createProjectSnapshot,
  pushProjectSnapshot,
  removeProjectSnapshot,
} from "../src/lib/projectSnapshots.js";

test("createProjectSnapshot keeps project metadata with a readable label", () => {
  const snapshot = createProjectSnapshot(
    {
      name: "ERK pathway",
      nodes: [],
      connectors: [],
    },
    {
      id: "snapshot-1",
      createdAt: "2026-04-22T12:00:00.000Z",
      fileName: "erk-pathway.helixcanvas.json",
    },
  );

  assert.equal(snapshot.id, "snapshot-1");
  assert.equal(snapshot.fileName, "erk-pathway.helixcanvas.json");
  assert.match(snapshot.label, /ERK pathway/);
});

test("pushProjectSnapshot prepends a new snapshot and enforces a limit", () => {
  const next = pushProjectSnapshot(
    [
      { id: "old-a" },
      { id: "old-b" },
    ],
    { id: "new" },
    2,
  );

  assert.deepEqual(next, [{ id: "new" }, { id: "old-a" }]);
});

test("removeProjectSnapshot deletes only the requested snapshot", () => {
  const next = removeProjectSnapshot(
    [
      { id: "snapshot-a" },
      { id: "snapshot-b" },
    ],
    "snapshot-a",
  );

  assert.deepEqual(next, [{ id: "snapshot-b" }]);
});

