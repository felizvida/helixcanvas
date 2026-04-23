import test from "node:test";
import assert from "node:assert/strict";

import { applyExportPreset, EXPORT_PRESETS, getExportPreset } from "../src/lib/exportPresets.js";

test("export presets expose manuscript, slides, and poster targets", () => {
  assert.deepEqual(
    EXPORT_PRESETS.map((preset) => preset.id),
    ["custom", "manuscript", "slides", "poster"],
  );
});

test("applyExportPreset updates the board size for the chosen target", () => {
  const project = {
    board: {
      width: 1400,
      height: 900,
      background: "#f7f2ea",
    },
  };

  const next = applyExportPreset(project, "slides");

  assert.equal(next.board.width, 1920);
  assert.equal(next.board.height, 1080);
  assert.equal(getExportPreset("poster").board.width, 2400);
});
