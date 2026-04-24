function assetNode(asset, x, y, w, h, extra = {}) {
  return {
    type: "asset",
    ...asset,
    x,
    y,
    w,
    h,
    ...extra,
  };
}

function cardNode(text, x, y, w, h, fill, stroke, color = "#12232e") {
  return {
    type: "shape",
    shape: "card",
    text,
    fill,
    stroke,
    color,
    x,
    y,
    w,
    h,
  };
}

function textNode(text, x, y, w, options = {}) {
  return {
    type: "text",
    text,
    x,
    y,
    w,
    fontSize: options.fontSize ?? 16,
    fontWeight: options.fontWeight ?? 500,
    color: options.color ?? "#4d5d68",
  };
}

function connector(from, to, stroke, strokeWidth = 4) {
  return {
    from,
    to,
    stroke,
    strokeWidth,
  };
}

const SHARED_ASSETS = {
  cellComplete: {
    title: "Cell complete",
    assetUrl:
      "https://raw.githubusercontent.com/duerrsimon/bioicons/main/static/icons/cc-by-3.0/Intracellular_components/Servier/cell-complete.svg",
    sourceLabel: "Servier via Bioicons",
    citation:
      "cell-complete by Servier via Bioicons is licensed under CC BY 3.0.",
  },
  protein: {
    title: "Protein",
    assetUrl: "https://smart.servier.com/wp-content/uploads/2016/10/protein_01.png",
    sourceLabel: "Servier Original",
    citation:
      "Image provided by Servier Medical Art (https://smart.servier.com/), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).",
  },
  receptor: {
    title: "Simple Receptor",
    assetUrl:
      "https://raw.githubusercontent.com/duerrsimon/bioicons/main/static/icons/cc-by-sa-4.0/Receptors_channels/Helicase_11/simple_receptor.svg",
    sourceLabel: "Bioicons",
    citation:
      "Simple Receptor by Helicase 11 via Bioicons is licensed under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/).",
  },
  nucleus: {
    title: "Nucleus",
    assetUrl:
      "https://raw.githubusercontent.com/duerrsimon/bioicons/main/static/icons/cc-by-3.0/Intracellular_components/Servier/nucleus.svg",
    sourceLabel: "Servier via Bioicons",
    citation:
      "Nucleus by Servier via Bioicons is licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/).",
  },
  dna: {
    title: "DNA Symbolic Extending",
    assetUrl:
      "https://raw.githubusercontent.com/duerrsimon/bioicons/main/static/icons/cc-0/Genetics/David-Eccles--gringer-/DNA_symbolic_extending.svg",
    sourceLabel: "Bioicons",
    citation:
      "DNA Symbolic Extending by David-Eccles--gringer- via Bioicons is licensed under CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/).",
  },
  crispr: {
    title: "CRISPR Cas9",
    assetUrl:
      "https://raw.githubusercontent.com/duerrsimon/bioicons/main/static/icons/cc-0/Genetics/Marcel_Tisch/CRISPR_Cas9.svg",
    sourceLabel: "Bioicons",
    citation:
      "CRISPR Cas9 by Marcel Tisch via Bioicons is licensed under CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/).",
  },
  macrophage: {
    title: "Macrophage",
    assetUrl:
      "https://raw.githubusercontent.com/duerrsimon/bioicons/main/static/icons/cc-by-3.0/Blood_Immunology/Servier/macrophage.svg",
    sourceLabel: "Servier via Bioicons",
    citation:
      "Macrophage by Servier via Bioicons is licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/).",
  },
  westernBlot: {
    title: "Western Blotting",
    assetUrl:
      "https://raw.githubusercontent.com/duerrsimon/bioicons/main/static/icons/cc-by-4.0/General_items/Pooja/western_blotting.svg",
    sourceLabel: "Bioicons",
    citation:
      "Western Blotting by Pooja via Bioicons is licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).",
  },
  confocal: {
    title: "Confocal Scanning Laser Microscope CSLM",
    assetUrl:
      "https://raw.githubusercontent.com/duerrsimon/bioicons/main/static/icons/cc-by-4.0/Lab_apparatus/DBCLS/confocal-scanning-laser-microscope-CSLM.svg",
    sourceLabel: "Bioicons",
    citation:
      "Confocal Scanning Laser Microscope CSLM by DBCLS via Bioicons is licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).",
  },
  retina: {
    title: "Retina",
    assetUrl:
      "https://raw.githubusercontent.com/duerrsimon/bioicons/main/static/icons/cc-by-3.0/Human_physiology/Servier/retina.svg",
    sourceLabel: "Servier via Bioicons",
    citation:
      "Retina by Servier via Bioicons is licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/).",
  },
  retinaCell: {
    title: "Retina Cell",
    assetUrl:
      "https://raw.githubusercontent.com/duerrsimon/bioicons/main/static/icons/cc-by-3.0/Human_physiology/Servier/retina-cell.svg",
    sourceLabel: "Servier via Bioicons",
    citation:
      "Retina Cell by Servier via Bioicons is licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/).",
  },
  neuron: {
    title: "Neuron",
    assetUrl:
      "https://raw.githubusercontent.com/duerrsimon/bioicons/main/static/icons/cc-by-4.0/Cell_culture/DBCLS/neuron.svg",
    sourceLabel: "Bioicons",
    citation:
      "Neuron by DBCLS via Bioicons is licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).",
  },
  antibody: {
    title: "Antibody",
    assetUrl:
      "https://raw.githubusercontent.com/duerrsimon/bioicons/main/static/icons/cc-by-3.0/Blood_Immunology/Servier/antibody.svg",
    sourceLabel: "Servier via Bioicons",
    citation:
      "Antibody by Servier via Bioicons is licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/).",
  },
};

export const EXAMPLE_PROJECTS = [
  {
    id: "egfr-mapk-nsclc",
    title: "EGFR to ERK signaling in NSCLC",
    problem:
      "Create a mechanism figure showing ligand-triggered EGFR signaling, ERK nuclear translocation, and immediate early transcription in non-small-cell lung cancer.",
    summary:
      "A ready-to-edit mechanistic schematic for receptor signaling, gene expression, and growth output.",
    brief:
      "Illustrate EGFR activation in NSCLC with ligand binding, RAS-RAF-MEK-ERK relay, nuclear transcription, and downstream MYC/Cyclin D1 output.",
    tags: ["Signaling", "Oncology", "Mechanism"],
    project: {
      name: "EGFR to ERK signaling in NSCLC",
      brief:
        "EGFR activation drives the RAS-RAF-MEK-ERK cascade and immediate early transcription in epithelial tumor cells.",
      board: {
        width: 1400,
        height: 900,
        background: "#f6f1e8",
      },
      palette: {
        background: "#f6f1e8",
        accent: "#0f766e",
        accentSoft: "#d8f0ee",
        ink: "#12232e",
        coral: "#ea8060",
        olive: "#90a85f",
      },
      nodes: [
        textNode("EGFR to ERK signaling in NSCLC", 94, 62, 900, {
          fontSize: 34,
          fontWeight: 700,
          color: "#12232e",
        }),
        textNode(
          "Use this as a fast starting point for pathway figures, drug-response schematics, or graphical abstracts.",
          94,
          116,
          720,
        ),
        assetNode(SHARED_ASSETS.cellComplete, 86, 160, 360, 360),
        assetNode(SHARED_ASSETS.receptor, 300, 232, 76, 190),
        assetNode(
          {
            ...SHARED_ASSETS.protein,
            title: "EGF ligand",
          },
          470,
          232,
          124,
          96,
        ),
        assetNode(SHARED_ASSETS.nucleus, 178, 288, 140, 140),
        assetNode(SHARED_ASSETS.dna, 270, 286, 136, 148),
        cardNode("EGF binds EGFR", 436, 166, 190, 60, "#d8f0ee", "#0f766e"),
        cardNode("RAS -> RAF -> MEK", 680, 214, 216, 60, "#eef5df", "#90a85f"),
        cardNode("ERK phosphorylation", 680, 320, 216, 60, "#d8f0ee", "#0f766e"),
        cardNode("Nuclear entry", 944, 260, 184, 60, "#fde1d6", "#ea8060"),
        cardNode("MYC / CCND1 induction", 1168, 260, 184, 60, "#f7ead6", "#b9853e"),
        textNode("Membrane receptor", 274, 436, 138, {
          fontSize: 14,
          fontWeight: 700,
          color: "#3f5561",
        }),
        textNode("Immediate-early transcription", 176, 448, 220, {
          fontSize: 14,
          fontWeight: 700,
          color: "#3f5561",
        }),
        textNode(
          "Editing exercise: relabel the output card for your own gene set, then add a second receptor or drug inhibitor above the membrane.",
          94,
          612,
          760,
        ),
        cardNode("Proliferation bias", 1086, 406, 198, 60, "#fde1d6", "#ea8060"),
        cardNode("Adaptive resistance notes", 860, 520, 258, 60, "#f2efe8", "#b7a999"),
      ],
      connectors: [
        connector({ x: 594, y: 264 }, { x: 678, y: 244 }, "#0f766e"),
        connector({ x: 896, y: 244 }, { x: 944, y: 290 }, "#90a85f"),
        connector({ x: 1128, y: 290 }, { x: 1168, y: 290 }, "#ea8060"),
        connector({ x: 1040, y: 320 }, { x: 1040, y: 404 }, "#ea8060"),
        connector({ x: 790, y: 350 }, { x: 320, y: 352 }, "#0f766e"),
      ],
    },
  },
  {
    id: "rela-crispr-macrophage",
    title: "RELA CRISPR knockout workflow",
    problem:
      "Lay out a methods figure for a macrophage perturbation experiment testing whether RELA knockout suppresses TNF-alpha-induced NF-kappaB signaling.",
    summary:
      "A methods-first figure with perturbation, stimulation, and orthogonal readouts already composed.",
    brief:
      "Show a CRISPR Cas9 workflow in macrophages with RELA knockout, TNF-alpha stimulation, western blotting, and confocal imaging readouts.",
    tags: ["Workflow", "CRISPR", "Immunology"],
    project: {
      name: "RELA CRISPR knockout workflow",
      brief:
        "CRISPR perturbation workflow for testing NF-kappaB pathway suppression after TNF-alpha stimulation in macrophages.",
      board: {
        width: 1400,
        height: 900,
        background: "#f8f5ef",
      },
      palette: {
        background: "#f8f5ef",
        accent: "#155e75",
        accentSoft: "#d2edf5",
        ink: "#1f2933",
        coral: "#e76f51",
        olive: "#7a8f3d",
      },
      nodes: [
        textNode("RELA CRISPR knockout workflow", 94, 62, 900, {
          fontSize: 34,
          fontWeight: 700,
          color: "#1f2933",
        }),
        textNode(
          "Real biological problem: test whether RELA loss dampens TNF-alpha-driven NF-kappaB activation in macrophages.",
          94,
          116,
          760,
        ),
        cardNode("1. Design sgRNA", 92, 176, 210, 70, "#d2edf5", "#155e75", "#1f2933"),
        cardNode("2. Deliver Cas9 + select", 372, 176, 232, 70, "#edf4de", "#7a8f3d", "#1f2933"),
        cardNode("3. Stimulate with TNF-alpha", 684, 176, 244, 70, "#fae0d7", "#e76f51", "#1f2933"),
        cardNode("4. Quantify pathway output", 1004, 176, 256, 70, "#efe7ff", "#7c6eb0", "#1f2933"),
        assetNode(SHARED_ASSETS.dna, 110, 312, 160, 152),
        assetNode(SHARED_ASSETS.crispr, 338, 338, 220, 132),
        assetNode(SHARED_ASSETS.macrophage, 622, 298, 178, 178),
        assetNode(SHARED_ASSETS.westernBlot, 980, 320, 180, 140),
        assetNode(SHARED_ASSETS.confocal, 1168, 276, 166, 220),
        textNode("Target RELA exon", 128, 480, 124, {
          fontSize: 14,
          fontWeight: 700,
          color: "#415361",
        }),
        textNode("Lentiviral delivery or ribonucleoprotein", 314, 490, 260, {
          fontSize: 14,
          fontWeight: 700,
          color: "#415361",
        }),
        textNode("TNF-alpha 10 ng/mL for 4 h", 624, 492, 194, {
          fontSize: 14,
          fontWeight: 700,
          color: "#415361",
        }),
        textNode("p65 / IKBalpha immunoblot", 966, 476, 190, {
          fontSize: 14,
          fontWeight: 700,
          color: "#415361",
        }),
        textNode("Nuclear localization imaging", 1142, 514, 194, {
          fontSize: 14,
          fontWeight: 700,
          color: "#415361",
        }),
        cardNode("Expected result: reduced phospho-p65 and IL6", 870, 604, 356, 62, "#dff1eb", "#159570", "#1f2933"),
        textNode(
          "Editing exercise: duplicate the last card to add qPCR, ELISA, or single-cell RNA-seq as a fifth readout.",
          94,
          742,
          760,
        ),
      ],
      connectors: [
        connector({ x: 302, y: 212 }, { x: 372, y: 212 }, "#155e75"),
        connector({ x: 604, y: 212 }, { x: 684, y: 212 }, "#7a8f3d"),
        connector({ x: 928, y: 212 }, { x: 1004, y: 212 }, "#e76f51"),
        connector({ x: 474, y: 404 }, { x: 622, y: 392 }, "#7a8f3d"),
        connector({ x: 800, y: 390 }, { x: 980, y: 390 }, "#e76f51"),
        connector({ x: 1160, y: 390 }, { x: 1168, y: 390 }, "#7c6eb0"),
      ],
    },
  },
  {
    id: "retinal-complement-degeneration",
    title: "Complement deposition in retinal degeneration",
    problem:
      "Build a pathology figure for retinal degeneration that highlights complement tagging, photoreceptor stress, and recruitment of phagocytic cells.",
    summary:
      "A disease-overview composition for retina papers, lecture slides, or grant schematics.",
    brief:
      "Illustrate complement deposition in retinal degeneration with a retina overview, photoreceptor stress, antibody-like complement tagging, and phagocyte recruitment.",
    tags: ["Neurobiology", "Retina", "Pathology"],
    project: {
      name: "Complement deposition in retinal degeneration",
      brief:
        "Retinal degeneration figure connecting tissue-level anatomy, photoreceptor stress, complement tagging, and phagocyte recruitment.",
      board: {
        width: 1400,
        height: 900,
        background: "#f6f1eb",
      },
      palette: {
        background: "#f6f1eb",
        accent: "#0e7490",
        accentSoft: "#d6edf2",
        ink: "#16212c",
        coral: "#e07a5f",
        olive: "#9ab87a",
      },
      nodes: [
        textNode("Complement deposition in retinal degeneration", 94, 62, 960, {
          fontSize: 34,
          fontWeight: 700,
          color: "#16212c",
        }),
        textNode(
          "Real biological problem: connect local tissue anatomy to photoreceptor stress, complement tagging, and inflammatory cell recruitment.",
          94,
          116,
          780,
        ),
        assetNode(SHARED_ASSETS.retina, 84, 168, 360, 470),
        assetNode(SHARED_ASSETS.retinaCell, 530, 226, 144, 188),
        assetNode(SHARED_ASSETS.antibody, 736, 238, 124, 160),
        assetNode(SHARED_ASSETS.macrophage, 946, 360, 194, 194),
        assetNode(SHARED_ASSETS.neuron, 1160, 232, 134, 176),
        cardNode("Photoreceptor stress", 496, 170, 214, 60, "#d6edf2", "#0e7490", "#16212c"),
        cardNode("Complement tagging", 716, 170, 214, 60, "#fce0d9", "#e07a5f", "#16212c"),
        cardNode("Phagocyte recruitment", 940, 286, 226, 60, "#edf4de", "#9ab87a", "#16212c"),
        cardNode("Synaptic dysfunction", 1140, 170, 190, 60, "#f5ead7", "#bf8d45", "#16212c"),
        cardNode("Retinal thinning over time", 1040, 596, 240, 60, "#f4efe8", "#b5a79a", "#16212c"),
        textNode("Lamina and lesion overview", 160, 654, 206, {
          fontSize: 14,
          fontWeight: 700,
          color: "#4d5d68",
        }),
        textNode(
          "Editing exercise: replace the antibody asset with cytokine or microglia-specific icons if your story is inflammation-first instead of complement-first.",
          94,
          742,
          820,
        ),
      ],
      connectors: [
        connector({ x: 444, y: 360 }, { x: 530, y: 320 }, "#0e7490"),
        connector({ x: 674, y: 318 }, { x: 736, y: 318 }, "#e07a5f"),
        connector({ x: 860, y: 318 }, { x: 946, y: 402 }, "#9ab87a"),
        connector({ x: 1140, y: 408 }, { x: 1160, y: 318 }, "#bf8d45"),
        connector({ x: 1040, y: 626 }, { x: 430, y: 626 }, "#b5a79a"),
      ],
    },
  },
];
