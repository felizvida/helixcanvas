function normalizePoint(point) {
  return {
    x: Number(point?.x) || 0,
    y: Number(point?.y) || 0,
  };
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
  const route = connector.route === "elbow" ? "elbow" : "straight";
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
