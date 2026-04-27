import { getCombinedNodeBounds, getNodeBounds } from "./editorSelection.js";
import { resolveConnectorAnchors } from "./connectors.js";

const DEFAULT_PASTE_OFFSET = { x: 32, y: 32 };
const ENDPOINT_PADDING = 14;

function pointInBounds(point, bounds, padding = 0) {
  return (
    point.x >= bounds.left - padding &&
    point.x <= bounds.right + padding &&
    point.y >= bounds.top - padding &&
    point.y <= bounds.bottom + padding
  );
}

function pointInAnyNodeBounds(point, nodes, padding = ENDPOINT_PADDING) {
  return nodes.some((node) => pointInBounds(point, getNodeBounds(node), padding));
}

function getConnectorSelectionState(connector, allNodes, selectedNodes, selectedIdSet) {
  const resolved = resolveConnectorAnchors(connector, allNodes);

  return {
    from:
      selectedIdSet.has(connector.fromAnchor?.nodeId) ||
      pointInAnyNodeBounds(resolved.from, selectedNodes),
    to:
      selectedIdSet.has(connector.toAnchor?.nodeId) ||
      pointInAnyNodeBounds(resolved.to, selectedNodes),
    resolved,
  };
}

function relativizePoint(point, origin) {
  return {
    x: point.x - origin.x,
    y: point.y - origin.y,
  };
}

function absolutizePoint(point, origin) {
  return {
    x: origin.x + point.x,
    y: origin.y + point.y,
  };
}

function remapGroupId(groupId, groupIds, createId) {
  if (!groupId) {
    return null;
  }

  if (!groupIds.has(groupId)) {
    groupIds.set(groupId, createId("group"));
  }

  return groupIds.get(groupId);
}

function remapAnchor(anchor, nodeIds) {
  if (!anchor?.nodeId || !nodeIds.has(anchor.nodeId)) {
    return null;
  }

  return {
    nodeId: nodeIds.get(anchor.nodeId),
    side: anchor.side ?? "auto",
  };
}

function createConnectorSnapshot(connector, allNodes, origin) {
  const resolved = resolveConnectorAnchors(connector, allNodes);

  return {
    ...connector,
    from: relativizePoint(resolved.from, origin),
    to: relativizePoint(resolved.to, origin),
    fromAnchor: connector.fromAnchor ?? null,
    toAnchor: connector.toAnchor ?? null,
  };
}

function createCommentSnapshot(comment, origin) {
  return {
    ...comment,
    x: (comment.x ?? 0) - origin.x,
    y: (comment.y ?? 0) - origin.y,
  };
}

function getConnectorBounds(connector, allNodes) {
  const resolved = resolveConnectorAnchors(connector, allNodes);
  const left = Math.min(resolved.from.x, resolved.to.x);
  const top = Math.min(resolved.from.y, resolved.to.y);

  return {
    left,
    top,
    right: Math.max(resolved.from.x, resolved.to.x),
    bottom: Math.max(resolved.from.y, resolved.to.y),
    width: Math.abs(resolved.to.x - resolved.from.x),
    height: Math.abs(resolved.to.y - resolved.from.y),
  };
}

export function createSceneClipboard(project, selection) {
  if (!project || !selection) {
    return null;
  }

  if (selection.kind === "nodes") {
    const selectedIdSet = new Set(selection.ids ?? []);
    const nodes = project.nodes.filter((node) => selectedIdSet.has(node.id));

    if (!nodes.length) {
      return null;
    }

    const bounds = getCombinedNodeBounds(nodes);
    const origin = { x: bounds.left, y: bounds.top };
    const connectors = project.connectors.filter((connector) => {
      const state = getConnectorSelectionState(connector, project.nodes, nodes, selectedIdSet);
      return state.from && state.to;
    });
    const comments = (project.comments ?? []).filter((comment) => selectedIdSet.has(comment.nodeId));

    return {
      kind: "scene-fragment",
      sourceLabel: nodes.length === 1 ? nodes[0].title ?? nodes[0].text ?? "Layer" : `${nodes.length} layers`,
      origin,
      bounds: {
        width: bounds.width,
        height: bounds.height,
      },
      nodes: nodes.map((node) => ({
        ...node,
        x: (node.x ?? 0) - origin.x,
        y: (node.y ?? 0) - origin.y,
      })),
      connectors: connectors.map((connector) => createConnectorSnapshot(connector, project.nodes, origin)),
      comments: comments.map((comment) => createCommentSnapshot(comment, origin)),
    };
  }

  if (selection.kind === "connector") {
    const connector = project.connectors.find((item) => item.id === selection.id);

    if (!connector) {
      return null;
    }

    const bounds = getConnectorBounds(connector, project.nodes);
    const origin = { x: bounds.left, y: bounds.top };

    return {
      kind: "scene-fragment",
      sourceLabel: connector.label || "Connector",
      origin,
      bounds: {
        width: bounds.width,
        height: bounds.height,
      },
      nodes: [],
      connectors: [createConnectorSnapshot(connector, project.nodes, origin)],
      comments: [],
    };
  }

  if (selection.kind === "comment") {
    const comment = (project.comments ?? []).find((item) => item.id === selection.id);

    if (!comment) {
      return null;
    }

    const origin = { x: comment.x ?? 0, y: comment.y ?? 0 };

    return {
      kind: "scene-fragment",
      sourceLabel: "Review note",
      origin,
      bounds: {
        width: 0,
        height: 0,
      },
      nodes: [],
      connectors: [],
      comments: [createCommentSnapshot(comment, origin)],
    };
  }

  return null;
}

export function instantiateSceneClipboard(snapshot, options) {
  if (snapshot?.kind !== "scene-fragment") {
    return null;
  }

  const { createId } = options;
  const position = options.position ?? {
    x: (snapshot.origin?.x ?? 160) + (options.offset?.x ?? DEFAULT_PASTE_OFFSET.x),
    y: (snapshot.origin?.y ?? 160) + (options.offset?.y ?? DEFAULT_PASTE_OFFSET.y),
  };
  const groupIds = new Map();
  const nodeIds = new Map();
  const nodes = (snapshot.nodes ?? []).map((node) => {
    const id = createId("node");
    nodeIds.set(node.id, id);

    return {
      ...node,
      id,
      groupId: remapGroupId(node.groupId, groupIds, createId),
      x: position.x + (node.x ?? 0),
      y: position.y + (node.y ?? 0),
      hidden: false,
      locked: false,
    };
  });
  const connectors = (snapshot.connectors ?? []).map((connector) => ({
    ...connector,
    id: createId("connector"),
    from: absolutizePoint(connector.from, position),
    to: absolutizePoint(connector.to, position),
    fromAnchor: remapAnchor(connector.fromAnchor, nodeIds),
    toAnchor: remapAnchor(connector.toAnchor, nodeIds),
  }));
  const now = options.createdAt ?? new Date().toISOString();
  const comments = (snapshot.comments ?? []).map((comment) => ({
    ...comment,
    id: createId("comment"),
    nodeId: comment.nodeId && nodeIds.has(comment.nodeId) ? nodeIds.get(comment.nodeId) : null,
    x: position.x + (comment.x ?? 0),
    y: position.y + (comment.y ?? 0),
    createdAt: now,
    updatedAt: now,
  }));

  return {
    nodes,
    connectors,
    comments,
    nodeIds: nodes.map((node) => node.id),
    connectorIds: connectors.map((connector) => connector.id),
    commentIds: comments.map((comment) => comment.id),
  };
}

export function removeSelectionFromProject(project, selection) {
  if (!project || !selection) {
    return project;
  }

  if (selection.kind === "nodes") {
    const selectedIdSet = new Set(selection.ids ?? []);
    const selectedNodes = project.nodes.filter((node) => selectedIdSet.has(node.id));

    if (!selectedNodes.length) {
      return project;
    }

    return {
      ...project,
      nodes: project.nodes.filter((node) => !selectedIdSet.has(node.id)),
      connectors: project.connectors.filter((connector) => {
        const state = getConnectorSelectionState(connector, project.nodes, selectedNodes, selectedIdSet);
        return !state.from && !state.to;
      }),
      comments: (project.comments ?? []).filter((comment) => !selectedIdSet.has(comment.nodeId)),
    };
  }

  if (selection.kind === "connector") {
    return {
      ...project,
      connectors: project.connectors.filter((connector) => connector.id !== selection.id),
    };
  }

  if (selection.kind === "comment") {
    return {
      ...project,
      comments: (project.comments ?? []).filter((comment) => comment.id !== selection.id),
    };
  }

  return project;
}
