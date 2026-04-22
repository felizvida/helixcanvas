import { getNodeBounds } from "./editorSelection.js";

export const PANEL_LAYOUT_PRESETS = [
  {
    id: "panels-1x2",
    title: "1 x 2",
    description: "Two wide panels for before/after or pathway plus validation figures.",
    columns: 2,
    rows: 1,
  },
  {
    id: "panels-1x3",
    title: "1 x 3",
    description: "Three-panel horizontal spread for mechanism narratives and assay sequences.",
    columns: 3,
    rows: 1,
  },
  {
    id: "panels-2x2",
    title: "2 x 2",
    description: "Four equal panels for compact manuscript figures and comparative cohorts.",
    columns: 2,
    rows: 2,
  },
];

const PANEL_MARGIN_X = 92;
const PANEL_MARGIN_TOP = 112;
const PANEL_MARGIN_BOTTOM = 84;
const PANEL_GAP = 24;

function getPresetOrThrow(presetId) {
  const preset = PANEL_LAYOUT_PRESETS.find((item) => item.id === presetId);

  if (!preset) {
    throw new Error(`Unknown panel preset: ${presetId}`);
  }

  return preset;
}

function sortNodesByReadingOrder(nodes) {
  return [...nodes].sort((leftNode, rightNode) => {
    const leftBounds = getNodeBounds(leftNode);
    const rightBounds = getNodeBounds(rightNode);
    const rowDelta = leftBounds.top - rightBounds.top;

    if (Math.abs(rowDelta) > 24) {
      return rowDelta;
    }

    return leftBounds.left - rightBounds.left;
  });
}

function createPanelCells(preset, board) {
  const usableWidth = board.width - PANEL_MARGIN_X * 2 - PANEL_GAP * (preset.columns - 1);
  const usableHeight =
    board.height - PANEL_MARGIN_TOP - PANEL_MARGIN_BOTTOM - PANEL_GAP * (preset.rows - 1);
  const cellWidth = usableWidth / preset.columns;
  const cellHeight = usableHeight / preset.rows;
  const cells = [];

  for (let row = 0; row < preset.rows; row += 1) {
    for (let column = 0; column < preset.columns; column += 1) {
      const index = row * preset.columns + column;
      const label = String.fromCharCode(65 + index);
      cells.push({
        id: `${preset.id}-${label.toLowerCase()}`,
        label,
        x: PANEL_MARGIN_X + column * (cellWidth + PANEL_GAP),
        y: PANEL_MARGIN_TOP + row * (cellHeight + PANEL_GAP),
        w: cellWidth,
        h: cellHeight,
      });
    }
  }

  return cells;
}

export function buildPanelLayout(presetId, board, palette, createId) {
  const preset = getPresetOrThrow(presetId);
  const cells = createPanelCells(preset, board);
  const frameStroke = palette.accent ?? "#0f766e";
  const frameFill = "rgba(255, 255, 255, 0.72)";
  const labelColor = palette.accent ?? "#0f766e";

  const nodes = cells.flatMap((cell) => {
    const groupId = createId("group");
    const panelId = createId("panel");

    return [
      {
        id: createId("node"),
        panelId,
        groupId,
        type: "shape",
        role: "panel-frame",
        title: `Panel ${cell.label}`,
        shape: "card",
        text: "",
        fill: frameFill,
        stroke: frameStroke,
        strokeWidth: 2,
        strokeDasharray: "12 8",
        color: "#12232e",
        x: cell.x,
        y: cell.y,
        w: cell.w,
        h: cell.h,
      },
      {
        id: createId("node"),
        panelId,
        groupId,
        type: "text",
        role: "panel-label",
        title: `Panel ${cell.label} label`,
        text: cell.label,
        fontSize: 28,
        fontWeight: 800,
        color: labelColor,
        x: cell.x + 18,
        y: cell.y + 40,
        w: 56,
      },
    ];
  });

  return {
    preset,
    cells,
    nodes,
  };
}

export function placeNodesIntoPanelLayout(nodes, selectedIds, cells) {
  const selectedIdSet = new Set(selectedIds);
  const selectedNodes = sortNodesByReadingOrder(nodes.filter((node) => selectedIdSet.has(node.id)));
  const placements = new Map();

  selectedNodes.forEach((node, index) => {
    const cell = cells[index];

    if (!cell) {
      return;
    }

    const bounds = getNodeBounds(node);
    const maxWidth = Math.max(120, cell.w - 44);
    const maxHeight = Math.max(100, cell.h - 52);

    if (node.type === "text") {
      const nextWidth = Math.min(Math.max(bounds.width, 180), maxWidth);
      const nextHeight = bounds.height;
      const nextLeft = cell.x + (cell.w - nextWidth) / 2;
      const nextTop = cell.y + (cell.h - nextHeight) / 2;

      placements.set(node.id, {
        x: nextLeft,
        y: nextTop + nextHeight,
        w: nextWidth,
      });
      return;
    }

    const scale = Math.min(maxWidth / bounds.width, maxHeight / bounds.height, 1);
    const nextWidth = bounds.width * scale;
    const nextHeight = bounds.height * scale;
    const nextLeft = cell.x + (cell.w - nextWidth) / 2;
    const nextTop = cell.y + (cell.h - nextHeight) / 2;
    const patch = {
      x: nextLeft,
      y: nextTop,
    };

    if ("w" in node) {
      patch.w = nextWidth;
    }

    if ("h" in node) {
      patch.h = nextHeight;
    }

    placements.set(node.id, patch);
  });

  return nodes.map((node) =>
    placements.has(node.id)
      ? {
          ...node,
          ...placements.get(node.id),
        }
      : node,
  );
}

export function getPanelCellCount(presetId) {
  const preset = getPresetOrThrow(presetId);
  return preset.columns * preset.rows;
}

