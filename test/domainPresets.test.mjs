import test from "node:test";
import assert from "node:assert/strict";

import { createDomainPresetProject, DOMAIN_PRESETS } from "../src/lib/domainPresets.js";

function createId(prefix) {
  createId.counter += 1;
  return `${prefix}-${createId.counter}`;
}

createId.counter = 0;

test("domain presets expose the shipped one-click starting points", () => {
  assert.deepEqual(
    DOMAIN_PRESETS.map((preset) => preset.id),
    [
      "oncology-mechanism-board",
      "immunology-perturbation-board",
      "retinal-microscopy-board",
      "neuroscience-synapse-board",
      "host-pathogen-response-board",
    ],
  );
});

test("createDomainPresetProject composes the flow, builders, and theme", () => {
  const result = createDomainPresetProject("immunology-perturbation-board", {
    createId,
    library: [],
    now: "2026-04-23T12:00:00.000Z",
  });

  assert.equal(result.preset.id, "immunology-perturbation-board");
  assert.equal(result.theme.id, "clinical-coral");
  assert.equal(result.project.palette.themeId, "clinical-coral");
  assert.equal(result.project.nodes.some((node) => node.title === "Assay strip title"), true);
  assert.equal(result.project.nodes.some((node) => node.title === "Timeline title"), true);
  assert.equal(result.libraryQuery.includes("workflow"), true);
});

test("domain presets can compose builder variants into a themed project", () => {
  const result = createDomainPresetProject("host-pathogen-response-board", {
    createId,
    library: [],
    now: "2026-04-23T12:00:00.000Z",
  });

  assert.equal(result.preset.id, "host-pathogen-response-board");
  assert.equal(result.theme.id, "atlas-slate");
  assert.equal(result.project.nodes.some((node) => node.text === "Specimen"), true);
  assert.equal(result.project.nodes.some((node) => node.text === "Membrane docking"), true);
});
