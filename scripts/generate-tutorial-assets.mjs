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
const LOCAL_APP_URL = "http://127.0.0.1:4173";
const TUTORIAL_EXPORTED_AT = "2026-04-24T00:00:00.000Z";

const TUTORIAL_GUIDE = {
  "egfr-mapk-nsclc": {
    level: "Beginner to intermediate",
    directUrl: `${LOCAL_APP_URL}/?example=egfr-mapk-nsclc&focus=workspace`,
    learningGoals: [
      "Trace a receptor-to-nucleus signaling story on a single board.",
      "Inspect Bioicons and Servier-derived provenance on placed assets.",
      "Revise labels and cards without breaking citation output.",
      "Extend a mechanism figure with inhibitor or treatment-state comparisons.",
    ],
    suggestedExercise:
      "Duplicate the receptor region to compare ligand-only and inhibitor-treated conditions, then relabel the downstream readout.",
    aiImagePrompt:
      "A clean vector-style inset showing EGFR receptors clustered on a cancer cell membrane with a subtle MAPK relay motif, no fake data, no watermark.",
  },
  "rela-crispr-macrophage": {
    level: "Intermediate",
    directUrl: `${LOCAL_APP_URL}/?example=rela-crispr-macrophage&focus=workspace`,
    learningGoals: [
      "Convert a wet-lab plan into a left-to-right workflow figure.",
      "Balance model system, perturbation, stimulation, and readouts.",
      "Use panel layouts, reusable components, and snapshots during revision.",
      "Export a methods-ready figure with a separate attribution bundle.",
    ],
    suggestedExercise:
      "Add qPCR, ELISA, or single-cell RNA-seq as a third readout lane and compare the layout before and after with a snapshot.",
    aiImagePrompt:
      "A publication-style macrophage perturbation workflow backdrop with CRISPR knockout, TNF-alpha stimulation, and two assay readout zones, no fake charts.",
  },
  "retinal-complement-degeneration": {
    level: "Intermediate to teaching use",
    directUrl: `${LOCAL_APP_URL}/?example=retinal-complement-degeneration&focus=workspace`,
    learningGoals: [
      "Connect tissue anatomy, cellular stress, immune tagging, and degeneration over time.",
      "Use color and callouts to separate biological processes.",
      "Adapt a disease-overview figure for papers, lectures, grants, or lab meetings.",
      "Review generated or imported content separately from open-library assets.",
    ],
    suggestedExercise:
      "Replace complement tagging with a cytokine or microglia-specific mechanism and retitle the lower card for a timecourse or treatment arm.",
    aiImagePrompt:
      "A microscopy-inspired retinal degeneration panel with photoreceptor stress and complement deposition cues, dark-field fluorescent style, no fake scale bar.",
  },
};

async function writeTextFile(filename, contents) {
  await fs.writeFile(path.join(TUTORIAL_DIR, filename), contents, "utf8");
}

function createTutorialManifestEntry(example) {
  const guide = TUTORIAL_GUIDE[example.id] ?? {};

  return {
    id: example.id,
    title: example.title,
    problem: example.problem,
    summary: example.summary,
    tags: example.tags,
    level: guide.level ?? "",
    directUrl: guide.directUrl ?? `${LOCAL_APP_URL}/?example=${example.id}&focus=workspace`,
    learningGoals: guide.learningGoals ?? [],
    suggestedExercise: guide.suggestedExercise ?? "",
    aiImagePrompt: guide.aiImagePrompt ?? "",
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
    const projectDocument = createProjectDocument(example.project);
    projectDocument.exportedAt = TUTORIAL_EXPORTED_AT;

    await Promise.all([
      writeTextFile(`${example.id}.svg`, svg),
      writeTextFile(`${example.id}.citations.txt`, citations),
      writeTextFile(projectFilename, `${JSON.stringify(projectDocument, null, 2)}\n`),
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
