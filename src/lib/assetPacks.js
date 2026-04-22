export const LIBRARY_PACK_SCHEMA_VERSION = 1;
export const PACK_LICENSE_STRATEGIES = ["per-asset", "shared", "user-owned"];
export const PACK_ATTRIBUTION_STRATEGIES = ["per-asset", "shared", "manual"];
export const PACK_KINDS = ["built-in", "community", "example"];
export const PACK_ASSET_TYPES = ["svg", "png"];

const PACK_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function lower(value) {
  return String(value ?? "").toLowerCase();
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isLikelyHttpUrl(value) {
  return /^https?:\/\//i.test(String(value ?? ""));
}

function isLikelyDataUrl(value) {
  return /^data:/i.test(String(value ?? ""));
}

function isLikelyLocalPublicUrl(value) {
  return typeof value === "string" && value.startsWith("/");
}

function inferPackLicenseLabel(pack, assets) {
  if (pack.primaryLicenseLabel) {
    return pack.primaryLicenseLabel;
  }

  if (pack.licenseStrategy === "per-asset") {
    return "Mixed / per asset";
  }

  const licenseLabels = uniqueStrings(assets.map((asset) => asset.licenseLabel));
  return licenseLabels[0] ?? "Review pack";
}

function inferPackSourceBucket(pack, assets) {
  return pack.sourceBucket ?? assets[0]?.sourceBucket ?? "community";
}

function inferPackSourceLabel(pack, assets) {
  return pack.sourceLabel ?? assets[0]?.sourceLabel ?? pack.title ?? "Asset pack";
}

export function describePackLicenseStrategy(pack) {
  if (pack.licenseStrategy === "shared") {
    return pack.primaryLicenseLabel || "Shared pack license";
  }

  if (pack.licenseStrategy === "user-owned") {
    return "User-owned / review rights";
  }

  return "Per-asset licensing";
}

function buildNormalizedPackMeta(pack) {
  return {
    id: pack?.id ?? `pack-${slugify(pack?.title || "untitled") || "untitled"}`,
    title: pack?.title ?? "Untitled pack",
    description: pack?.description ?? "",
    version: pack?.version ?? "1.0.0",
    homepage: pack?.homepage ?? "",
    sourceBucket: pack?.sourceBucket,
    sourceLabel: pack?.sourceLabel,
    kind: pack?.kind ?? "built-in",
    provenance: pack?.provenance ?? "open-library",
    licenseStrategy: pack?.licenseStrategy ?? "per-asset",
    attributionStrategy: pack?.attributionStrategy ?? "per-asset",
    primaryLicenseCode: pack?.primaryLicenseCode ?? "",
    primaryLicenseUrl: pack?.primaryLicenseUrl ?? "",
    primaryLicenseLabel: pack?.primaryLicenseLabel ?? "",
    maintainedBy: pack?.maintainedBy ?? "",
    generatedAt: pack?.generatedAt ?? null,
    defaultCitation: pack?.defaultCitation ?? "",
    tags: uniqueStrings(Array.isArray(pack?.tags) ? pack.tags.map(String) : []),
  };
}

function buildNormalizedPackAssets(pack, normalizedMeta) {
  const rawAssets = Array.isArray(pack?.assets) ? pack.assets.filter(isObject) : [];
  return rawAssets.map((asset) => normalizeLibraryAsset(asset, normalizedMeta));
}

export function validateAssetPack(pack) {
  const errors = [];
  const warnings = [];

  if (!pack?.id) {
    errors.push("Missing pack id.");
  } else if (!PACK_ID_PATTERN.test(pack.id)) {
    errors.push("Pack id must use lowercase letters, numbers, and hyphens only.");
  }

  if (!pack?.title) {
    errors.push("Missing pack title.");
  }

  if (!Array.isArray(pack?.assets)) {
    errors.push("Pack assets must be an array.");
  }

  const normalizedMeta = buildNormalizedPackMeta(pack);
  const assets = buildNormalizedPackAssets(pack, normalizedMeta);

  if (!assets.length) {
    errors.push("Pack must include at least one asset.");
  }

  if (!normalizedMeta.description) {
    warnings.push("Pack description is missing.");
  }

  if (!normalizedMeta.homepage) {
    warnings.push("Pack homepage is missing.");
  } else if (!isLikelyHttpUrl(normalizedMeta.homepage)) {
    errors.push("Pack homepage must be an http(s) URL.");
  }

  if (!SEMVER_PATTERN.test(normalizedMeta.version)) {
    warnings.push("Pack version should follow semantic versioning like 1.0.0.");
  }

  if (!PACK_LICENSE_STRATEGIES.includes(normalizedMeta.licenseStrategy)) {
    errors.push(
      `Pack licenseStrategy must be one of: ${PACK_LICENSE_STRATEGIES.join(", ")}.`,
    );
  }

  if (!PACK_ATTRIBUTION_STRATEGIES.includes(normalizedMeta.attributionStrategy)) {
    errors.push(
      `Pack attributionStrategy must be one of: ${PACK_ATTRIBUTION_STRATEGIES.join(", ")}.`,
    );
  }

  if (!PACK_KINDS.includes(normalizedMeta.kind)) {
    warnings.push(`Pack kind "${normalizedMeta.kind}" is non-standard.`);
  }

  if (!normalizedMeta.maintainedBy) {
    warnings.push("Pack maintainedBy is missing.");
  }

  if (!normalizedMeta.tags.length) {
    warnings.push("Pack tags are missing.");
  }

  if (normalizedMeta.licenseStrategy === "shared" && !normalizedMeta.primaryLicenseLabel) {
    errors.push("Shared-license packs must declare primaryLicenseLabel.");
  }

  if (normalizedMeta.attributionStrategy === "shared" && !normalizedMeta.defaultCitation) {
    errors.push("Shared-attribution packs must declare defaultCitation.");
  }

  const seenAssetIds = new Set();

  assets.forEach((asset, index) => {
    const assetLabel = asset.title || asset.id || `asset ${index + 1}`;

    if (!asset.title) {
      errors.push(`Asset ${index + 1} is missing a title.`);
    }

    if (!asset.category && !asset.categoryLabel) {
      errors.push(`Asset "${assetLabel}" is missing a category or categoryLabel.`);
    }

    if (!PACK_ASSET_TYPES.includes(asset.assetType)) {
      errors.push(
        `Asset "${assetLabel}" must use one of: ${PACK_ASSET_TYPES.join(", ")}.`,
      );
    }

    if (!asset.assetUrl) {
      errors.push(`Asset "${assetLabel}" is missing assetUrl.`);
    } else if (
      !isLikelyHttpUrl(asset.assetUrl) &&
      !isLikelyDataUrl(asset.assetUrl) &&
      !isLikelyLocalPublicUrl(asset.assetUrl)
    ) {
      errors.push(
        `Asset "${assetLabel}" assetUrl must be an http(s), data, or /public URL.`,
      );
    }

    if (
      asset.previewUrl &&
      !isLikelyHttpUrl(asset.previewUrl) &&
      !isLikelyDataUrl(asset.previewUrl) &&
      !isLikelyLocalPublicUrl(asset.previewUrl)
    ) {
      errors.push(
        `Asset "${assetLabel}" previewUrl must be an http(s), data, or /public URL.`,
      );
    }

    if (!asset.sourcePage && !normalizedMeta.homepage) {
      warnings.push(`Asset "${assetLabel}" is missing sourcePage and the pack has no homepage.`);
    }

    if (normalizedMeta.licenseStrategy === "per-asset" && !asset.licenseLabel) {
      errors.push(`Asset "${assetLabel}" must declare licenseLabel for per-asset licensing.`);
    }

    if (normalizedMeta.attributionStrategy === "per-asset" && !asset.citation) {
      errors.push(`Asset "${assetLabel}" must declare citation for per-asset attribution.`);
    }

    if (seenAssetIds.has(asset.id)) {
      errors.push(`Duplicate asset id "${asset.id}" found in pack.`);
    }

    seenAssetIds.add(asset.id);
  });

  return {
    normalizedMeta,
    assets,
    errors,
    warnings,
  };
}

export function normalizeLibraryAsset(asset, pack) {
  const title = asset.title ?? "Untitled asset";
  const slug = asset.slug ?? slugify(title ?? asset.id) ?? "";
  const fallbackSlug = slug || slugify(asset.id) || "asset";
  const categoryLabel = asset.categoryLabel ?? asset.category ?? "Uncategorized";
  const sourceBucket = asset.sourceBucket ?? pack.sourceBucket ?? "community";
  const sourceLabel = asset.sourceLabel ?? pack.sourceLabel ?? pack.title ?? "Asset pack";
  const originLabel = asset.originLabel ?? asset.author ?? pack.title ?? "Unknown";
  const licenseLabel = asset.licenseLabel ?? pack.primaryLicenseLabel ?? "";
  const searchText = lower(
    asset.searchText ??
      [title, categoryLabel, originLabel, sourceLabel, licenseLabel, pack.title]
        .filter(Boolean)
        .join(" "),
  );

  return {
    ...asset,
    id: asset.id ?? `${pack.id}:${fallbackSlug}`,
    title,
    slug: fallbackSlug,
    searchText,
    category: asset.category ?? categoryLabel,
    categoryLabel,
    author: asset.author ?? originLabel,
    authorUrl: asset.authorUrl ?? "",
    sourceBucket,
    sourceLabel,
    originLabel,
    assetType: asset.assetType ?? "svg",
    assetUrl: asset.assetUrl ?? "",
    previewUrl: asset.previewUrl ?? asset.assetUrl ?? "",
    sourcePage: asset.sourcePage ?? pack.homepage ?? "",
    licenseCode: asset.licenseCode ?? pack.primaryLicenseCode ?? "",
    licenseLabel,
    licenseUrl: asset.licenseUrl ?? pack.primaryLicenseUrl ?? "",
    citation: asset.citation ?? pack.defaultCitation ?? "",
    packId: pack.id,
    packTitle: pack.title,
    packVersion: pack.version ?? "1.0.0",
    packKind: pack.kind ?? "built-in",
    packHomepage: pack.homepage ?? "",
  };
}

export function normalizeAssetPack(pack) {
  const { normalizedMeta, assets, errors, warnings } = validateAssetPack(pack);
  const categoriesCount = new Set(assets.map((asset) => asset.categoryLabel)).size;
  const issues = [...errors, ...warnings];

  const normalizedPack = {
    ...normalizedMeta,
    sourceBucket: inferPackSourceBucket(normalizedMeta, assets),
    sourceLabel: inferPackSourceLabel(normalizedMeta, assets),
    primaryLicenseLabel: inferPackLicenseLabel(normalizedMeta, assets),
    status: errors.length ? "needs-review" : "ready",
    validation: {
      errors,
      warnings,
    },
    issues,
    assetCount: assets.length,
    categoriesCount,
    assets,
  };

  return normalizedPack;
}

export function parseLibraryPackManifest(payload) {
  const rawPacks = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.packs)
      ? payload.packs
      : [];

  return rawPacks
    .filter(isObject)
    .map((pack) => normalizeAssetPack(pack))
    .filter((pack) => pack.assetCount || pack.issues.length);
}

export function flattenAssetPacks(packs) {
  return packs.flatMap((pack) => pack.assets);
}

export function summarizeLibraryPacks(packs) {
  const assets = flattenAssetPacks(packs);

  return {
    schemaVersion: LIBRARY_PACK_SCHEMA_VERSION,
    packCount: packs.length,
    readyPackCount: packs.filter((pack) => (pack.validation?.errors ?? []).length === 0).length,
    issuePackCount: packs.filter((pack) => (pack.validation?.errors ?? []).length > 0).length,
    warningPackCount: packs.filter((pack) => (pack.validation?.warnings ?? []).length > 0).length,
    totalAssets: assets.length,
    bioiconsAssets: assets.filter((asset) => asset.sourceBucket === "bioicons").length,
    servierVectorAssets: assets.filter((asset) => asset.sourceBucket === "servier-vector").length,
    servierOriginalAssets: assets.filter((asset) => asset.sourceBucket === "servier-original").length,
    figurelabsImports: assets.filter((asset) => asset.sourceBucket === "figurelabs-import").length,
    categories: new Set(assets.map((asset) => asset.categoryLabel)).size,
  };
}

export function createLibraryPackManifest(packs, { generatedAt = new Date().toISOString() } = {}) {
  const normalizedPacks = packs.map((pack) => normalizeAssetPack(pack));

  return {
    schemaVersion: LIBRARY_PACK_SCHEMA_VERSION,
    generatedAt,
    stats: summarizeLibraryPacks(normalizedPacks),
    packs: normalizedPacks,
  };
}

export function createBioiconsCommunityPack(assets, { generatedAt = new Date().toISOString() } = {}) {
  return normalizeAssetPack({
    id: "bioicons-community",
    title: "Bioicons Community",
    description:
      "Open biomedical SVG library mirrored from Bioicons with per-asset licensing and attribution preserved.",
    version: "1.0.0",
    homepage: "https://bioicons.com/",
    sourceBucket: "bioicons",
    sourceLabel: "Bioicons",
    kind: "built-in",
    provenance: "open-library",
    licenseStrategy: "per-asset",
    attributionStrategy: "per-asset",
    maintainedBy: "HelixCanvas",
    generatedAt,
    tags: ["open", "svg", "biomedical", "community"],
    assets,
  });
}

export function createServierOriginalPack(
  assets,
  {
    licenseCode = "",
    licenseLabel = "CC BY 4.0",
    licenseUrl = "",
    defaultCitation = "",
    generatedAt = new Date().toISOString(),
  } = {},
) {
  return normalizeAssetPack({
    id: "servier-originals",
    title: "Servier Medical Art Originals",
    description:
      "Official Servier Medical Art raster examples curated alongside the editor with a shared attribution requirement.",
    version: "1.0.0",
    homepage: "https://smart.servier.com/",
    sourceBucket: "servier-original",
    sourceLabel: "Servier Original",
    kind: "built-in",
    provenance: "official-source",
    licenseStrategy: "shared",
    attributionStrategy: "shared",
    primaryLicenseCode: licenseCode,
    primaryLicenseLabel: licenseLabel,
    primaryLicenseUrl: licenseUrl,
    defaultCitation,
    maintainedBy: "HelixCanvas",
    generatedAt,
    tags: ["official", "medical-art", "png", "servier"],
    assets,
  });
}
