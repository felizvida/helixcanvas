const NODE_STYLE_KEYS = [
  "fill",
  "stroke",
  "color",
  "strokeWidth",
  "fontFamily",
  "fontWeight",
  "textAlign",
  "lineHeight",
  "opacity",
  "effect",
  "assetFit",
  "assetMask",
  "cropX",
  "cropY",
  "cropZoom",
];

const CONNECTOR_STYLE_KEYS = [
  "stroke",
  "strokeWidth",
  "kind",
  "route",
  "lineStyle",
  "curveBend",
];

function pickDefined(source, keys) {
  return Object.fromEntries(
    keys
      .filter((key) => source[key] !== undefined)
      .map((key) => [key, source[key]]),
  );
}

export function createNodeStyleSnapshot(node) {
  if (!node) {
    return null;
  }

  return {
    kind: "node-style",
    sourceLabel: node.title ?? node.text ?? "Layer style",
    patch: pickDefined(node, NODE_STYLE_KEYS),
  };
}

export function createConnectorStyleSnapshot(connector) {
  if (!connector) {
    return null;
  }

  return {
    kind: "connector-style",
    sourceLabel: connector.label || "Connector style",
    patch: pickDefined(connector, CONNECTOR_STYLE_KEYS),
  };
}

export function applyNodeStyleSnapshot(nodes, selectedIds, snapshot) {
  if (snapshot?.kind !== "node-style") {
    return nodes;
  }

  const selectedIdSet = new Set(selectedIds);

  return nodes.map((node) =>
    selectedIdSet.has(node.id) && !node.locked
      ? {
          ...node,
          ...snapshot.patch,
        }
      : node,
  );
}

export function applyConnectorStyleSnapshot(connectors, connectorId, snapshot) {
  if (snapshot?.kind !== "connector-style") {
    return connectors;
  }

  return connectors.map((connector) =>
    connector.id === connectorId
      ? {
          ...connector,
          ...snapshot.patch,
        }
      : connector,
  );
}
