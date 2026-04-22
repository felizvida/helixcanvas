import test from "node:test";
import assert from "node:assert/strict";

import { EXAMPLE_PROJECTS } from "../src/data/exampleProjects.js";

test("example projects expose unique ids and complete project shapes", () => {
  const ids = new Set();

  for (const example of EXAMPLE_PROJECTS) {
    assert.ok(example.id);
    assert.equal(ids.has(example.id), false);
    ids.add(example.id);

    assert.ok(example.title);
    assert.ok(example.problem);
    assert.ok(example.brief);
    assert.ok(Array.isArray(example.tags));
    assert.ok(example.tags.length > 0);
    assert.ok(example.project);
    assert.ok(example.project.name);
    assert.ok(Array.isArray(example.project.nodes));
    assert.ok(Array.isArray(example.project.connectors));
    assert.ok(example.project.nodes.length > 0);
  }
});

test("example projects keep citations attached to illustration assets", () => {
  for (const example of EXAMPLE_PROJECTS) {
    const assets = example.project.nodes.filter((node) => node.type === "asset");
    assert.ok(assets.length > 0);

    for (const asset of assets) {
      assert.ok(asset.assetUrl);
      assert.ok(asset.sourceLabel);
      assert.ok(asset.citation);
    }
  }
});
