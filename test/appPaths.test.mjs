import test from "node:test";
import assert from "node:assert/strict";
import { applyAppBaseToPacks, normalizeBaseUrl, resolveAppUrl } from "../src/lib/appPaths.js";

test("normalizeBaseUrl keeps root and normalizes subpaths", () => {
  assert.equal(normalizeBaseUrl("/"), "/");
  assert.equal(normalizeBaseUrl("/helixcanvas"), "/helixcanvas/");
  assert.equal(normalizeBaseUrl("helixcanvas"), "/helixcanvas/");
});

test("resolveAppUrl prefixes root-relative local assets with the app base", () => {
  assert.equal(resolveAppUrl("/packs/community-demo/signal-relay.svg", "/helixcanvas/"), "/helixcanvas/packs/community-demo/signal-relay.svg");
  assert.equal(resolveAppUrl("data/library.packs.json", "/helixcanvas/"), "/helixcanvas/data/library.packs.json");
  assert.equal(resolveAppUrl("https://bioicons.com/icon.svg", "/helixcanvas/"), "https://bioicons.com/icon.svg");
});

test("applyAppBaseToPacks rewrites pack asset urls without changing metadata", () => {
  const [pack] = applyAppBaseToPacks(
    [
      {
        id: "community-demo",
        title: "Community demo",
        assets: [
          {
            id: "asset-1",
            title: "Signal relay",
            assetUrl: "/packs/community-demo/signal-relay.svg",
            previewUrl: "/packs/community-demo/signal-relay.svg",
          },
        ],
      },
    ],
    "/helixcanvas/",
  );

  assert.equal(pack.id, "community-demo");
  assert.equal(pack.assets[0].assetUrl, "/helixcanvas/packs/community-demo/signal-relay.svg");
  assert.equal(pack.assets[0].previewUrl, "/helixcanvas/packs/community-demo/signal-relay.svg");
});
