import test from "node:test";
import assert from "node:assert/strict";

import { STARTER_TEMPLATES } from "../src/data/starterTemplates.js";

test("starter templates cover concrete figure archetypes", () => {
  assert.deepEqual(
    STARTER_TEMPLATES.map((starterTemplate) => starterTemplate.id),
    [
      "oncology-pathway",
      "immunology-perturbation",
      "retinal-microscopy",
      "neuroscience-synapse",
      "host-pathogen-response",
      "blank-workflow",
    ],
  );

  assert.equal(
    STARTER_TEMPLATES.filter((starterTemplate) => Boolean(starterTemplate.presetId)).length >= 5,
    true,
  );
  assert.equal(
    STARTER_TEMPLATES.some((starterTemplate) => starterTemplate.templateId === "workflow-board"),
    true,
  );
});
