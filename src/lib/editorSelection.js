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
