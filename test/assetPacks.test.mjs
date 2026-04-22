import test from "node:test";
import assert from "node:assert/strict";

import {
  createBioiconsCommunityPack,
  createLibraryPackManifest,
  createServierOriginalPack,
  describePackLicenseStrategy,
  flattenAssetPacks,
  parseLibraryPackManifest,
  summarizeLibraryPacks,
  validateAssetPack,
} from "../src/lib/assetPacks.js";

test("createLibraryPackManifest normalizes packs and assets", () => {
  const manifest = createLibraryPackManifest([
    createBioiconsCommunityPack([
      {
        id: "bioicons:cell",
        title: "Cell membrane",
        categoryLabel: "Cells",
        sourceBucket: "bioicons",
        sourceLabel: "Bioicons",
        assetUrl: "https://example.com/cell.svg",
        licenseLabel: "CC BY 4.0",
        citation: "Cell membrane via Bioicons.",
      },
    ]),
  ]);

  assert.equal(manifest.schemaVersion, 1);
  assert.equal("generatedAt" in manifest, false);
  assert.equal(manifest.packs.length, 1);
  assert.equal(manifest.packs[0].assetCount, 1);
  assert.equal(manifest.packs[0].assets[0].packId, "bioicons-community");
  assert.equal(manifest.packs[0].assets[0].packTitle, "Bioicons Community");
  assert.equal(manifest.packs[0].generatedAt, null);
});

test("parseLibraryPackManifest preserves built-in pack metadata and summaries", () => {
  const packs = parseLibraryPackManifest({
    packs: [
      {
        id: "custom-pack",
        title: "Custom pack",
        description: "A community test pack.",
        homepage: "https://example.com",
        licenseStrategy: "per-asset",
        tags: ["custom", "test"],
        assets: [
          {
            title: "Neuron",
            categoryLabel: "Neurology",
            sourceBucket: "bioicons",
            sourceLabel: "Bioicons",
            assetUrl: "https://example.com/neuron.svg",
            licenseLabel: "CC BY 4.0",
            citation: "Neuron via Bioicons.",
          },
        ],
      },
    ],
  });

  assert.equal(packs.length, 1);
  assert.equal(packs[0].status, "ready");
  assert.equal(packs[0].assetCount, 1);
  assert.equal(packs[0].categoriesCount, 1);
  assert.equal(describePackLicenseStrategy(packs[0]), "Per-asset licensing");
});

test("summarizeLibraryPacks counts source buckets across multiple packs", () => {
  const packs = [
    createBioiconsCommunityPack([
      {
        id: "bioicons:cell",
        title: "Cell membrane",
        categoryLabel: "Cells",
        sourceBucket: "bioicons",
        sourceLabel: "Bioicons",
        assetUrl: "https://example.com/cell.svg",
        licenseLabel: "CC BY 4.0",
        citation: "Cell membrane via Bioicons.",
      },
      {
        id: "bioicons:servier",
        title: "Neuron",
        categoryLabel: "Neurology",
        sourceBucket: "servier-vector",
        sourceLabel: "Servier via Bioicons",
        assetUrl: "https://example.com/neuron.svg",
        licenseLabel: "CC BY 4.0",
        citation: "Neuron via Bioicons.",
      },
    ]),
    createServierOriginalPack(
      [
        {
          id: "servier-original:retina",
          title: "Retina",
          categoryLabel: "Ophthalmology",
          sourceBucket: "servier-original",
          sourceLabel: "Servier Original",
          assetType: "png",
          assetUrl: "https://example.com/retina.png",
        },
      ],
      {
        defaultCitation: "Image provided by Servier Medical Art.",
      },
    ),
  ];

  const summary = summarizeLibraryPacks(packs);
  const flattened = flattenAssetPacks(packs);

  assert.equal(summary.packCount, 2);
  assert.equal(summary.readyPackCount, 2);
  assert.equal(summary.totalAssets, 3);
  assert.equal(summary.bioiconsAssets, 1);
  assert.equal(summary.servierVectorAssets, 1);
  assert.equal(summary.servierOriginalAssets, 1);
  assert.equal(flattened.length, 3);
});

test("validateAssetPack catches strategy-dependent metadata gaps", () => {
  const validation = validateAssetPack({
    id: "broken-pack",
    title: "Broken pack",
    version: "1.0.0",
    licenseStrategy: "shared",
    attributionStrategy: "shared",
    assets: [
      {
        title: "Cell",
        categoryLabel: "Cells",
        assetType: "svg",
        assetUrl: "/packs/broken-pack/cell.svg",
      },
    ],
  });

  assert.match(validation.errors.join("\n"), /primaryLicenseLabel/);
  assert.match(validation.errors.join("\n"), /defaultCitation/);
});

test("validateAssetPack accepts a well-formed shared-license community pack", () => {
  const validation = validateAssetPack({
    id: "community-demo",
    title: "Community demo",
    description: "A self-authored demo pack.",
    version: "1.0.0",
    homepage: "https://example.com/community-demo",
    licenseStrategy: "shared",
    attributionStrategy: "shared",
    primaryLicenseLabel: "CC0 1.0",
    defaultCitation: "Community demo pack is released under CC0 1.0.",
    maintainedBy: "HelixCanvas",
    tags: ["example"],
    assets: [
      {
        id: "community-demo:cell",
        title: "Cell",
        categoryLabel: "Cells",
        assetType: "svg",
        assetUrl: "/packs/community-demo/cell.svg",
      },
    ],
  });

  assert.equal(validation.errors.length, 0);
});
