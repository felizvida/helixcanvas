import test from "node:test";
import assert from "node:assert/strict";

import {
  createHistoryState,
  pushHistoryState,
  redoHistoryState,
  undoHistoryState,
} from "../src/lib/history.js";

test("history stores past states and clears future on new changes", () => {
  const history = pushHistoryState(
    {
      past: [{ id: "older" }],
      future: [{ id: "redo-me" }],
    },
    { id: "current" },
  );

  assert.deepEqual(history.past, [{ id: "older" }, { id: "current" }]);
  assert.deepEqual(history.future, []);
});

test("undoHistoryState returns previous state and seeds redo history", () => {
  const currentProject = { id: "current" };
  const history = {
    past: [{ id: "first" }, { id: "second" }],
    future: [],
  };

  const result = undoHistoryState(history, currentProject);

  assert.equal(result.changed, true);
  assert.deepEqual(result.project, { id: "second" });
  assert.deepEqual(result.history.past, [{ id: "first" }]);
  assert.deepEqual(result.history.future, [{ id: "current" }]);
});

test("redoHistoryState restores the next future state", () => {
  const currentProject = { id: "current" };
  const history = {
    past: [{ id: "first" }],
    future: [{ id: "redo" }, { id: "later" }],
  };

  const result = redoHistoryState(history, currentProject);

  assert.equal(result.changed, true);
  assert.deepEqual(result.project, { id: "redo" });
  assert.deepEqual(result.history.past, [{ id: "first" }, { id: "current" }]);
  assert.deepEqual(result.history.future, [{ id: "later" }]);
});

test("empty history is a no-op for undo and redo", () => {
  const project = { id: "current" };
  const history = createHistoryState();

  assert.equal(undoHistoryState(history, project).changed, false);
  assert.equal(redoHistoryState(history, project).changed, false);
});
