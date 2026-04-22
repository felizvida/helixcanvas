import fs from "node:fs";
import path from "node:path";

import { createBioiconsCommunityPack, createLibraryPackManifest } from "../src/lib/assetPacks.js";
import { loadPackDirectory } from "./lib/packFiles.mjs";

const LICENSES = {
  bsd: {
    label: "BSD 3-Clause",
    url: "https://opensource.org/licenses/BSD-3-Clause",
  },
  "cc-0": {
    label: "CC0 1.0",
    url: "https://creativecommons.org/publicdomain/zero/1.0/",
  },
  "cc-by-3.0": {
    label: "CC BY 3.0",
    url: "https://creativecommons.org/licenses/by/3.0/",
  },
  "cc-by-4.0": {
    label: "CC BY 4.0",
    url: "https://creativecommons.org/licenses/by/4.0/",
  },
  "cc-by-sa-3.0": {
    label: "CC BY-SA 3.0",
    url: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
  "cc-by-sa-4.0": {
    label: "CC BY-SA 4.0",
    url: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  mit: {
    label: "MIT",
    url: "https://mit-license.org/",
  },
};

function walk(dir) {
  const entries = [];

  for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, dirent.name);

    if (dirent.isDirectory()) {
      entries.push(...walk(fullPath));
      continue;
    }

    if (dirent.isFile() && dirent.name.endsWith(".svg")) {
      entries.push(fullPath);
    }
  }

  return entries;
}

function titleCase(value) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (segment) => segment.toUpperCase());
}

const bioiconsDir = process.env.BIOICONS_DIR || process.argv[2];
const outputDir = path.join(process.cwd(), "public", "data");
const packsDir = path.join(process.cwd(), "packs");
const cachedLibraryPath = path.join(outputDir, "bioicons.library.json");
const iconsRoot = bioiconsDir ? path.join(bioiconsDir, "static", "icons") : "";
const authorsPath = iconsRoot ? path.join(iconsRoot, "authors.json") : "";
const hasBioiconsCheckout = Boolean(iconsRoot) && fs.existsSync(iconsRoot);
const authors = hasBioiconsCheckout && fs.existsSync(authorsPath)
  ? JSON.parse(fs.readFileSync(authorsPath, "utf8"))
  : {};
let items = [];

if (hasBioiconsCheckout) {
  items = walk(iconsRoot).map((fullPath) => {
    const relativePath = path.relative(iconsRoot, fullPath).split(path.sep).join("/");
    const parts = relativePath.split("/");
    const licenseCode = parts[0];
    const categoryCode = parts[1];
    const filename = parts.at(-1);
    const authorDir = parts.length === 4 ? parts[2] : "Bioicons";
    const name = filename.replace(/\.svg$/i, "");
    const authorLabel = authorDir.replaceAll("_", " ");
    const license = LICENSES[licenseCode] ?? {
      label: licenseCode,
      url: "",
    };
    const isServier = authorLabel === "Servier" || authorLabel === "ModifiedFrom Servier";
    const categoryLabel = titleCase(categoryCode);

    return {
      id: `bioicons:${licenseCode}:${categoryCode}:${authorDir}:${name}`,
      title: titleCase(name),
      slug: name,
      searchText: `${name} ${categoryLabel} ${authorLabel} ${license.label}`.toLowerCase(),
      category: categoryCode,
      categoryLabel,
      author: authorLabel,
      authorUrl: authors[authorLabel] ?? "",
      sourceBucket: isServier ? "servier-vector" : "bioicons",
      sourceLabel: isServier ? "Servier via Bioicons" : "Bioicons",
      originLabel: authorLabel,
      assetType: "svg",
      assetUrl: `https://raw.githubusercontent.com/duerrsimon/bioicons/main/static/icons/${relativePath}`,
      previewUrl: `https://raw.githubusercontent.com/duerrsimon/bioicons/main/static/icons/${relativePath}`,
      sourcePage: "https://bioicons.com/",
      licenseCode,
      licenseLabel: license.label,
      licenseUrl: license.url,
      citation: `${titleCase(name)} by ${authorLabel} via Bioicons is licensed under ${license.label}${
        license.url ? ` (${license.url})` : ""
      }.`,
    };
  });
} else if (fs.existsSync(cachedLibraryPath)) {
  items = JSON.parse(fs.readFileSync(cachedLibraryPath, "utf8"));
  console.warn(
    `Bioicons checkout not found${
      bioiconsDir ? ` at ${iconsRoot}` : ""
    }. Reusing cached manifest at ${cachedLibraryPath}.`,
  );
} else {
  console.error(
    "Missing Bioicons checkout and no cached manifest available. Pass BIOICONS_DIR or add public/data/bioicons.library.json.",
  );
  process.exit(1);
}

items.sort((left, right) => {
  if (left.sourceBucket !== right.sourceBucket) {
    return left.sourceBucket.localeCompare(right.sourceBucket);
  }

  if (left.categoryLabel !== right.categoryLabel) {
    return left.categoryLabel.localeCompare(right.categoryLabel);
  }

  return left.title.localeCompare(right.title);
});

const stats = {
  totalAssets: items.length,
  bioiconsAssets: items.filter((item) => item.sourceBucket === "bioicons").length,
  servierVectorAssets: items.filter((item) => item.sourceBucket === "servier-vector").length,
  categories: [...new Set(items.map((item) => item.categoryLabel))].length,
};

const discoveredPacks = loadPackDirectory(packsDir);
const fileBasedPacks = discoveredPacks.filter((pack) => pack.status === "ready");
const invalidPacks = discoveredPacks.filter((pack) => pack.status !== "ready");

if (invalidPacks.length) {
  invalidPacks.forEach((pack) => {
    for (const error of pack.validation?.errors ?? []) {
      console.error(`${pack.sourceFile}: ${error}`);
    }
  });
  process.exit(1);
}

const libraryManifest = createLibraryPackManifest(
  [createBioiconsCommunityPack(items), ...fileBasedPacks],
);

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
  path.join(outputDir, "bioicons.library.json"),
  JSON.stringify(items, null, 2),
);
fs.writeFileSync(
  path.join(outputDir, "bioicons.stats.json"),
  JSON.stringify(stats, null, 2),
);
fs.writeFileSync(
  path.join(outputDir, "library.packs.json"),
  JSON.stringify(libraryManifest, null, 2),
);
fs.writeFileSync(
  path.join(outputDir, "library.stats.json"),
  JSON.stringify(libraryManifest.stats, null, 2),
);

console.log(
  `Wrote ${items.length} Bioicons records to ${path.join(outputDir, "bioicons.library.json")}`,
);
console.log(
  `Wrote ${libraryManifest.packs.length} library packs to ${path.join(outputDir, "library.packs.json")}`,
);
