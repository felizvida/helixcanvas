import { getNodeBounds } from "./editorSelection.js";

const DEFAULT_BODY = "Add a review note for this figure.";
const DEFAULT_AUTHOR = "Reviewer";

function clampCoordinate(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

export function normalizeReviewComment(comment) {
  const createdAt = comment.createdAt ?? new Date().toISOString();

  return {
    id: comment.id,
    body: String(comment.body ?? DEFAULT_BODY),
    author: String(comment.author ?? DEFAULT_AUTHOR),
    status: comment.status === "resolved" ? "resolved" : "open",
    nodeId: comment.nodeId ?? null,
    x: clampCoordinate(comment.x, 140),
    y: clampCoordinate(comment.y, 140),
    createdAt,
    updatedAt: comment.updatedAt ?? createdAt,
  };
}

export function createReviewComment(options = {}) {
  if (!options.id) {
    throw new Error("Review comments require an id.");
  }

  return normalizeReviewComment({
    id: options.id,
    body: options.body,
    author: options.author,
    status: options.status,
    nodeId: options.nodeId,
    x: options.x,
    y: options.y,
    createdAt: options.createdAt,
    updatedAt: options.updatedAt,
  });
}

export function resolveReviewCommentPosition(comment, nodes) {
  const targetNode = comment.nodeId ? nodes.find((node) => node.id === comment.nodeId) : null;

  if (targetNode) {
    const bounds = getNodeBounds(targetNode);
    return {
      x: Math.max(22, bounds.right - 16),
      y: Math.max(22, bounds.top - 16),
      anchored: true,
      targetLabel: targetNode.title ?? targetNode.text ?? "Linked layer",
    };
  }

  return {
    x: comment.x,
    y: comment.y,
    anchored: false,
    targetLabel: "Board note",
  };
}

export function countOpenReviewComments(comments) {
  return comments.filter((comment) => comment.status !== "resolved").length;
}
