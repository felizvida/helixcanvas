const DEFAULT_LIMIT = 24;

function createComponentId() {
  return `component-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createDefaultLabel(createdAt) {
  return `Reusable component · ${new Date(createdAt).toLocaleString()}`;
}

export function createReusableComponent(nodes, options = {}) {
  const createdAt = options.createdAt ?? new Date().toISOString();

  if (!nodes?.length) {
    throw new Error("Select at least one layer before saving a reusable component.");
  }

  const anchorX = Math.min(...nodes.map((node) => node.x ?? 0));
  const anchorY = Math.min(...nodes.map((node) => node.y ?? 0));

  return {
    id: options.id ?? createComponentId(),
    label: options.label?.trim() || createDefaultLabel(createdAt),
    createdAt,
    nodes: nodes.map((node) => ({
      ...node,
      x: (node.x ?? 0) - anchorX,
      y: (node.y ?? 0) - anchorY,
    })),
  };
}

export function pushReusableComponent(components, component, limit = DEFAULT_LIMIT) {
  return [component, ...(components ?? []).filter((item) => item.id !== component.id)].slice(0, limit);
}

export function removeReusableComponent(components, componentId) {
  return (components ?? []).filter((component) => component.id !== componentId);
}

export function instantiateReusableComponent(component, options) {
  const { createId, position = { x: 160, y: 160 } } = options;
  const groupIds = new Map();

  return component.nodes.map((node) => ({
    ...node,
    id: createId("node"),
    groupId: node.groupId
      ? (groupIds.has(node.groupId)
          ? groupIds.get(node.groupId)
          : groupIds.set(node.groupId, createId("group")).get(node.groupId))
      : null,
    x: position.x + (node.x ?? 0),
    y: position.y + (node.y ?? 0),
    hidden: false,
    locked: false,
  }));
}

