import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAiSuggestions,
  expandSearchTerms,
  getSearchMatchScore,
  isDuplicateImportedAsset,
  matchesAssetSearchQuery,
  pushRecentAsset,
  sortLibraryAssets,
  toggleFavoriteAssetId,
} from "../src/lib/assets.js";

test("toggleFavoriteAssetId adds and removes asset ids", () => {
  const added = toggleFavoriteAssetId(["bioicons-cell"], "servier-neuron");
  assert.deepEqual(added, ["servier-neuron", "bioicons-cell"]);

  const removed = toggleFavoriteAssetId(added, "servier-neuron");
  assert.deepEqual(removed, ["bioicons-cell"]);
});

test("pushRecentAsset deduplicates and keeps most recent items first", () => {
  const updated = pushRecentAsset(["asset-a", "asset-b", "asset-c"], "asset-b", 3);
  assert.deepEqual(updated, ["asset-b", "asset-a", "asset-c"]);
});

test("isDuplicateImportedAsset catches matching urls and fallback title/type collisions", () => {
  const assets = [
    {
      title: "cell membrane",
      assetType: "svg",
      assetUrl: "https://cdn.example.com/cell.svg",
    },
  ];

  assert.equal(
    isDuplicateImportedAsset(assets, {
      title: "different",
      assetType: "svg",
      assetUrl: "https://cdn.example.com/cell.svg",
    }),
    true,
  );

  assert.equal(
    isDuplicateImportedAsset(assets, {
      title: "cell membrane",
      assetType: "svg",
      assetUrl: "data:image/svg+xml;base64,abc",
    }),
    true,
  );
});

test("buildAiSuggestions favors preferred sources and strong text matches", () => {
  const suggestions = [
    {
      query: "cell membrane",
      rationale: "Show the membrane context.",
      preferredSourceBucket: "servier-vector",
    },
  ];
  const library = [
    {
      id: "bioicons-cell",
      title: "Cell membrane",
      searchText: "cell membrane plasma",
      categoryLabel: "Cells",
      sourceLabel: "Bioicons",
      sourceBucket: "bioicons",
    },
    {
      id: "servier-cell",
      title: "Cell membrane",
      searchText: "cell membrane plasma",
      categoryLabel: "Cells",
      sourceLabel: "Servier",
      sourceBucket: "servier-vector",
    },
  ];

  const result = buildAiSuggestions(suggestions, library);

  assert.equal(result[0].matches[0].id, "servier-cell");
});

test("sortLibraryAssets respects favorites, recents, and alphabetical fallbacks", () => {
  const assets = [
    { id: "c", title: "Cell" },
    { id: "a", title: "Actin" },
    { id: "b", title: "Blood" },
  ];

  const favoritesFirst = sortLibraryAssets(assets, {
    sortMode: "favorites",
    favoriteAssetIds: ["b"],
    recentAssetIds: [],
    usedAssetIds: [],
  });
  assert.deepEqual(
    favoritesFirst.map((asset) => asset.id),
    ["b", "a", "c"],
  );

  const recentFirst = sortLibraryAssets(assets, {
    sortMode: "recent",
    favoriteAssetIds: [],
    recentAssetIds: ["c", "a"],
    usedAssetIds: [],
  });
  assert.deepEqual(
    recentFirst.map((asset) => asset.id),
    ["c", "a", "b"],
  );

  const alphabetical = sortLibraryAssets(assets, {
    sortMode: "alphabetical",
    favoriteAssetIds: ["c"],
    recentAssetIds: ["b"],
    usedAssetIds: ["a"],
  });
  assert.deepEqual(
    alphabetical.map((asset) => asset.id),
    ["a", "b", "c"],
  );
});

test("expandSearchTerms adds useful aliases for domain queries", () => {
  const terms = expandSearchTerms("macrophage microscopy");

  assert.equal(terms.includes("monocyte"), true);
  assert.equal(terms.includes("confocal"), true);
  assert.equal(terms.includes("imaging"), true);
});

test("matchesAssetSearchQuery uses semantic aliases instead of literal matches only", () => {
  const asset = {
    id: "confocal-scope",
    title: "Confocal scanning microscope",
    searchText: "laser imaging microscope",
    categoryLabel: "Lab apparatus",
    packTitle: "Microscopy kit",
  };

  assert.equal(matchesAssetSearchQuery(asset, "microscopy"), true);
  assert.ok(getSearchMatchScore(asset, "microscopy") >= 10);
});
