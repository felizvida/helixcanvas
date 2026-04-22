export const DOMAIN_STARTER_KITS = [
  {
    id: "oncology-signaling",
    title: "Oncology signaling",
    description: "Mechanism-first starter for receptor signaling, pathway relays, and phenotype outputs.",
    templateId: "signal-cascade",
    exampleId: "egfr-mapk-nsclc",
    focusQuery: "receptor kinase pathway nucleus transcription",
    preferredSourceBucket: "bioicons",
    brief:
      "Create an oncology signaling figure with receptor activation, intracellular relay, nuclear response, and a druggable intervention point.",
    tags: ["Oncology", "Mechanism"],
  },
  {
    id: "immunology-workflow",
    title: "Immunology workflow",
    description: "Starter for perturbation studies, stimulation-response experiments, and assay readouts in immune cells.",
    templateId: "workflow-board",
    exampleId: "rela-crispr-macrophage",
    focusQuery: "macrophage cytokine crispr western blot confocal",
    preferredSourceBucket: "servier-vector",
    brief:
      "Build an immunology workflow figure with perturbation, stimulation, orthogonal readouts, and interpretation blocks.",
    tags: ["Immunology", "Workflow"],
  },
  {
    id: "neuroscience-pathology",
    title: "Neuroscience pathology",
    description: "Starter for retinal, neuronal, or tissue-overview figures that connect anatomy to mechanism.",
    templateId: "anatomy-focus",
    exampleId: "retinal-complement-degeneration",
    focusQuery: "retina neuron microglia complement pathology",
    preferredSourceBucket: "bioicons",
    brief:
      "Create a neuroscience pathology figure that connects tissue anatomy, cellular stress, immune tagging, and downstream degeneration.",
    tags: ["Neuroscience", "Pathology"],
  },
  {
    id: "microscopy-comparison",
    title: "Microscopy comparison",
    description: "Starter for image panels, legends, scale bars, and concise observational callouts.",
    templateId: "anatomy-focus",
    exampleId: "",
    focusQuery: "microscope microscopy confocal staining image cell",
    preferredSourceBucket: "bioicons",
    brief:
      "Build a microscopy comparison figure with panel labels, legends, scale bars, and compact interpretive annotations.",
    tags: ["Microscopy", "Panels"],
  },
];
