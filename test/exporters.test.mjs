import test from "node:test";
import assert from "node:assert/strict";

import { collectProjectCitations, projectToSvg } from "../src/lib/exporters.js";

test("collectProjectCitations deduplicates repeated citations", () => {
  const citations = collectProjectCitations({
    nodes: [
      { citation: "Bioicons: Cell" },
      { citation: "Servier: Neuron" },
      { citation: "Bioicons: Cell" },
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
      },
    ],
    nodes: [
      {
        type: "text",
        x: 40,
        y: 80,
        text: "Signal & response",
        fontSize: 20,
        color: "#12232e",
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
    ],
  });

  assert.match(svg, /Signal &amp; response/);
  assert.match(svg, /Panel &lt;A&gt;/);
  assert.match(svg, /<image[^>]+https:\/\/example.com\/cell\.svg/);
  assert.match(svg, /marker-end="url\(#arrowhead\)"/);
});
