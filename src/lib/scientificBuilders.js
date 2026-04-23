const DEFAULT_PALETTE = {
  accent: "#0f766e",
  accentSoft: "#d8f0ee",
  ink: "#12232e",
  coral: "#ea8060",
  olive: "#90a85f",
  gold: "#b9853e",
  muted: "#51606d",
};

export const SCIENTIFIC_BUILDER_STYLES = [
  {
    id: "journal-clean",
    title: "Journal clean",
    description: "Soft editorial contrast with restrained note text for publication-style figures.",
    palette: {},
    titleFontSize: 24,
    noteFontSize: 15,
    cardStrokeWidth: 2,
    connectorWidth: 4,
  },
  {
    id: "presentation-contrast",
    title: "Presentation contrast",
    description: "Bolder fills, larger labels, and heavier strokes for teaching slides and talks.",
    palette: {
      accentSoft: "#cfeef2",
      coral: "#d96546",
      gold: "#c18f39",
      muted: "#44525c",
    },
    titleFontSize: 26,
    noteFontSize: 16,
    cardStrokeWidth: 3,
    connectorWidth: 5,
  },
  {
    id: "notebook-slate",
    title: "Notebook slate",
    description: "Cooler slate tones and compact helper copy for denser analytic workspaces.",
    palette: {
      accent: "#24576a",
      accentSoft: "#d8e8ef",
      coral: "#c96f5c",
      olive: "#6f8c63",
      gold: "#a98843",
      muted: "#5a6670",
    },
    titleFontSize: 24,
    noteFontSize: 14,
    cardStrokeWidth: 2,
    connectorWidth: 4,
  },
];

export const SCIENTIFIC_BUILDERS = [
  {
    id: "membrane-signaling",
    title: "Membrane signaling lane",
    description:
      "A receptor-ready membrane scaffold with extracellular, membrane, cytoplasmic, and phenotype stages.",
    summary: "Best for pathway figures, ligand-triggered signaling, and intervention annotations.",
    focusQuery: "receptor membrane ligand kinase pathway nucleus inhibitor",
    preferredSourceBucket: "bioicons",
    tags: ["Membrane", "Pathway"],
    defaultVariantId: "cascade",
    variants: [
      {
        id: "cascade",
        title: "Cascade",
        description: "Classic ligand-to-phenotype mechanism with receptor, relay, and phenotype blocks.",
        focusQuery: "receptor membrane ligand kinase pathway nucleus inhibitor",
        scaffoldTitle: "Membrane signaling",
        extracellularLabel: "Extracellular space",
        ligandLabel: "Ligand cue",
        receptorLabel: "Receptor",
        relayLabel: "Relay",
        phenotypeLabel: "Phenotype",
        helperNote: "Drop assets on top of the receptor, membrane, or output blocks.",
      },
      {
        id: "cell-interface",
        title: "Cell interface",
        description: "Paired-receptor or synapse-style interface with a focused downstream program.",
        focusQuery: "synapse receptor pair cytokine interface stat nucleus neuron",
        scaffoldTitle: "Cell interface signaling",
        extracellularLabel: "Cell-cell interface",
        ligandLabel: "Partner cue",
        receptorLabel: "Receptor pair",
        relayLabel: "Signal hub",
        phenotypeLabel: "Program",
        helperNote: "Use paired cues and receptor assets to narrate synaptic, cytokine, or contact-dependent signaling.",
      },
      {
        id: "drug-response",
        title: "Drug response",
        description: "Target, biomarker, and response framing for intervention-heavy figures.",
        focusQuery: "drug target inhibitor receptor biomarker pathway response",
        scaffoldTitle: "Drug response lane",
        extracellularLabel: "Exposure window",
        ligandLabel: "Drug / ligand",
        receptorLabel: "Target",
        relayLabel: "Biomarker",
        phenotypeLabel: "Response",
        helperNote: "This variant works well when the main story is target engagement and downstream response.",
      },
    ],
  },
  {
    id: "cell-compartment",
    title: "Cell compartment map",
    description:
      "A compartment-first scaffold for cell body, nucleus, and localized mechanism callouts.",
    summary: "Best for cell-state figures, subcellular localization, and organelle-centric explanations.",
    focusQuery: "cell nucleus cytoplasm organelle dna transcription",
    preferredSourceBucket: "bioicons",
    tags: ["Compartment", "Cell"],
    defaultVariantId: "gene-regulation",
    variants: [
      {
        id: "gene-regulation",
        title: "Gene regulation",
        description: "Surface-to-nucleus mechanism map for signaling and transcription stories.",
        focusQuery: "cell nucleus cytoplasm organelle dna transcription",
        scaffoldTitle: "Cell compartment map",
        membraneCallout: "Membrane process",
        cytoplasmCallout: "Cytoplasmic relay",
        nucleusCallout: "Nuclear event",
        helperNote: "Use this when the story depends on where the mechanism happens.",
      },
      {
        id: "trafficking-map",
        title: "Trafficking map",
        description: "Endosomal and vesicle-trafficking framing for transport-heavy stories.",
        focusQuery: "endosome vesicle trafficking receptor lysosome secretion nucleus",
        scaffoldTitle: "Trafficking map",
        membraneCallout: "Membrane docking",
        cytoplasmCallout: "Endosomal traffic",
        nucleusCallout: "Nuclear adaptation",
        helperNote: "Best for transport, secretion, and infection stories that change location over time.",
      },
      {
        id: "stress-response",
        title: "Stress response",
        description: "Checkpoint-style map for stress signaling, rescue cues, and survival programs.",
        focusQuery: "stress checkpoint mitochondria apoptosis survival nucleus cytoplasm",
        scaffoldTitle: "Stress response map",
        membraneCallout: "Surface stress cue",
        cytoplasmCallout: "Checkpoint relay",
        nucleusCallout: "Survival program",
        helperNote: "Use this when the figure needs to highlight stress adaptation or checkpoint control.",
      },
    ],
  },
  {
    id: "assay-readout",
    title: "Assay readout strip",
    description:
      "A compact methods lane for model system, perturbation, treatment, readout, and takeaway blocks.",
    summary: "Best for methods figures, graphical abstracts, and orthogonal readout summaries.",
    focusQuery: "assay workflow perturbation stimulus readout western blot microscopy",
    preferredSourceBucket: "servier-vector",
    tags: ["Assay", "Workflow"],
    defaultVariantId: "perturbation-strip",
    variants: [
      {
        id: "perturbation-strip",
        title: "Perturbation strip",
        description: "Model-to-readout assay lane for CRISPR, inhibitors, and stimulation workflows.",
        focusQuery: "assay workflow perturbation stimulus readout western blot microscopy",
        scaffoldTitle: "Assay readout strip",
        steps: [
          { title: "Model", note: "Cells / tissue", tone: "accent" },
          { title: "Perturb", note: "CRISPR / drug", tone: "olive" },
          { title: "Treat", note: "Stimulus / time", tone: "gold" },
          { title: "Readout", note: "Blot / imaging", tone: "coral" },
          { title: "Takeaway", note: "Conclusion", tone: "plain" },
        ],
        helperNote:
          "Drop this strip into a figure when you need one clean assay narrative without rebuilding the whole workflow.",
      },
      {
        id: "dose-response",
        title: "Dose response",
        description: "Gradient-focused strip for concentration, time, and therapeutic-window figures.",
        focusQuery: "dose response treatment gradient assay viability microscopy",
        scaffoldTitle: "Dose-response strip",
        steps: [
          { title: "Model", note: "Cells / tissue", tone: "accent" },
          { title: "Dose", note: "Gradient / schedule", tone: "gold" },
          { title: "Observe", note: "Endpoint window", tone: "olive" },
          { title: "Quantify", note: "Curve / stats", tone: "coral" },
          { title: "Interpret", note: "Therapeutic window", tone: "plain" },
        ],
        helperNote:
          "Use this when the story hinges on concentration series, exposure windows, and response curves.",
      },
      {
        id: "spatial-profiling",
        title: "Spatial profiling",
        description: "Tissue-to-quantification lane for microscopy, staining, and segmentation workflows.",
        focusQuery: "spatial profiling tissue staining microscopy segmentation analysis",
        scaffoldTitle: "Spatial profiling strip",
        steps: [
          { title: "Specimen", note: "Tissue / section", tone: "accent" },
          { title: "Label", note: "Antibody / probe", tone: "olive" },
          { title: "Image", note: "Microscopy", tone: "gold" },
          { title: "Quantify", note: "Segmentation", tone: "coral" },
          { title: "Interpret", note: "Spatial takeaway", tone: "plain" },
        ],
        helperNote:
          "This variant fits imaging-heavy workflows where labeling, acquisition, and segmentation are the real narrative.",
      },
    ],
  },
  {
    id: "timecourse-timeline",
    title: "Timecourse timeline",
    description:
      "A comparison-ready strip with ordered timepoints, intervention cues, and observation anchors.",
    summary: "Best for pulse-chase designs, treatment timelines, and longitudinal readouts.",
    focusQuery: "timeline timecourse treatment pulse chase readout",
    preferredSourceBucket: "bioicons",
    tags: ["Timeline", "Experiment"],
    defaultVariantId: "pulse-chase",
    variants: [
      {
        id: "pulse-chase",
        title: "Pulse chase",
        description: "Classic baseline-to-late-phenotype timeline for stimulation and washout figures.",
        focusQuery: "timeline timecourse treatment pulse chase readout",
        scaffoldTitle: "Timecourse timeline",
        timepoints: [
          { label: "0h", note: "Baseline" },
          { label: "6h", note: "Early response" },
          { label: "24h", note: "Peak signal" },
          { label: "72h", note: "Late phenotype" },
        ],
        windowLabel: "Intervention window",
      },
      {
        id: "dose-escalation",
        title: "Dose escalation",
        description: "Treatment-ramp schedule for repeated dosing and adaptive-response figures.",
        focusQuery: "dose escalation timeline treatment schedule repeated dosing response",
        scaffoldTitle: "Dose escalation timeline",
        timepoints: [
          { label: "D1", note: "Prime" },
          { label: "D7", note: "Escalate" },
          { label: "D14", note: "Assess" },
          { label: "D28", note: "Durable" },
        ],
        windowLabel: "Dose ramp",
      },
      {
        id: "recovery-window",
        title: "Recovery window",
        description: "Injury-to-repair sequence for rescue, washout, and recovery figures.",
        focusQuery: "recovery timeline injury repair washout rescue phenotype",
        scaffoldTitle: "Recovery timeline",
        timepoints: [
          { label: "Pre", note: "Baseline" },
          { label: "0h", note: "Injury" },
          { label: "24h", note: "Acute" },
          { label: "7d", note: "Recovery" },
        ],
        windowLabel: "Recovery window",
      },
    ],
  },
];

function resolvePalette(palette = {}, stylePreset = null) {
  return {
    ...DEFAULT_PALETTE,
    ...palette,
    ...(stylePreset?.palette ?? {}),
  };
}

function getToneColors(tone, palette) {
  if (tone === "olive") {
    return { fill: "#eef5df", stroke: palette.olive };
  }

  if (tone === "gold") {
    return { fill: "#fff6ea", stroke: palette.gold };
  }

  if (tone === "coral") {
    return { fill: "#fde1d6", stroke: palette.coral };
  }

  if (tone === "plain") {
    return { fill: "#ffffff", stroke: palette.accent };
  }

  return { fill: palette.accentSoft, stroke: palette.accent };
}

function createNode(createId, node) {
  return {
    id: createId("node"),
    rotation: 0,
    opacity: 1,
    strokeWidth: node.strokeWidth ?? 2,
    fontFamily: node.fontFamily ?? "sans",
    textAlign: node.textAlign ?? "left",
    lineHeight: node.lineHeight ?? 1.3,
    groupId: node.groupId ?? null,
    hidden: false,
    locked: false,
    ...node,
  };
}

function createTextNode(createId, text, x, y, w, options = {}) {
  return createNode(createId, {
    type: "text",
    title: options.title,
    text,
    x,
    y,
    w,
    fontSize: options.fontSize ?? 16,
    fontWeight: options.fontWeight ?? 500,
    color: options.color ?? "#4d5d68",
    textAlign: options.textAlign ?? "left",
    lineHeight: options.lineHeight ?? 1.3,
    groupId: options.groupId ?? null,
  });
}

function createCardNode(createId, text, x, y, w, h, fill, stroke, options = {}) {
  return createNode(createId, {
    type: "shape",
    shape: options.shape ?? "card",
    title: options.title ?? text,
    text,
    x,
    y,
    w,
    h,
    fill,
    stroke,
    color: options.color ?? "#12232e",
    strokeWidth: options.strokeWidth ?? 2,
    strokeDasharray: options.strokeDasharray,
    groupId: options.groupId ?? null,
    role: options.role,
  });
}

function createConnector(createId, from, to, options = {}) {
  return {
    id: createId("connector"),
    from,
    to,
    stroke: options.stroke ?? "#155e75",
    strokeWidth: options.strokeWidth ?? 4,
    kind: options.kind ?? "activation",
    route: options.route ?? "straight",
    label: options.label ?? "",
  };
}

function shiftNodes(nodes, position) {
  return nodes.map((node) => ({
    ...node,
    x: position.x + (node.x ?? 0),
    y: position.y + (node.y ?? 0),
  }));
}

function shiftConnectors(connectors, position) {
  return connectors.map((connector) => ({
    ...connector,
    from: {
      x: position.x + connector.from.x,
      y: position.y + connector.from.y,
    },
    to: {
      x: position.x + connector.to.x,
      y: position.y + connector.to.y,
    },
  }));
}

export function getScientificBuilder(builderIdOrBuilder) {
  const builder =
    typeof builderIdOrBuilder === "object" && builderIdOrBuilder?.id
      ? builderIdOrBuilder
      : SCIENTIFIC_BUILDERS.find((item) => item.id === builderIdOrBuilder);

  if (!builder) {
    throw new Error(`Unknown scientific builder: ${builderIdOrBuilder}`);
  }

  return builder;
}

export function getScientificBuilderVariant(builderIdOrBuilder, variantId) {
  const builder = getScientificBuilder(builderIdOrBuilder);
  const variant =
    builder.variants.find((item) => item.id === (variantId || builder.defaultVariantId)) ??
    builder.variants[0];

  if (!variant) {
    throw new Error(`Builder ${builder.id} has no variants configured.`);
  }

  return variant;
}

export function getScientificBuilderStylePreset(styleId = SCIENTIFIC_BUILDER_STYLES[0]?.id) {
  return (
    SCIENTIFIC_BUILDER_STYLES.find((item) => item.id === styleId) ??
    SCIENTIFIC_BUILDER_STYLES[0] ??
    null
  );
}

export function getScientificBuilderDefaultOptions(builderIdOrBuilder) {
  const builder = getScientificBuilder(builderIdOrBuilder);

  return {
    variantId: getScientificBuilderVariant(builder).id,
    styleId: getScientificBuilderStylePreset()?.id ?? "",
  };
}

function buildMembraneSignaling(builder, options) {
  const palette = resolvePalette(options.palette, options.stylePreset);
  const createId = options.createId;
  const groupId = createId("group");
  const variant = options.variant;
  const style = options.stylePreset ?? {};
  const titleFontSize = style.titleFontSize ?? 24;
  const noteFontSize = style.noteFontSize ?? 15;
  const cardStrokeWidth = style.cardStrokeWidth ?? 2;
  const connectorWidth = style.connectorWidth ?? 4;

  const nodes = [
    createTextNode(createId, variant.scaffoldTitle, 0, 24, 280, {
      groupId,
      fontSize: titleFontSize,
      fontWeight: 800,
      color: palette.ink,
      title: "Membrane signaling title",
    }),
    createCardNode(createId, "", 0, 56, 560, 74, "#f8fbfd", "#d7d3cb", {
      groupId,
      title: "Extracellular region",
    }),
    createTextNode(createId, variant.extracellularLabel, 22, 102, 220, {
      groupId,
      fontSize: noteFontSize,
      fontWeight: 700,
      color: palette.muted,
      title: "Extracellular label",
    }),
    createCardNode(createId, "", 0, 138, 560, 30, palette.accent, palette.accent, {
      groupId,
      title: "Plasma membrane band",
      strokeWidth: 1,
    }),
    createTextNode(createId, "Plasma membrane", 198, 160, 180, {
      groupId,
      fontSize: 13,
      fontWeight: 800,
      color: "#ffffff",
      textAlign: "center",
      title: "Membrane label",
    }),
    createCardNode(createId, "", 0, 176, 560, 214, "#fcfbf8", "#d7d3cb", {
      groupId,
      title: "Cytoplasmic region",
    }),
    createTextNode(createId, "Cytoplasm", 22, 216, 180, {
      groupId,
      fontSize: noteFontSize,
      fontWeight: 700,
      color: palette.muted,
      title: "Cytoplasm label",
    }),
    createCardNode(createId, variant.ligandLabel, 76, 72, 126, 46, palette.accentSoft, palette.accent, {
      groupId,
      title: "Ligand cue",
      strokeWidth: cardStrokeWidth,
    }),
    createCardNode(createId, variant.receptorLabel, 236, 72, 82, 200, "#ffffff", palette.accent, {
      groupId,
      title: "Receptor lane",
      strokeWidth: cardStrokeWidth,
    }),
    createCardNode(createId, variant.relayLabel, 380, 222, 132, 52, "#eef5df", palette.olive, {
      groupId,
      title: "Relay block",
      strokeWidth: cardStrokeWidth,
    }),
    createCardNode(createId, variant.phenotypeLabel, 380, 308, 132, 52, "#fde1d6", palette.coral, {
      groupId,
      title: "Phenotype block",
      strokeWidth: cardStrokeWidth,
    }),
    createTextNode(createId, variant.helperNote, 22, 414, 452, {
      groupId,
      fontSize: noteFontSize,
      color: palette.muted,
      title: "Membrane helper note",
    }),
  ];
  const connectors = [
    createConnector(createId, { x: 202, y: 96 }, { x: 236, y: 96 }, { stroke: palette.accent, strokeWidth: connectorWidth }),
    createConnector(createId, { x: 318, y: 244 }, { x: 380, y: 248 }, { stroke: palette.olive, strokeWidth: connectorWidth }),
    createConnector(createId, { x: 446, y: 274 }, { x: 446, y: 308 }, { stroke: palette.coral, strokeWidth: connectorWidth }),
  ];

  return {
    builder,
    variant,
    stylePreset: style,
    width: 560,
    height: 456,
    nodes: shiftNodes(nodes, options.position),
    connectors: shiftConnectors(connectors, options.position),
  };
}

function buildCellCompartment(builder, options) {
  const palette = resolvePalette(options.palette, options.stylePreset);
  const createId = options.createId;
  const groupId = createId("group");
  const variant = options.variant;
  const style = options.stylePreset ?? {};
  const titleFontSize = style.titleFontSize ?? 24;
  const noteFontSize = style.noteFontSize ?? 15;
  const cardStrokeWidth = style.cardStrokeWidth ?? 2;
  const connectorWidth = style.connectorWidth ?? 4;
  const nodes = [
    createTextNode(createId, variant.scaffoldTitle, 0, 24, 280, {
      groupId,
      fontSize: titleFontSize,
      fontWeight: 800,
      color: palette.ink,
      title: "Compartment title",
    }),
    createCardNode(createId, "", 12, 74, 340, 340, "#f9fbfa", palette.accent, {
      groupId,
      shape: "circle",
      title: "Cell body shell",
      strokeWidth: cardStrokeWidth + 1,
    }),
    createCardNode(createId, "", 108, 170, 148, 148, "#ffffff", palette.olive, {
      groupId,
      shape: "circle",
      title: "Nucleus shell",
      strokeWidth: cardStrokeWidth + 1,
    }),
    createTextNode(createId, "Cell body", 110, 108, 150, {
      groupId,
      fontSize: 18,
      fontWeight: 800,
      color: palette.ink,
      textAlign: "center",
      title: "Cell body label",
    }),
    createTextNode(createId, "Nucleus", 146, 248, 84, {
      groupId,
      fontSize: 18,
      fontWeight: 800,
      color: palette.ink,
      textAlign: "center",
      title: "Nucleus label",
    }),
    createCardNode(createId, variant.membraneCallout, 402, 112, 160, 56, palette.accentSoft, palette.accent, {
      groupId,
      title: "Membrane process callout",
      strokeWidth: cardStrokeWidth,
    }),
    createCardNode(createId, variant.cytoplasmCallout, 402, 214, 160, 56, "#eef5df", palette.olive, {
      groupId,
      title: "Cytoplasmic relay callout",
      strokeWidth: cardStrokeWidth,
    }),
    createCardNode(createId, variant.nucleusCallout, 402, 316, 160, 56, "#fde1d6", palette.coral, {
      groupId,
      title: "Nuclear event callout",
      strokeWidth: cardStrokeWidth,
    }),
    createTextNode(createId, variant.helperNote, 12, 448, 500, {
      groupId,
      fontSize: noteFontSize,
      color: palette.muted,
      title: "Compartment helper note",
    }),
  ];
  const connectors = [
    createConnector(createId, { x: 352, y: 142 }, { x: 402, y: 142 }, { stroke: palette.accent, route: "elbow", strokeWidth: connectorWidth }),
    createConnector(createId, { x: 312, y: 248 }, { x: 402, y: 244 }, { stroke: palette.olive, route: "elbow", strokeWidth: connectorWidth }),
    createConnector(createId, { x: 256, y: 244 }, { x: 402, y: 344 }, { stroke: palette.coral, route: "elbow", strokeWidth: connectorWidth }),
  ];

  return {
    builder,
    variant,
    stylePreset: style,
    width: 576,
    height: 486,
    nodes: shiftNodes(nodes, options.position),
    connectors: shiftConnectors(connectors, options.position),
  };
}

function buildAssayReadout(builder, options) {
  const palette = resolvePalette(options.palette, options.stylePreset);
  const createId = options.createId;
  const groupId = createId("group");
  const variant = options.variant;
  const style = options.stylePreset ?? {};
  const titleFontSize = style.titleFontSize ?? 24;
  const noteFontSize = style.noteFontSize ?? 15;
  const cardStrokeWidth = style.cardStrokeWidth ?? 2;
  const connectorWidth = style.connectorWidth ?? 4;
  const stepX = [0, 154, 308, 462, 616];
  const nodes = [
    createTextNode(createId, variant.scaffoldTitle, 0, 24, 320, {
      groupId,
      fontSize: titleFontSize,
      fontWeight: 800,
      color: palette.ink,
      title: "Assay strip title",
    }),
    ...variant.steps.flatMap((step, index) => {
      const colors = getToneColors(step.tone, palette);
      return [
        createCardNode(createId, step.title, stepX[index], 94, 136, 68, colors.fill, colors.stroke, {
          groupId,
          title: `${step.title} step`,
          strokeWidth: cardStrokeWidth,
        }),
        createTextNode(createId, step.note, stepX[index], 198, 136, {
          groupId,
          fontSize: noteFontSize,
          color: palette.muted,
          textAlign: "center",
          title: `${step.title} note`,
        }),
      ];
    }),
    createTextNode(createId, variant.helperNote, 0, 278, 680, {
      groupId,
      fontSize: noteFontSize,
      color: palette.muted,
      title: "Assay helper note",
    }),
  ];
  const connectors = stepX.slice(0, -1).map((x, index) => {
    const nextStep = variant.steps[index];
    const colors = getToneColors(nextStep.tone, palette);
    return createConnector(
      createId,
      { x: x + 136, y: 128 },
      { x: stepX[index + 1], y: 128 },
      { stroke: colors.stroke, strokeWidth: connectorWidth },
    );
  });

  return {
    builder,
    variant,
    stylePreset: style,
    width: 752,
    height: 320,
    nodes: shiftNodes(nodes, options.position),
    connectors: shiftConnectors(connectors, options.position),
  };
}

function buildTimecourseTimeline(builder, options) {
  const palette = resolvePalette(options.palette, options.stylePreset);
  const createId = options.createId;
  const groupId = createId("group");
  const variant = options.variant;
  const style = options.stylePreset ?? {};
  const titleFontSize = style.titleFontSize ?? 24;
  const noteFontSize = style.noteFontSize ?? 14;
  const cardStrokeWidth = style.cardStrokeWidth ?? 2;
  const timepointX = [20, 186, 352, 518];
  const nodes = [
    createTextNode(createId, variant.scaffoldTitle, 0, 24, 320, {
      groupId,
      fontSize: titleFontSize,
      fontWeight: 800,
      color: palette.ink,
      title: "Timeline title",
    }),
    createCardNode(createId, "", 18, 132, 610, 8, palette.accent, palette.accent, {
      groupId,
      title: "Timeline baseline",
      strokeWidth: 1,
    }),
    ...variant.timepoints.flatMap((point, index) => [
      createCardNode(createId, point.label, timepointX[index], 94, 72, 72, "#ffffff", palette.accent, {
        groupId,
        shape: "circle",
        title: `${point.label} timepoint`,
        strokeWidth: cardStrokeWidth,
      }),
      createTextNode(createId, point.note, timepointX[index] - 10, 208, 96, {
        groupId,
        fontSize: noteFontSize,
        color: palette.muted,
        textAlign: "center",
        title: `${point.label} annotation`,
      }),
    ]),
    createCardNode(createId, variant.windowLabel, 246, 44, 170, 42, "#fff6ea", palette.gold, {
      groupId,
      title: "Intervention window",
      strokeWidth: cardStrokeWidth,
    }),
  ];

  return {
    builder,
    variant,
    stylePreset: style,
    width: 648,
    height: 282,
    nodes: shiftNodes(nodes, options.position),
    connectors: [],
  };
}

export function createScientificBuilderScene(builderIdOrBuilder, options = {}) {
  const builder = getScientificBuilder(builderIdOrBuilder);
  const variant = getScientificBuilderVariant(builder, options.variantId);
  const stylePreset = getScientificBuilderStylePreset(options.styleId);
  const context = {
    createId: options.createId ?? ((prefix) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`),
    palette: options.palette,
    position: options.position ?? { x: 120, y: 140 },
    variant,
    stylePreset,
  };

  if (builder.id === "membrane-signaling") {
    return buildMembraneSignaling(builder, context);
  }

  if (builder.id === "cell-compartment") {
    return buildCellCompartment(builder, context);
  }

  if (builder.id === "assay-readout") {
    return buildAssayReadout(builder, context);
  }

  return buildTimecourseTimeline(builder, context);
}
