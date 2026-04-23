import test from "node:test";
import assert from "node:assert/strict";

import {
  FIGURE_FLOWS,
  composeFigureFlowBrief,
  createFigureFlowDefaultAnswers,
  createFigureFlowProject,
} from "../src/lib/figureFlows.js";

function createDeterministicIdFactory() {
  let value = 0;
  return (prefix) => `${prefix}-${String(value++).padStart(3, "0")}`;
}

test("createFigureFlowDefaultAnswers returns the configured defaults", () => {
  const answers = createFigureFlowDefaultAnswers("signaling-pathway");

  assert.equal(answers.title, "EGFR to ERK signaling in NSCLC");
  assert.equal(answers.intervention, "EGFR inhibitor dampens signaling before ERK activation");
});

test("composeFigureFlowBrief produces a structured pathway prompt", () => {
  const brief = composeFigureFlowBrief("signaling-pathway", {
    title: "JAK STAT signaling",
    context: "myeloid leukemia",
    trigger: "IL6 engages IL6R",
    relay: "JAK -> STAT3",
    outcome: "survival transcription program",
    intervention: "JAK inhibitor reduces STAT3 activation",
  });

  assert.match(brief, /JAK STAT signaling/);
  assert.match(brief, /IL6 engages IL6R/);
  assert.match(brief, /JAK inhibitor reduces STAT3 activation/);
});

test("createFigureFlowProject matches preferred assets for pathway figures", () => {
  const library = [
    {
      id: "bioicons-receptor",
      title: "Membrane receptor",
      assetUrl: "https://example.com/receptor.svg",
      sourceBucket: "bioicons",
      sourceLabel: "Bioicons",
      assetType: "svg",
      searchText: "receptor kinase egfr membrane receptor",
      categoryLabel: "Receptors",
    },
    {
      id: "bioicons-cell",
      title: "Cell membrane",
      assetUrl: "https://example.com/cell.svg",
      sourceBucket: "bioicons",
      sourceLabel: "Bioicons",
      assetType: "svg",
      searchText: "cell membrane epithelial cell",
      categoryLabel: "Cells",
    },
    {
      id: "bioicons-nucleus",
      title: "Nucleus",
      assetUrl: "https://example.com/nucleus.svg",
      sourceBucket: "bioicons",
      sourceLabel: "Bioicons",
      assetType: "svg",
      searchText: "nucleus transcription dna",
      categoryLabel: "Organelles",
    },
  ];

  const result = createFigureFlowProject(
    "signaling-pathway",
    {
      title: "EGFR signaling",
      context: "epithelial tumor cells",
      trigger: "EGF binds EGFR",
      relay: "RAS RAF MEK ERK cascade",
      outcome: "MYC induction",
      intervention: "EGFR inhibitor attenuates ERK activation",
    },
    {
      library,
      createId: createDeterministicIdFactory(),
      now: "2026-04-23T12:00:00.000Z",
    },
  );

  assert.equal(result.flowId, "signaling-pathway");
  assert.equal(result.project.name, "EGFR signaling");
  assert.equal(result.project.connectors.length, 5);
  assert.ok(result.matchedAssets.some((match) => match.role === "Receptor"));
  assert.ok(result.project.nodes.some((node) => node.type === "asset" && node.assetId === "bioicons-receptor"));
  assert.equal(result.project.updatedAt, "2026-04-23T12:00:00.000Z");
});

test("microscopy flow creates four labeled panels and a scale bar", () => {
  const result = createFigureFlowProject(
    "microscopy-comparison",
    {
      title: "Retinal complement microscopy",
      specimen: "retinal sections",
      comparison: "Control, Disease, Rescue, Edge zoom",
      markers: "C3, IBA1, Hoechst",
      scaleBar: "50 um",
      observation: "Complement tagging intensifies at the lesion edge",
    },
    {
      library: [],
      createId: createDeterministicIdFactory(),
      now: "2026-04-23T12:00:00.000Z",
    },
  );

  const panelFrames = result.project.nodes.filter((node) => node.role === "panel-frame");
  const panelLabels = result.project.nodes.filter((node) => node.role === "panel-label");
  const scaleLabel = result.project.nodes.find((node) => node.title === "Scale label");

  assert.equal(panelFrames.length, 4);
  assert.equal(panelLabels.length, 4);
  assert.equal(scaleLabel?.text, "50 um");
});

test("the shipped figure flows cover pathway, workflow, and microscopy builders", () => {
  assert.deepEqual(
    FIGURE_FLOWS.map((flow) => flow.id),
    ["signaling-pathway", "methods-workflow", "microscopy-comparison"],
  );
});
