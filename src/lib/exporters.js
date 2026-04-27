import {
  buildConnectorArrowHead,
  buildConnectorGeometry,
  buildConnectorInhibitionBar,
  getConnectorStrokeDasharray,
  resolveConnectorAnchors,
} from "./connectors.js";
import { getNodeBounds } from "./editorSelection.js";
import { getFontFamilyStack } from "./figureStyles.js";

const XML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

const MIME_BY_EXTENSION = {
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

const SVG_EFFECT_DEFS = `
<defs>
  <filter id="node-effect-soft-shadow" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="16" stdDeviation="10" flood-color="#151713" flood-opacity="0.18" />
  </filter>
  <filter id="node-effect-lifted" x="-35%" y="-35%" width="170%" height="170%">
    <feDropShadow dx="0" dy="24" stdDeviation="14" flood-color="#151713" flood-opacity="0.2" />
    <feDropShadow dx="0" dy="-1" stdDeviation="0.2" flood-color="#ffffff" flood-opacity="0.72" />
  </filter>
  <filter id="node-effect-glow" x="-45%" y="-45%" width="190%" height="190%">
    <feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="#008f86" flood-opacity="0.42" />
  </filter>
  <filter id="node-effect-halo" x="-45%" y="-45%" width="190%" height="190%">
    <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#ffffff" flood-opacity="0.98" />
    <feDropShadow dx="0" dy="0" stdDeviation="1" flood-color="#ffffff" flood-opacity="0.98" />
  </filter>
</defs>`;

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (char) => XML_ESCAPES[char]);
}

function sanitizeFilenamePart(value) {
  return String(value || "helixcanvas-export")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "helixcanvas-export";
}

function clampPercent(value) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

function getSvgAlignment(value, low, middle, high) {
  const percent = clampPercent(value);

  if (percent <= 33) {
    return low;
  }

  if (percent >= 67) {
    return high;
  }

  return middle;
}

function getAssetPreserveAspectRatio(node) {
  if (node.assetFit === "fill") {
    return "none";
  }

  const xAlign = getSvgAlignment(node.cropX ?? 50, "xMin", "xMid", "xMax");
  const yAlign = getSvgAlignment(node.cropY ?? 50, "YMin", "YMid", "YMax");
  const fit = node.assetFit === "cover" || (Number(node.cropZoom) || 1) > 1 ? "slice" : "meet";
  return `${xAlign}${yAlign} ${fit}`;
}

function getAssetImageFrame(node) {
  const zoom = Math.max(1, Number(node.cropZoom) || 1);
  const cropX = clampPercent(node.cropX ?? 50) / 100;
  const cropY = clampPercent(node.cropY ?? 50) / 100;
  const width = node.w * zoom;
  const height = node.h * zoom;

  return {
    x: node.x - (width - node.w) * cropX,
    y: node.y - (height - node.h) * cropY,
    width,
    height,
  };
}

function getAssetClipPath(node, clipId) {
  if (node.assetMask === "circle") {
    return `<clipPath id="${clipId}"><ellipse cx="${node.x + node.w / 2}" cy="${node.y + node.h / 2}" rx="${node.w / 2}" ry="${node.h / 2}" /></clipPath>`;
  }

  if (node.assetMask === "hex") {
    const points = [
      [node.x + node.w * 0.25, node.y + node.h * 0.04],
      [node.x + node.w * 0.75, node.y + node.h * 0.04],
      [node.x + node.w, node.y + node.h * 0.5],
      [node.x + node.w * 0.75, node.y + node.h * 0.96],
      [node.x + node.w * 0.25, node.y + node.h * 0.96],
      [node.x, node.y + node.h * 0.5],
    ]
      .map(([x, y]) => `${formatPdfNumber(x)},${formatPdfNumber(y)}`)
      .join(" ");
    return `<clipPath id="${clipId}"><polygon points="${points}" /></clipPath>`;
  }

  const radius = node.assetMask === "rounded" ? Math.min(24, node.w / 2, node.h / 2) : 0;
  return `<clipPath id="${clipId}"><rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="${radius}" /></clipPath>`;
}

function renderShape(node) {
  const x = node.x;
  const y = node.y;
  const width = node.w;
  const height = node.h;
  const fill = node.fill ?? "#ffffff";
  const stroke = node.stroke ?? "#d0d7de";
  const strokeWidth = node.strokeWidth ?? 2;
  const strokeDasharray = node.strokeDasharray ? ` stroke-dasharray="${node.strokeDasharray}"` : "";

  if (node.shape === "circle") {
    return [
      `<ellipse cx="${x + width / 2}" cy="${y + height / 2}" rx="${width / 2}" ry="${height / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${strokeDasharray} />`,
      node.text
        ? `<text x="${x + width / 2}" y="${y + height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="18" font-weight="700" fill="${node.color ?? "#12232e"}">${escapeXml(node.text)}</text>`
        : "",
    ].join("");
  }

  const radius = node.shape === "card" ? 24 : node.shape === "pill" ? height / 2 : 12;
  return [
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${strokeDasharray} />`,
    node.text
      ? `<text x="${x + width / 2}" y="${y + height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="18" font-weight="700" fill="${node.color ?? "#12232e"}">${escapeXml(node.text)}</text>`
      : "",
  ].join("");
}

function getNodeSvgTransform(node) {
  const rotation = Number(node.rotation) || 0;
  const scaleX = node.flipX ? -1 : 1;
  const scaleY = node.flipY ? -1 : 1;

  if (!rotation && scaleX === 1 && scaleY === 1) {
    return "";
  }

  const bounds = getNodeBounds(node);
  const centerX = bounds.left + bounds.width / 2;
  const centerY = bounds.top + bounds.height / 2;
  const transforms = [`translate(${centerX} ${centerY})`];

  if (rotation) {
    transforms.push(`rotate(${rotation})`);
  }

  if (scaleX !== 1 || scaleY !== 1) {
    transforms.push(`scale(${scaleX} ${scaleY})`);
  }

  transforms.push(`translate(${-centerX} ${-centerY})`);
  return transforms.join(" ");
}

function wrapNodeSvg(node, markup) {
  const transform = getNodeSvgTransform(node);
  const opacity = Number.isFinite(node.opacity) && node.opacity < 1 ? ` opacity="${node.opacity}"` : "";
  const filter =
    node.effect && node.effect !== "none" ? ` filter="url(#node-effect-${escapeXml(node.effect)})"` : "";

  if (!transform && !opacity && !filter) {
    return markup;
  }

  return `<g${transform ? ` transform="${transform}"` : ""}${opacity}${filter}>${markup}</g>`;
}

function renderTextNode(node) {
  const fontWeight = node.fontWeight ?? 600;
  const fontSize = node.fontSize ?? 18;
  const textAlign = node.textAlign ?? "left";
  const lineHeight = Number(node.lineHeight) || 1.3;
  const fontFamily = getFontFamilyStack(node.fontFamily);
  const anchor = textAlign === "center" ? "middle" : textAlign === "right" ? "end" : "start";
  const x =
    textAlign === "center" ? node.x + (node.w ?? 0) / 2 : textAlign === "right" ? node.x + (node.w ?? 0) : node.x;
  const lines = String(node.text ?? "").split("\n");

  return [
    `<text x="${x}" y="${node.y}" font-size="${fontSize}" font-weight="${fontWeight}" font-family="${escapeXml(
      fontFamily,
    )}" text-anchor="${anchor}" fill="${node.color ?? "#12232e"}">`,
    ...lines.map((line, index) =>
      `<tspan x="${x}" dy="${index === 0 ? 0 : fontSize * lineHeight}">${escapeXml(line)}</tspan>`,
    ),
    `</text>`,
  ].join("");
}

function renderAssetNode(node) {
  const fit = node.assetFit ?? "contain";
  const mask = node.assetMask ?? "none";
  const frame = getAssetImageFrame(node);
  const preserveAspectRatio = getAssetPreserveAspectRatio(node);
  const image = `<image x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}" href="${escapeXml(
    node.assetUrl,
  )}" preserveAspectRatio="${preserveAspectRatio}" />`;
  const needsClip =
    mask !== "none" ||
    fit === "cover" ||
    fit === "fill" ||
    (Number(node.cropZoom) || 1) > 1;

  if (!needsClip) {
    return image;
  }

  const clipId = `asset-clip-${sanitizeFilenamePart(node.id ?? node.title)}`;
  return `<defs>${getAssetClipPath(node, clipId)}</defs><g clip-path="url(#${clipId})">${image}</g>`;
}

function renderNode(node) {
  let markup = "";

  if (node.type === "asset") {
    markup = renderAssetNode(node);
    return wrapNodeSvg(node, markup);
  }

  if (node.type === "text") {
    markup = renderTextNode(node);
    return wrapNodeSvg(node, markup);
  }

  if (node.type === "shape") {
    markup = renderShape(node);
    return wrapNodeSvg(node, markup);
  }

  return "";
}

function renderConnector(connector, nodes = []) {
  const resolvedConnector = resolveConnectorAnchors(connector, nodes);
  const geometry = buildConnectorGeometry(resolvedConnector);
  const stroke = connector.stroke ?? "#155e75";
  const strokeWidth = connector.strokeWidth ?? 4;
  const strokeDasharray = getConnectorStrokeDasharray(connector);
  const strokeDash = strokeDasharray ? ` stroke-dasharray="${strokeDasharray}"` : "";
  const label = connector.label
    ? `<text x="${geometry.label.x}" y="${geometry.label.y}" text-anchor="middle" font-size="13" font-weight="700" font-family="${escapeXml(
        getFontFamilyStack("grotesk"),
      )}" fill="${stroke}" stroke="#ffffff" stroke-width="4" paint-order="stroke">${escapeXml(
        connector.label,
      )}</text>`
    : "";
  const arrow =
    connector.kind === "activation"
      ? `<polygon points="${buildConnectorArrowHead(geometry.endSegment)}" fill="${stroke}" />`
      : "";
  const inhibition =
    connector.kind === "inhibition"
      ? (() => {
          const bar = buildConnectorInhibitionBar(geometry.endSegment);
          return `<line x1="${bar.x1}" y1="${bar.y1}" x2="${bar.x2}" y2="${bar.y2}" stroke="${stroke}" stroke-width="${Math.max(
            3,
            strokeWidth - 0.5,
          )}" stroke-linecap="round"${strokeDash} />`;
        })()
      : "";

  return [
    `<path d="${geometry.path}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${strokeDash} />`,
    arrow,
    inhibition,
    label,
  ].join("");
}

function guessMimeTypeFromUrl(url) {
  const extension = url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
}

function bytesToBase64(bytes) {
  let binary = "";

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary);
}

function stringToBytes(value) {
  return new TextEncoder().encode(value);
}

function concatByteArrays(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const bytes = new Uint8Array(totalLength);
  let offset = 0;

  chunks.forEach((chunk) => {
    bytes.set(chunk, offset);
    offset += chunk.length;
  });

  return bytes;
}

function formatPdfNumber(value) {
  return Number(value).toFixed(2).replace(/\.?0+$/, "");
}

async function assetUrlToDataUrl(url) {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Could not inline asset: ${url}`);
  }

  const blob = await response.blob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return `data:${blob.type || guessMimeTypeFromUrl(url)};base64,${bytesToBase64(bytes)}`;
}

async function inlineProjectAssetUrls(project) {
  const warnings = [];

  const nodes = await Promise.all(
    project.nodes.map(async (node) => {
      if (node.type !== "asset" || !node.assetUrl) {
        return node;
      }

      try {
        return {
          ...node,
          assetUrl: await assetUrlToDataUrl(node.assetUrl),
        };
      } catch {
        warnings.push(`Could not inline ${node.title ?? node.assetUrl}; exported raster may omit it.`);
        return node;
      }
    }),
  );

  return {
    project: {
      ...project,
      nodes,
    },
    warnings,
  };
}

async function loadImageFromSvg(svg) {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.decoding = "async";

  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("Could not render SVG for export."));
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not create export blob."));
        return;
      }

      resolve(blob);
    }, type, quality);
  });
}

export function projectToSvg(project, options = {}) {
  const { includeBackground = true } = options;
  const width = project.board.width;
  const height = project.board.height;
  const background = project.board.background ?? "#f7f2ea";
  const visibleNodes = project.nodes.filter((node) => !node.hidden);
  const nodes = visibleNodes.map(renderNode).join("");
  const connectors = project.connectors
    .map((connector) => renderConnector(connector, visibleNodes))
    .join("");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    SVG_EFFECT_DEFS,
    includeBackground ? `<rect width="${width}" height="${height}" fill="${background}" />` : "",
    connectors,
    nodes,
    `</svg>`,
  ].join("");
}

export function buildExportFilename(name, extension) {
  return `${sanitizeFilenamePart(name)}.${extension}`;
}

export function dataUrlToBytes(dataUrl) {
  const [, base64 = ""] = dataUrl.split(",", 2);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export function buildPdfFromJpegBytes({
  jpegBytes,
  imageWidth,
  imageHeight,
  pageWidth = imageWidth,
  pageHeight = imageHeight,
}) {
  const imageObjectHeader = stringToBytes(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
  );
  const imageObjectFooter = stringToBytes(`\nendstream\nendobj\n`);
  const contentStream = `q\n${formatPdfNumber(pageWidth)} 0 0 ${formatPdfNumber(pageHeight)} 0 0 cm\n/Im0 Do\nQ\n`;
  const contentBytes = stringToBytes(contentStream);
  const objects = [
    stringToBytes(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`),
    stringToBytes(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`),
    stringToBytes(
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${formatPdfNumber(pageWidth)} ${formatPdfNumber(pageHeight)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
    ),
    concatByteArrays([imageObjectHeader, jpegBytes, imageObjectFooter]),
    concatByteArrays([
      stringToBytes(`5 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`),
      contentBytes,
      stringToBytes(`endstream\nendobj\n`),
    ]),
  ];
  const header = stringToBytes(`%PDF-1.4\n%${String.fromCharCode(0xff, 0xff, 0xff, 0xff)}\n`);
  let offset = header.length;
  const offsets = [0];

  objects.forEach((objectBytes) => {
    offsets.push(offset);
    offset += objectBytes.length;
  });

  const xrefStart = offset;
  const xrefLines = ["xref", `0 ${objects.length + 1}`, "0000000000 65535 f "];

  for (let index = 1; index <= objects.length; index += 1) {
    xrefLines.push(`${String(offsets[index]).padStart(10, "0")} 00000 n `);
  }

  const trailer = [
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    `${xrefStart}`,
    "%%EOF",
  ].join("\n");

  return concatByteArrays([
    header,
    ...objects,
    stringToBytes(`${xrefLines.join("\n")}\n${trailer}`),
  ]);
}

export async function renderProjectToCanvas(project, options = {}) {
  const {
    scale = 2,
    includeBackground = true,
    fillBackground = includeBackground ? null : null,
  } = options;
  const rasterScale = Math.max(1, Number(scale) || 1);
  const { project: inlineProject, warnings } = await inlineProjectAssetUrls(project);
  const svg = projectToSvg(inlineProject, { includeBackground });
  const image = await loadImageFromSvg(svg);
  const canvas = document.createElement("canvas");
  const width = inlineProject.board.width;
  const height = inlineProject.board.height;
  canvas.width = Math.round(width * rasterScale);
  canvas.height = Math.round(height * rasterScale);

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas export is unavailable in this browser.");
  }

  if (fillBackground) {
    context.fillStyle = fillBackground;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  context.scale(rasterScale, rasterScale);
  context.drawImage(image, 0, 0, width, height);

  return {
    canvas,
    warnings,
  };
}

export async function createProjectPngBlob(project, options = {}) {
  const { canvas, warnings } = await renderProjectToCanvas(project, options);
  const blob = await canvasToBlob(canvas, "image/png");
  return { blob, warnings };
}

export async function createProjectPdfBlob(project, options = {}) {
  const { scale = 2, includeBackground = true } = options;
  const { canvas, warnings } = await renderProjectToCanvas(project, {
    scale,
    includeBackground,
    fillBackground: includeBackground ? null : "#ffffff",
  });
  const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.96);
  const pdfBytes = buildPdfFromJpegBytes({
    jpegBytes: dataUrlToBytes(jpegDataUrl),
    imageWidth: canvas.width,
    imageHeight: canvas.height,
    pageWidth: project.board.width,
    pageHeight: project.board.height,
  });

  return {
    blob: new Blob([pdfBytes], { type: "application/pdf" }),
    warnings,
  };
}

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadText(filename, text, mimeType = "text/plain;charset=utf-8") {
  downloadBlob(filename, new Blob([text], { type: mimeType }));
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

function summarizeOpenComments(project) {
  return (project.comments ?? [])
    .filter((comment) => comment.status !== "resolved")
    .map((comment, index) => `- [ ] Comment ${index + 1} (${comment.author}): ${comment.body}`);
}

function summarizeResolvedComments(project) {
  return (project.comments ?? [])
    .filter((comment) => comment.status === "resolved")
    .map((comment, index) => `- [x] Comment ${index + 1} (${comment.author}): ${comment.body}`);
}

export function buildReviewBundleText(project, options = {}) {
  const comparison = options.comparison;
  const citations = collectProjectCitations(project);
  const exportPreset = options.exportPreset;
  const openComments = summarizeOpenComments(project);
  const resolvedComments = summarizeResolvedComments(project);

  return [
    `# ${project.name || "HelixCanvas figure"}`,
    "",
    project.brief ? project.brief : "No figure brief captured yet.",
    "",
    "## Figure Summary",
    `- Board: ${project.board.width} x ${project.board.height}`,
    `- Nodes: ${(project.nodes ?? []).filter((node) => !node.hidden).length}`,
    `- Connectors: ${(project.connectors ?? []).length}`,
    `- Comments: ${(project.comments ?? []).length}`,
    exportPreset ? `- Export target: ${exportPreset.title}` : null,
    "",
    comparison
      ? [
          "## Snapshot Comparison",
          comparison.narrative,
          `- Changed layers: ${comparison.changedNodes.length}`,
          `- Added layers: ${comparison.addedNodes.length}`,
          `- Removed layers: ${comparison.removedNodes.length}`,
          `- Connector changes: ${comparison.changedConnectors.length}`,
          `- New review notes: ${comparison.addedComments.length}`,
          comparison.resolvedComments?.length ? `- Resolved comments: ${comparison.resolvedComments.length}` : null,
          "",
        ]
      : null,
    "## Open Review Notes",
    ...(openComments.length ? openComments : ["- No open review notes."]),
    "",
    resolvedComments.length ? "## Resolved Review Notes" : null,
    ...(resolvedComments.length ? [...resolvedComments, ""] : []),
    citations ? "## Citations" : null,
    ...(citations ? [citations, ""] : []),
  ]
    .flat()
    .filter((line) => line !== null && line !== undefined)
    .join("\n");
}
