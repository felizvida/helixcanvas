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
  const nodes = project.nodes.filter((node) => !node.hidden).map(renderNode).join("");
  const connectors = project.connectors.map(renderConnector).join("");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<defs><marker id="arrowhead" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 z" fill="#155e75" /></marker></defs>`,
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

