import test from "node:test";
import assert from "node:assert/strict";

import {
  createProjectDocument,
  parseProjectDocument,
  suggestProjectFilename,
} from "../src/lib/projectFiles.js";

const SAMPLE_PROJECT = {
  id: "project-1",
  name: "Signal Cascade",
  brief: "Example",
  board: {
    width: 1200,
    height: 800,
    background: "#fff",
  },
  nodes: [],
  connectors: [],
  updatedAt: "2026-04-21T00:00:00.000Z",
};

test("suggestProjectFilename creates a stable helixcanvas filename", () => {
  assert.equal(
    suggestProjectFilename("Signal Cascade Figure"),
    "signal-cascade-figure.helixcanvas.json",
  );
});

test("createProjectDocument wraps the project in a versioned file envelope", () => {
  const document = createProjectDocument(SAMPLE_PROJECT);

  assert.equal(document.format, "helixcanvas-project");
  assert.equal(document.version, 1);
  assert.deepEqual(document.project, SAMPLE_PROJECT);
});

test("parseProjectDocument accepts wrapped HelixCanvas project files", () => {
  const text = JSON.stringify(createProjectDocument(SAMPLE_PROJECT));
  const parsed = parseProjectDocument(text);

  assert.deepEqual(parsed.project, SAMPLE_PROJECT);
  assert.equal(parsed.meta.format, "helixcanvas-project");
});

test("parseProjectDocument accepts legacy raw project json", () => {
  const parsed = parseProjectDocument(JSON.stringify(SAMPLE_PROJECT));

  assert.deepEqual(parsed.project, SAMPLE_PROJECT);
  assert.equal(parsed.meta.format, "raw-json");
});

test("parseProjectDocument rejects invalid payloads", () => {
  assert.throws(
    () => parseProjectDocument(JSON.stringify({ hello: "world" })),
    /HelixCanvas project/,
  );
});
