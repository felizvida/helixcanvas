import test from "node:test";
import assert from "node:assert/strict";

import {
  buildExportFilename,
  buildPdfFromJpegBytes,
  buildReviewBundleText,
  collectProjectCitations,
  projectToSvg,
} from "../src/lib/exporters.js";

test("collectProjectCitations deduplicates repeated citations", () => {
  const citations = collectProjectCitations({
    nodes: [
      { citation: "Bioicons: Cell" },
      { citation: "Servier: Neuron" },
      { citation: "Bioicons: Cell" },
      { citation: "Hidden: Ignore", hidden: true },
    ],
  });

  assert.equal(citations, "Bioicons: Cell\nServier: Neuron");
});

test("projectToSvg renders escaped text, connectors, and assets", () => {
  const svg = projectToSvg({
    board: {
      width: 800,
      height: 600,
      background: "#ffffff",
    },
    connectors: [
      {
        from: { x: 10, y: 20 },
        to: { x: 30, y: 40 },
        stroke: "#155e75",
        strokeWidth: 4,
        kind: "activation",
        route: "elbow",
        label: "blocks",
      },
    ],
    nodes: [
      {
        type: "text",
        x: 40,
        y: 80,
        text: "Signal & response\nwith context",
        fontSize: 20,
        fontFamily: "serif",
        textAlign: "center",
        lineHeight: 1.4,
        color: "#12232e",
        w: 180,
      },
      {
        type: "asset",
        x: 90,
        y: 120,
        w: 150,
        h: 120,
        assetUrl: "https://example.com/cell.svg",
      },
      {
        type: "shape",
        shape: "card",
        x: 260,
        y: 160,
        w: 180,
        h: 90,
        text: "Panel <A>",
        fill: "#eef4dc",
        stroke: "#88a166",
      },
      {
        type: "text",
        x: 80,
        y: 260,
        text: "Hidden note",
        hidden: true,
      },
    ],
  });

  assert.match(svg, /Signal &amp; response/);
  assert.match(svg, /with context/);
  assert.match(svg, /Panel &lt;A&gt;/);
  assert.match(svg, /<image[^>]+https:\/\/example.com\/cell\.svg/);
  assert.match(svg, /font-family="&quot;Iowan Old Style&quot;, &quot;Palatino Linotype&quot;, Georgia, serif"/);
  assert.match(svg, /text-anchor="middle"/);
  assert.match(svg, /<polygon points="/);
  assert.match(svg, /blocks/);
  assert.doesNotMatch(svg, /Hidden note/);
});

test("projectToSvg can omit the board background for transparent exports", () => {
  const svg = projectToSvg(
    {
      board: {
        width: 640,
        height: 480,
        background: "#f7f2ea",
      },
      connectors: [],
      nodes: [],
    },
    { includeBackground: false },
  );

  assert.doesNotMatch(svg, /<rect width="640" height="480" fill="#f7f2ea"/);
});

test("projectToSvg preserves rotation, flipping, and opacity transforms", () => {
  const svg = projectToSvg({
    board: {
      width: 320,
      height: 240,
      background: "#ffffff",
    },
    connectors: [],
    nodes: [
      {
        type: "shape",
        shape: "card",
        x: 40,
        y: 60,
        w: 120,
        h: 80,
        text: "Flipped",
        fill: "#ffffff",
        stroke: "#111111",
        rotation: 45,
        flipX: true,
        opacity: 0.5,
      },
    ],
  });

  assert.match(
    svg,
    /<g transform="translate\(100 100\) rotate\(45\) scale\(-1 1\) translate\(-100 -100\)" opacity="0.5">/,
  );
});

test("projectToSvg preserves asset crop, zoom, and mask clips", () => {
  const svg = projectToSvg({
    board: {
      width: 320,
      height: 240,
      background: "#ffffff",
    },
    connectors: [],
    nodes: [
      {
        id: "asset-a",
        type: "asset",
        x: 40,
        y: 60,
        w: 120,
        h: 80,
        assetUrl: "https://example.com/cell.png",
        assetFit: "cover",
        assetMask: "circle",
        cropX: 80,
        cropY: 20,
        cropZoom: 1.5,
      },
    ],
  });

  assert.match(svg, /<clipPath id="asset-clip-asset-a">/);
  assert.match(svg, /<ellipse cx="100" cy="100" rx="60" ry="40"/);
  assert.match(svg, /clip-path="url\(#asset-clip-asset-a\)"/);
  assert.match(svg, /preserveAspectRatio="xMaxYMin slice"/);
  assert.match(svg, /<image x="-8" y="52" width="180" height="120"/);
});

test("projectToSvg preserves node visual effects", () => {
  const svg = projectToSvg({
    board: {
      width: 320,
      height: 240,
      background: "#ffffff",
    },
    connectors: [],
    nodes: [
      {
        type: "shape",
        shape: "card",
        x: 40,
        y: 60,
        w: 120,
        h: 80,
        text: "Glow",
        effect: "glow",
      },
    ],
  });

  assert.match(svg, /<filter id="node-effect-glow"/);
  assert.match(svg, /filter="url\(#node-effect-glow\)"/);
});

test("projectToSvg renders inhibition connectors as bars without arrow markers", () => {
  const svg = projectToSvg({
    board: {
      width: 320,
      height: 240,
      background: "#ffffff",
    },
    connectors: [
      {
        from: { x: 40, y: 120 },
        to: { x: 220, y: 120 },
        stroke: "#8f4b2d",
        strokeWidth: 5,
        kind: "inhibition",
        route: "straight",
      },
    ],
    nodes: [],
  });

  assert.match(svg, /stroke="#8f4b2d"/);
  assert.doesNotMatch(svg, /marker-end/);
  assert.match(svg, /<line x1="220" y1="126" x2="220" y2="114"/);
});

test("projectToSvg resolves connector anchors before export", () => {
  const svg = projectToSvg({
    board: {
      width: 320,
      height: 240,
      background: "#ffffff",
    },
    connectors: [
      {
        from: { x: 0, y: 0 },
        to: { x: 260, y: 120 },
        fromAnchor: { nodeId: "egfr", side: "right" },
        stroke: "#155e75",
        strokeWidth: 4,
        kind: "activation",
        route: "straight",
      },
    ],
    nodes: [
      {
        id: "egfr",
        type: "shape",
        shape: "card",
        x: 40,
        y: 80,
        w: 120,
        h: 80,
        text: "EGFR",
      },
    ],
  });

  assert.match(svg, /<path d="M 160 120 L 260 120"/);
});

test("projectToSvg preserves curved dashed connector styling", () => {
  const svg = projectToSvg({
    board: {
      width: 320,
      height: 240,
      background: "#ffffff",
    },
    connectors: [
      {
        from: { x: 40, y: 120 },
        to: { x: 260, y: 120 },
        stroke: "#155e75",
        strokeWidth: 4,
        kind: "neutral",
        route: "curve",
        curveBend: -40,
        lineStyle: "dashed",
      },
    ],
    nodes: [],
  });

  assert.match(svg, /<path d="M 40 120 C /);
  assert.match(svg, /stroke-dasharray="12 8"/);
});

test("buildExportFilename normalizes project names for downloads", () => {
  assert.equal(buildExportFilename("EGFR / ERK Figure", "png"), "egfr-erk-figure.png");
});

test("buildPdfFromJpegBytes returns a simple one-page pdf document", () => {
  const pdfBytes = buildPdfFromJpegBytes({
    jpegBytes: Uint8Array.of(0xff, 0xd8, 0xff, 0xd9),
    imageWidth: 1200,
    imageHeight: 800,
    pageWidth: 600,
    pageHeight: 400,
  });
  const pdfText = new TextDecoder().decode(pdfBytes);

  assert.match(pdfText, /^%PDF-1\.4/);
  assert.match(pdfText, /\/Type \/Page/);
  assert.match(pdfText, /\/Filter \/DCTDecode/);
  assert.match(pdfText, /\/MediaBox \[0 0 600 400\]/);
});

test("buildReviewBundleText includes review notes, citations, and comparison summary", () => {
  const bundle = buildReviewBundleText(
    {
      name: "EGFR figure",
      brief: "Mechanism figure for review.",
      board: { width: 1600, height: 1200 },
      nodes: [{ citation: "Bioicons: Receptor" }],
      connectors: [{ id: "c-1" }],
      comments: [
        { id: "comment-1", status: "open", author: "Liux", body: "Clarify the inhibitor label." },
        { id: "comment-2", status: "resolved", author: "PI", body: "Legend looks good now." },
      ],
    },
    {
      exportPreset: { title: "Manuscript figure" },
      comparison: {
        narrative: "Compared with the baseline, this figure has 2 changed layers.",
        changedNodes: ["Title"],
        addedNodes: [],
        removedNodes: [],
        changedConnectors: [],
        addedComments: ["Clarify the inhibitor label."],
        resolvedComments: ["Legend looks good now."],
      },
    },
  );

  assert.match(bundle, /# EGFR figure/);
  assert.match(bundle, /Export target: Manuscript figure/);
  assert.match(bundle, /Compared with the baseline/);
  assert.match(bundle, /Clarify the inhibitor label/);
  assert.match(bundle, /Legend looks good now/);
  assert.match(bundle, /Bioicons: Receptor/);
});
