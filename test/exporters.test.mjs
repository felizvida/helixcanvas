import test from "node:test";
import assert from "node:assert/strict";

import {
  buildExportFilename,
  buildPdfFromJpegBytes,
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
