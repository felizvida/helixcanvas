import fs from "node:fs";
import path from "node:path";

import { normalizeAssetPack } from "../../src/lib/assetPacks.js";

function walkPackFiles(dir) {
  const entries = [];

  for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, dirent.name);

    if (dirent.isDirectory()) {
      entries.push(...walkPackFiles(fullPath));
      continue;
    }

    if (dirent.isFile() && dirent.name.endsWith(".pack.json")) {
      entries.push(fullPath);
    }
  }

  return entries.sort((left, right) => left.localeCompare(right));
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown JSON parse failure.";
    throw new Error(`Could not parse ${filePath}: ${reason}`);
  }
}

function mergePackValidation(pack, { errors = [], warnings = [] } = {}) {
  const mergedErrors = [...(pack.validation?.errors ?? []), ...errors];
  const mergedWarnings = [...(pack.validation?.warnings ?? []), ...warnings];

  return {
    ...pack,
    status: mergedErrors.length ? "needs-review" : "ready",
    validation: {
      errors: mergedErrors,
      warnings: mergedWarnings,
    },
    issues: [...mergedErrors, ...mergedWarnings],
  };
}

function validatePublicAssetReference(filePath, field, url, workspaceRoot) {
  if (!url?.startsWith("/")) {
    return [];
  }

  const publicPath = path.join(workspaceRoot, "public", url.replace(/^\//, ""));

  if (fs.existsSync(publicPath)) {
    return [];
  }

  return [`${filePath}: ${field} points to a missing public file: ${url}`];
}

export function collectPackFiles(packRoot) {
  if (!fs.existsSync(packRoot)) {
    return [];
  }

  return walkPackFiles(packRoot);
}

export function loadPackFile(filePath, { workspaceRoot = process.cwd() } = {}) {
  const rawPack = readJson(filePath);
  const normalizedPack = normalizeAssetPack(rawPack);
  const fileErrors = [];
  const fileWarnings = [];

  if (path.basename(filePath) !== `${normalizedPack.id}.pack.json`) {
    fileWarnings.push(
      `${filePath}: filename should usually match the pack id as ${normalizedPack.id}.pack.json.`,
    );
  }

  normalizedPack.assets.forEach((asset) => {
    fileErrors.push(
      ...validatePublicAssetReference(filePath, "assetUrl", asset.assetUrl, workspaceRoot),
    );
    fileErrors.push(
      ...validatePublicAssetReference(filePath, "previewUrl", asset.previewUrl, workspaceRoot),
    );
  });

  return mergePackValidation(
    {
      ...normalizedPack,
      sourceFile: path.relative(workspaceRoot, filePath),
    },
    {
      errors: fileErrors,
      warnings: fileWarnings,
    },
  );
}

export function loadPackDirectory(packRoot, { workspaceRoot = process.cwd() } = {}) {
  return collectPackFiles(packRoot).map((filePath) =>
    loadPackFile(filePath, { workspaceRoot }),
  );
}
