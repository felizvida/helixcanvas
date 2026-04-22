import path from "node:path";

import { collectPackFiles, loadPackDirectory, loadPackFile } from "./lib/packFiles.mjs";

const workspaceRoot = process.cwd();
const inputPaths = process.argv.slice(2);
const targets = inputPaths.length ? inputPaths : [path.join(workspaceRoot, "packs")];

const loadedPacks = [];
const failures = [];

for (const target of targets) {
  const absoluteTarget = path.isAbsolute(target) ? target : path.join(workspaceRoot, target);

  try {
    const packFiles = collectPackFiles(absoluteTarget);

    if (packFiles.length) {
      loadedPacks.push(...loadPackDirectory(absoluteTarget, { workspaceRoot }));
      continue;
    }

    loadedPacks.push(loadPackFile(absoluteTarget, { workspaceRoot }));
  } catch (error) {
    failures.push(error instanceof Error ? error.message : `Failed to validate ${target}.`);
  }
}

for (const pack of loadedPacks) {
  console.log(`${pack.id} (${pack.sourceFile})`);
  console.log(`  status: ${pack.status}`);
  console.log(`  assets: ${pack.assetCount}`);
  console.log(`  warnings: ${(pack.validation?.warnings ?? []).length}`);
  console.log(`  errors: ${(pack.validation?.errors ?? []).length}`);

  for (const warning of pack.validation?.warnings ?? []) {
    console.log(`  warning: ${warning}`);
  }

  for (const error of pack.validation?.errors ?? []) {
    console.log(`  error: ${error}`);
  }

  if ((pack.validation?.errors ?? []).length > 0) {
    failures.push(`${pack.id} has validation errors.`);
  }
}

if (!loadedPacks.length && !failures.length) {
  console.log("No asset pack files found.");
}

if (failures.length) {
  console.error("\nAsset pack validation failed.");

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log(`\nValidated ${loadedPacks.length} asset pack file(s) successfully.`);
