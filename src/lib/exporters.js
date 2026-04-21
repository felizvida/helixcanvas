const XML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (char) => XML_ESCAPES[char]);
}

function renderShape(node) {
  const x = node.x;
  const y = node.y;
  const width = node.w;
  const height = node.h;
  const fill = node.fill ?? "#ffffff";
  const stroke = node.stroke ?? "#d0d7de";
  const strokeWidth = node.strokeWidth ?? 2;

  if (node.shape === "circle") {
    return [
      `<ellipse cx="${x + width / 2}" cy="${y + height / 2}" rx="${width / 2}" ry="${height / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`,
      node.text
        ? `<text x="${x + width / 2}" y="${y + height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="18" font-weight="700" fill="${node.color ?? "#12232e"}">${escapeXml(node.text)}</text>`
        : "",
    ].join("");
  }

  const radius = node.shape === "card" ? 24 : node.shape === "pill" ? height / 2 : 12;
  return [
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`,
    node.text
      ? `<text x="${x + width / 2}" y="${y + height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="18" font-weight="700" fill="${node.color ?? "#12232e"}">${escapeXml(node.text)}</text>`
      : "",
  ].join("");
}

function renderNode(node) {
  if (node.type === "asset") {
    return `<image x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" href="${escapeXml(
      node.assetUrl,
    )}" preserveAspectRatio="xMidYMid meet" />`;
  }

  if (node.type === "text") {
    const fontWeight = node.fontWeight ?? 600;
    const fontSize = node.fontSize ?? 18;
    return `<text x="${node.x}" y="${node.y}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${node.color ?? "#12232e"}">${escapeXml(
      node.text,
    )}</text>`;
  }

  if (node.type === "shape") {
    return renderShape(node);
  }

  return "";
}

function renderConnector(connector) {
  return `<line x1="${connector.from.x}" y1="${connector.from.y}" x2="${connector.to.x}" y2="${connector.to.y}" stroke="${connector.stroke ?? "#155e75"}" stroke-width="${connector.strokeWidth ?? 4}" marker-end="url(#arrowhead)" stroke-linecap="round" />`;
}

export function projectToSvg(project) {
  const width = project.board.width;
  const height = project.board.height;
  const background = project.board.background ?? "#f7f2ea";
  const nodes = project.nodes.filter((node) => !node.hidden).map(renderNode).join("");
  const connectors = project.connectors.map(renderConnector).join("");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<defs><marker id="arrowhead" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 z" fill="#155e75" /></marker></defs>`,
    `<rect width="${width}" height="${height}" fill="${background}" />`,
    connectors,
    nodes,
    `</svg>`,
  ].join("");
}

export function downloadText(filename, text, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function collectProjectCitations(project) {
  const citations = [];

  for (const node of project.nodes) {
    if (node.hidden) {
      continue;
    }

    if (node.citation && !citations.includes(node.citation)) {
      citations.push(node.citation);
    }
  }

  return citations.join("\n");
}
