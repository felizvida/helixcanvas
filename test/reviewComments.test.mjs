import test from "node:test";
import assert from "node:assert/strict";
import {
  countOpenReviewComments,
  createReviewComment,
  normalizeReviewComment,
  resolveReviewCommentPosition,
} from "../src/lib/reviewComments.js";

test("normalizeReviewComment applies stable defaults", () => {
  const comment = normalizeReviewComment({ id: "comment-1" });

  assert.equal(comment.id, "comment-1");
  assert.equal(comment.body, "Add a review note for this figure.");
  assert.equal(comment.author, "Reviewer");
  assert.equal(comment.status, "open");
  assert.equal(comment.nodeId, null);
});

test("createReviewComment preserves explicit anchor fields", () => {
  const comment = createReviewComment({
    id: "comment-2",
    body: "Clarify the phospho-state",
    author: "PI",
    nodeId: "node-7",
    x: 180,
    y: 220,
  });

  assert.equal(comment.body, "Clarify the phospho-state");
  assert.equal(comment.author, "PI");
  assert.equal(comment.nodeId, "node-7");
  assert.equal(comment.x, 180);
  assert.equal(comment.y, 220);
});

test("resolveReviewCommentPosition anchors to the linked node bounds", () => {
  const position = resolveReviewCommentPosition(
    {
      id: "comment-3",
      nodeId: "node-1",
      x: 30,
      y: 40,
    },
    [
      {
        id: "node-1",
        type: "shape",
        title: "EGFR receptor",
        x: 120,
        y: 180,
        w: 140,
        h: 90,
      },
    ],
  );

  assert.equal(position.anchored, true);
  assert.equal(position.targetLabel, "EGFR receptor");
  assert.equal(position.x, 244);
  assert.equal(position.y, 164);
});

test("resolveReviewCommentPosition falls back to a board note when the node is missing", () => {
  const position = resolveReviewCommentPosition(
    {
      id: "comment-4",
      nodeId: "missing",
      x: 280,
      y: 320,
    },
    [],
  );

  assert.equal(position.anchored, false);
  assert.equal(position.targetLabel, "Board note");
  assert.equal(position.x, 280);
  assert.equal(position.y, 320);
});

test("countOpenReviewComments excludes resolved items", () => {
  const count = countOpenReviewComments([
    { id: "open-1", status: "open" },
    { id: "resolved-1", status: "resolved" },
    { id: "open-2", status: "open" },
  ]);

  assert.equal(count, 2);
});
