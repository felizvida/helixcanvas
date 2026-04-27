import { getNodeBounds } from "./editorSelection.js";

function normalizePoint(point) {
  return {
    x: Number(point?.x) || 0,
    y: Number(point?.y) || 0,
  };
}

function getDistance(first, second) {
  const dx = first.x - second.x;
  const dy = first.y - second.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function dedupePoints(points) {
  return points.filter((point, index) => {
    if (index === 0) {
      return true;
    }

    const previous = points[index - 1];
    return previous.x !== point.x || previous.y !== point.y;
  });
}

function getMidpoint(from, to) {
  return {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2,
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function getNodeAnchorPoint(node, side = "auto", targetPoint = null) {
  const bounds = getNodeBounds(node);
  const center = {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
  };

  if (side === "top") {
    return { x: center.x, y: bounds.top };
  }

  if (side === "right") {
    return { x: bounds.right, y: center.y };
  }

  if (side === "bottom") {
    return { x: center.x, y: bounds.bottom };
  }

  if (side === "left") {
    return { x: bounds.left, y: center.y };
  }

  if (!targetPoint) {
    return center;
  }

  const halfWidth = Math.max(bounds.width / 2, 1);
  const halfHeight = Math.max(bounds.height / 2, 1);
  const dx = targetPoint.x - center.x;
  const dy = targetPoint.y - center.y;

  if (!dx && !dy) {
    return center;
  }

  if (Math.abs(dx) / halfWidth >= Math.abs(dy) / halfHeight) {
    const edgeX = dx >= 0 ? bounds.right : bounds.left;
    const scale = Math.abs((edgeX - center.x) / (dx || 1));
    return {
      x: edgeX,
      y: center.y + dy * scale,
    };
  }

  const edgeY = dy >= 0 ? bounds.bottom : bounds.top;
  const scale = Math.abs((edgeY - center.y) / (dy || 1));
  return {
    x: center.x + dx * scale,
    y: edgeY,
  };
}

function buildNodeAnchorCandidates(node) {
  return ["top", "right", "bottom", "left"].map((side) => ({
    nodeId: node.id,
    side,
    title: node.title ?? node.text ?? node.id,
    point: getNodeAnchorPoint(node, side),
  }));
}

function getNodeCenter(node) {
  const bounds = getNodeBounds(node);
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
  };
}

function anchorTowardPoint(node, point) {
  return findNearestNodeAnchor(point, [node], { threshold: Number.POSITIVE_INFINITY }) ?? {
    nodeId: node.id,
    side: "auto",
    title: node.title ?? node.text ?? node.id,
    point: getNodeAnchorPoint(node, "auto", point),
  };
}

function createConnectorDraft(base = {}) {
  return {
    id: base.id,
    from: base.from ?? { x: 0, y: 0 },
    to: base.to ?? { x: 180, y: 0 },
    fromAnchor: base.fromAnchor ?? null,
    toAnchor: base.toAnchor ?? null,
    stroke: base.stroke ?? "#155e75",
    strokeWidth: base.strokeWidth ?? 4,
    kind: base.kind ?? "activation",
    route: base.route ?? "straight",
    lineStyle: base.lineStyle ?? "solid",
    curveBend: Number.isFinite(base.curveBend) ? base.curveBend : 0,
    label: base.label ?? "",
  };
}

export function createConnectorDraftBetweenNodes(fromNode, toNode, options = {}) {
  if (!fromNode || !toNode) {
    return null;
  }

  const fromAnchor = anchorTowardPoint(fromNode, getNodeCenter(toNode));
  const toAnchor = anchorTowardPoint(toNode, getNodeCenter(fromNode));

  return createConnectorDraft({
    ...options,
    from: fromAnchor.point,
    to: toAnchor.point,
    fromAnchor: {
      nodeId: fromAnchor.nodeId,
      side: fromAnchor.side,
    },
    toAnchor: {
      nodeId: toAnchor.nodeId,
      side: toAnchor.side,
    },
    route: options.route ?? "curve",
  });
}

export function createConnectorDraftFromNode(node, options = {}) {
  if (!node) {
    return null;
  }

  const bounds = getNodeBounds(node);
  const targetPoint = {
    x: bounds.right + Math.max(180, bounds.width),
    y: bounds.top + bounds.height / 2,
  };
  const fromAnchor = anchorTowardPoint(node, targetPoint);

  return createConnectorDraft({
    ...options,
    from: fromAnchor.point,
    to: targetPoint,
    fromAnchor: {
      nodeId: fromAnchor.nodeId,
      side: fromAnchor.side,
    },
    toAnchor: null,
  });
}

function buildRoutePoints(from, to, route = "straight") {
  if (route !== "elbow") {
    return [from, to];
  }

  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    const midX = from.x + dx / 2;
    return dedupePoints([from, { x: midX, y: from.y }, { x: midX, y: to.y }, to]);
  }

  const midY = from.y + dy / 2;
  return dedupePoints([from, { x: from.x, y: midY }, { x: to.x, y: midY }, to]);
}

function buildCurveControls(from, to, bend = 0) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy) || 1;
  const bendOffset = clamp(bend, -100, 100) * 0.01 * Math.min(distance * 0.42, 180);
  const normal = {
    x: -dy / distance,
    y: dx / distance,
  };

  return {
    c1: {
      x: from.x + dx * 0.38 + normal.x * bendOffset,
      y: from.y + dy * 0.38 + normal.y * bendOffset,
    },
    c2: {
      x: from.x + dx * 0.62 + normal.x * bendOffset,
      y: from.y + dy * 0.62 + normal.y * bendOffset,
    },
  };
}

function cubicPoint(from, c1, c2, to, t) {
  const inverse = 1 - t;
  return {
    x:
      inverse ** 3 * from.x +
      3 * inverse ** 2 * t * c1.x +
      3 * inverse * t ** 2 * c2.x +
      t ** 3 * to.x,
    y:
      inverse ** 3 * from.y +
      3 * inverse ** 2 * t * c1.y +
      3 * inverse * t ** 2 * c2.y +
      t ** 3 * to.y,
  };
}

export function getConnectorCurveBendFromPoint(connector, point) {
  const from = normalizePoint(connector.from);
  const to = normalizePoint(connector.to);
  const handle = normalizePoint(point);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy) || 1;
  const maxOffset = Math.min(distance * 0.42, 180);

  if (maxOffset <= 0) {
    return 0;
  }

  const midpoint = getMidpoint(from, to);
  const normal = {
    x: -dy / distance,
    y: dx / distance,
  };
  const projection = (handle.x - midpoint.x) * normal.x + (handle.y - midpoint.y) * normal.y;

  return Math.round(clamp((projection / (maxOffset * 0.75)) * 100, -100, 100));
}

function pointsToPath(points) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function getEndSegment(points) {
  if (points.length < 2) {
    return {
      from: points[0] ?? { x: 0, y: 0 },
      to: points[0] ?? { x: 0, y: 0 },
    };
  }

  return {
    from: points[points.length - 2],
    to: points[points.length - 1],
  };
}

function getUnitVector(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;

  return {
    dx: dx / length,
    dy: dy / length,
  };
}

export function buildConnectorGeometry(connector) {
  const from = normalizePoint(connector.from);
  const to = normalizePoint(connector.to);
  const route = connector.route === "elbow" || connector.route === "curve" ? connector.route : "straight";

  if (route === "curve") {
    const controls = buildCurveControls(from, to, connector.curveBend ?? 0);
    const labelAnchor = cubicPoint(from, controls.c1, controls.c2, to, 0.5);

    return {
      route,
      points: [from, controls.c1, controls.c2, to],
      controls,
      curveHandle: labelAnchor,
      path: `M ${from.x} ${from.y} C ${controls.c1.x} ${controls.c1.y} ${controls.c2.x} ${controls.c2.y} ${to.x} ${to.y}`,
      label: {
        x: labelAnchor.x,
        y: labelAnchor.y - 12,
      },
      endSegment: {
        from: controls.c2,
        to,
      },
    };
  }

  const points = buildRoutePoints(from, to, route);
  const path = pointsToPath(points);
  const labelAnchor =
    points.length >= 4 ? getMidpoint(points[1], points[2]) : getMidpoint(from, to);

  return {
    route,
    points,
    path,
    label: {
      x: labelAnchor.x,
      y: labelAnchor.y - 12,
    },
    endSegment: getEndSegment(points),
  };
}

export function getConnectorStrokeDasharray(connector) {
  const width = Math.max(Number(connector.strokeWidth) || 4, 1);

  if (connector.lineStyle === "dashed") {
    return `${width * 3} ${width * 2}`;
  }

  if (connector.lineStyle === "dotted") {
    return `0 ${width * 2.2}`;
  }

  return "";
}

export function findNearestNodeAnchor(point, nodes, options = {}) {
  const threshold = options.threshold ?? 44;
  const ignoreNodeIds = new Set(options.ignoreNodeIds ?? []);
  const candidates = (nodes ?? [])
    .filter((node) => node?.id && !node.hidden && !ignoreNodeIds.has(node.id))
    .flatMap(buildNodeAnchorCandidates)
    .map((candidate) => ({
      ...candidate,
      distance: getDistance(point, candidate.point),
    }))
    .sort((first, second) => first.distance - second.distance);
  const nearest = candidates[0] ?? null;

  if (!nearest || nearest.distance > threshold) {
    return null;
  }

  return nearest;
}

export function resolveConnectorAnchors(connector, nodes) {
  const nodeMap = new Map((nodes ?? []).map((node) => [node.id, node]));
  let from = normalizePoint(connector.from);
  let to = normalizePoint(connector.to);
  const fromNode = connector.fromAnchor?.nodeId ? nodeMap.get(connector.fromAnchor.nodeId) : null;
  const toNode = connector.toAnchor?.nodeId ? nodeMap.get(connector.toAnchor.nodeId) : null;

  if (toNode) {
    to = getNodeAnchorPoint(toNode, connector.toAnchor.side, from);
  }

  if (fromNode) {
    from = getNodeAnchorPoint(fromNode, connector.fromAnchor.side, to);
  }

  if (toNode) {
    to = getNodeAnchorPoint(toNode, connector.toAnchor.side, from);
  }

  return {
    ...connector,
    from,
    to,
  };
}

export function buildConnectorArrowHead(endSegment, size = 14, width = 10) {
  const { dx, dy } = getUnitVector(endSegment.from, endSegment.to);
  const perp = { x: -dy, y: dx };
  const tip = endSegment.to;
  const base = {
    x: tip.x - dx * size,
    y: tip.y - dy * size,
  };
  const halfWidth = width / 2;

  return [
    `${tip.x},${tip.y}`,
    `${base.x + perp.x * halfWidth},${base.y + perp.y * halfWidth}`,
    `${base.x - perp.x * halfWidth},${base.y - perp.y * halfWidth}`,
  ].join(" ");
}

export function buildConnectorInhibitionBar(endSegment, size = 12) {
  const { dx, dy } = getUnitVector(endSegment.from, endSegment.to);
  const perp = { x: -dy, y: dx };
  const halfSize = size / 2;
  const center = endSegment.to;

  return {
    x1: center.x + perp.x * halfSize,
    y1: center.y + perp.y * halfSize,
    x2: center.x - perp.x * halfSize,
    y2: center.y - perp.y * halfSize,
  };
}
