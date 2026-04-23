function summarizeNode(node) {
  return {
    id: node.id,
    label: node.title ?? node.text ?? node.id,
    text: node.text ?? "",
    title: node.title ?? "",
    type: node.type,
    x: Math.round(node.x ?? 0),
    y: Math.round(node.y ?? 0),
    w: Math.round(node.w ?? 0),
    h: Math.round(node.h ?? 0),
    hidden: Boolean(node.hidden),
    locked: Boolean(node.locked),
  };
}

function summarizeConnector(connector) {
  return {
    id: connector.id,
    kind: connector.kind ?? "activation",
    route: connector.route ?? "straight",
    label: connector.label ?? "",
    fromX: Math.round(connector.from?.x ?? 0),
    fromY: Math.round(connector.from?.y ?? 0),
    toX: Math.round(connector.to?.x ?? 0),
    toY: Math.round(connector.to?.y ?? 0),
  };
}

function isEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function compareProjects(currentProject, baselineProject) {
  const currentNodes = new Map((currentProject.nodes ?? []).map((node) => [node.id, summarizeNode(node)]));
  const baselineNodes = new Map((baselineProject.nodes ?? []).map((node) => [node.id, summarizeNode(node)]));
  const currentConnectors = new Map(
    (currentProject.connectors ?? []).map((connector) => [connector.id, summarizeConnector(connector)]),
  );
  const baselineConnectors = new Map(
    (baselineProject.connectors ?? []).map((connector) => [connector.id, summarizeConnector(connector)]),
  );
  const currentComments = new Map((currentProject.comments ?? []).map((comment) => [comment.id, comment]));
  const baselineComments = new Map((baselineProject.comments ?? []).map((comment) => [comment.id, comment]));

  const changedNodes = [];
  const addedNodes = [];
  const removedNodes = [];

  currentNodes.forEach((node, id) => {
    if (!baselineNodes.has(id)) {
      addedNodes.push(node.label);
      return;
    }

    if (!isEqual(node, baselineNodes.get(id))) {
      changedNodes.push(node.label);
    }
  });

  baselineNodes.forEach((node, id) => {
    if (!currentNodes.has(id)) {
      removedNodes.push(node.label);
    }
  });

  const changedConnectors = [];
  currentConnectors.forEach((connector, id) => {
    if (!baselineConnectors.has(id)) {
      changedConnectors.push(`Added connector ${id}`);
      return;
    }

    if (!isEqual(connector, baselineConnectors.get(id))) {
      changedConnectors.push(connector.label || `${connector.kind} connector`);
    }
  });

  baselineConnectors.forEach((connector, id) => {
    if (!currentConnectors.has(id)) {
      changedConnectors.push(`Removed connector ${connector.label || id}`);
    }
  });

  const addedComments = [];
  const resolvedComments = [];
  const reopenedComments = [];
  currentComments.forEach((comment, id) => {
    if (!baselineComments.has(id)) {
      addedComments.push(comment.body);
      return;
    }

    const baselineComment = baselineComments.get(id);

    if (baselineComment.status !== "resolved" && comment.status === "resolved") {
      resolvedComments.push(comment.body);
    }

    if (baselineComment.status === "resolved" && comment.status !== "resolved") {
      reopenedComments.push(comment.body);
    }
  });

  const narrativeParts = [];

  if (changedNodes.length) {
    narrativeParts.push(`${changedNodes.length} layer${changedNodes.length === 1 ? "" : "s"} changed`);
  }
  if (addedNodes.length) {
    narrativeParts.push(`${addedNodes.length} added`);
  }
  if (removedNodes.length) {
    narrativeParts.push(`${removedNodes.length} removed`);
  }
  if (changedConnectors.length) {
    narrativeParts.push(`${changedConnectors.length} connector update${changedConnectors.length === 1 ? "" : "s"}`);
  }
  if (addedComments.length) {
    narrativeParts.push(`${addedComments.length} new review note${addedComments.length === 1 ? "" : "s"}`);
  }
  if (resolvedComments.length) {
    narrativeParts.push(`${resolvedComments.length} resolved comment${resolvedComments.length === 1 ? "" : "s"}`);
  }
  if (reopenedComments.length) {
    narrativeParts.push(`${reopenedComments.length} reopened comment${reopenedComments.length === 1 ? "" : "s"}`);
  }

  return {
    counts: {
      current: {
        nodes: currentNodes.size,
        connectors: currentConnectors.size,
        comments: currentComments.size,
      },
      baseline: {
        nodes: baselineNodes.size,
        connectors: baselineConnectors.size,
        comments: baselineComments.size,
      },
      deltas: {
        nodes: currentNodes.size - baselineNodes.size,
        connectors: currentConnectors.size - baselineConnectors.size,
        comments: currentComments.size - baselineComments.size,
      },
    },
    changedNodes: changedNodes.slice(0, 8),
    addedNodes: addedNodes.slice(0, 6),
    removedNodes: removedNodes.slice(0, 6),
    changedConnectors: changedConnectors.slice(0, 6),
    addedComments: addedComments.slice(0, 4),
    resolvedComments: resolvedComments.slice(0, 4),
    reopenedComments: reopenedComments.slice(0, 4),
    narrative: narrativeParts.length
      ? `Compared with the baseline, this figure has ${narrativeParts.join(", ")}.`
      : "No visible structural changes detected against the baseline snapshot.",
  };
}
