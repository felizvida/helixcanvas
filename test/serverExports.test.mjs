import test from "node:test";
import assert from "node:assert/strict";
import { createHelixCanvasApp, startHelixCanvasServer } from "../server/index.mjs";

test("server module exports a configurable express app factory", () => {
  const app = createHelixCanvasApp();

  assert.equal(typeof createHelixCanvasApp, "function");
  assert.equal(typeof startHelixCanvasServer, "function");
  assert.equal(typeof app.use, "function");
  assert.equal(typeof app.listen, "function");
});
