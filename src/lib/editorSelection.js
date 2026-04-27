function uniqueNodeIds(ids) {
  return [...new Set((ids ?? []).filter(Boolean))];
}

function getNodeSize(node) {
  const width = Number.isFinite(node.w) ? node.w : 0;
  const fontSize = Math.max(node.fontSize ?? 24, 18);
  const lineHeight = Number(node.lineHeight) || 1.3;
  const lineCount = Math.max(String(node.text ?? "").split("\n").length, 1);
  const textHeight = fontSize * lineHeight * lineCount;
  const height = Number.isFinite(node.h) ? node.h : node.type === "text" ? textHeight : 0;

  return {
    width,
    height,
  };
}

export function createNodeSelection(ids) {
  const normalizedIds = uniqueNodeIds(ids);
  return normalizedIds.length ? { kind: "nodes", ids: normalizedIds } : null;
}

export function isNodeSelection(selection) {
  return selection?.kind === "nodes" && Array.isArray(selection.ids) && selection.ids.length > 0;
}

export function isNodeSelected(selection, nodeId) {
  return isNodeSelection(selection) && selection.ids.includes(nodeId);
}

export function getSelectedNodes(project, selection) {
  if (!isNodeSelection(selection)) {
    return [];
  }

  const selectedIds = new Set(selection.ids);
  return project.nodes.filter((node) => selectedIds.has(node.id));
}

export function getNodeBounds(node) {
  const { width, height } = getNodeSize(node);
  const top = node.type === "text" ? node.y - (node.fontSize ?? 24) : node.y;

  return {
    left: node.x,
    top,
    right: node.x + width,
    bottom: top + height,
    width,
    height,
  };
}

export function getCombinedNodeBounds(nodes) {
  if (!nodes.length) {
    return null;
  }

  return getCombinedBounds(nodes);
}

function getNodePositionForBounds(node, bounds) {
  return {
    x: bounds.left,
    y: node.type === "text" ? bounds.top + bounds.height : bounds.top,
  };
}

function getBoundsCenter(bounds) {
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
  };
}

function rotatePoint(point, center, angleRadians) {
  const cos = Math.cos(angleRadians);
  const sin = Math.sin(angleRadians);
  const deltaX = point.x - center.x;
  const deltaY = point.y - center.y;

  return {
    x: center.x + deltaX * cos - deltaY * sin,
    y: center.y + deltaX * sin + deltaY * cos,
  };
}

function translatePoint(point, deltaX, deltaY) {
  return {
    x: point.x + deltaX,
    y: point.y + deltaY,
  };
}

function normalizeDegrees(value) {
  let degrees = Number(value) || 0;

  while (degrees > 180) {
    degrees -= 360;
  }

  while (degrees < -180) {
    degrees += 360;
  }

  return degrees;
}

function createOriginNodeMap(originNodes) {
  if (originNodes instanceof Map) {
    return originNodes;
  }

  if (Array.isArray(originNodes)) {
    return new Map(originNodes.map((node) => [node.id, node]));
  }

  return new Map(Object.entries(originNodes ?? {}));
}

function createOriginConnectorMap(originConnectors) {
  if (originConnectors instanceof Map) {
    return originConnectors;
  }

  if (Array.isArray(originConnectors)) {
    return new Map(originConnectors.map((connector) => [connector.id, connector]));
  }

  return new Map(Object.entries(originConnectors ?? {}));
}

function getConnectorIdsFromSnapshot(connectorIds, originConnectors) {
  if (connectorIds?.length) {
    return connectorIds;
  }

  if (originConnectors instanceof Map) {
    return [...originConnectors.keys()];
  }

  if (Array.isArray(originConnectors)) {
    return originConnectors.map((connector) => connector.id);
  }

  return Object.keys(originConnectors ?? {});
}

function getHandleAnchor(bounds, handle) {
  const center = getBoundsCenter(bounds);

  return {
    x: handle.includes("w") ? bounds.right : handle.includes("e") ? bounds.left : center.x,
    y: handle.includes("n") ? bounds.bottom : handle.includes("s") ? bounds.top : center.y,
  };
}

function clampBoundsFromHandle(bounds, handle, point, minSize) {
  const nextBounds = { ...bounds };

  if (handle.includes("w")) {
    nextBounds.left = Math.min(point.x, bounds.right - minSize);
  }

  if (handle.includes("e")) {
    nextBounds.right = Math.max(point.x, bounds.left + minSize);
  }

  if (handle.includes("n")) {
    nextBounds.top = Math.min(point.y, bounds.bottom - minSize);
  }

  if (handle.includes("s")) {
    nextBounds.bottom = Math.max(point.y, bounds.top + minSize);
  }

  nextBounds.width = Math.max(minSize, nextBounds.right - nextBounds.left);
  nextBounds.height = Math.max(minSize, nextBounds.bottom - nextBounds.top);
  return nextBounds;
}

function preserveAspectBounds(bounds, handle, point, minSize) {
  const anchor = getHandleAnchor(bounds, handle);
  const aspect = bounds.width / Math.max(bounds.height, 1);
  const affectsX = handle.includes("w") || handle.includes("e");
  const affectsY = handle.includes("n") || handle.includes("s");
  const rawWidth = affectsX ? Math.max(minSize, Math.abs(point.x - anchor.x)) : bounds.width;
  const rawHeight = affectsY ? Math.max(minSize, Math.abs(point.y - anchor.y)) : bounds.height;
  const scale = affectsX && affectsY
    ? Math.max(rawWidth / Math.max(bounds.width, 1), rawHeight / Math.max(bounds.height, 1))
    : affectsX
      ? rawWidth / Math.max(bounds.width, 1)
      : rawHeight / Math.max(bounds.height, 1);
  const width = Math.max(minSize, bounds.width * scale);
  const height = Math.max(minSize, width / aspect);
  const center = getBoundsCenter(bounds);
  const left = handle.includes("w")
    ? anchor.x - width
    : handle.includes("e")
      ? anchor.x
      : center.x - width / 2;
  const top = handle.includes("n")
    ? anchor.y - height
    : handle.includes("s")
      ? anchor.y
      : center.y - height / 2;

  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
}

function snapPoint(point, gridSize) {
  if (!gridSize) {
    return point;
  }

  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

function boundsAreEquivalent(first, second) {
  if (!first || !second) {
    return false;
  }

  return (
    first.left === second.left &&
    first.top === second.top &&
    first.width === second.width &&
    first.height === second.height
  );
}

function getResizeBounds(originBounds, handle, point, options = {}) {
  const minSize = options.minSize ?? 16;
  const nextPoint = snapPoint(point, options.snapToGrid ? options.gridSize ?? 16 : 0);

  return options.preserveAspect
    ? preserveAspectBounds(originBounds, handle, nextPoint, minSize)
    : clampBoundsFromHandle(originBounds, handle, nextPoint, minSize);
}

function getFitBounds(originBounds, targetBounds, options = {}) {
  const padding = options.padding ?? 0;
  const usableBounds = {
    left: targetBounds.left + padding,
    top: targetBounds.top + padding,
    width: Math.max(1, targetBounds.width - padding * 2),
    height: Math.max(1, targetBounds.height - padding * 2),
  };
  usableBounds.right = usableBounds.left + usableBounds.width;
  usableBounds.bottom = usableBounds.top + usableBounds.height;

  const scale =
    options.preserveAspect === false
      ? null
      : Math.min(
          usableBounds.width / Math.max(originBounds.width, 1),
          usableBounds.height / Math.max(originBounds.height, 1),
        );
  const nextBounds = scale
    ? {
        width: originBounds.width * scale,
        height: originBounds.height * scale,
      }
    : {
        width: usableBounds.width,
        height: usableBounds.height,
      };
  nextBounds.left = usableBounds.left + (usableBounds.width - nextBounds.width) / 2;
  nextBounds.top = usableBounds.top + (usableBounds.height - nextBounds.height) / 2;
  nextBounds.right = nextBounds.left + nextBounds.width;
  nextBounds.bottom = nextBounds.top + nextBounds.height;

  return nextBounds;
}

function transformPointToBounds(point, originBounds, nextBounds) {
  const scaleX = nextBounds.width / Math.max(originBounds.width, 1);
  const scaleY = nextBounds.height / Math.max(originBounds.height, 1);

  return {
    x: nextBounds.left + (point.x - originBounds.left) * scaleX,
    y: nextBounds.top + (point.y - originBounds.top) * scaleY,
  };
}

function pointIsInsideBounds(point, bounds, padding = 0) {
  return (
    point.x >= bounds.left - padding &&
    point.x <= bounds.right + padding &&
    point.y >= bounds.top - padding &&
    point.y <= bounds.bottom + padding
  );
}

function connectorIsInsideBounds(connector, bounds, padding = 0) {
  return (
    connector?.from &&
    connector?.to &&
    pointIsInsideBounds(connector.from, bounds, padding) &&
    pointIsInsideBounds(connector.to, bounds, padding)
  );
}

function applyBoundsToNode(node, nextBounds, scaleX = 1, scaleY = 1) {
  const safeBounds = {
    ...nextBounds,
    width: Math.max(1, nextBounds.width),
    height: Math.max(1, nextBounds.height),
  };

  if (node.type === "text") {
    const textScale = Math.max(0.3, Math.sqrt(Math.abs(scaleX * scaleY)) || 1);
    const fontSize = Math.max(8, (node.fontSize ?? 18) * textScale);

    return {
      ...node,
      x: safeBounds.left,
      y: safeBounds.top + fontSize,
      w: safeBounds.width,
      fontSize,
    };
  }

  return {
    ...node,
    x: safeBounds.left,
    y: safeBounds.top,
    w: safeBounds.width,
    h: safeBounds.height,
  };
}

export function createTransformOriginSnapshot(nodes, selectedIds) {
  const selectedIdSet = new Set(selectedIds);
  const selectedNodes = nodes.filter((node) => selectedIdSet.has(node.id));

  return {
    bounds: selectedNodes.length ? getCombinedBounds(selectedNodes) : null,
    nodes: Object.fromEntries(selectedNodes.map((node) => [node.id, { ...node }])),
  };
}

export function createConnectorTransformSnapshot(connectors, bounds, options = {}) {
  if (!bounds) {
    return {
      ids: [],
      connectors: {},
    };
  }

  const padding = options.padding ?? 0;
  const selectedConnectors = (connectors ?? []).filter((connector) =>
    connectorIsInsideBounds(connector, bounds, padding),
  );

  return {
    ids: selectedConnectors.map((connector) => connector.id),
    connectors: Object.fromEntries(
      selectedConnectors.map((connector) => [
        connector.id,
        {
          ...connector,
          from: { ...connector.from },
          to: { ...connector.to },
        },
      ]),
    ),
  };
}

export function transformSelectedNodesToBounds(
  nodes,
  selectedIds,
  originNodes,
  originBounds,
  nextBounds,
) {
  const selectedIdSet = new Set(selectedIds);
  const originNodeMap = createOriginNodeMap(originNodes);
  const scaleX = nextBounds.width / Math.max(originBounds.width, 1);
  const scaleY = nextBounds.height / Math.max(originBounds.height, 1);

  return nodes.map((node) => {
    if (!selectedIdSet.has(node.id)) {
      return node;
    }

    const originNode = originNodeMap.get(node.id);

    if (!originNode) {
      return node;
    }

    const bounds = getNodeBounds(originNode);
    const transformedBounds = {
      left: nextBounds.left + (bounds.left - originBounds.left) * scaleX,
      top: nextBounds.top + (bounds.top - originBounds.top) * scaleY,
      width: bounds.width * scaleX,
      height: bounds.height * scaleY,
    };
    transformedBounds.right = transformedBounds.left + transformedBounds.width;
    transformedBounds.bottom = transformedBounds.top + transformedBounds.height;

    return applyBoundsToNode(originNode, transformedBounds, scaleX, scaleY);
  });
}

export function resizeSelectedNodes(
  nodes,
  selectedIds,
  originNodes,
  originBounds,
  handle,
  point,
  options = {},
) {
  const nextBounds = getResizeBounds(originBounds, handle, point, options);

  if (boundsAreEquivalent(originBounds, nextBounds)) {
    return nodes;
  }

  return transformSelectedNodesToBounds(nodes, selectedIds, originNodes, originBounds, nextBounds);
}

export function rotateSelectedNodes(
  nodes,
  selectedIds,
  originNodes,
  originBounds,
  startPoint,
  currentPoint,
  options = {},
) {
  const center = getBoundsCenter(originBounds);
  const startAngle = Math.atan2(startPoint.y - center.y, startPoint.x - center.x);
  const currentAngle = Math.atan2(currentPoint.y - center.y, currentPoint.x - center.x);
  let deltaDegrees = ((currentAngle - startAngle) * 180) / Math.PI;

  if (options.snapDegrees) {
    deltaDegrees = Math.round(deltaDegrees / options.snapDegrees) * options.snapDegrees;
  }

  return rotateSelectedNodesByDelta(
    nodes,
    selectedIds,
    originNodes,
    originBounds,
    deltaDegrees,
  );
}

function rotateSelectedNodesByDelta(nodes, selectedIds, originNodes, originBounds, deltaDegrees) {
  if (!deltaDegrees) {
    return nodes;
  }

  const deltaRadians = (deltaDegrees * Math.PI) / 180;
  const center = getBoundsCenter(originBounds);
  const originNodeMap = createOriginNodeMap(originNodes);
  const selectedIdSet = new Set(selectedIds);

  return nodes.map((node) => {
    if (!selectedIdSet.has(node.id)) {
      return node;
    }

    const originNode = originNodeMap.get(node.id);

    if (!originNode) {
      return node;
    }

    const bounds = getNodeBounds(originNode);
    const nodeCenter = getBoundsCenter(bounds);
    const nextCenter = rotatePoint(nodeCenter, center, deltaRadians);
    const nextBounds = {
      left: nextCenter.x - bounds.width / 2,
      top: nextCenter.y - bounds.height / 2,
      width: bounds.width,
      height: bounds.height,
    };
    nextBounds.right = nextBounds.left + nextBounds.width;
    nextBounds.bottom = nextBounds.top + nextBounds.height;

    return {
      ...applyBoundsToNode(originNode, nextBounds, 1, 1),
      rotation: normalizeDegrees((originNode.rotation ?? 0) + deltaDegrees),
    };
  });
}

export function flipSelectedNodes(nodes, selectedIds, axis) {
  const selectedIdSet = new Set(selectedIds);
  const selectedNodes = nodes.filter((node) => selectedIdSet.has(node.id));

  if (!selectedNodes.length) {
    return nodes;
  }

  const combinedBounds = getCombinedBounds(selectedNodes);
  const center = getBoundsCenter(combinedBounds);

  return nodes.map((node) => {
    if (!selectedIdSet.has(node.id)) {
      return node;
    }

    const bounds = getNodeBounds(node);
    const nodeCenter = getBoundsCenter(bounds);
    const nextCenter = {
      x: axis === "horizontal" ? center.x * 2 - nodeCenter.x : nodeCenter.x,
      y: axis === "vertical" ? center.y * 2 - nodeCenter.y : nodeCenter.y,
    };
    const nextBounds = {
      left: nextCenter.x - bounds.width / 2,
      top: nextCenter.y - bounds.height / 2,
      width: bounds.width,
      height: bounds.height,
    };
    nextBounds.right = nextBounds.left + nextBounds.width;
    nextBounds.bottom = nextBounds.top + nextBounds.height;

    return {
      ...applyBoundsToNode(node, nextBounds, 1, 1),
      flipX: axis === "horizontal" ? !node.flipX : Boolean(node.flipX),
      flipY: axis === "vertical" ? !node.flipY : Boolean(node.flipY),
    };
  });
}

export function rotateSelectedNodesBy(nodes, selectedIds, degrees) {
  const snapshot = createTransformOriginSnapshot(nodes, selectedIds);

  if (!snapshot.bounds) {
    return nodes;
  }

  return rotateSelectedNodesByDelta(
    nodes,
    selectedIds,
    snapshot.nodes,
    snapshot.bounds,
    degrees,
  );
}

export function matchSelectedNodeSize(nodes, selectedIds, dimension) {
  const selectedIdSet = new Set(selectedIds);
  const selectedNodes = nodes.filter((node) => selectedIdSet.has(node.id));

  if (selectedNodes.length < 2) {
    return nodes;
  }

  const referenceBounds = getNodeBounds(selectedNodes[0]);

  return nodes.map((node) => {
    if (!selectedIdSet.has(node.id) || node.id === selectedNodes[0].id) {
      return node;
    }

    const bounds = getNodeBounds(node);
    const nextBounds = {
      ...bounds,
      width: dimension === "height" ? bounds.width : referenceBounds.width,
      height: dimension === "width" ? bounds.height : referenceBounds.height,
    };
    nextBounds.right = nextBounds.left + nextBounds.width;
    nextBounds.bottom = nextBounds.top + nextBounds.height;

    return applyBoundsToNode(
      node,
      nextBounds,
      nextBounds.width / Math.max(bounds.width, 1),
      nextBounds.height / Math.max(bounds.height, 1),
    );
  });
}

export function fitSelectedNodesToBounds(nodes, selectedIds, targetBounds, options = {}) {
  const selectedIdSet = new Set(selectedIds);
  const selectedNodes = nodes.filter((node) => selectedIdSet.has(node.id));

  if (!selectedNodes.length) {
    return nodes;
  }

  const originBounds = getCombinedBounds(selectedNodes);
  const nextBounds = getFitBounds(originBounds, targetBounds, options);

  return transformSelectedNodesToBounds(
    nodes,
    selectedIds,
    Object.fromEntries(selectedNodes.map((node) => [node.id, { ...node }])),
    originBounds,
    nextBounds,
  );
}

export function transformConnectorsToBounds(
  connectors,
  connectorIds,
  originConnectors,
  originBounds,
  nextBounds,
) {
  const ids = getConnectorIdsFromSnapshot(connectorIds, originConnectors);
  const selectedIdSet = new Set(ids);
  const originConnectorMap = createOriginConnectorMap(originConnectors);

  if (!selectedIdSet.size || boundsAreEquivalent(originBounds, nextBounds)) {
    return connectors;
  }

  return connectors.map((connector) => {
    if (!selectedIdSet.has(connector.id)) {
      return connector;
    }

    const originConnector = originConnectorMap.get(connector.id);

    if (!originConnector) {
      return connector;
    }

    return {
      ...connector,
      from: transformPointToBounds(originConnector.from, originBounds, nextBounds),
      to: transformPointToBounds(originConnector.to, originBounds, nextBounds),
    };
  });
}

export function resizeConnectors(
  connectors,
  connectorIds,
  originConnectors,
  originBounds,
  handle,
  point,
  options = {},
) {
  const nextBounds = getResizeBounds(originBounds, handle, point, options);

  return transformConnectorsToBounds(
    connectors,
    connectorIds,
    originConnectors,
    originBounds,
    nextBounds,
  );
}

function rotateConnectorsByDelta(
  connectors,
  connectorIds,
  originConnectors,
  originBounds,
  deltaDegrees,
) {
  const ids = getConnectorIdsFromSnapshot(connectorIds, originConnectors);
  const selectedIdSet = new Set(ids);
  const originConnectorMap = createOriginConnectorMap(originConnectors);

  if (!selectedIdSet.size || !deltaDegrees) {
    return connectors;
  }

  const center = getBoundsCenter(originBounds);
  const deltaRadians = (deltaDegrees * Math.PI) / 180;

  return connectors.map((connector) => {
    if (!selectedIdSet.has(connector.id)) {
      return connector;
    }

    const originConnector = originConnectorMap.get(connector.id);

    if (!originConnector) {
      return connector;
    }

    return {
      ...connector,
      from: rotatePoint(originConnector.from, center, deltaRadians),
      to: rotatePoint(originConnector.to, center, deltaRadians),
    };
  });
}

export function rotateConnectors(
  connectors,
  connectorIds,
  originConnectors,
  originBounds,
  startPoint,
  currentPoint,
  options = {},
) {
  const center = getBoundsCenter(originBounds);
  const startAngle = Math.atan2(startPoint.y - center.y, startPoint.x - center.x);
  const currentAngle = Math.atan2(currentPoint.y - center.y, currentPoint.x - center.x);
  let deltaDegrees = ((currentAngle - startAngle) * 180) / Math.PI;

  if (options.snapDegrees) {
    deltaDegrees = Math.round(deltaDegrees / options.snapDegrees) * options.snapDegrees;
  }

  return rotateConnectorsByDelta(
    connectors,
    connectorIds,
    originConnectors,
    originBounds,
    deltaDegrees,
  );
}

export function rotateConnectorsBy(connectors, connectorIds, originConnectors, originBounds, degrees) {
  return rotateConnectorsByDelta(
    connectors,
    connectorIds,
    originConnectors,
    originBounds,
    degrees,
  );
}

export function flipConnectors(connectors, connectorIds, originConnectors, originBounds, axis) {
  const ids = getConnectorIdsFromSnapshot(connectorIds, originConnectors);
  const selectedIdSet = new Set(ids);
  const originConnectorMap = createOriginConnectorMap(originConnectors);

  if (!selectedIdSet.size) {
    return connectors;
  }

  const center = getBoundsCenter(originBounds);
  const mirrorPoint = (point) => ({
    x: axis === "horizontal" ? center.x * 2 - point.x : point.x,
    y: axis === "vertical" ? center.y * 2 - point.y : point.y,
  });

  return connectors.map((connector) => {
    if (!selectedIdSet.has(connector.id)) {
      return connector;
    }

    const originConnector = originConnectorMap.get(connector.id);

    if (!originConnector) {
      return connector;
    }

    return {
      ...connector,
      from: mirrorPoint(originConnector.from),
      to: mirrorPoint(originConnector.to),
    };
  });
}

export function translateConnectorsBy(
  connectors,
  connectorIds,
  originConnectors,
  deltaX,
  deltaY,
) {
  const ids = getConnectorIdsFromSnapshot(connectorIds, originConnectors);
  const selectedIdSet = new Set(ids);
  const originConnectorMap = createOriginConnectorMap(originConnectors);

  if (!selectedIdSet.size || (!deltaX && !deltaY)) {
    return connectors;
  }

  return connectors.map((connector) => {
    if (!selectedIdSet.has(connector.id)) {
      return connector;
    }

    const originConnector = originConnectorMap.get(connector.id);

    if (!originConnector) {
      return connector;
    }

    return {
      ...connector,
      from: translatePoint(originConnector.from, deltaX, deltaY),
      to: translatePoint(originConnector.to, deltaX, deltaY),
    };
  });
}

export function fitConnectorsToBounds(
  connectors,
  connectorIds,
  originConnectors,
  originBounds,
  targetBounds,
  options = {},
) {
  const nextBounds = getFitBounds(originBounds, targetBounds, options);

  return transformConnectorsToBounds(
    connectors,
    connectorIds,
    originConnectors,
    originBounds,
    nextBounds,
  );
}

function getCombinedBounds(nodes) {
  const bounds = nodes.map(getNodeBounds);
  const left = Math.min(...bounds.map((item) => item.left));
  const top = Math.min(...bounds.map((item) => item.top));
  const right = Math.max(...bounds.map((item) => item.right));
  const bottom = Math.max(...bounds.map((item) => item.bottom));

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

function translateBounds(bounds, deltaX, deltaY) {
  return {
    ...bounds,
    left: bounds.left + deltaX,
    right: bounds.right + deltaX,
    top: bounds.top + deltaY,
    bottom: bounds.bottom + deltaY,
  };
}

function getBoundsRefs(bounds) {
  return {
    left: bounds.left,
    center: bounds.left + bounds.width / 2,
    right: bounds.right,
    top: bounds.top,
    middle: bounds.top + bounds.height / 2,
    bottom: bounds.bottom,
  };
}

function buildGuideRange(orientation, movingBounds, targetBounds) {
  if (orientation === "vertical") {
    return {
      start: Math.min(movingBounds.top, targetBounds.top),
      end: Math.max(movingBounds.bottom, targetBounds.bottom),
    };
  }

  return {
    start: Math.min(movingBounds.left, targetBounds.left),
    end: Math.max(movingBounds.right, targetBounds.right),
  };
}

export function getMarqueeRect(startPoint, currentPoint) {
  const left = Math.min(startPoint.x, currentPoint.x);
  const top = Math.min(startPoint.y, currentPoint.y);
  const right = Math.max(startPoint.x, currentPoint.x);
  const bottom = Math.max(startPoint.y, currentPoint.y);

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

export function getMarqueeSelectionIds(nodes, rect) {
  return nodes
    .filter((node) => !node.hidden)
    .filter((node) => {
      const bounds = getNodeBounds(node);

      return (
        bounds.left < rect.right &&
        bounds.right > rect.left &&
        bounds.top < rect.bottom &&
        bounds.bottom > rect.top
      );
    })
    .map((node) => node.id);
}

export function findAlignmentGuides(
  nodes,
  movingIds,
  originPositions,
  deltaX,
  deltaY,
  threshold = 10,
) {
  const movingIdSet = new Set(movingIds);
  const movingNodes = nodes.filter((node) => movingIdSet.has(node.id));

  if (!movingNodes.length) {
    return {
      adjustedDeltaX: deltaX,
      adjustedDeltaY: deltaY,
      guides: [],
    };
  }

  const stationaryNodes = nodes.filter((node) => !node.hidden && !movingIdSet.has(node.id));

  if (!stationaryNodes.length) {
    return {
      adjustedDeltaX: deltaX,
      adjustedDeltaY: deltaY,
      guides: [],
    };
  }

  const movingBounds = getCombinedBounds(
    movingNodes.map((node) => {
      const origin = originPositions[node.id];
      return origin ? { ...node, x: origin.x, y: origin.y } : node;
    }),
  );
  const translatedBounds = translateBounds(movingBounds, deltaX, deltaY);
  const movingRefs = getBoundsRefs(translatedBounds);

  let bestVerticalGuide = null;
  let bestHorizontalGuide = null;

  stationaryNodes.forEach((node) => {
    const targetBounds = getNodeBounds(node);
    const targetRefs = getBoundsRefs(targetBounds);

    [
      ["left", "left"],
      ["center", "center"],
      ["right", "right"],
    ].forEach(([movingKey, targetKey]) => {
      const offset = targetRefs[targetKey] - movingRefs[movingKey];
      const absOffset = Math.abs(offset);

      if (absOffset > threshold) {
        return;
      }

      if (!bestVerticalGuide || absOffset < bestVerticalGuide.absOffset) {
        bestVerticalGuide = {
          orientation: "vertical",
          x: targetRefs[targetKey],
          absOffset,
          offset,
          range: buildGuideRange("vertical", translatedBounds, targetBounds),
        };
      }
    });

    [
      ["top", "top"],
      ["middle", "middle"],
      ["bottom", "bottom"],
    ].forEach(([movingKey, targetKey]) => {
      const offset = targetRefs[targetKey] - movingRefs[movingKey];
      const absOffset = Math.abs(offset);

      if (absOffset > threshold) {
        return;
      }

      if (!bestHorizontalGuide || absOffset < bestHorizontalGuide.absOffset) {
        bestHorizontalGuide = {
          orientation: "horizontal",
          y: targetRefs[targetKey],
          absOffset,
          offset,
          range: buildGuideRange("horizontal", translatedBounds, targetBounds),
        };
      }
    });
  });

  const adjustedDeltaX = deltaX + (bestVerticalGuide?.offset ?? 0);
  const adjustedDeltaY = deltaY + (bestHorizontalGuide?.offset ?? 0);
  const guides = [bestVerticalGuide, bestHorizontalGuide].filter(Boolean).map((guide) => {
    if (guide.orientation === "vertical") {
      return {
        orientation: guide.orientation,
        x: guide.x,
        start: guide.range.start,
        end: guide.range.end,
      };
    }

    return {
      orientation: guide.orientation,
      y: guide.y,
      start: guide.range.start,
      end: guide.range.end,
    };
  });

  return {
    adjustedDeltaX,
    adjustedDeltaY,
    guides,
  };
}

export function alignSelectedNodes(nodes, selectedIds, mode) {
  const selectedIdSet = new Set(selectedIds);
  const selectedNodes = nodes.filter((node) => selectedIdSet.has(node.id));

  if (selectedNodes.length < 2) {
    return nodes;
  }

  const combinedBounds = getCombinedBounds(selectedNodes);

  return nodes.map((node) => {
    if (!selectedIdSet.has(node.id)) {
      return node;
    }

    const bounds = getNodeBounds(node);
    let nextBounds = bounds;

    if (mode === "left") {
      nextBounds = { ...bounds, left: combinedBounds.left };
    }

    if (mode === "center") {
      nextBounds = {
        ...bounds,
        left: combinedBounds.left + combinedBounds.width / 2 - bounds.width / 2,
      };
    }

    if (mode === "right") {
      nextBounds = { ...bounds, left: combinedBounds.right - bounds.width };
    }

    if (mode === "top") {
      nextBounds = { ...bounds, top: combinedBounds.top };
    }

    if (mode === "middle") {
      nextBounds = {
        ...bounds,
        top: combinedBounds.top + combinedBounds.height / 2 - bounds.height / 2,
      };
    }

    if (mode === "bottom") {
      nextBounds = { ...bounds, top: combinedBounds.bottom - bounds.height };
    }

    if (nextBounds === bounds) {
      return node;
    }

    const nextPosition = getNodePositionForBounds(node, nextBounds);
    return {
      ...node,
      ...nextPosition,
    };
  });
}

export function distributeSelectedNodes(nodes, selectedIds, axis) {
  const selectedIdSet = new Set(selectedIds);
  const selectedNodes = nodes.filter((node) => selectedIdSet.has(node.id));

  if (selectedNodes.length < 3) {
    return nodes;
  }

  const sortedNodes = [...selectedNodes].sort((leftNode, rightNode) => {
    const leftBounds = getNodeBounds(leftNode);
    const rightBounds = getNodeBounds(rightNode);

    return axis === "horizontal"
      ? leftBounds.left - rightBounds.left
      : leftBounds.top - rightBounds.top;
  });

  const sortedBounds = sortedNodes.map(getNodeBounds);
  const totalSize = sortedBounds.reduce(
    (sum, bounds) => sum + (axis === "horizontal" ? bounds.width : bounds.height),
    0,
  );
  const span =
    axis === "horizontal"
      ? sortedBounds.at(-1).right - sortedBounds[0].left
      : sortedBounds.at(-1).bottom - sortedBounds[0].top;
  const gap = (span - totalSize) / (sortedBounds.length - 1);
  let cursor = axis === "horizontal" ? sortedBounds[0].left : sortedBounds[0].top;
  const nextPositionById = new Map();

  sortedNodes.forEach((node, index) => {
    const bounds = sortedBounds[index];

    if (index === 0) {
      cursor += axis === "horizontal" ? bounds.width + gap : bounds.height + gap;
      return;
    }

    if (index === sortedNodes.length - 1) {
      return;
    }

    const nextBounds =
      axis === "horizontal" ? { ...bounds, left: cursor } : { ...bounds, top: cursor };
    nextPositionById.set(node.id, getNodePositionForBounds(node, nextBounds));
    cursor += axis === "horizontal" ? bounds.width + gap : bounds.height + gap;
  });

  return nodes.map((node) =>
    nextPositionById.has(node.id)
      ? {
          ...node,
          ...nextPositionById.get(node.id),
        }
      : node,
  );
}

export function arrangeSelectedNodes(nodes, selectedIds, mode, options = {}) {
  const selectedIdSet = new Set(selectedIds);
  const selectedNodes = nodes.filter((node) => selectedIdSet.has(node.id));

  if (selectedNodes.length < 2) {
    return nodes;
  }

  const combinedBounds = getCombinedBounds(selectedNodes);
  const center = getBoundsCenter(combinedBounds);
  const gap = Number.isFinite(options.gap) ? options.gap : 48;
  const nextPositionById = new Map();

  if (mode === "row") {
    const sortedNodes = [...selectedNodes].sort(
      (first, second) => getNodeBounds(first).left - getNodeBounds(second).left,
    );
    const sortedBounds = sortedNodes.map(getNodeBounds);
    const totalWidth =
      sortedBounds.reduce((sum, bounds) => sum + bounds.width, 0) + gap * (sortedBounds.length - 1);
    let cursor = center.x - totalWidth / 2;

    sortedNodes.forEach((node, index) => {
      const bounds = sortedBounds[index];
      const nextBounds = {
        ...bounds,
        left: cursor,
        top: center.y - bounds.height / 2,
      };
      nextPositionById.set(node.id, getNodePositionForBounds(node, nextBounds));
      cursor += bounds.width + gap;
    });
  }

  if (mode === "column") {
    const sortedNodes = [...selectedNodes].sort(
      (first, second) => getNodeBounds(first).top - getNodeBounds(second).top,
    );
    const sortedBounds = sortedNodes.map(getNodeBounds);
    const totalHeight =
      sortedBounds.reduce((sum, bounds) => sum + bounds.height, 0) + gap * (sortedBounds.length - 1);
    let cursor = center.y - totalHeight / 2;

    sortedNodes.forEach((node, index) => {
      const bounds = sortedBounds[index];
      const nextBounds = {
        ...bounds,
        left: center.x - bounds.width / 2,
        top: cursor,
      };
      nextPositionById.set(node.id, getNodePositionForBounds(node, nextBounds));
      cursor += bounds.height + gap;
    });
  }

  if (mode === "grid") {
    const sortedNodes = [...selectedNodes].sort((first, second) => {
      const firstBounds = getNodeBounds(first);
      const secondBounds = getNodeBounds(second);
      return firstBounds.top === secondBounds.top
        ? firstBounds.left - secondBounds.left
        : firstBounds.top - secondBounds.top;
    });
    const sortedBounds = sortedNodes.map(getNodeBounds);
    const columns = Number.isFinite(options.columns)
      ? Math.max(1, Math.min(sortedNodes.length, Math.round(options.columns)))
      : Math.ceil(Math.sqrt(sortedNodes.length));
    const rows = Math.ceil(sortedNodes.length / columns);
    const cellWidth = Math.max(...sortedBounds.map((bounds) => bounds.width));
    const cellHeight = Math.max(...sortedBounds.map((bounds) => bounds.height));
    const totalWidth = columns * cellWidth + gap * (columns - 1);
    const totalHeight = rows * cellHeight + gap * (rows - 1);
    const startLeft = center.x - totalWidth / 2;
    const startTop = center.y - totalHeight / 2;

    sortedNodes.forEach((node, index) => {
      const bounds = sortedBounds[index];
      const column = index % columns;
      const row = Math.floor(index / columns);
      const nextBounds = {
        ...bounds,
        left: startLeft + column * (cellWidth + gap) + (cellWidth - bounds.width) / 2,
        top: startTop + row * (cellHeight + gap) + (cellHeight - bounds.height) / 2,
      };
      nextPositionById.set(node.id, getNodePositionForBounds(node, nextBounds));
    });
  }

  if (mode === "radial") {
    const sortedNodes = [...selectedNodes].sort((first, second) => {
      const firstCenter = getBoundsCenter(getNodeBounds(first));
      const secondCenter = getBoundsCenter(getNodeBounds(second));
      const firstAngle = Math.atan2(firstCenter.y - center.y, firstCenter.x - center.x);
      const secondAngle = Math.atan2(secondCenter.y - center.y, secondCenter.x - center.x);
      return firstAngle - secondAngle;
    });
    const maxNodeSize = Math.max(
      ...selectedNodes.map((node) => {
        const bounds = getNodeBounds(node);
        return Math.max(bounds.width, bounds.height);
      }),
    );
    const radius = Number.isFinite(options.radius)
      ? options.radius
      : Math.max(120, maxNodeSize * 1.35, selectedNodes.length * 32);
    const startAngle = Number.isFinite(options.startAngle) ? options.startAngle : -Math.PI / 2;

    sortedNodes.forEach((node, index) => {
      const bounds = getNodeBounds(node);
      const angle = startAngle + (index / sortedNodes.length) * Math.PI * 2;
      const nextBounds = {
        ...bounds,
        left: center.x + Math.cos(angle) * radius - bounds.width / 2,
        top: center.y + Math.sin(angle) * radius - bounds.height / 2,
      };
      nextPositionById.set(node.id, getNodePositionForBounds(node, nextBounds));
    });
  }

  if (!nextPositionById.size) {
    return nodes;
  }

  let changed = false;
  const nextNodes = nodes.map((node) => {
    if (!nextPositionById.has(node.id)) {
      return node;
    }

    const nextPosition = nextPositionById.get(node.id);

    if (node.x === nextPosition.x && node.y === nextPosition.y) {
      return node;
    }

    changed = true;
    return {
      ...node,
      ...nextPosition,
    };
  });

  return changed ? nextNodes : nodes;
}

function nodeOrderChanged(firstNodes, secondNodes) {
  return (
    firstNodes.length !== secondNodes.length ||
    firstNodes.some((node, index) => node.id !== secondNodes[index]?.id)
  );
}

export function reorderSelectedNodes(nodes, selectedIds, mode) {
  const selectedIdSet = new Set(selectedIds);

  if (!selectedIdSet.size) {
    return nodes;
  }

  if (mode === "front" || mode === "back") {
    const selectedNodes = nodes.filter((node) => selectedIdSet.has(node.id));
    const unselectedNodes = nodes.filter((node) => !selectedIdSet.has(node.id));
    const reordered = mode === "front"
      ? [...unselectedNodes, ...selectedNodes]
      : [...selectedNodes, ...unselectedNodes];

    return nodeOrderChanged(nodes, reordered) ? reordered : nodes;
  }

  if (mode === "forward") {
    const reordered = [...nodes];
    let changed = false;

    for (let index = reordered.length - 2; index >= 0; index -= 1) {
      if (!selectedIdSet.has(reordered[index].id)) {
        continue;
      }

      let nextIndex = index + 1;

      while (nextIndex < reordered.length && selectedIdSet.has(reordered[nextIndex].id)) {
        nextIndex += 1;
      }

      if (nextIndex >= reordered.length) {
        continue;
      }

      [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
      changed = true;
    }

    return changed ? reordered : nodes;
  }

  if (mode === "backward") {
    const reordered = [...nodes];
    let changed = false;

    for (let index = 1; index < reordered.length; index += 1) {
      if (!selectedIdSet.has(reordered[index].id)) {
        continue;
      }

      let previousIndex = index - 1;

      while (previousIndex >= 0 && selectedIdSet.has(reordered[previousIndex].id)) {
        previousIndex -= 1;
      }

      if (previousIndex < 0) {
        continue;
      }

      [reordered[index], reordered[previousIndex]] = [reordered[previousIndex], reordered[index]];
      changed = true;
    }

    return changed ? reordered : nodes;
  }

  return nodes;
}
