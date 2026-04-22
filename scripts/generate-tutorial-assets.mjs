import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { EXAMPLE_PROJECTS } from "../src/data/exampleProjects.js";
import { collectProjectCitations, projectToSvg } from "../src/lib/exporters.js";
import { createProjectDocument, suggestProjectFilename } from "../src/lib/projectFiles.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const TUTORIAL_DIR = path.join(ROOT_DIR, "docs", "tutorial");

async function writeTextFile(filename, contents) {
  await fs.writeFile(path.join(TUTORIAL_DIR, filename), contents, "utf8");
}

function createTutorialManifestEntry(example) {
  return {
    id: example.id,
    title: example.title,
    problem: example.problem,
    summary: example.summary,
    tags: example.tags,
    artifacts: {
      svg: `${example.id}.svg`,
      project: suggestProjectFilename(example.project.name),
      citations: `${example.id}.citations.txt`,
    },
  };
}

async function main() {
  await fs.mkdir(TUTORIAL_DIR, { recursive: true });

  const manifest = [];

  for (const example of EXAMPLE_PROJECTS) {
    const svg = projectToSvg(example.project);
    const citations = collectProjectCitations(example.project);
    const projectFilename = suggestProjectFilename(example.project.name);
    const projectDocument = JSON.stringify(createProjectDocument(example.project), null, 2);

    await Promise.all([
      writeTextFile(`${example.id}.svg`, svg),
      writeTextFile(`${example.id}.citations.txt`, citations),
      writeTextFile(projectFilename, `${projectDocument}\n`),
    ]);

    manifest.push(createTutorialManifestEntry(example));
  }

  await writeTextFile("tutorial.manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`Generated tutorial assets for ${manifest.length} example projects in ${TUTORIAL_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
