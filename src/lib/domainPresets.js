import { createFigureFlowDefaultAnswers, createFigureFlowProject, FIGURE_FLOWS } from "./figureFlows.js";
import { applyFigureTheme, FIGURE_THEMES } from "./figureThemes.js";
import { createScientificBuilderScene, SCIENTIFIC_BUILDERS } from "./scientificBuilders.js";

export const DOMAIN_PRESETS = [
  {
    id: "oncology-mechanism-board",
    title: "Oncology mechanism board",
    description:
      "A receptor-signaling figure with a membrane scaffold and a clean editorial palette for pathway-centric oncology stories.",
    flowId: "signaling-pathway",
    themeId: "journal-sage",
    builderPlacements: [
      {
        builderId: "membrane-signaling",
        variantId: "cascade",
        styleId: "journal-clean",
        position: { x: 812, y: 126 },
      },
    ],
    answerOverrides: {
      title: "EGFR to ERK signaling in NSCLC",
      context: "NSCLC epithelial tumor cells",
      trigger: "EGF engages EGFR at the plasma membrane",
      relay: "RAS -> RAF -> MEK -> ERK cascade",
      outcome: "MYC and CCND1 transcription with proliferation bias",
      intervention: "EGFR inhibitor reduces downstream ERK signaling",
    },
  },
  {
    id: "immunology-perturbation-board",
    title: "Immunology perturbation board",
    description:
      "A workflow-first figure with assay and timecourse scaffolds for cytokine-response and CRISPR perturbation studies.",
    flowId: "methods-workflow",
    themeId: "clinical-coral",
    builderPlacements: [
      {
        builderId: "assay-readout",
        variantId: "perturbation-strip",
        styleId: "presentation-contrast",
        position: { x: 86, y: 610 },
      },
      {
        builderId: "timecourse-timeline",
        variantId: "pulse-chase",
        styleId: "journal-clean",
        position: { x: 700, y: 614 },
      },
    ],
    answerOverrides: {
      title: "RELA perturbation workflow in macrophages",
      question: "Does RELA perturbation blunt NF-kappaB signaling after TNF-alpha stimulation?",
      model: "THP-1-derived macrophages",
      perturbation: "CRISPR Cas9 knockout or inhibitor perturbation of RELA",
      stimulus: "TNF-alpha pulse followed by timed harvest",
      readouts: "Western blot, confocal imaging, cytokine output",
      takeaway: "RELA loss weakens p65 pathway activity and suppresses inflammatory output",
    },
  },
  {
    id: "retinal-microscopy-board",
    title: "Retinal microscopy board",
    description:
      "A microscopy comparison preset with tissue-centric styling and a compartment scaffold for pathology storytelling.",
    flowId: "microscopy-comparison",
    themeId: "retina-dawn",
    builderPlacements: [
      {
        builderId: "cell-compartment",
        variantId: "gene-regulation",
        styleId: "journal-clean",
        position: { x: 804, y: 406 },
      },
    ],
    answerOverrides: {
      title: "Complement deposition in retinal degeneration",
      specimen: "Retinal sections from degeneration-model mouse eye",
      comparison: "Control retina, lesion core, rescue treatment, lesion edge zoom",
      markers: "C3, IBA1, Hoechst",
      scaleBar: "100 um",
      observation: "Complement tagging and microglial recruitment intensify near the outer retinal lesion edge",
    },
  },
  {
    id: "neuroscience-synapse-board",
    title: "Neuroscience synapse board",
    description:
      "A synaptic mechanism board with paired-interface signaling and a recovery timeline for stimulation-response stories.",
    flowId: "signaling-pathway",
    themeId: "atlas-slate",
    builderPlacements: [
      {
        builderId: "membrane-signaling",
        variantId: "cell-interface",
        styleId: "notebook-slate",
        position: { x: 804, y: 126 },
      },
      {
        builderId: "timecourse-timeline",
        variantId: "recovery-window",
        styleId: "notebook-slate",
        position: { x: 770, y: 620 },
      },
    ],
    answerOverrides: {
      title: "Synaptic calcium-to-CREB response in cortical neurons",
      context: "Cortical excitatory neurons after patterned stimulation",
      trigger: "Glutamatergic synaptic input activates NMDA receptors",
      relay: "Calcium influx -> CaMKIV -> CREB signaling",
      outcome: "Immediate early gene expression with spine remodeling",
      intervention: "NMDA receptor blockade blunts CREB activation",
    },
  },
  {
    id: "host-pathogen-response-board",
    title: "Host-pathogen response board",
    description:
      "A tissue-infection workflow with spatial profiling and trafficking-focused callouts for microscopy-heavy immunology stories.",
    flowId: "methods-workflow",
    themeId: "atlas-slate",
    builderPlacements: [
      {
        builderId: "assay-readout",
        variantId: "spatial-profiling",
        styleId: "presentation-contrast",
        position: { x: 82, y: 610 },
      },
      {
        builderId: "cell-compartment",
        variantId: "trafficking-map",
        styleId: "journal-clean",
        position: { x: 808, y: 382 },
      },
    ],
    answerOverrides: {
      title: "Host-pathogen response profiling after airway infection",
      question: "How does epithelial infection reshape trafficking and immune output across the tissue?",
      model: "Primary airway epithelial cultures with immune-cell coculture",
      perturbation: "Viral infection with inhibitor rescue arm",
      stimulus: "Timed fixation across acute and recovery windows",
      readouts: "Spatial imaging, cytokine profiling, segmentation metrics",
      takeaway: "Infection rewires trafficking and amplifies inflammatory hotspots before recovery",
    },
  },
];

function getFlowOrThrow(flowId) {
  const flow = FIGURE_FLOWS.find((item) => item.id === flowId);

  if (!flow) {
    throw new Error(`Unknown preset flow: ${flowId}`);
  }

  return flow;
}

function getThemeOrThrow(themeId) {
  const theme = FIGURE_THEMES.find((item) => item.id === themeId);

  if (!theme) {
    throw new Error(`Unknown preset theme: ${themeId}`);
  }

  return theme;
}

function getBuilderOrThrow(builderId) {
  const builder = SCIENTIFIC_BUILDERS.find((item) => item.id === builderId);

  if (!builder) {
    throw new Error(`Unknown preset builder: ${builderId}`);
  }

  return builder;
}

export function createDomainPresetProject(presetIdOrPreset, options = {}) {
  const preset =
    typeof presetIdOrPreset === "object" && presetIdOrPreset?.id
      ? presetIdOrPreset
      : DOMAIN_PRESETS.find((item) => item.id === presetIdOrPreset);

  if (!preset) {
    throw new Error(`Unknown domain preset: ${presetIdOrPreset}`);
  }

  const flow = getFlowOrThrow(preset.flowId);
  const answers = {
    ...createFigureFlowDefaultAnswers(flow),
    ...(preset.answerOverrides ?? {}),
    ...(options.answerOverrides ?? {}),
  };
  const flowResult = createFigureFlowProject(flow, answers, {
    library: options.library ?? [],
    createId: options.createId,
    now: options.now,
  });
  const theme = getThemeOrThrow(preset.themeId);
  const builderScenes = (preset.builderPlacements ?? []).map((placement) => {
    const builder = getBuilderOrThrow(placement.builderId);
    return createScientificBuilderScene(builder, {
      createId: options.createId,
      palette: flowResult.project.palette,
      position: placement.position,
      styleId: placement.styleId,
      variantId: placement.variantId,
    });
  });
  const combinedProject = {
    ...flowResult.project,
    nodes: [...flowResult.project.nodes, ...builderScenes.flatMap((scene) => scene.nodes)],
    connectors: [...flowResult.project.connectors, ...builderScenes.flatMap((scene) => scene.connectors)],
  };
  const themedProject = applyFigureTheme(combinedProject, theme);
  const builderFocus = builderScenes.map((scene) => scene.builder.focusQuery).join(" ");

  return {
    ...flowResult,
    preset,
    flow,
    theme,
    answers,
    project: themedProject,
    libraryQuery: [flowResult.libraryQuery, builderFocus].filter(Boolean).join(" ").trim(),
    nextStep: `Preset ready. ${preset.description}`,
  };
}
