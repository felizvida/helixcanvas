import test from "node:test";
import assert from "node:assert/strict";

import {
  createScientificBuilderScene,
  getScientificBuilderDefaultOptions,
  getScientificBuilderVariant,
  SCIENTIFIC_BUILDER_STYLES,
  SCIENTIFIC_BUILDERS,
} from "../src/lib/scientificBuilders.js";

function createId(prefix) {
  createId.counter += 1;
  return `${prefix}-${createId.counter}`;
}

createId.counter = 0;

test("scientific builders expose the expected insertable scaffolds", () => {
  assert.deepEqual(
    SCIENTIFIC_BUILDERS.map((builder) => builder.id),
    ["membrane-signaling", "cell-compartment", "assay-readout", "timecourse-timeline"],
  );
  assert.equal(SCIENTIFIC_BUILDER_STYLES.length, 3);
});

test("membrane signaling scene includes staged connectors and offset nodes", () => {
  const scene = createScientificBuilderScene("membrane-signaling", {
    createId,
    position: { x: 240, y: 180 },
    palette: {
      accent: "#004466",
      coral: "#cc5533",
    },
  });

  assert.equal(scene.builder.id, "membrane-signaling");
  assert.equal(scene.connectors.length, 3);
  assert.equal(scene.nodes[0].x, 240);
  assert.equal(scene.nodes[0].y, 204);
  assert.equal(scene.nodes.some((node) => node.title === "Plasma membrane band"), true);
  assert.equal(scene.connectors[0].stroke, "#004466");
});

test("cell compartment scene creates linked compartment callouts", () => {
  const scene = createScientificBuilderScene("cell-compartment", {
    createId,
    position: { x: 100, y: 120 },
  });

  const circleNodes = scene.nodes.filter((node) => node.shape === "circle");

  assert.equal(circleNodes.length, 2);
  assert.equal(scene.connectors.length, 3);
  assert.equal(scene.nodes.some((node) => node.text === "Nucleus"), true);
});

test("scientific builders expose default insert options and variant lookup", () => {
  const defaults = getScientificBuilderDefaultOptions("assay-readout");
  const variant = getScientificBuilderVariant("assay-readout", "spatial-profiling");

  assert.equal(defaults.variantId, "perturbation-strip");
  assert.equal(typeof defaults.styleId, "string");
  assert.equal(variant.scaffoldTitle, "Spatial profiling strip");
});

test("assay readout strip creates a multi-step lane with four connectors", () => {
  const scene = createScientificBuilderScene("assay-readout", {
    createId,
    position: { x: 40, y: 60 },
  });

  const stepNodes = scene.nodes.filter((node) => node.title?.endsWith("step"));

  assert.equal(stepNodes.length, 5);
  assert.equal(scene.connectors.length, 4);
  assert.equal(scene.nodes.some((node) => node.text === "CRISPR / drug"), true);
});

test("builder variants and styles change the inserted scaffold labels", () => {
  const scene = createScientificBuilderScene("assay-readout", {
    createId,
    position: { x: 40, y: 60 },
    variantId: "spatial-profiling",
    styleId: "presentation-contrast",
  });

  assert.equal(scene.variant.id, "spatial-profiling");
  assert.equal(scene.stylePreset.id, "presentation-contrast");
  assert.equal(scene.nodes.some((node) => node.text === "Specimen"), true);
  assert.equal(scene.nodes.some((node) => node.text === "Segmentation"), true);
});

test("timecourse timeline creates four timepoints and no extra connectors", () => {
  const scene = createScientificBuilderScene("timecourse-timeline", {
    createId,
    position: { x: 80, y: 90 },
  });

  const timepoints = scene.nodes.filter((node) => node.title?.includes("timepoint"));

  assert.equal(timepoints.length, 4);
  assert.equal(scene.connectors.length, 0);
  assert.equal(scene.nodes.some((node) => node.title === "Timeline baseline"), true);
});
