import { getSearchMatchScore } from "./assets.js";
import { buildPanelLayout } from "./layoutPresets.js";

const DEFAULT_BOARD = {
  width: 1400,
  height: 900,
};

const SIGNALING_PALETTE = {
  background: "#f6f1e8",
  accent: "#0f766e",
  accentSoft: "#d8f0ee",
  ink: "#12232e",
  coral: "#ea8060",
  olive: "#90a85f",
  gold: "#b9853e",
};

const WORKFLOW_PALETTE = {
  background: "#f8f5ef",
  accent: "#155e75",
  accentSoft: "#d2edf5",
  ink: "#1f2933",
  coral: "#e76f51",
  olive: "#7a8f3d",
  violet: "#7c6eb0",
};

const MICROSCOPY_PALETTE = {
  background: "#f5f1eb",
  accent: "#155e75",
  accentSoft: "#d2edf5",
  ink: "#1f2933",
  coral: "#dc6b51",
  olive: "#7a8f3d",
  gold: "#b9853e",
};

export const FIGURE_FLOWS = [
  {
    id: "signaling-pathway",
    title: "Pathway Builder",
    shortTitle: "Pathway",
    description:
      "Turn a receptor-to-phenotype story into a publication-style pathway figure with intervention logic.",
    domain: "Mechanism",
    templateId: "signal-cascade",
    exampleId: "egfr-mapk-nsclc",
    preferredSourceBucket: "bioicons",
    focusQuery: "receptor kinase pathway nucleus dna inhibitor cell",
    starterPrompt:
      "Guide a receptor-signaling story from trigger to phenotype, then make the intervention point explicit.",
    questions: [
      {
        id: "title",
        label: "Figure title",
        type: "text",
        defaultValue: "EGFR to ERK signaling in NSCLC",
      },
      {
        id: "context",
        label: "Biological context",
        type: "text",
        defaultValue: "Non-small-cell lung cancer epithelial cells",
      },
      {
        id: "trigger",
        label: "Upstream trigger",
        type: "text",
        defaultValue: "EGF binds EGFR at the plasma membrane",
      },
      {
        id: "relay",
        label: "Intracellular relay",
        type: "text",
        defaultValue: "RAS -> RAF -> MEK -> ERK cascade",
      },
      {
        id: "outcome",
        label: "Downstream outcome",
        type: "text",
        defaultValue: "MYC / CCND1 transcription and proliferation bias",
      },
      {
        id: "intervention",
        label: "Intervention or control point",
        type: "text",
        defaultValue: "EGFR inhibitor dampens signaling before ERK activation",
      },
    ],
  },
  {
    id: "methods-workflow",
    title: "Methods Workflow Builder",
    shortTitle: "Workflow",
    description:
      "Lay out perturbation studies, stimulation steps, and orthogonal readouts without starting from a blank board.",
    domain: "Methods",
    templateId: "workflow-board",
    exampleId: "rela-crispr-macrophage",
    preferredSourceBucket: "servier-vector",
    focusQuery: "macrophage crispr workflow assay western blot confocal cytokine",
    starterPrompt:
      "Compose a methods-first figure that shows model system, perturbation, stimulus, readouts, and the interpretation path.",
    questions: [
      {
        id: "title",
        label: "Figure title",
        type: "text",
        defaultValue: "RELA CRISPR knockout workflow in macrophages",
      },
      {
        id: "question",
        label: "Biological question",
        type: "text",
        defaultValue: "Does RELA knockout suppress TNF-alpha-induced NF-kappaB signaling?",
      },
      {
        id: "model",
        label: "Model system",
        type: "text",
        defaultValue: "THP-1-derived macrophages",
      },
      {
        id: "perturbation",
        label: "Perturbation",
        type: "text",
        defaultValue: "CRISPR Cas9 knockout of RELA",
      },
      {
        id: "stimulus",
        label: "Stimulation or treatment",
        type: "text",
        defaultValue: "TNF-alpha pulse for 30 minutes",
      },
      {
        id: "readouts",
        label: "Readouts",
        type: "text",
        defaultValue: "Western blot, confocal imaging, cytokine quantification",
      },
      {
        id: "takeaway",
        label: "Interpretation",
        type: "text",
        defaultValue: "Loss of RELA blunts p65 signaling and weakens inflammatory output",
      },
    ],
  },
  {
    id: "microscopy-comparison",
    title: "Microscopy Figure Builder",
    shortTitle: "Microscopy",
    description:
      "Generate a labeled microscopy panel figure with comparison panels, a legend, a scale bar, and a crisp interpretive note.",
    domain: "Microscopy",
    templateId: "anatomy-focus",
    exampleId: "retinal-complement-degeneration",
    preferredSourceBucket: "bioicons",
    focusQuery: "microscopy confocal retina staining antibody scale bar panel comparison",
    starterPrompt:
      "Set up a comparative microscopy figure with panel labels, stain cues, and an interpretation that can go straight into a result section.",
    questions: [
      {
        id: "title",
        label: "Figure title",
        type: "text",
        defaultValue: "Complement deposition in retinal degeneration",
      },
      {
        id: "specimen",
        label: "Specimen or tissue",
        type: "text",
        defaultValue: "Retinal sections from degenerating mouse eye",
      },
      {
        id: "comparison",
        label: "Comparison groups",
        type: "text",
        defaultValue: "Control retina, degeneration model, rescue treatment, zoomed lesion edge",
      },
      {
        id: "markers",
        label: "Markers or stains",
        type: "text",
        defaultValue: "C3, IBA1, Hoechst",
      },
      {
        id: "scaleBar",
        label: "Scale bar",
        type: "text",
        defaultValue: "100 um",
      },
      {
        id: "observation",
        label: "Main observation",
        type: "text",
        defaultValue: "Complement tagging and microglial recruitment intensify at the degenerating outer retina",
      },
    ],
  },
];

function getFlowOrThrow(flowIdOrFlow) {
  if (typeof flowIdOrFlow === "object" && flowIdOrFlow?.id) {
    return flowIdOrFlow;
  }

  const flow = FIGURE_FLOWS.find((item) => item.id === flowIdOrFlow);

  if (!flow) {
    throw new Error(`Unknown figure flow: ${flowIdOrFlow}`);
  }

  return flow;
}

function trimOrFallback(value, fallback) {
  const trimmed = String(value ?? "").trim();
  return trimmed || fallback;
}

function clipWords(value, maxWords = 7) {
  const words = String(value ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length <= maxWords) {
    return words.join(" ");
  }

  return `${words.slice(0, maxWords).join(" ")}...`;
}

function parseList(value) {
  return String(value ?? "")
    .split(/[,\n;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildFocusQuery(flow, answers) {
  const fragments = flow.questions
    .slice(1, 5)
    .map((field) => clipWords(answers[field.id] ?? "", 4))
    .filter(Boolean);

  return [flow.focusQuery, ...fragments].join(" ").trim();
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
  });
}

function createCardNode(createId, text, x, y, w, h, fill, stroke, options = {}) {
  return createNode(createId, {
    type: "shape",
    shape: "card",
    text,
    x,
    y,
    w,
    h,
    fill,
    stroke,
    color: options.color ?? "#12232e",
    strokeWidth: options.strokeWidth ?? 2,
    title: options.title ?? text,
    strokeDasharray: options.strokeDasharray,
  });
}

function createAssetNode(createId, asset, x, y, w, h, options = {}) {
  return createNode(createId, {
    type: "asset",
    assetId: asset.id,
    title: options.title ?? asset.title,
    assetUrl: asset.assetUrl,
    previewUrl: asset.previewUrl,
    sourceBucket: asset.sourceBucket,
    sourceLabel: asset.sourceLabel,
    originLabel: asset.originLabel,
    citation: asset.citation,
    sourcePage: asset.sourcePage,
    licenseLabel: asset.licenseLabel,
    packId: asset.packId,
    packTitle: asset.packTitle,
    assetType: asset.assetType,
    x,
    y,
    w,
    h,
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

function createPlaceholderAssetNode(createId, role, query, x, y, w, h, palette) {
  return createCardNode(
    createId,
    `${role}\n${clipWords(query, 5)}`,
    x,
    y,
    w,
    h,
    "#ffffff",
    palette.accentSoft ?? palette.accent,
    {
      color: palette.ink,
      title: `${role} placeholder`,
      strokeDasharray: "10 8",
    },
  );
}

function getAssetCandidates(library, queries, preferredSourceBucket, usedIds) {
  const queryList = Array.isArray(queries) ? queries : [queries];
  const scored = library
    .filter((asset) => asset?.assetUrl && !usedIds.has(asset.id))
    .map((asset) => {
      const queryScore = Math.max(
        ...queryList.map((query) => getSearchMatchScore(asset, String(query ?? "").toLowerCase().trim())),
      );
      const preferredBonus = asset.sourceBucket === preferredSourceBucket ? 4 : 0;
      return {
        asset,
        score: queryScore + preferredBonus,
      };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.asset.title.localeCompare(right.asset.title));

  return scored;
}

function pickAsset(role, queries, library, preferredSourceBucket, usedIds) {
  const [candidate] = getAssetCandidates(library, queries, preferredSourceBucket, usedIds);

  if (!candidate) {
    return {
      role,
      query: Array.isArray(queries) ? queries[0] : queries,
      asset: null,
    };
  }

  usedIds.add(candidate.asset.id);
  return {
    role,
    query: Array.isArray(queries) ? queries[0] : queries,
    asset: candidate.asset,
  };
}

function createCalloutGroup(createId, position, title, body, palette) {
  const groupId = createId("group");
  return [
    createCardNode(
      createId,
      "",
      position.x,
      position.y,
      340,
      156,
      "#fffaf3",
      palette.gold ?? palette.coral ?? "#d6b587",
      {
        groupId,
        title: "Callout panel",
      },
    ),
    createTextNode(createId, title, position.x + 22, position.y + 44, 260, {
      groupId,
      fontSize: 22,
      fontWeight: 800,
      color: palette.coral ?? "#8f4b2d",
    }),
    createTextNode(createId, body, position.x + 22, position.y + 92, 286, {
      groupId,
      fontSize: 16,
      color: "#51606d",
    }),
  ];
}

function createLegendGroup(createId, position, labels, palette) {
  const groupId = createId("group");
  return [
    createCardNode(createId, "", position.x, position.y, 316, 188, "#ffffff", "#d7d3cb", {
      groupId,
      title: "Legend block",
    }),
    createTextNode(createId, "Legend", position.x + 22, position.y + 38, 180, {
      groupId,
      fontSize: 22,
      fontWeight: 800,
      color: palette.ink,
    }),
    createCardNode(createId, "", position.x + 24, position.y + 72, 28, 18, palette.accent, palette.accent, {
      groupId,
      title: "Legend swatch one",
    }),
    createTextNode(createId, labels[0] ?? "Condition A", position.x + 66, position.y + 88, 200, {
      groupId,
      fontSize: 16,
      fontWeight: 600,
      color: "#51606d",
    }),
    createCardNode(
      createId,
      "",
      position.x + 24,
      position.y + 118,
      28,
      18,
      palette.coral ?? palette.olive ?? "#ea8060",
      palette.coral ?? palette.olive ?? "#ea8060",
      {
        groupId,
        title: "Legend swatch two",
      },
    ),
    createTextNode(createId, labels[1] ?? "Condition B", position.x + 66, position.y + 134, 200, {
      groupId,
      fontSize: 16,
      fontWeight: 600,
      color: "#51606d",
    }),
  ];
}

function createScaleBarGroup(createId, position, label) {
  const groupId = createId("group");
  return [
    createCardNode(createId, "", position.x, position.y, 140, 10, "#12232e", "#12232e", {
      groupId,
      title: "Scale bar",
      strokeWidth: 1,
    }),
    createTextNode(createId, label, position.x + 28, position.y + 34, 120, {
      groupId,
      fontSize: 16,
      fontWeight: 700,
      color: "#12232e",
      title: "Scale label",
    }),
  ];
}

function summarizeMatchedAssets(matches) {
  return matches
    .filter((match) => match.asset)
    .map((match) => ({
      role: match.role,
      title: match.asset.title,
      sourceLabel: match.asset.sourceLabel ?? match.asset.packTitle ?? "Library asset",
      assetId: match.asset.id,
    }));
}

function summarizeMissingAssets(matches) {
  return matches
    .filter((match) => !match.asset)
    .map((match) => ({
      role: match.role,
      query: match.query,
    }));
}

function buildSignalingProject(flow, answers, options) {
  const createId = options.createId;
  const usedIds = new Set();
  const matches = [
    pickAsset("Cell context", [`${answers.context} cell`, "cell membrane"], options.library, flow.preferredSourceBucket, usedIds),
    pickAsset("Receptor", [`${answers.trigger} receptor`, "receptor kinase"], options.library, flow.preferredSourceBucket, usedIds),
    pickAsset("Ligand", [`${answers.trigger} ligand`, "protein ligand"], options.library, flow.preferredSourceBucket, usedIds),
    pickAsset("Nucleus", ["nucleus"], options.library, flow.preferredSourceBucket, usedIds),
    pickAsset("DNA / transcription", ["dna transcription", answers.outcome], options.library, flow.preferredSourceBucket, usedIds),
  ];
  const byRole = Object.fromEntries(matches.map((match) => [match.role, match]));
  const palette = SIGNALING_PALETTE;
  const title = trimOrFallback(answers.title, flow.questions[0].defaultValue);
  const brief = composeFigureFlowBrief(flow, answers);
  const nodes = [
    createTextNode(createId, title, 94, 62, 760, {
      fontSize: 34,
      fontWeight: 700,
      color: palette.ink,
    }),
    createTextNode(createId, trimOrFallback(answers.context, flow.questions[1].defaultValue), 94, 96, 760, {
      fontSize: 16,
      fontWeight: 500,
      color: "#4d5d68",
    }),
    byRole["Cell context"].asset
      ? createAssetNode(createId, byRole["Cell context"].asset, 86, 160, 360, 360)
      : createPlaceholderAssetNode(createId, "Cell context", answers.context, 86, 160, 360, 360, palette),
    byRole.Receptor.asset
      ? createAssetNode(createId, byRole.Receptor.asset, 300, 232, 84, 190)
      : createPlaceholderAssetNode(createId, "Receptor", answers.trigger, 300, 232, 108, 190, palette),
    byRole.Ligand.asset
      ? createAssetNode(createId, byRole.Ligand.asset, 474, 232, 126, 96)
      : createPlaceholderAssetNode(createId, "Ligand", answers.trigger, 474, 232, 126, 96, palette),
    byRole["Nucleus"].asset
      ? createAssetNode(createId, byRole["Nucleus"].asset, 180, 288, 140, 140)
      : createPlaceholderAssetNode(createId, "Nucleus", "nucleus", 180, 288, 140, 140, palette),
    byRole["DNA / transcription"].asset
      ? createAssetNode(createId, byRole["DNA / transcription"].asset, 270, 286, 136, 148)
      : createPlaceholderAssetNode(createId, "DNA", answers.outcome, 270, 286, 136, 148, palette),
    createCardNode(createId, clipWords(answers.trigger, 6), 438, 166, 196, 62, palette.accentSoft, palette.accent),
    createCardNode(createId, clipWords(answers.relay, 6), 688, 214, 232, 62, "#eef5df", palette.olive),
    createCardNode(createId, "Nuclear response", 954, 260, 184, 62, "#fde1d6", palette.coral),
    createCardNode(createId, clipWords(answers.outcome, 5), 1162, 260, 198, 62, "#f7ead6", palette.gold),
    createCardNode(createId, clipWords(answers.intervention, 5), 922, 150, 264, 62, "#ffffff", palette.coral),
    createCardNode(createId, "Phenotype output", 1088, 406, 210, 62, "#fde1d6", palette.coral),
    createTextNode(createId, "Membrane receptor context", 264, 438, 170, {
      fontSize: 14,
      fontWeight: 700,
      color: "#3f5561",
    }),
    createTextNode(createId, "Immediate-early transcription", 166, 454, 238, {
      fontSize: 14,
      fontWeight: 700,
      color: "#3f5561",
    }),
    createTextNode(createId, `Outcome: ${trimOrFallback(answers.outcome, flow.questions[4].defaultValue)}`, 866, 520, 430, {
      fontSize: 16,
      fontWeight: 500,
      color: "#51606d",
    }),
    ...createCalloutGroup(
      createId,
      { x: 92, y: 614 },
      "Why this matters",
      trimOrFallback(answers.intervention, flow.questions[5].defaultValue),
      palette,
    ),
  ];
  const connectors = [
    createConnector(createId, { x: 600, y: 264 }, { x: 688, y: 244 }, { stroke: palette.accent }),
    createConnector(createId, { x: 920, y: 244 }, { x: 954, y: 290 }, { stroke: palette.olive }),
    createConnector(createId, { x: 1138, y: 290 }, { x: 1162, y: 290 }, { stroke: palette.coral }),
    createConnector(createId, { x: 1048, y: 322 }, { x: 1048, y: 406 }, { stroke: palette.coral }),
    createConnector(
      createId,
      { x: 1052, y: 212 },
      { x: 822, y: 244 },
      { stroke: palette.coral, kind: "inhibition", route: "elbow", label: "intervention" },
    ),
  ];

  return {
    project: {
      name: title,
      brief,
      board: {
        ...DEFAULT_BOARD,
        background: palette.background,
      },
      palette,
      nodes,
      connectors,
      comments: [],
      updatedAt: options.timestamp,
    },
    summary: `Built a pathway figure with ${summarizeMatchedAssets(matches).length} matched library assets.`,
    captionDraft: `${title}. ${trimOrFallback(answers.trigger, "")}. ${trimOrFallback(
      answers.relay,
      "",
    )} culminates in ${trimOrFallback(answers.outcome, "")}. ${trimOrFallback(answers.intervention, "")}.`,
    matchedAssets: summarizeMatchedAssets(matches),
    missingAssetQueries: summarizeMissingAssets(matches),
  };
}

function buildWorkflowProject(flow, answers, options) {
  const createId = options.createId;
  const usedIds = new Set();
  const readouts = parseList(answers.readouts);
  const matches = [
    pickAsset("Model system", [`${answers.model} cell`, answers.model], options.library, flow.preferredSourceBucket, usedIds),
    pickAsset("Perturbation", [answers.perturbation, "crispr cas9"], options.library, flow.preferredSourceBucket, usedIds),
    pickAsset("Readout one", [readouts[0] ?? answers.readouts, "western blot"], options.library, flow.preferredSourceBucket, usedIds),
    pickAsset("Readout two", [readouts[1] ?? "confocal imaging", "microscope imaging"], options.library, flow.preferredSourceBucket, usedIds),
  ];
  const byRole = Object.fromEntries(matches.map((match) => [match.role, match]));
  const palette = WORKFLOW_PALETTE;
  const title = trimOrFallback(answers.title, flow.questions[0].defaultValue);
  const brief = composeFigureFlowBrief(flow, answers);
  const steps = [
    {
      heading: "Model",
      body: clipWords(answers.model, 8),
      fill: palette.accentSoft,
      stroke: palette.accent,
      x: 92,
      y: 224,
    },
    {
      heading: "Perturbation",
      body: clipWords(answers.perturbation, 8),
      fill: "#edf4de",
      stroke: palette.olive,
      x: 368,
      y: 224,
    },
    {
      heading: "Stimulus",
      body: clipWords(answers.stimulus, 8),
      fill: "#fae0d7",
      stroke: palette.coral,
      x: 644,
      y: 224,
    },
    {
      heading: "Readouts",
      body: clipWords(answers.readouts, 8),
      fill: "#efe7ff",
      stroke: palette.violet,
      x: 920,
      y: 224,
    },
  ];

  const nodes = [
    createTextNode(createId, title, 94, 68, 760, {
      fontSize: 34,
      fontWeight: 700,
      color: palette.ink,
    }),
    createTextNode(createId, trimOrFallback(answers.question, flow.questions[1].defaultValue), 94, 100, 840, {
      fontSize: 16,
      fontWeight: 500,
      color: "#51606d",
    }),
    ...steps.flatMap((step) => [
      createCardNode(
        createId,
        step.heading,
        step.x,
        step.y,
        228,
        78,
        step.fill,
        step.stroke,
        {
          color: palette.ink,
          title: `${step.heading} step`,
        },
      ),
      createTextNode(createId, step.body, step.x, step.y + 106, 228, {
        fontSize: 15,
        color: "#51606d",
      }),
    ]),
    byRole["Model system"].asset
      ? createAssetNode(createId, byRole["Model system"].asset, 114, 368, 180, 180)
      : createPlaceholderAssetNode(createId, "Model", answers.model, 114, 368, 180, 180, palette),
    byRole.Perturbation.asset
      ? createAssetNode(createId, byRole.Perturbation.asset, 390, 368, 180, 180)
      : createPlaceholderAssetNode(createId, "Perturbation", answers.perturbation, 390, 368, 180, 180, palette),
    byRole["Readout one"].asset
      ? createAssetNode(createId, byRole["Readout one"].asset, 688, 354, 164, 198)
      : createPlaceholderAssetNode(createId, "Readout", readouts[0] ?? answers.readouts, 688, 354, 164, 198, palette),
    byRole["Readout two"].asset
      ? createAssetNode(createId, byRole["Readout two"].asset, 980, 354, 164, 198)
      : createPlaceholderAssetNode(createId, "Readout", readouts[1] ?? "microscopy", 980, 354, 164, 198, palette),
    createCardNode(
      createId,
      "Interpretation",
      934,
      596,
      250,
      62,
      "#ffffff",
      palette.accent,
      {
        color: palette.ink,
      },
    ),
    createTextNode(createId, trimOrFallback(answers.takeaway, flow.questions[6].defaultValue), 934, 692, 286, {
      fontSize: 16,
      color: "#51606d",
    }),
    ...createCalloutGroup(
      createId,
      { x: 94, y: 606 },
      "Experimental question",
      trimOrFallback(answers.question, flow.questions[1].defaultValue),
      palette,
    ),
  ];

  const connectors = [
    createConnector(createId, { x: 320, y: 262 }, { x: 368, y: 262 }, { stroke: palette.accent }),
    createConnector(createId, { x: 596, y: 262 }, { x: 644, y: 262 }, { stroke: palette.olive }),
    createConnector(createId, { x: 872, y: 262 }, { x: 920, y: 262 }, { stroke: palette.coral }),
    createConnector(createId, { x: 1032, y: 548 }, { x: 1058, y: 596 }, { stroke: palette.violet }),
  ];

  return {
    project: {
      name: title,
      brief,
      board: {
        ...DEFAULT_BOARD,
        background: palette.background,
      },
      palette,
      nodes,
      connectors,
      comments: [],
      updatedAt: options.timestamp,
    },
    summary: `Built a workflow figure with ${summarizeMatchedAssets(matches).length} matched library assets.`,
    captionDraft: `${title}. ${trimOrFallback(answers.model, "")} undergo ${trimOrFallback(
      answers.perturbation,
      "",
    )}, followed by ${trimOrFallback(answers.stimulus, "")}. Readouts include ${trimOrFallback(
      answers.readouts,
      "",
    )}, supporting the conclusion that ${trimOrFallback(answers.takeaway, "")}.`,
    matchedAssets: summarizeMatchedAssets(matches),
    missingAssetQueries: summarizeMissingAssets(matches),
  };
}

function buildMicroscopyProject(flow, answers, options) {
  const createId = options.createId;
  const usedIds = new Set();
  const comparisonLabels = parseList(answers.comparison);
  const markerLabels = parseList(answers.markers);
  const matches = [
    pickAsset("Microscope", ["confocal microscope", "microscope"], options.library, flow.preferredSourceBucket, usedIds),
    pickAsset("Specimen", [answers.specimen, "retina tissue"], options.library, flow.preferredSourceBucket, usedIds),
    pickAsset("Marker cue", [markerLabels[0] ?? answers.markers, "antibody"], options.library, flow.preferredSourceBucket, usedIds),
  ];
  const byRole = Object.fromEntries(matches.map((match) => [match.role, match]));
  const palette = MICROSCOPY_PALETTE;
  const title = trimOrFallback(answers.title, flow.questions[0].defaultValue);
  const brief = composeFigureFlowBrief(flow, answers);
  const board = {
    ...DEFAULT_BOARD,
    background: palette.background,
  };
  const layout = buildPanelLayout("panels-2x2", board, palette, createId);
  const panelBodies = layout.cells.flatMap((cell, index) => {
    const label = comparisonLabels[index] ?? `Panel ${cell.label}`;
    const imageX = cell.x + 32;
    const imageY = cell.y + 58;
    const imageW = cell.w - 64;
    const imageH = Math.max(140, cell.h - 136);
    const tint =
      index % 2 === 0
        ? "rgba(21, 94, 117, 0.10)"
        : index % 3 === 0
          ? "rgba(220, 107, 81, 0.12)"
          : "rgba(122, 143, 61, 0.12)";

    return [
      createCardNode(createId, `${label}\n${markerLabels.join(" / ")}`, imageX, imageY, imageW, imageH, tint, "#d7d3cb", {
        title: `${cell.label} image placeholder`,
        color: palette.ink,
      }),
      createTextNode(createId, label, cell.x + 32, cell.y + cell.h - 38, cell.w - 64, {
        fontSize: 16,
        fontWeight: 700,
        color: "#3f5561",
      }),
    ];
  });

  const nodes = [
    createTextNode(createId, title, 94, 58, 820, {
      fontSize: 34,
      fontWeight: 700,
      color: palette.ink,
    }),
    createTextNode(createId, trimOrFallback(answers.specimen, flow.questions[1].defaultValue), 94, 92, 760, {
      fontSize: 16,
      fontWeight: 500,
      color: "#51606d",
    }),
    ...(byRole.Microscope.asset
      ? [createAssetNode(createId, byRole.Microscope.asset, 1180, 24, 140, 140)]
      : [createPlaceholderAssetNode(createId, "Microscope", "confocal microscope", 1180, 24, 140, 140, palette)]),
    ...layout.nodes,
    ...panelBodies,
    ...(byRole.Specimen.asset
      ? [createAssetNode(createId, byRole.Specimen.asset, 948, 742, 114, 114)]
      : [createPlaceholderAssetNode(createId, "Specimen", answers.specimen, 948, 742, 114, 114, palette)]),
    ...(byRole["Marker cue"].asset
      ? [createAssetNode(createId, byRole["Marker cue"].asset, 1092, 744, 108, 108)]
      : []),
    ...createLegendGroup(
      createId,
      { x: 92, y: 728 },
      [comparisonLabels[0] ?? "Reference", comparisonLabels[1] ?? "Perturbed"],
      palette,
    ),
    ...createScaleBarGroup(
      createId,
      { x: 1220, y: 822 },
      trimOrFallback(answers.scaleBar, flow.questions[4].defaultValue),
    ),
    ...createCalloutGroup(
      createId,
      { x: 430, y: 728 },
      "Interpretation",
      trimOrFallback(answers.observation, flow.questions[5].defaultValue),
      palette,
    ),
  ];

  return {
    project: {
      name: title,
      brief,
      board,
      palette,
      nodes,
      connectors: [],
      comments: [],
      updatedAt: options.timestamp,
    },
    summary: `Built a microscopy figure scaffold with ${layout.cells.length} labeled panels.`,
    captionDraft: `${title}. ${trimOrFallback(answers.specimen, "")}. Panels compare ${trimOrFallback(
      answers.comparison,
      "",
    )} using ${trimOrFallback(answers.markers, "")}, highlighting that ${trimOrFallback(
      answers.observation,
      "",
    )}.`,
    matchedAssets: summarizeMatchedAssets(matches),
    missingAssetQueries: summarizeMissingAssets(matches),
  };
}

export function createFigureFlowDefaultAnswers(flowIdOrFlow) {
  const flow = getFlowOrThrow(flowIdOrFlow);
  return Object.fromEntries(flow.questions.map((field) => [field.id, field.defaultValue ?? ""]));
}

export function composeFigureFlowBrief(flowIdOrFlow, rawAnswers = {}) {
  const flow = getFlowOrThrow(flowIdOrFlow);
  const answers = {
    ...createFigureFlowDefaultAnswers(flow),
    ...rawAnswers,
  };

  if (flow.id === "signaling-pathway") {
    return `${trimOrFallback(answers.title, flow.title)}. Create a pathway figure in ${trimOrFallback(
      answers.context,
      "",
    )} showing how ${trimOrFallback(answers.trigger, "")} drives ${trimOrFallback(
      answers.relay,
      "",
    )}, leading to ${trimOrFallback(answers.outcome, "")}. Make ${trimOrFallback(
      answers.intervention,
      "",
    )} explicit in the layout.`;
  }

  if (flow.id === "methods-workflow") {
    return `${trimOrFallback(answers.title, flow.title)}. Create a methods workflow figure that tests ${trimOrFallback(
      answers.question,
      "",
    )} in ${trimOrFallback(answers.model, "")} using ${trimOrFallback(
      answers.perturbation,
      "",
    )}, followed by ${trimOrFallback(answers.stimulus, "")}. Show readouts of ${trimOrFallback(
      answers.readouts,
      "",
    )} and end with ${trimOrFallback(answers.takeaway, "")}.`;
  }

  return `${trimOrFallback(answers.title, flow.title)}. Create a microscopy figure for ${trimOrFallback(
    answers.specimen,
    "",
  )} comparing ${trimOrFallback(answers.comparison, "")} with stains ${trimOrFallback(
    answers.markers,
    "",
  )}. Include a ${trimOrFallback(answers.scaleBar, "")} scale bar and emphasize that ${trimOrFallback(
    answers.observation,
    "",
  )}.`;
}

export function createFigureFlowProject(flowIdOrFlow, rawAnswers = {}, options = {}) {
  const flow = getFlowOrThrow(flowIdOrFlow);
  const answers = {
    ...createFigureFlowDefaultAnswers(flow),
    ...rawAnswers,
  };
  const context = {
    library: options.library ?? [],
    createId: options.createId ?? ((prefix) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`),
    timestamp: options.now ?? new Date().toISOString(),
  };

  let result;

  if (flow.id === "signaling-pathway") {
    result = buildSignalingProject(flow, answers, context);
  } else if (flow.id === "methods-workflow") {
    result = buildWorkflowProject(flow, answers, context);
  } else {
    result = buildMicroscopyProject(flow, answers, context);
  }

  return {
    ...result,
    flowId: flow.id,
    title: trimOrFallback(answers.title, flow.title),
    prompt: composeFigureFlowBrief(flow, answers),
    libraryQuery: buildFocusQuery(flow, answers),
    nextStep: flow.starterPrompt,
  };
}
