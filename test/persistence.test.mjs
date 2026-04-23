import test from "node:test";
import assert from "node:assert/strict";
import {
  isQuotaExceededError,
  readStoredJson,
  readStoredJsonEntry,
  safeRemoveStoredValue,
  safeWriteStoredJson,
} from "../src/lib/persistence.js";

function createMemoryStorage(overrides = {}) {
  const values = new Map();

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      if (overrides.setItem) {
        return overrides.setItem(key, value);
      }

      values.set(key, value);
    },
    removeItem(key) {
      if (overrides.removeItem) {
        return overrides.removeItem(key);
      }

      values.delete(key);
    },
  };
}

test("readStoredJson and readStoredJsonEntry handle missing and valid values", () => {
  const storage = createMemoryStorage();
  storage.setItem("project", JSON.stringify({ name: "HelixCanvas" }));

  assert.deepEqual(readStoredJson(storage, "project", {}), { name: "HelixCanvas" });
  assert.deepEqual(readStoredJson(storage, "missing", { ok: true }), { ok: true });
  assert.deepEqual(readStoredJsonEntry(storage, "project"), {
    found: true,
    value: { name: "HelixCanvas" },
    error: null,
  });
});

test("safeWriteStoredJson reports quota failures instead of throwing", () => {
  const storage = createMemoryStorage({
    setItem() {
      throw new DOMException("quota", "QuotaExceededError");
    },
  });

  const result = safeWriteStoredJson(storage, "project", { name: "Too large" });
  assert.equal(result.ok, false);
  assert.equal(result.quotaExceeded, true);
  assert.equal(isQuotaExceededError(result.error), true);
});

test("safeRemoveStoredValue returns a non-throwing result", () => {
  const storage = createMemoryStorage();
  storage.setItem("project", JSON.stringify({ name: "HelixCanvas" }));

  const result = safeRemoveStoredValue(storage, "project");
  assert.equal(result.ok, true);
  assert.equal(storage.getItem("project"), null);
});
