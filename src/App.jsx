import { startTransition, useDeferredValue, useEffect, useRef, useState } from "react";
import { SERVIER_ATTRIBUTION, SERVIER_KITS, SERVIER_LICENSE, SERVIER_ORIGINALS, SOURCE_POLICIES } from "./data/servier.js";
import { EXAMPLE_PROJECTS } from "./data/exampleProjects.js";
import { TEMPLATES } from "./data/templates.js";
import { fetchAiHealth, requestFigureCritique, requestFigurePlan } from "./lib/ai.js";
import {
  createBioiconsCommunityPack,
  createServierOriginalPack,
  describePackLicenseStrategy,
  flattenAssetPacks,
  parseLibraryPackManifest,
  summarizeLibraryPacks,
} from "./lib/assetPacks.js";
import {
  buildAiSuggestions,
  isDuplicateImportedAsset,
  pushRecentAsset,
  sortLibraryAssets,
  toggleFavoriteAssetId,
} from "./lib/assets.js";
import {
  buildExportFilename,
  collectProjectCitations,
  createProjectPdfBlob,
  createProjectPngBlob,
  downloadBlob,
  downloadText,
  projectToSvg,
} from "./lib/exporters.js";
import {
  createHistoryState,
  pushHistoryState,
  redoHistoryState,
  undoHistoryState,
} from "./lib/history.js";
import {
  alignSelectedNodes,
  createNodeSelection,
  distributeSelectedNodes,
  findAlignmentGuides,
  getNodeBounds,
  getMarqueeRect,
  getMarqueeSelectionIds,
  getSelectedNodes,
  isNodeSelected,
  isNodeSelection,
} from "./lib/editorSelection.js";
import {
  createProjectDocument,
  parseProjectDocument,
  suggestProjectFilename,
} from "./lib/projectFiles.js";
import {
  createProjectSnapshot,
  pushProjectSnapshot,
  removeProjectSnapshot,
} from "./lib/projectSnapshots.js";
import {
  buildPanelLayout,
  getPanelCellCount,
  PANEL_LAYOUT_PRESETS,
  placeNodesIntoPanelLayout,
} from "./lib/layoutPresets.js";
import {
  createReusableComponent,
  instantiateReusableComponent,
  pushReusableComponent,
  removeReusableComponent,
} from "./lib/reusableComponents.js";
import {
  countOpenReviewComments,
  createReviewComment,
  normalizeReviewComment,
  resolveReviewCommentPosition,
} from "./lib/reviewComments.js";

const STORAGE_KEYS = {
  project: "helixcanvas-project-v1",
  projectMeta: "helixcanvas-project-meta-v1",
  importedAssets: "helixcanvas-imported-assets-v1",
  favoriteAssets: "helixcanvas-favorite-assets-v1",
  recentAssets: "helixcanvas-recent-assets-v1",
  recoveryDraft: "helixcanvas-recovery-draft-v1",
  projectSnapshots: "helixcanvas-project-snapshots-v1",
  reusableComponents: "helixcanvas-reusable-components-v1",
};

const SOURCE_FILTERS = [
  { id: "all", label: "All sources" },
  { id: "bioicons", label: "Bioicons" },
  { id: "community", label: "Community packs" },
  { id: "servier-vector", label: "Servier vectors" },
  { id: "servier-original", label: "Servier originals" },
  { id: "figurelabs-import", label: "FigureLabs imports" },
];

const SORT_OPTIONS = [
  { id: "relevance", label: "Relevance" },
  { id: "favorites", label: "Saved first" },
  { id: "recent", label: "Recent first" },
  { id: "alphabetical", label: "A-Z" },
];

const BOARD_PRESETS = {
  width: 1400,
  height: 900,
  background: "#f7f2ea",
};

const GRID_SIZE = 32;

const HERO_KPIS = [
  { label: "Open assets", value: "2.8K+" },
  { label: "Servier vectors", value: "1.3K+" },
  { label: "Official PPT kits", value: "50" },
  { label: "Guided examples", value: `${EXAMPLE_PROJECTS.length}` },
];

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function withNodeState(node) {
  return {
    ...node,
    rotation: node.rotation ?? 0,
    opacity: node.opacity ?? 1,
    strokeWidth: node.strokeWidth ?? 2,
    groupId: node.groupId ?? null,
    hidden: Boolean(node.hidden),
    locked: Boolean(node.locked),
  };
}

function withConnectorState(connector, strokeFallback = "#155e75") {
  return {
    id: connector.id ?? createId("connector"),
    stroke: connector.stroke ?? strokeFallback,
    strokeWidth: connector.strokeWidth ?? 4,
    from: { ...connector.from },
    to: { ...connector.to },
  };
}

function normalizeTemplate(template) {
  const nodeIds = new Map();

  const nodes = template.nodes.map((node) => {
    const id = createId("node");
    nodeIds.set(node, id);
    return withNodeState({
      id,
      ...node,
    });
  });

  const connectors = template.connectors.map((connector) =>
    withConnectorState({ id: createId("connector"), ...connector }, template.palette.accent),
  );

  return {
    id: createId("project"),
    name: template.name,
    brief: template.summary,
    board: {
      ...BOARD_PRESETS,
      background: template.palette.background,
    },
    palette: template.palette,
    nodes,
    connectors,
    comments: [],
    updatedAt: new Date().toISOString(),
  };
}

function createStarterProject() {
  return normalizeTemplate(TEMPLATES[0]);
}

function prepareLoadedProject(project) {
  const fallbackTemplate = inferTemplateFromBrief(`${project.name ?? ""} ${project.brief ?? ""}`) ?? TEMPLATES[0];

  return {
    id: project.id ?? createId("project"),
    name: project.name ?? "Recovered HelixCanvas project",
    brief: project.brief ?? "",
    board: {
      ...BOARD_PRESETS,
      ...project.board,
    },
    palette: {
      ...fallbackTemplate.palette,
      ...(project.palette ?? {}),
    },
    nodes: (project.nodes ?? []).map((node) =>
      withNodeState({
        id: node.id ?? createId("node"),
        ...node,
      }),
    ),
    connectors: (project.connectors ?? []).map((connector) =>
      withConnectorState(connector, project.palette?.accent ?? fallbackTemplate.palette.accent),
    ),
    comments: (project.comments ?? []).map((comment) => normalizeReviewComment(comment)),
    updatedAt: project.updatedAt ?? new Date().toISOString(),
  };
}

function describeSourcePolicy(sourceId) {
  return SOURCE_POLICIES.find((policy) => policy.id === sourceId);
}

function inferTemplateFromBrief(brief) {
  const lower = brief.toLowerCase();

  if (lower.includes("workflow") || lower.includes("assay") || lower.includes("protocol")) {
    return TEMPLATES.find((template) => template.id === "workflow-board");
  }

  if (
    lower.includes("brain") ||
    lower.includes("anatomy") ||
    lower.includes("organ") ||
    lower.includes("neuro")
  ) {
    return TEMPLATES.find((template) => template.id === "anatomy-focus");
  }

  return TEMPLATES.find((template) => template.id === "signal-cascade");
}

function parseStoredJson(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function summarizeCounts(items) {
  return {
    totalAssets: items.length,
    bioiconsAssets: items.filter((item) => item.sourceBucket === "bioicons").length,
    servierVectorAssets: items.filter((item) => item.sourceBucket === "servier-vector").length,
    servierOriginalAssets: items.filter((item) => item.sourceBucket === "servier-original").length,
    figurelabsImports: items.filter((item) => item.sourceBucket === "figurelabs-import").length,
  };
}

function createBuiltInPacksFromLegacyLibrary(items) {
  return [
    createBioiconsCommunityPack(items),
    createServierOriginalPack(SERVIER_ORIGINALS, {
      licenseLabel: SERVIER_LICENSE.label,
      licenseUrl: SERVIER_LICENSE.url,
      defaultCitation: SERVIER_ATTRIBUTION,
    }),
  ];
}

function getHandleDistance(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function formatDisplayCategory(category) {
  if (!category) {
    return "All categories";
  }

  return category;
}

function makeAssetNode(asset, position = { x: 160, y: 180 }) {
  const defaultWidth = asset.assetType === "png" ? 220 : 180;
  const defaultHeight = asset.assetType === "png" ? 160 : 180;

  return withNodeState({
    id: createId("node"),
    assetId: asset.id,
    type: "asset",
    title: asset.title,
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
    x: position.x,
    y: position.y,
    w: defaultWidth,
    h: defaultHeight,
  });
}

function makeShapeNode(shape, text, position) {
  return withNodeState({
    id: createId("node"),
    type: "shape",
    shape,
    text,
    fill: "#ffffff",
    stroke: "#d7d3cb",
    color: "#12232e",
    strokeWidth: 2,
    x: position.x,
    y: position.y,
    w: shape === "circle" ? 160 : 220,
    h: shape === "circle" ? 160 : 86,
  });
}

function makeTextNode(position) {
  return withNodeState({
    id: createId("node"),
    type: "text",
    text: "Add annotation",
    fontSize: 24,
    fontWeight: 700,
    color: "#12232e",
    x: position.x,
    y: position.y,
    w: 260,
  });
}

function createCalloutAnnotation(position) {
  const groupId = createId("group");
  return [
    withNodeState({
      id: createId("node"),
      groupId,
      role: "annotation-callout",
      type: "shape",
      shape: "card",
      title: "Callout panel",
      text: "",
      fill: "#fffaf3",
      stroke: "#d6b587",
      color: "#12232e",
      strokeWidth: 2,
      x: position.x,
      y: position.y,
      w: 320,
      h: 152,
    }),
    withNodeState({
      id: createId("node"),
      groupId,
      role: "annotation-title",
      type: "text",
      title: "Callout title",
      text: "Key finding",
      fontSize: 22,
      fontWeight: 800,
      color: "#8f4b2d",
      x: position.x + 22,
      y: position.y + 42,
      w: 240,
    }),
    withNodeState({
      id: createId("node"),
      groupId,
      role: "annotation-body",
      type: "text",
      title: "Callout body",
      text: "Add a concise interpretation or methodological note here.",
      fontSize: 16,
      fontWeight: 500,
      color: "#51606d",
      x: position.x + 22,
      y: position.y + 88,
      w: 272,
    }),
  ];
}

function createLegendAnnotation(position) {
  const groupId = createId("group");
  return [
    withNodeState({
      id: createId("node"),
      groupId,
      role: "annotation-legend",
      type: "shape",
      shape: "card",
      title: "Legend block",
      text: "",
      fill: "#ffffff",
      stroke: "#d7d3cb",
      color: "#12232e",
      strokeWidth: 2,
      x: position.x,
      y: position.y,
      w: 300,
      h: 196,
    }),
    withNodeState({
      id: createId("node"),
      groupId,
      type: "text",
      title: "Legend title",
      text: "Legend",
      fontSize: 22,
      fontWeight: 800,
      color: "#12232e",
      x: position.x + 22,
      y: position.y + 38,
      w: 180,
    }),
    withNodeState({
      id: createId("node"),
      groupId,
      type: "shape",
      shape: "card",
      title: "Legend swatch one",
      text: "",
      fill: "#0f766e",
      stroke: "#0f766e",
      strokeWidth: 2,
      x: position.x + 24,
      y: position.y + 72,
      w: 28,
      h: 18,
    }),
    withNodeState({
      id: createId("node"),
      groupId,
      type: "text",
      title: "Legend label one",
      text: "Condition A",
      fontSize: 16,
      fontWeight: 600,
      color: "#51606d",
      x: position.x + 66,
      y: position.y + 88,
      w: 180,
    }),
    withNodeState({
      id: createId("node"),
      groupId,
      type: "shape",
      shape: "card",
      title: "Legend swatch two",
      text: "",
      fill: "#ea8060",
      stroke: "#ea8060",
      strokeWidth: 2,
      x: position.x + 24,
      y: position.y + 118,
      w: 28,
      h: 18,
    }),
    withNodeState({
      id: createId("node"),
      groupId,
      type: "text",
      title: "Legend label two",
      text: "Condition B",
      fontSize: 16,
      fontWeight: 600,
      color: "#51606d",
      x: position.x + 66,
      y: position.y + 134,
      w: 180,
    }),
  ];
}

function createScaleBarAnnotation(position) {
  const groupId = createId("group");
  return [
    withNodeState({
      id: createId("node"),
      groupId,
      role: "annotation-scale-bar",
      type: "shape",
      shape: "card",
      title: "Scale bar",
      text: "",
      fill: "#12232e",
      stroke: "#12232e",
      color: "#12232e",
      strokeWidth: 1,
      x: position.x,
      y: position.y,
      w: 140,
      h: 10,
    }),
    withNodeState({
      id: createId("node"),
      groupId,
      role: "annotation-scale-label",
      type: "text",
      title: "Scale label",
      text: "100 um",
      fontSize: 16,
      fontWeight: 700,
      color: "#12232e",
      x: position.x + 28,
      y: position.y + 34,
      w: 120,
    }),
  ];
}

function snapValue(value, enabled) {
  return enabled ? Math.round(value / GRID_SIZE) * GRID_SIZE : value;
}

function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

function openExternalLink(href) {
  window.open(href, "_blank", "noopener,noreferrer");
}

function describeGroup(groupId, count) {
  if (!groupId || count <= 0) {
    return "";
  }

  return count === 1 ? "Grouped layer" : `Group · ${count} layers`;
}

function buildProjectSummaryForAi(project) {
  const visibleNodes = project.nodes.filter((node) => !node.hidden);
  const citations = collectProjectCitations(project);

  return {
    name: project.name,
    brief: project.brief,
    board: project.board,
    counts: {
      nodes: visibleNodes.length,
      connectors: project.connectors.length,
      assets: visibleNodes.filter((node) => node.type === "asset").length,
      text: visibleNodes.filter((node) => node.type === "text").length,
      shapes: visibleNodes.filter((node) => node.type === "shape").length,
    },
    nodes: visibleNodes.slice(0, 8).map((node) => ({
      type: node.type,
      title: node.title ?? "",
      text: node.text ?? "",
      x: Math.round(node.x ?? 0),
      y: Math.round(node.y ?? 0),
      w: Math.round(node.w ?? 0),
      h: Math.round(node.h ?? 0),
      sourceLabel: node.sourceLabel ?? "",
    })),
    citationsCount: citations ? citations.split("\n").filter(Boolean).length : 0,
  };
}

function getEmphasisTheme(palette, emphasis) {
  if (emphasis === "olive") {
    return {
      fill: "#eef4dc",
      stroke: palette.olive ?? "#88a166",
    };
  }

  if (emphasis === "coral") {
    return {
      fill: "#f9dfd2",
      stroke: palette.coral ?? "#ef8354",
    };
  }

  if (emphasis === "neutral") {
    return {
      fill: "#ffffff",
      stroke: "#d7d3cb",
    };
  }

  return {
    fill: palette.accentSoft ?? "#d7ecec",
    stroke: palette.accent ?? "#0d7b83",
  };
}

function createPlanProject(plan) {
  const template =
    TEMPLATES.find((item) => item.id === plan.templateId) ??
    inferTemplateFromBrief(`${plan.title} ${plan.summary}`) ??
    TEMPLATES[0];
  const baseProject = normalizeTemplate(template);
  const assetNodes = baseProject.nodes.filter((node) => node.type === "asset");
  const templateShapeNodes = baseProject.nodes.filter((node) => node.type === "shape");
  const panelCount = plan.panelSequence.length;
  const panelNodes = [];
  const detailNodes = [];
  const noteNodes = [];

  let fallbackX = template.id === "workflow-board" ? 92 : 720;
  let fallbackY = template.id === "workflow-board" ? 220 : 178;

  plan.panelSequence.forEach((panel, index) => {
    const referenceNode = templateShapeNodes[index];
    const horizontalWorkflow = template.id === "workflow-board";
    const shapeX = referenceNode
      ? referenceNode.x
      : horizontalWorkflow
        ? fallbackX + index * 294
        : fallbackX;
    const shapeY = referenceNode
      ? referenceNode.y
      : horizontalWorkflow
        ? fallbackY
        : fallbackY + index * 122;
    const shapeW = referenceNode?.w ?? 220;
    const shapeH = referenceNode?.h ?? 74;
    const theme = getEmphasisTheme(baseProject.palette, panel.emphasis);

    panelNodes.push(withNodeState({
      id: createId("node"),
      type: "shape",
      shape: "card",
      text: `${index + 1}. ${panel.heading}`,
      fill: theme.fill,
      stroke: theme.stroke,
      color: baseProject.palette.ink,
      strokeWidth: 2,
      x: shapeX,
      y: shapeY,
      w: shapeW,
      h: shapeH,
    }));

    detailNodes.push(withNodeState({
      id: createId("node"),
      type: "text",
      text: panel.body,
      fontSize: 15,
      fontWeight: 500,
      color: "#4d5d68",
      x: shapeX,
      y: shapeY + shapeH + 28,
      w: horizontalWorkflow ? shapeW : Math.min(shapeW + 48, 320),
    }));
  });

  const notesStartY =
    template.id === "workflow-board"
      ? 676
      : template.id === "anatomy-focus"
        ? 600
        : 610;

  plan.callouts.forEach((callout, index) => {
    noteNodes.push(withNodeState({
      id: createId("node"),
      type: "text",
      text: `- ${callout}`,
      fontSize: 16,
      fontWeight: 500,
      color: "#51606d",
      x: 94,
      y: notesStartY + index * 28,
      w: 760,
    }));
  });

  const titleNode = withNodeState({
    id: createId("node"),
    type: "text",
    text: plan.title,
    fontSize: 34,
    fontWeight: 700,
    color: baseProject.palette.ink,
    x: 94,
    y: 72,
    w: 820,
  });

  const summaryNode = withNodeState({
    id: createId("node"),
    type: "text",
    text: plan.figureGoal,
    fontSize: 16,
    fontWeight: 500,
    color: "#51606d",
    x: 94,
    y: 102,
    w: 860,
  });

  return {
    ...baseProject,
    name: plan.title,
    brief: plan.summary,
    nodes: [titleNode, summaryNode, ...assetNodes, ...panelNodes, ...detailNodes, ...noteNodes],
    comments: [],
    updatedAt: new Date().toISOString(),
  };
}

function AssetCard({
  asset,
  onAdd,
  active,
  onSelectSource,
  onSelectPack,
  onToggleFavorite,
  favorite,
  used,
}) {
  return (
    <article className={`asset-card ${active ? "is-active" : ""}`}>
      <div className="asset-card__preview">
        <img src={asset.previewUrl ?? asset.assetUrl} alt={asset.title} />
      </div>
      <div className="asset-card__body">
        <div className="asset-card__head">
          <h4>{asset.title}</h4>
          <button
            className="ghost-button"
            type="button"
            onClick={() => onSelectSource(asset.sourceBucket)}
          >
            {asset.sourceLabel}
          </button>
        </div>
        <p>{asset.categoryLabel}</p>
        <div className="asset-card__meta">
          <span>{asset.licenseLabel}</span>
          {asset.packTitle ? <span>{asset.packTitle}</span> : null}
          {asset.originLabel ? <span>{asset.originLabel}</span> : null}
          {used ? <span>On canvas</span> : null}
        </div>
      </div>
      <div className="asset-card__actions">
        <button className="secondary-button" type="button" onClick={() => onAdd(asset)}>
          Add
        </button>
        <button className="ghost-button" type="button" onClick={() => onToggleFavorite(asset.id)}>
          {favorite ? "Unsave" : "Save"}
        </button>
        {asset.packId ? (
          <button className="ghost-button" type="button" onClick={() => onSelectPack(asset.packId)}>
            Pack
          </button>
        ) : null}
        {asset.sourcePage ? (
          <button
            className="ghost-button"
            type="button"
            onClick={() => openExternalLink(asset.sourcePage)}
          >
            Source
          </button>
        ) : null}
      </div>
    </article>
  );
}

function PackCard({ pack, active, onFocusPack }) {
  return (
    <article className={`pack-card ${active ? "is-active" : ""}`}>
      <div className="pack-card__head">
        <div>
          <h4>{pack.title}</h4>
          <p>{pack.description}</p>
        </div>
        <span className={`pack-status pack-status--${pack.status}`}>{pack.status}</span>
      </div>
      <div className="pack-card__meta">
        <span>{pack.assetCount} assets</span>
        <span>{pack.categoriesCount} categories</span>
        <span>{describePackLicenseStrategy(pack)}</span>
      </div>
      <div className="ai-pill-row">
        {pack.tags.map((tag) => (
          <span key={tag} className="ai-pill">
            {tag}
          </span>
        ))}
      </div>
      <div className="pack-card__actions">
        <button type="button" className="secondary-button" onClick={() => onFocusPack(active ? "all" : pack.id)}>
          {active ? "Show all" : "Focus pack"}
        </button>
        {pack.homepage ? (
          <button type="button" className="ghost-button" onClick={() => openExternalLink(pack.homepage)}>
            Homepage
          </button>
        ) : null}
      </div>
    </article>
  );
}

function ExampleProjectCard({ example, onLoad, onUseBrief }) {
  return (
    <article className="example-card">
      <div className="example-card__head">
        <div>
          <h4>{example.title}</h4>
          <p>{example.problem}</p>
        </div>
      </div>
      <div className="ai-pill-row">
        {example.tags.map((tag) => (
          <span key={tag} className="ai-pill">
            {tag}
          </span>
        ))}
      </div>
      <p className="helper-copy">{example.summary}</p>
      <div className="example-card__actions">
        <button type="button" className="secondary-button" onClick={() => onLoad(example)}>
          Load figure
        </button>
        <button type="button" className="ghost-button" onClick={() => onUseBrief(example)}>
          Use brief
        </button>
      </div>
    </article>
  );
}

function KitCard({ kit }) {
  return (
    <article className="kit-card">
      <div>
        <h4>{kit.title}</h4>
        <p>{kit.section}</p>
      </div>
      <div className="kit-card__actions">
        <span>{kit.size}</span>
        <button type="button" className="ghost-button" onClick={() => openExternalLink(kit.downloadUrl)}>
          Download
        </button>
      </div>
    </article>
  );
}

function AssetShelf({ title, assets, onAdd }) {
  if (!assets.length) {
    return null;
  }

  return (
    <div className="asset-shelf">
      <div className="asset-shelf__head">
        <strong>{title}</strong>
        <span>{assets.length}</span>
      </div>
      <div className="asset-shelf__grid">
        {assets.map((asset) => (
          <button
            key={asset.id}
            type="button"
            className="asset-shelf__item"
            onClick={() => onAdd(asset)}
          >
            <img src={asset.previewUrl ?? asset.assetUrl} alt={asset.title} />
            <span>{asset.title}</span>
            <small>{asset.sourceLabel}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function PolicyCard({ policy }) {
  return (
    <article className="policy-card">
      <div className="policy-card__head">
        <h4>{policy.title}</h4>
        <button type="button" className="ghost-button" onClick={() => openExternalLink(policy.href)}>
          Visit
        </button>
      </div>
      <p>{policy.summary}</p>
      <ul>
        {policy.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </article>
  );
}

function App() {
  const [libraryStatus, setLibraryStatus] = useState("loading");
  const [libraryPacks, setLibraryPacks] = useState([]);
  const [library, setLibrary] = useState([]);
  const [libraryStats, setLibraryStats] = useState({
    packCount: 0,
    readyPackCount: 0,
    totalAssets: 0,
    bioiconsAssets: 0,
    servierVectorAssets: 0,
    servierOriginalAssets: 0,
    categories: 0,
  });
  const [project, setProject] = useState(() =>
    typeof window === "undefined"
      ? createStarterProject()
      : prepareLoadedProject(parseStoredJson(STORAGE_KEYS.project, createStarterProject())),
  );
  const [projectFileName, setProjectFileName] = useState(() =>
    typeof window === "undefined" ? "" : parseStoredJson(STORAGE_KEYS.projectMeta, {}).fileName ?? "",
  );
  const [savedProjectUpdatedAt, setSavedProjectUpdatedAt] = useState(() =>
    typeof window === "undefined"
      ? null
      : parseStoredJson(STORAGE_KEYS.projectMeta, {}).savedUpdatedAt ?? null,
  );
  const [importedAssets, setImportedAssets] = useState(() =>
    typeof window === "undefined" ? [] : parseStoredJson(STORAGE_KEYS.importedAssets, []),
  );
  const [selection, setSelection] = useState(null);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [packFilter, setPackFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortMode, setSortMode] = useState("relevance");
  const [brief, setBrief] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [notice, setNotice] = useState("");
  const [zoom, setZoom] = useState(0.78);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [dragState, setDragState] = useState(null);
  const [favoriteAssetIds, setFavoriteAssetIds] = useState(() =>
    typeof window === "undefined" ? [] : parseStoredJson(STORAGE_KEYS.favoriteAssets, []),
  );
  const [recentAssetIds, setRecentAssetIds] = useState(() =>
    typeof window === "undefined" ? [] : parseStoredJson(STORAGE_KEYS.recentAssets, []),
  );
  const [historyVersion, setHistoryVersion] = useState(0);
  const [aiStatus, setAiStatus] = useState({
    checking: true,
    configured: false,
    model: "",
    error: "",
  });
  const [aiPlan, setAiPlan] = useState(null);
  const [aiCritique, setAiCritique] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [recoveryDraft, setRecoveryDraft] = useState(() =>
    typeof window === "undefined" ? null : parseStoredJson(STORAGE_KEYS.recoveryDraft, null),
  );
  const [projectSnapshots, setProjectSnapshots] = useState(() =>
    typeof window === "undefined" ? [] : parseStoredJson(STORAGE_KEYS.projectSnapshots, []),
  );
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [reusableComponents, setReusableComponents] = useState(() =>
    typeof window === "undefined" ? [] : parseStoredJson(STORAGE_KEYS.reusableComponents, []),
  );
  const [componentLabel, setComponentLabel] = useState("");
  const [aiBusy, setAiBusy] = useState({
    planning: false,
    critique: false,
  });
  const [exportScale, setExportScale] = useState(2);
  const [transparentExport, setTransparentExport] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(true);
  const [exportBusy, setExportBusy] = useState({
    png: false,
    pdf: false,
  });

  const boardRef = useRef(null);
  const historyRef = useRef(createHistoryState());
  const dragHistoryCapturedRef = useRef(false);
  const projectImportInputRef = useRef(null);
  const projectFileHandleRef = useRef(null);
  const deferredQuery = useDeferredValue(libraryQuery.trim().toLowerCase());

  useEffect(() => {
    async function loadLibrary() {
      try {
        const response = await fetch("/data/library.packs.json");

        if (!response.ok) {
          throw new Error("Pack manifest unavailable.");
        }

        const payload = await response.json();
        const packs = parseLibraryPackManifest(payload);

        if (!packs.length) {
          throw new Error("Pack manifest is empty.");
        }

        setLibraryPacks(packs);
        setLibrary(flattenAssetPacks(packs));
        setLibraryStats(summarizeLibraryPacks(packs));
        setLibraryStatus("ready");
        return;
      } catch {}

      try {
        const [items] = await Promise.all([
          fetch("/data/bioicons.library.json").then((response) => {
            if (!response.ok) {
              throw new Error("Legacy library unavailable.");
            }

            return response.json();
          }),
        ]);

        const packs = createBuiltInPacksFromLegacyLibrary(items);
        setLibraryPacks(packs);
        setLibrary(flattenAssetPacks(packs));
        setLibraryStats(summarizeLibraryPacks(packs));
        setLibraryStatus("ready");
      } catch {
        setLibraryStatus("error");
      }
    }

    loadLibrary();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const exampleId = searchParams.get("example");
    const focus = searchParams.get("focus");

    if (exampleId) {
      const example = EXAMPLE_PROJECTS.find((item) => item.id === exampleId);

      if (example) {
        projectFileHandleRef.current = null;
        replaceProjectWorkspace(example.project, {
          fileName: `${example.id}.helixcanvas.json`,
        });
        setBrief(example.brief);
      }
    }

    if (focus === "workspace") {
      window.setTimeout(() => {
        window.scrollTo({ top: 420, behavior: "auto" });
      }, 120);
    }
  }, []);

  useEffect(() => {
    fetchAiHealth()
      .then((payload) => {
        setAiStatus({
          checking: false,
          configured: Boolean(payload.configured),
          model: payload.model ?? "",
          error: "",
        });
      })
      .catch((error) => {
        setAiStatus({
          checking: false,
          configured: false,
          model: "",
          error: error instanceof Error ? error.message : "AI service unavailable.",
        });
      });
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.project, JSON.stringify(project));
  }, [project]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.importedAssets, JSON.stringify(importedAssets));
  }, [importedAssets]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.favoriteAssets, JSON.stringify(favoriteAssetIds));
  }, [favoriteAssetIds]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.recentAssets, JSON.stringify(recentAssetIds));
  }, [recentAssetIds]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.projectMeta,
      JSON.stringify({
        fileName: projectFileName,
        savedUpdatedAt: savedProjectUpdatedAt,
      }),
    );
  }, [projectFileName, savedProjectUpdatedAt]);

  useEffect(() => {
    if (!recoveryDraft) {
      window.localStorage.removeItem(STORAGE_KEYS.recoveryDraft);
      return;
    }

    window.localStorage.setItem(STORAGE_KEYS.recoveryDraft, JSON.stringify(recoveryDraft));
  }, [recoveryDraft]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.projectSnapshots, JSON.stringify(projectSnapshots));
  }, [projectSnapshots]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.reusableComponents,
      JSON.stringify(reusableComponents),
    );
  }, [reusableComponents]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = window.setTimeout(() => setNotice(""), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const unifiedLibrary = [...importedAssets, ...library];

    if (!aiPlan?.assetQueries?.length) {
      setAiSuggestions([]);
      return;
    }

    setAiSuggestions(buildAiSuggestions(aiPlan.assetQueries, unifiedLibrary));
  }, [aiPlan, importedAssets, library]);

  useEffect(() => {
    if (!dragState) {
      return undefined;
    }

    function updateDrag(event) {
      const board = boardRef.current;

      if (!board) {
        return;
      }

      const rect = board.getBoundingClientRect();
      const x = (event.clientX - rect.left) / zoom;
      const y = (event.clientY - rect.top) / zoom;

      if (dragState.kind === "nodes") {
        const deltaX = x - dragState.startPoint.x;
        const deltaY = y - dragState.startPoint.y;
        const baseMoveX = snapToGrid ? Math.round(deltaX / GRID_SIZE) * GRID_SIZE : deltaX;
        const baseMoveY = snapToGrid ? Math.round(deltaY / GRID_SIZE) * GRID_SIZE : deltaY;
        const guideState = findAlignmentGuides(
          project.nodes,
          dragState.ids,
          dragState.originPositions,
          baseMoveX,
          baseMoveY,
        );

        setDragState((currentState) =>
          currentState?.kind === "nodes"
            ? {
                ...currentState,
                guides: guideState.guides,
              }
            : currentState,
        );

        setProject((current) => {
          const selectedIdSet = new Set(dragState.ids);
          const moveX = guideState.adjustedDeltaX;
          const moveY = guideState.adjustedDeltaY;
          let changed = false;

          const nodes = current.nodes.map((item) => {
            if (!selectedIdSet.has(item.id)) {
              return item;
            }

            const origin = dragState.originPositions[item.id];

            if (!origin) {
              return item;
            }

            const nextX = Math.max(0, origin.x + moveX);
            const nextY = Math.max(0, origin.y + moveY);

            if (nextX === item.x && nextY === item.y) {
              return item;
            }

            changed = true;
            return {
              ...item,
              x: nextX,
              y: nextY,
            };
          });

          if (!changed) {
            return current;
          }

          if (!dragHistoryCapturedRef.current) {
            historyRef.current = pushHistoryState(historyRef.current, current);
            dragHistoryCapturedRef.current = true;
            setHistoryVersion((value) => value + 1);
          }

          return {
            ...current,
            nodes,
            updatedAt: new Date().toISOString(),
          };
        });
      }

      if (dragState.kind === "marquee") {
        const nextPoint = { x, y };
        const nextRect = getMarqueeRect(dragState.startPoint, nextPoint);
        const ids = getMarqueeSelectionIds(project.nodes, nextRect);
        const nextIds = dragState.baseSelectionIds.length
          ? [...dragState.baseSelectionIds, ...ids]
          : ids;

        setDragState((currentState) =>
          currentState?.kind === "marquee"
            ? {
                ...currentState,
                currentPoint: nextPoint,
              }
            : currentState,
        );
        setSelection(createNodeSelection(nextIds));
      }

      if (dragState.kind === "connector") {
        setProject((current) => {
          const connector = current.connectors.find((item) => item.id === dragState.id);

          if (!connector) {
            return current;
          }

          const nextHandle = {
            x: snapValue(x, snapToGrid),
            y: snapValue(y, snapToGrid),
          };
          const currentHandle = connector[dragState.handle];

          if (nextHandle.x === currentHandle.x && nextHandle.y === currentHandle.y) {
            return current;
          }

          if (!dragHistoryCapturedRef.current) {
            historyRef.current = pushHistoryState(historyRef.current, current);
            dragHistoryCapturedRef.current = true;
            setHistoryVersion((value) => value + 1);
          }

          return {
            ...current,
            connectors: current.connectors.map((item) =>
              item.id === dragState.id
                ? {
                    ...item,
                    [dragState.handle]: nextHandle,
                  }
                : item,
            ),
            updatedAt: new Date().toISOString(),
          };
        });
      }
    }

    function stopDrag() {
      if (dragState?.kind === "marquee") {
        const rect = getMarqueeRect(dragState.startPoint, dragState.currentPoint);
        const isClick = rect.width < 4 && rect.height < 4;

        if (isClick) {
          setSelection(createNodeSelection(dragState.baseSelectionIds));
        }
      }

      dragHistoryCapturedRef.current = false;
      setDragState(null);
    }

    window.addEventListener("pointermove", updateDrag);
    window.addEventListener("pointerup", stopDrag);

    return () => {
      window.removeEventListener("pointermove", updateDrag);
      window.removeEventListener("pointerup", stopDrag);
    };
  }, [dragState, project.nodes, snapToGrid, zoom]);

  const unifiedLibrary = [...importedAssets, ...library];
  const totalCounts = summarizeCounts(unifiedLibrary);
  const packOptions = [{ id: "all", title: "All packs" }, ...libraryPacks];
  const usedAssetIds = [
    ...new Set(
      project.nodes
        .filter((node) => node.type === "asset" && node.assetId)
        .map((node) => node.assetId),
    ),
  ];
  const categories = [
    "all",
    ...[...new Set(unifiedLibrary.map((item) => item.categoryLabel))].sort(),
  ];
  const filteredLibrary = sortLibraryAssets(
    unifiedLibrary.filter((asset) => {
      const matchesSource = sourceFilter === "all" || asset.sourceBucket === sourceFilter;
      const matchesPack = packFilter === "all" || asset.packId === packFilter;
      const matchesCategory = categoryFilter === "all" || asset.categoryLabel === categoryFilter;
      const matchesQuery =
        !deferredQuery ||
        asset.title.toLowerCase().includes(deferredQuery) ||
        asset.searchText?.includes(deferredQuery);

      return matchesSource && matchesPack && matchesCategory && matchesQuery;
    }),
    {
      sortMode,
      favoriteAssetIds,
      recentAssetIds,
      usedAssetIds,
    },
  );

  const selectedNodes = getSelectedNodes(project, selection);
  const selectedNodeIds = selectedNodes.map((node) => node.id);
  const selectedNode = selectedNodes.length === 1 ? selectedNodes[0] : null;
  const selectedConnector =
    selection?.kind === "connector"
      ? project.connectors.find((connector) => connector.id === selection.id) ?? null
      : null;
  const selectedComment =
    selection?.kind === "comment"
      ? project.comments.find((comment) => comment.id === selection.id) ?? null
      : null;
  const hasNodeSelection = selectedNodes.length > 0;
  const hasLockedSelectedNodes = selectedNodes.some((node) => node.locked);
  const allSelectedNodesHidden = hasNodeSelection && selectedNodes.every((node) => node.hidden);
  const allSelectedNodesLocked = hasNodeSelection && selectedNodes.every((node) => node.locked);
  const sharedGroupId =
    hasNodeSelection &&
    selectedNodes.every((node) => node.groupId) &&
    new Set(selectedNodes.map((node) => node.groupId)).size === 1
      ? selectedNodes[0].groupId
      : null;
  const sharedGroupNodeIds = sharedGroupId
    ? project.nodes.filter((node) => node.groupId === sharedGroupId).map((node) => node.id)
    : [];
  const isWholeGroupSelected =
    sharedGroupId &&
    sharedGroupNodeIds.length === selectedNodeIds.length &&
    sharedGroupNodeIds.every((id) => selectedNodeIds.includes(id));
  const groupBadge = sharedGroupId ? describeGroup(sharedGroupId, sharedGroupNodeIds.length) : "";
  const selectionLabel = selectedNode
    ? selectedNode.title ?? selectedNode.text
    : hasNodeSelection
      ? groupBadge || `${selectedNodes.length} layers`
      : selectedComment
        ? `Review note · ${selectedComment.author}`
      : selectedConnector
        ? "Connector"
        : "Nothing selected";
  const marqueeRect = dragState?.kind === "marquee"
    ? getMarqueeRect(dragState.startPoint, dragState.currentPoint)
    : null;
  const dragGuides = dragState?.kind === "nodes" ? dragState.guides ?? [] : [];
  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;
  const openCommentCount = countOpenReviewComments(project.comments ?? []);
  const positionedComments = (project.comments ?? []).map((comment) => ({
    comment,
    position: resolveReviewCommentPosition(comment, project.nodes),
  }));
  const favoriteAssets = favoriteAssetIds
    .map((id) => unifiedLibrary.find((asset) => asset.id === id))
    .filter(Boolean)
    .slice(0, 6);
  const recentAssets = recentAssetIds
    .map((id) => unifiedLibrary.find((asset) => asset.id === id))
    .filter(Boolean)
    .slice(0, 6);
  const projectFileLabel = projectFileName || suggestProjectFilename(project.name);
  const hasUnsavedChanges = savedProjectUpdatedAt !== project.updatedAt;

  function applyProjectChange(updater, options = {}) {
    const { selection: nextSelection, notice: noticeMessage } = options;

    setProject((current) => {
      const nextProject = typeof updater === "function" ? updater(current) : updater;

      if (!nextProject || nextProject === current) {
        return current;
      }

      historyRef.current = pushHistoryState(historyRef.current, current);
      setHistoryVersion((value) => value + 1);

      return {
        ...nextProject,
        updatedAt: new Date().toISOString(),
      };
    });

    if (nextSelection !== undefined) {
      setSelection(nextSelection);
    }

    if (noticeMessage) {
      setNotice(noticeMessage);
    }
  }

  function stageRecoveryDraft(reason) {
    setRecoveryDraft({
      reason,
      capturedAt: new Date().toISOString(),
      fileName: projectFileName,
      savedUpdatedAt: savedProjectUpdatedAt,
      project,
    });
  }

  function replaceProjectWorkspace(nextProject, options = {}) {
    const preparedProject = prepareLoadedProject(nextProject);
    const {
      fileName = "",
      savedUpdatedAt: savedAt = preparedProject.updatedAt,
      notice: noticeMessage = "",
      stageReason = "",
    } = options;

    if (stageReason) {
      stageRecoveryDraft(stageReason);
    }

    historyRef.current = createHistoryState();
    setHistoryVersion((value) => value + 1);
    setProject(preparedProject);
    setSelection(null);
    setBrief(preparedProject.brief ?? "");
    setAiPlan(null);
    setAiCritique(null);
    setAiSuggestions([]);
    setProjectFileName(fileName);
    setSavedProjectUpdatedAt(savedAt);

    if (noticeMessage) {
      setNotice(noticeMessage);
    }
  }

  function restoreRecoveryDraft() {
    if (!recoveryDraft?.project) {
      setNotice("No recovery draft is available");
      return;
    }

    replaceProjectWorkspace(recoveryDraft.project, {
      fileName: recoveryDraft.fileName ?? "",
      savedUpdatedAt: recoveryDraft.savedUpdatedAt ?? null,
      notice: "Restored recovery draft",
    });
  }

  function clearRecoveryDraft() {
    setRecoveryDraft(null);
    setNotice("Cleared recovery draft");
  }

  function saveProjectSnapshot(options = {}) {
    const snapshot = createProjectSnapshot(project, {
      label: options.label ?? snapshotLabel,
      fileName: projectFileName,
      savedUpdatedAt: savedProjectUpdatedAt,
    });

    setProjectSnapshots((current) => pushProjectSnapshot(current, snapshot));
    setSnapshotLabel("");
    setNotice(`Saved snapshot: ${snapshot.label}`);
  }

  function restoreProjectSnapshot(snapshot) {
    if (!snapshot?.project) {
      setNotice("That snapshot is no longer available");
      return;
    }

    projectFileHandleRef.current = null;
    replaceProjectWorkspace(snapshot.project, {
      fileName: snapshot.fileName ?? "",
      savedUpdatedAt: snapshot.savedUpdatedAt ?? null,
      notice: `Restored snapshot: ${snapshot.label}`,
      stageReason: `Restored snapshot ${snapshot.label}`,
    });
  }

  function deleteProjectSnapshot(snapshotId) {
    setProjectSnapshots((current) => removeProjectSnapshot(current, snapshotId));
    setNotice("Deleted snapshot");
  }

  function saveSelectionAsReusableComponent() {
    if (!hasNodeSelection) {
      setNotice("Select layers first, then save them as a reusable component");
      return;
    }

    const component = createReusableComponent(selectedNodes, {
      label: componentLabel,
    });

    setReusableComponents((current) => pushReusableComponent(current, component));
    setComponentLabel("");
    setNotice(`Saved reusable component: ${component.label}`);
  }

  function insertReusableComponent(component) {
    const position = {
      x: 140 + project.nodes.length * 10,
      y: 140 + project.nodes.length * 8,
    };
    const nodes = instantiateReusableComponent(component, {
      createId,
      position,
    }).map(withNodeState);

    applyProjectChange(
      (current) => ({
        ...current,
        nodes: [...current.nodes, ...nodes],
      }),
      {
        selection: createNodeSelection(nodes.map((node) => node.id)),
        notice: `Inserted component: ${component.label}`,
      },
    );
  }

  function deleteReusableComponent(componentId) {
    setReusableComponents((current) => removeReusableComponent(current, componentId));
    setNotice("Deleted reusable component");
  }

  function addAnnotationBlock(kind) {
    const position = {
      x: 180 + project.nodes.length * 10,
      y: 140 + project.nodes.length * 8,
    };
    const nodes =
      kind === "callout"
        ? createCalloutAnnotation(position)
        : kind === "legend"
          ? createLegendAnnotation(position)
          : createScaleBarAnnotation(position);

    applyProjectChange(
      (current) => ({
        ...current,
        nodes: [...current.nodes, ...nodes],
      }),
      {
        selection: createNodeSelection(nodes.map((node) => node.id)),
        notice:
          kind === "callout"
            ? "Added callout block"
            : kind === "legend"
              ? "Added legend block"
              : "Added scale bar",
      },
    );
  }

  function addReviewComment(options = {}) {
    const linkedNode = options.nodeId
      ? project.nodes.find((node) => node.id === options.nodeId) ?? null
      : options.attachToSelection
        ? selectedNodes[0] ?? null
        : null;
    const linkedNodeBounds = linkedNode ? getNodeBounds(linkedNode) : null;
    const position = {
      x: options.x ?? (linkedNodeBounds ? linkedNodeBounds.right - 16 : 140 + project.comments.length * 18),
      y: options.y ?? (linkedNodeBounds ? Math.max(24, linkedNodeBounds.top - 16) : 140 + project.comments.length * 18),
    };
    const comment = createReviewComment({
      id: createId("comment"),
      body:
        options.body ??
        (linkedNode
          ? `Review ${linkedNode.title ?? linkedNode.text ?? "this layer"} and tighten the explanation.`
          : "Add a review note for this figure."),
      author: options.author ?? "Reviewer",
      nodeId: linkedNode?.id ?? null,
      x: position.x,
      y: position.y,
    });

    applyProjectChange(
      (current) => ({
        ...current,
        comments: [...(current.comments ?? []), comment],
      }),
      {
        selection: { kind: "comment", id: comment.id },
        notice: linkedNode ? "Added a pinned comment on the selected layer" : "Added a board review note",
      },
    );
  }

  function addCommentOnSelection() {
    if (!hasNodeSelection) {
      setNotice("Select a layer first, or add a board note instead");
      return;
    }

    addReviewComment({ attachToSelection: true });
  }

  function addBoardComment() {
    addReviewComment({
      x: project.board.width - 220,
      y: 104 + project.comments.length * 24,
    });
  }

  function focusReviewComment(commentId) {
    setSelection({ kind: "comment", id: commentId });
  }

  function updateSelectedComment(patch) {
    if (!selectedComment) {
      return;
    }

    applyProjectChange((current) => ({
      ...current,
      comments: (current.comments ?? []).map((comment) =>
        comment.id === selectedComment.id
          ? normalizeReviewComment({
              ...comment,
              ...patch,
              updatedAt: new Date().toISOString(),
            })
          : comment,
      ),
    }));
  }

  function toggleReviewCommentStatus(commentId) {
    const comment = (project.comments ?? []).find((item) => item.id === commentId);

    if (!comment) {
      return;
    }

    applyProjectChange((current) => ({
      ...current,
      comments: (current.comments ?? []).map((item) =>
        item.id === commentId
          ? normalizeReviewComment({
              ...item,
              status: item.status === "resolved" ? "open" : "resolved",
              updatedAt: new Date().toISOString(),
            })
          : item,
      ),
    }));
  }

  function deleteReviewComment(commentId) {
    applyProjectChange(
      (current) => ({
        ...current,
        comments: (current.comments ?? []).filter((comment) => comment.id !== commentId),
      }),
      {
        selection: selection?.kind === "comment" && selection.id === commentId ? null : selection,
        notice: "Deleted review comment",
      },
    );
  }

  function requestProjectOpen() {
    projectImportInputRef.current?.click();
  }

  function loadExampleProject(example) {
    projectFileHandleRef.current = null;
    replaceProjectWorkspace(example.project, {
      fileName: `${example.id}.helixcanvas.json`,
      notice: `Loaded example: ${example.title}`,
      stageReason: `Loaded example ${example.title}`,
    });
    setBrief(example.brief);
  }

  function useExampleBrief(example) {
    setBrief(example.brief);
    setNotice(`Loaded example brief for ${example.title}`);
  }

  async function saveProjectFile(options = {}) {
    const { saveAs = false } = options;
    const projectDocument = createProjectDocument(project);
    const contents = JSON.stringify(projectDocument, null, 2);
    const fallbackName = projectFileLabel;

    try {
      if ("showSaveFilePicker" in window) {
        let handle = projectFileHandleRef.current;

        if (saveAs || !handle) {
          handle = await window.showSaveFilePicker({
            suggestedName: fallbackName,
            types: [
              {
                description: "HelixCanvas project",
                accept: {
                  "application/json": [".json"],
                },
              },
            ],
          });
          projectFileHandleRef.current = handle;
        }

        const writable = await handle.createWritable();
        await writable.write(contents);
        await writable.close();

        setProjectFileName(handle.name || fallbackName);
        setSavedProjectUpdatedAt(project.updatedAt);
        setNotice(`Saved ${handle.name || fallbackName}`);
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }

    downloadText(fallbackName, contents, "application/json");
    setProjectFileName(fallbackName);
    setSavedProjectUpdatedAt(project.updatedAt);
    setNotice(`Downloaded ${fallbackName}`);
  }

  async function importProjectFromFile(event) {
    const [file] = event.target.files ?? [];

    if (!file) {
      return;
    }

    try {
      const parsed = parseProjectDocument(await file.text());
      projectFileHandleRef.current = null;
      replaceProjectWorkspace(parsed.project, {
        fileName: file.name,
        notice: `Opened ${file.name}`,
        stageReason: `Opened ${file.name}`,
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not open that project file");
    } finally {
      event.target.value = "";
    }
  }

  function getNodeInteractionIds(nodeId) {
    const node = project.nodes.find((item) => item.id === nodeId);

    if (!node) {
      return [];
    }

    if (!node.groupId) {
      return [nodeId];
    }

    const groupedIds = project.nodes
      .filter((item) => item.groupId === node.groupId)
      .map((item) => item.id);

    return groupedIds.length ? groupedIds : [nodeId];
  }

  function setNodeSelection(ids) {
    setSelection(createNodeSelection(ids));
  }

  function toggleNodeSelection(nodeId) {
    const interactionIds = getNodeInteractionIds(nodeId);

    setSelection((currentSelection) => {
      const currentIds = isNodeSelection(currentSelection) ? currentSelection.ids : [];
      const hasAllIds = interactionIds.every((id) => currentIds.includes(id));
      const nextIds = hasAllIds
        ? currentIds.filter((id) => !interactionIds.includes(id))
        : [...currentIds, ...interactionIds];
      return createNodeSelection(nextIds);
    });
  }

  function groupSelection() {
    if (selectedNodes.length < 2) {
      setNotice("Select at least two layers to group them");
      return;
    }

    if (sharedGroupId && isWholeGroupSelected) {
      setNotice("Selection is already grouped");
      return;
    }

    const nextGroupId = createId("group");

    applyProjectChange(
      (current) => ({
        ...current,
        nodes: current.nodes.map((node) =>
          selectedNodeIds.includes(node.id)
            ? {
                ...node,
                groupId: nextGroupId,
              }
            : node,
        ),
      }),
      {
        selection: createNodeSelection(selectedNodeIds),
        notice: "Grouped selected layers",
      },
    );
  }

  function ungroupSelection() {
    if (!hasNodeSelection) {
      return;
    }

    applyProjectChange(
      (current) => ({
        ...current,
        nodes: current.nodes.map((node) =>
          selectedNodeIds.includes(node.id)
            ? {
                ...node,
                groupId: null,
              }
            : node,
        ),
      }),
      {
        selection: createNodeSelection(selectedNodeIds),
        notice: "Ungrouped selected layers",
      },
    );
  }

  function selectSharedGroup() {
    if (!sharedGroupNodeIds.length) {
      return;
    }

    setNodeSelection(sharedGroupNodeIds);
    setNotice("Selected the full group");
  }

  function setNodesHidden(nodeIds, hidden) {
    if (!nodeIds.length) {
      return;
    }

    applyProjectChange(
      (current) => ({
        ...current,
        nodes: current.nodes.map((node) =>
          nodeIds.includes(node.id) ? { ...node, hidden } : node,
        ),
      }),
      { selection: createNodeSelection(nodeIds) },
    );
  }

  function setNodesLocked(nodeIds, locked) {
    if (!nodeIds.length) {
      return;
    }

    applyProjectChange(
      (current) => ({
        ...current,
        nodes: current.nodes.map((node) =>
          nodeIds.includes(node.id) ? { ...node, locked } : node,
        ),
      }),
      { selection: createNodeSelection(nodeIds) },
    );
  }

  function toggleNodeHidden(nodeId) {
    const node = project.nodes.find((item) => item.id === nodeId);

    if (!node) {
      return;
    }

    setNodesHidden([nodeId], !node.hidden);
  }

  function toggleNodeLocked(nodeId) {
    const node = project.nodes.find((item) => item.id === nodeId);

    if (!node) {
      return;
    }

    setNodesLocked([nodeId], !node.locked);
  }

  function toggleSelectedNodesHidden() {
    setNodesHidden(selectedNodeIds, !allSelectedNodesHidden);
  }

  function toggleSelectedNodesLocked() {
    setNodesLocked(selectedNodeIds, !allSelectedNodesLocked);
  }

  function handleLayerSelect(node, event) {
    if (event.shiftKey) {
      toggleNodeSelection(node.id);
      return;
    }

    setNodeSelection(getNodeInteractionIds(node.id));
  }

  function handleCanvasPointerDown(event) {
    const isBoardTarget =
      event.target === event.currentTarget || event.target.classList?.contains("connector-layer");

    if (!isBoardTarget) {
      return;
    }

    const board = boardRef.current;

    if (!board) {
      return;
    }

    const rect = board.getBoundingClientRect();
    const point = {
      x: (event.clientX - rect.left) / zoom,
      y: (event.clientY - rect.top) / zoom,
    };
    const baseSelectionIds = event.shiftKey && isNodeSelection(selection) ? selection.ids : [];

    if (!event.shiftKey) {
      setSelection(null);
    }

    setDragState({
      kind: "marquee",
      startPoint: point,
      currentPoint: point,
      baseSelectionIds,
    });
  }

  function handleNodePointerDown(node, event) {
    event.preventDefault();
    event.stopPropagation();

    const interactionIds = getNodeInteractionIds(node.id);

    if (event.shiftKey) {
      toggleNodeSelection(node.id);
      return;
    }

    const currentIds =
      isNodeSelection(selection) && interactionIds.every((id) => selection.ids.includes(id))
        ? selection.ids
        : interactionIds;
    const dragNodes = project.nodes.filter((item) => currentIds.includes(item.id));

    setNodeSelection(currentIds);

    if (node.locked) {
      return;
    }

    if (dragNodes.some((item) => item.locked)) {
      setNotice("Unlock selected layers before moving them together");
      return;
    }

    const rect = boardRef.current?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
    setDragState({
      kind: "nodes",
      ids: currentIds,
      guides: [],
      startPoint: {
        x: (event.clientX - rect.left) / zoom,
        y: (event.clientY - rect.top) / zoom,
      },
      originPositions: Object.fromEntries(
        dragNodes.map((item) => [item.id, { x: item.x, y: item.y }]),
      ),
    });
  }

  function undoProject() {
    setProject((current) => {
      const result = undoHistoryState(historyRef.current, current);

      if (!result.changed) {
        return current;
      }

      historyRef.current = result.history;
      setHistoryVersion((value) => value + 1);
      return result.project;
    });
    setSelection(null);
  }

  function redoProject() {
    setProject((current) => {
      const result = redoHistoryState(historyRef.current, current);

      if (!result.changed) {
        return current;
      }

      historyRef.current = result.history;
      setHistoryVersion((value) => value + 1);
      return result.project;
    });
    setSelection(null);
  }

  function registerAssetUsage(asset) {
    setRecentAssetIds((current) => pushRecentAsset(current, asset.id));
  }

  function toggleFavorite(assetId) {
    setFavoriteAssetIds((current) => toggleFavoriteAssetId(current, assetId));
  }

  useEffect(() => {
    function handleKeydown(event) {
      if (isTypingTarget(event.target)) {
        return;
      }

      const metaKey = event.metaKey || event.ctrlKey;

      if (metaKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveProjectFile();
        return;
      }

      if (metaKey && event.key.toLowerCase() === "o") {
        event.preventDefault();
        requestProjectOpen();
        return;
      }

      if (metaKey && event.key.toLowerCase() === "z" && event.shiftKey) {
        event.preventDefault();
        redoProject();
        return;
      }

      if (metaKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undoProject();
        return;
      }

      if (metaKey && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redoProject();
        return;
      }

      if (metaKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setNodeSelection(project.nodes.map((node) => node.id));
        return;
      }

      if (metaKey && event.key.toLowerCase() === "g" && event.shiftKey) {
        event.preventDefault();
        ungroupSelection();
        return;
      }

      if (metaKey && event.key.toLowerCase() === "g") {
        event.preventDefault();
        groupSelection();
        return;
      }

      if (metaKey && event.key.toLowerCase() === "d" && hasNodeSelection) {
        event.preventDefault();

        if (hasLockedSelectedNodes) {
          setNotice("Unlock selected layers before duplicating them");
          return;
        }

        duplicateSelection();
        return;
      }

      if (!selection) {
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();

        if (isNodeSelection(selection) && hasLockedSelectedNodes) {
          setNotice("Unlock selected layers before deleting them");
          return;
        }

        applyProjectChange(
          (current) =>
            isNodeSelection(selection)
              ? {
                  ...current,
                  nodes: current.nodes.filter((node) => !selection.ids.includes(node.id)),
                }
              : selection.kind === "comment"
                ? {
                    ...current,
                    comments: (current.comments ?? []).filter((comment) => comment.id !== selection.id),
                  }
              : {
                  ...current,
                  connectors: current.connectors.filter((connector) => connector.id !== selection.id),
                },
          { selection: null },
        );
        return;
      }

      if (hasNodeSelection && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault();

        if (hasLockedSelectedNodes) {
          setNotice("Unlock selected layers before moving them");
          return;
        }

        const step = event.shiftKey ? GRID_SIZE : 8;
        const deltaX = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
        const deltaY = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
        const selectedIdSet = new Set(selectedNodeIds);

        applyProjectChange((current) => ({
          ...current,
          nodes: current.nodes.map((node) =>
            selectedIdSet.has(node.id)
              ? {
                  ...node,
                  x: Math.max(0, snapValue(node.x + deltaX, snapToGrid && event.shiftKey)),
                  y: Math.max(0, snapValue(node.y + deltaY, snapToGrid && event.shiftKey)),
                }
              : node,
          ),
        }));
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [groupSelection, hasLockedSelectedNodes, hasNodeSelection, historyVersion, project.nodes, selectedNodeIds, selection, snapToGrid, ungroupSelection]);

  function addAssetToCanvas(asset) {
    const offset = 120 + project.nodes.length * 18;
    const newNode = makeAssetNode(asset, { x: offset, y: 140 + project.nodes.length * 10 });

    applyProjectChange(
      (current) => ({
        ...current,
        nodes: [...current.nodes, newNode],
      }),
      { selection: createNodeSelection([newNode.id]) },
    );
    registerAssetUsage(asset);
  }

  function addShape(shape) {
    const newNode = makeShapeNode(shape, shape === "circle" ? "Note" : "Step", {
      x: 180 + project.nodes.length * 14,
      y: 180 + project.nodes.length * 10,
    });

    applyProjectChange(
      (current) => ({
        ...current,
        nodes: [...current.nodes, newNode],
      }),
      { selection: createNodeSelection([newNode.id]) },
    );
  }

  function addText() {
    const newNode = makeTextNode({
      x: 220 + project.nodes.length * 10,
      y: 120 + project.nodes.length * 12,
    });

    applyProjectChange(
      (current) => ({
        ...current,
        nodes: [...current.nodes, newNode],
      }),
      { selection: createNodeSelection([newNode.id]) },
    );
  }

  function addConnector() {
    const connector = {
      id: createId("connector"),
      from: { x: 340, y: 320 },
      to: { x: 520, y: 320 },
      stroke: project.palette?.accent ?? "#155e75",
      strokeWidth: 4,
    };

    applyProjectChange(
      (current) => ({
        ...current,
        connectors: [...current.connectors, connector],
      }),
      { selection: { kind: "connector", id: connector.id } },
    );
  }

  function insertPanelLayout(presetId) {
    const layout = buildPanelLayout(presetId, project.board, project.palette, createId);

    applyProjectChange(
      (current) => ({
        ...current,
        nodes: [...layout.nodes, ...current.nodes],
      }),
      {
        selection: createNodeSelection(layout.nodes.map((node) => node.id)),
        notice: `Inserted ${layout.preset.title} panel layout`,
      },
    );
  }

  function placeSelectionIntoLayout(presetId) {
    if (!hasNodeSelection) {
      setNotice("Select layers first, then place them into a panel layout");
      return;
    }

    const cellCount = getPanelCellCount(presetId);

    if (selectedNodes.length > cellCount) {
      setNotice(`This layout holds ${cellCount} slots, but ${selectedNodes.length} layers are selected`);
      return;
    }

    if (hasLockedSelectedNodes) {
      setNotice("Unlock selected layers before placing them into a layout");
      return;
    }

    const layout = buildPanelLayout(presetId, project.board, project.palette, createId);

    applyProjectChange(
      (current) => ({
        ...current,
        nodes: placeNodesIntoPanelLayout(current.nodes, selectedNodeIds, layout.cells),
      }),
      {
        selection: createNodeSelection(selectedNodeIds),
        notice: `Placed selection into ${layout.preset.title}`,
      },
    );
  }

  function applyTemplate(template) {
    startTransition(() => {
      stageRecoveryDraft(`Loaded template ${template.name}`);
      applyProjectChange(normalizeTemplate(template), {
        selection: null,
        notice: `Loaded ${template.name}`,
      });
    });
  }

  function draftFromBrief() {
    const template = inferTemplateFromBrief(brief);

    if (!template) {
      return;
    }

    const draftedProject = normalizeTemplate(template);
    draftedProject.name = brief ? brief.slice(0, 48) : template.name;
    draftedProject.brief = brief || template.summary;

    startTransition(() => {
      stageRecoveryDraft("Created a quick draft from the brief");
      applyProjectChange(draftedProject, {
        selection: null,
        notice: "Drafted a layout from your brief",
      });
    });
  }

  function applyAiPlan(plan) {
    const draftedProject = createPlanProject(plan);

    startTransition(() => {
      stageRecoveryDraft("Applied an AI figure draft");
      applyProjectChange(draftedProject, {
        selection: null,
        notice: "Applied AI figure plan",
      });
    });
  }

  async function copyTextValue(text, successMessage) {
    if (!text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setNotice(successMessage);
    } catch {
      downloadText("helixcanvas-ai-note.txt", text);
      setNotice("Clipboard unavailable, downloaded text instead");
    }
  }

  async function draftWithAi() {
    if (!brief.trim()) {
      setNotice("Add a research brief first");
      return;
    }

    if (!aiStatus.configured) {
      draftFromBrief();
      setNotice("AI unavailable, used the local quick draft");
      return;
    }

    setAiBusy((current) => ({ ...current, planning: true }));

    try {
      const response = await requestFigurePlan({
        brief,
        currentProject: buildProjectSummaryForAi(project),
      });

      setAiPlan(response.plan);
      setAiCritique(null);
      applyAiPlan(response.plan);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "AI drafting failed");
    } finally {
      setAiBusy((current) => ({ ...current, planning: false }));
    }
  }

  async function critiqueWithAi() {
    if (!aiStatus.configured) {
      setNotice(aiStatus.error || "AI critique is unavailable until the server is configured");
      return;
    }

    setAiBusy((current) => ({ ...current, critique: true }));

    try {
      const response = await requestFigureCritique({
        brief: brief || project.brief,
        currentProject: buildProjectSummaryForAi(project),
      });

      setAiCritique(response.critique);
      setNotice("AI critique ready");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "AI critique failed");
    } finally {
      setAiBusy((current) => ({ ...current, critique: false }));
    }
  }

  function focusSuggestionSearch(suggestion) {
    setLibraryQuery(suggestion.query);
    setSourceFilter(suggestion.preferredSourceBucket);
    setPackFilter("all");
    setCategoryFilter("all");
    setNotice(`Focused the library on "${suggestion.query}"`);
  }

  function focusPack(packId) {
    setPackFilter(packId);
    setSourceFilter("all");
    setCategoryFilter("all");
    setNotice(packId === "all" ? "Showing every installed pack" : "Focused the library on one pack");
  }

  function focusSource(sourceBucket) {
    const sourceLabel =
      SOURCE_FILTERS.find((filter) => filter.id === sourceBucket)?.label ?? sourceBucket;
    setSourceFilter(sourceBucket);
    setPackFilter("all");
    setCategoryFilter("all");
    setNotice(`Focused the library on ${sourceLabel}`);
  }

  function updateSelectedNode(patch) {
    if (!selectedNode) {
      return;
    }

    if (selectedNode.locked) {
      setNotice("Unlock this layer before editing it");
      return;
    }

    applyProjectChange((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === selectedNode.id ? { ...node, ...patch } : node,
      ),
    }));
  }

  function updateSelectedConnector(patch) {
    if (!selectedConnector) {
      return;
    }

    applyProjectChange((current) => ({
      ...current,
      connectors: current.connectors.map((connector) =>
        connector.id === selectedConnector.id ? { ...connector, ...patch } : connector,
      ),
    }));
  }

  function alignSelection(mode) {
    if (selectedNodes.length < 2) {
      return;
    }

    if (hasLockedSelectedNodes) {
      setNotice("Unlock selected layers before aligning them");
      return;
    }

    applyProjectChange(
      (current) => {
        const nodes = alignSelectedNodes(current.nodes, selectedNodeIds, mode);
        const changed = nodes.some((node, index) => node !== current.nodes[index]);
        return changed
          ? {
              ...current,
              nodes,
            }
          : current;
      },
      { selection: createNodeSelection(selectedNodeIds) },
    );
  }

  function distributeSelection(axis) {
    if (selectedNodes.length < 3) {
      return;
    }

    if (hasLockedSelectedNodes) {
      setNotice("Unlock selected layers before distributing them");
      return;
    }

    applyProjectChange(
      (current) => {
        const nodes = distributeSelectedNodes(current.nodes, selectedNodeIds, axis);
        const changed = nodes.some((node, index) => node !== current.nodes[index]);
        return changed
          ? {
              ...current,
              nodes,
            }
          : current;
      },
      { selection: createNodeSelection(selectedNodeIds) },
    );
  }

  function duplicateSelection() {
    if (!hasNodeSelection) {
      return;
    }

    if (hasLockedSelectedNodes) {
      setNotice("Unlock selected layers before duplicating them");
      return;
    }

    const duplicateGroupIds = new Map();
    const duplicates = selectedNodes.map((node) => ({
      ...node,
      id: createId("node"),
      groupId: node.groupId
        ? (duplicateGroupIds.has(node.groupId)
            ? duplicateGroupIds.get(node.groupId)
            : duplicateGroupIds.set(node.groupId, createId("group")).get(node.groupId))
        : null,
      x: node.x + 32,
      y: node.y + 32,
      locked: false,
      hidden: false,
    }));

    applyProjectChange(
      (current) => ({
        ...current,
        nodes: [...current.nodes, ...duplicates],
      }),
      { selection: createNodeSelection(duplicates.map((node) => node.id)) },
    );
  }

  function bringForward() {
    if (!hasNodeSelection) {
      return;
    }

    if (hasLockedSelectedNodes) {
      setNotice("Unlock selected layers before reordering them");
      return;
    }

    applyProjectChange((current) => {
      const selectedIdSet = new Set(selectedNodeIds);
      const nodes = [...current.nodes];
      let changed = false;

      for (let index = nodes.length - 2; index >= 0; index -= 1) {
        if (!selectedIdSet.has(nodes[index].id)) {
          continue;
        }

        let nextIndex = index + 1;

        while (nextIndex < nodes.length && selectedIdSet.has(nodes[nextIndex].id)) {
          nextIndex += 1;
        }

        if (nextIndex >= nodes.length) {
          continue;
        }

        [nodes[index], nodes[nextIndex]] = [nodes[nextIndex], nodes[index]];
        changed = true;
      }

      if (!changed) {
        return current;
      }
      return {
        ...current,
        nodes,
      };
    });
  }

  function sendBackward() {
    if (!hasNodeSelection) {
      return;
    }

    if (hasLockedSelectedNodes) {
      setNotice("Unlock selected layers before reordering them");
      return;
    }

    applyProjectChange((current) => {
      const selectedIdSet = new Set(selectedNodeIds);
      const nodes = [...current.nodes];
      let changed = false;

      for (let index = 1; index < nodes.length; index += 1) {
        if (!selectedIdSet.has(nodes[index].id)) {
          continue;
        }

        let previousIndex = index - 1;

        while (previousIndex >= 0 && selectedIdSet.has(nodes[previousIndex].id)) {
          previousIndex -= 1;
        }

        if (previousIndex < 0) {
          continue;
        }

        [nodes[index], nodes[previousIndex]] = [nodes[previousIndex], nodes[index]];
        changed = true;
      }

      if (!changed) {
        return current;
      }
      return {
        ...current,
        nodes,
      };
    });
  }

  function exportProjectSvg() {
    downloadText(
      buildExportFilename(project.name || "helixcanvas-export", "svg"),
      projectToSvg(project, { includeBackground: !transparentExport }),
      "image/svg+xml;charset=utf-8",
    );
    setNotice(transparentExport ? "Exported SVG without board background" : "Exported SVG");
  }

  async function exportProjectPng() {
    setExportBusy((current) => ({ ...current, png: true }));

    try {
      const { blob, warnings } = await createProjectPngBlob(project, {
        scale: exportScale,
        includeBackground: !transparentExport,
      });

      downloadBlob(buildExportFilename(project.name || "helixcanvas-export", "png"), blob);
      setNotice(
        warnings.length
          ? warnings[0]
          : transparentExport
            ? `Exported PNG at ${exportScale}x with transparency`
            : `Exported PNG at ${exportScale}x`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "PNG export failed");
    } finally {
      setExportBusy((current) => ({ ...current, png: false }));
    }
  }

  async function exportProjectPdf() {
    setExportBusy((current) => ({ ...current, pdf: true }));

    try {
      const { blob, warnings } = await createProjectPdfBlob(project, {
        scale: exportScale,
        includeBackground: !transparentExport,
      });

      downloadBlob(buildExportFilename(project.name || "helixcanvas-export", "pdf"), blob);
      setNotice(
        warnings.length
          ? warnings[0]
          : transparentExport
            ? `Exported PDF at ${exportScale}x with a white page background`
            : `Exported PDF at ${exportScale}x`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "PDF export failed");
    } finally {
      setExportBusy((current) => ({ ...current, pdf: false }));
    }
  }

  function exportProjectJson() {
    const projectDocument = createProjectDocument(project);
    downloadText(projectFileLabel, JSON.stringify(projectDocument, null, 2), "application/json");
    setNotice("Downloaded project file");
  }

  async function copyCitationBundle() {
    const citations = collectProjectCitations(project);

    if (!citations) {
      setNotice("No asset citations on the board yet");
      return;
    }

    try {
      await navigator.clipboard.writeText(citations);
      setNotice("Copied figure attributions");
    } catch {
      downloadText("helixcanvas-attributions.txt", citations);
      setNotice("Clipboard unavailable, downloaded attributions instead");
    }
  }

  function resetProject() {
    projectFileHandleRef.current = null;
    replaceProjectWorkspace(createStarterProject(), {
      notice: "Reset to starter project",
      stageReason: "Reset the current workspace",
    });
    setProjectFileName("");
    setSavedProjectUpdatedAt(null);
  }

  function importFromUrl() {
    if (!importUrl.trim()) {
      return;
    }

    const filename = importUrl.split("/").pop()?.split("?")[0] ?? "FigureLabs asset";
    const asset = {
      id: createId("import"),
      title: filename.replace(/\.[a-z0-9]+$/i, "").replaceAll("-", " "),
      searchText: filename.toLowerCase(),
      category: "User imports",
      categoryLabel: "User imports",
      sourceBucket: "figurelabs-import",
      sourceLabel: "FigureLabs Import",
      originLabel: "User-owned export",
      assetType: filename.endsWith(".png") ? "png" : "svg",
      assetUrl: importUrl.trim(),
      previewUrl: importUrl.trim(),
      sourcePage: importUrl.trim(),
      licenseLabel: "Review rights",
      licenseUrl: "",
      citation:
        "User imported asset. Confirm publication rights and attribution rules before submission.",
    };

    if (isDuplicateImportedAsset(importedAssets, asset)) {
      setNotice("That import is already in your library");
      return;
    }

    setImportedAssets((current) => [asset, ...current]);
    setImportUrl("");
    setNotice("Added a user-owned import");
  }

  function importFromFile(event) {
    const [file] = event.target.files ?? [];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const asset = {
        id: createId("import"),
        title: file.name.replace(/\.[a-z0-9]+$/i, "").replaceAll("-", " "),
        searchText: file.name.toLowerCase(),
        category: "User imports",
        categoryLabel: "User imports",
        sourceBucket: "figurelabs-import",
        sourceLabel: "FigureLabs Import",
        originLabel: "User-owned export",
        assetType: file.type.includes("png") ? "png" : "svg",
        assetUrl: reader.result,
        previewUrl: reader.result,
        sourcePage: "",
        licenseLabel: "Review rights",
        licenseUrl: "",
        citation:
          "User imported asset. Confirm publication rights and attribution rules before submission.",
      };

      if (isDuplicateImportedAsset(importedAssets, asset)) {
        setNotice(`${file.name} is already in your library`);
        return;
      }

      setImportedAssets((current) => [asset, ...current]);
      setNotice(`Imported ${file.name}`);
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  }

  const selectedSourcePolicy = selectedNode
    ? describeSourcePolicy(
        selectedNode.sourceBucket === "figurelabs-import"
          ? "figurelabs"
          : selectedNode.sourceBucket === "servier-original" ||
              selectedNode.sourceBucket === "servier-vector"
            ? "servier"
            : selectedNode.sourceBucket === "bioicons"
              ? "bioicons"
              : "",
      )
    : null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">AI-native biomedical figure studio</span>
          <h1>HelixCanvas</h1>
        </div>
        <div className="topbar__actions">
          <button type="button" className="ghost-button" onClick={requestProjectOpen}>
            Open project
          </button>
          <button type="button" className="secondary-button" onClick={() => saveProjectFile()}>
            Save project
          </button>
          <button type="button" className="ghost-button" onClick={copyCitationBundle}>
            Copy attributions
          </button>
          <button type="button" className="ghost-button" onClick={exportProjectSvg}>
            Export SVG
          </button>
          <button type="button" className="primary-button" onClick={exportProjectPng} disabled={exportBusy.png}>
            {exportBusy.png ? "Exporting PNG..." : "Export PNG"}
          </button>
        </div>
      </header>

      <section className="hero">
        <div className="hero__copy">
          <span className="eyebrow">Open biomedical illustration platform</span>
          <h2>Create publication-ready figures with open libraries and a source-aware AI copilot.</h2>
          <p>
            HelixCanvas combines Bioicons, the Servier vector subset, official Servier Medical
            Art downloads, and a safe import lane for your own FigureLabs exports into one
            publication-focused editor. The AI layer drafts structured figure plans on the server,
            suggests local assets, and critiques layout clarity without exposing your API key in the browser.
          </p>
          <div className="hero__actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => applyTemplate(TEMPLATES[0])}
            >
              Launch studio
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => loadExampleProject(EXAMPLE_PROJECTS[0])}
            >
              Open real example
            </button>
            <button type="button" className="ghost-button" onClick={() => openExternalLink("https://bioicons.com/")}>
              Browse Bioicons
            </button>
          </div>
        </div>
        <div className="hero__stats">
          {HERO_KPIS.map((kpi) => (
            <article key={kpi.label} className="stat-card">
              <strong>{kpi.value}</strong>
              <span>{kpi.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="workspace">
        <aside className="workspace__sidebar">
          <div className="panel">
            <div className="panel__head">
              <h3>Local project</h3>
              <span>{hasUnsavedChanges ? "Unsaved edits" : "Saved locally"}</span>
            </div>
            <p className="helper-copy">
              <strong>{project.name}</strong>
              <br />
              {projectFileLabel}
            </p>
            <div className="library-summary">
              <span>{hasUnsavedChanges ? "Unsaved changes" : "Save state clean"}</span>
              <span>{savedProjectUpdatedAt ? "Manual save tracked" : "Not saved yet"}</span>
            </div>
            <div className="stack-row">
              <button type="button" className="secondary-button" onClick={() => saveProjectFile()}>
                Save
              </button>
              <button type="button" className="ghost-button" onClick={() => saveProjectFile({ saveAs: true })}>
                Save as
              </button>
              <button type="button" className="ghost-button" onClick={requestProjectOpen}>
                Open
              </button>
              <button type="button" className="ghost-button" onClick={exportProjectJson}>
                Download copy
              </button>
            </div>
            {recoveryDraft?.project ? (
              <div className="project-recovery-card">
                <div>
                  <strong>Recovery draft available</strong>
                  <p>
                    {recoveryDraft.reason}
                    {recoveryDraft.capturedAt
                      ? ` · ${new Date(recoveryDraft.capturedAt).toLocaleString()}`
                      : ""}
                  </p>
                </div>
                <div className="stack-row">
                  <button type="button" className="secondary-button" onClick={restoreRecoveryDraft}>
                    Restore draft
                  </button>
                  <button type="button" className="ghost-button" onClick={clearRecoveryDraft}>
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <p className="helper-copy">
                Resetting the workspace or opening another file keeps the previous draft here so you can recover it.
              </p>
            )}
            <input
              ref={projectImportInputRef}
              type="file"
              accept=".json,.helixcanvas.json,application/json"
              hidden
              onChange={importProjectFromFile}
            />
          </div>

          <div className="panel">
            <div className="panel__head">
              <h3>Snapshots</h3>
              <span>{projectSnapshots.length} local checkpoints</span>
            </div>
            <p className="helper-copy">
              Save checkpoints before a major restructure, template swap, or export pass. Snapshots stay local to this browser and can be restored without touching your current file on disk.
            </p>
            <div className="stack-row">
              <input
                className="text-input"
                value={snapshotLabel}
                onChange={(event) => setSnapshotLabel(event.target.value)}
                placeholder="Optional snapshot label"
              />
              <button type="button" className="secondary-button" onClick={() => saveProjectSnapshot()}>
                Save snapshot
              </button>
            </div>
            <div className="snapshot-list">
              {projectSnapshots.length ? (
                projectSnapshots.map((snapshot) => (
                  <article key={snapshot.id} className="snapshot-card">
                    <div className="snapshot-card__head">
                      <strong>{snapshot.label}</strong>
                      <span>{new Date(snapshot.createdAt).toLocaleString()}</span>
                    </div>
                    <p>
                      {snapshot.project?.name || "HelixCanvas figure"}
                      {snapshot.fileName ? ` · ${snapshot.fileName}` : ""}
                    </p>
                    <div className="stack-row">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => restoreProjectSnapshot(snapshot)}
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => deleteProjectSnapshot(snapshot.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="helper-copy">
                  No snapshots yet. Save one before a big figure revision and it will appear here.
                </p>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <h3>Export</h3>
              <span>{transparentExport ? "Transparent raster" : "Board background included"}</span>
            </div>
            <p className="helper-copy">
              Export the current figure as SVG, PNG, or PDF. Use higher scale for slides and posters, or transparent PNG when the figure needs to sit on another layout.
            </p>
            <div className="inspector-grid">
              <label>
                Raster scale
                <select value={exportScale} onChange={(event) => setExportScale(Number(event.target.value))}>
                  <option value="1">1x</option>
                  <option value="2">2x</option>
                  <option value="3">3x</option>
                </select>
              </label>
              <label className="toggle-field">
                Background
                <button
                  type="button"
                  className={`ghost-button ${transparentExport ? "is-toggled" : ""}`}
                  onClick={() => setTransparentExport((value) => !value)}
                >
                  {transparentExport ? "Transparent" : "Board color"}
                </button>
              </label>
            </div>
            <div className="stack-row">
              <button
                type="button"
                className="primary-button"
                onClick={exportProjectPng}
                disabled={exportBusy.png}
              >
                {exportBusy.png ? "Exporting PNG..." : "Download PNG"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={exportProjectPdf}
                disabled={exportBusy.pdf}
              >
                {exportBusy.pdf ? "Exporting PDF..." : "Download PDF"}
              </button>
              <button type="button" className="ghost-button" onClick={exportProjectSvg}>
                Download SVG
              </button>
            </div>
            <div className="library-summary">
              <span>{project.board.width} × {project.board.height} board</span>
              <span>{exportScale}x raster output</span>
              <span>{transparentExport ? "PNG alpha on" : "Opaque export"}</span>
            </div>
            <p className="helper-copy">
              PDF export uses a white page when transparency is enabled, since PDF raster export is flattened for broad compatibility.
            </p>
          </div>

          <div className="panel">
            <div className="panel__head">
              <h3>Reusable components</h3>
              <span>{reusableComponents.length} saved snippets</span>
            </div>
            <p className="helper-copy">
              Turn any selected cluster into a reusable component, then drop it back into later figures as a starting point.
            </p>
            <div className="stack-row">
              <input
                className="text-input"
                value={componentLabel}
                onChange={(event) => setComponentLabel(event.target.value)}
                placeholder="Optional component label"
              />
              <button
                type="button"
                className="secondary-button"
                onClick={saveSelectionAsReusableComponent}
                disabled={!hasNodeSelection}
              >
                Save selection
              </button>
            </div>
            <div className="component-list">
              {reusableComponents.length ? (
                reusableComponents.map((component) => (
                  <article key={component.id} className="component-card">
                    <div className="component-card__head">
                      <strong>{component.label}</strong>
                      <span>{component.nodes.length} layers</span>
                    </div>
                    <p>{new Date(component.createdAt).toLocaleString()}</p>
                    <div className="stack-row">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => insertReusableComponent(component)}
                      >
                        Insert
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => deleteReusableComponent(component.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="helper-copy">
                  No saved components yet. Select a motif or pathway cluster and save it here for reuse.
                </p>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <h3>Real-world examples</h3>
              <span>{EXAMPLE_PROJECTS.length} guided figures</span>
            </div>
            <p className="helper-copy">
              Start from actual biology problems instead of placeholders. Each example is editable, source-aware, and designed to teach the interface through a realistic figure.
            </p>
            <div className="example-list">
              {EXAMPLE_PROJECTS.map((example) => (
                <ExampleProjectCard
                  key={example.id}
                  example={example}
                  onLoad={loadExampleProject}
                  onUseBrief={useExampleBrief}
                />
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <h3>AI copilot</h3>
              <span>{aiStatus.checking ? "Checking server" : aiStatus.configured ? aiStatus.model : "Offline"}</span>
            </div>
            <textarea
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              placeholder="Describe the figure you need: pathway, assay workflow, graphical abstract, anatomy plate..."
            />
            <p className="helper-copy">
              {aiStatus.checking
                ? "Connecting to the local AI service."
                : aiStatus.configured
                  ? "Server-side planning keeps the OpenAI key off the client while turning your brief into a structured figure plan."
                  : aiStatus.error || "Set OPENAI_API_KEY and run the local API server to enable AI drafting and critique."}
            </p>
            <div className="stack-row">
              <button
                type="button"
                className="primary-button"
                onClick={draftWithAi}
                disabled={aiBusy.planning}
              >
                {aiBusy.planning ? "Drafting..." : "AI draft"}
              </button>
              <button type="button" className="secondary-button" onClick={draftFromBrief}>
                Quick draft
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={critiqueWithAi}
                disabled={aiBusy.critique}
              >
                {aiBusy.critique ? "Reviewing..." : "AI critique"}
              </button>
              <button type="button" className="ghost-button" onClick={resetProject}>
                Reset
              </button>
            </div>
            {aiPlan ? (
              <div className="ai-summary">
                <div className="panel__head">
                  <h4>{aiPlan.title}</h4>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => copyTextValue(aiPlan.captionDraft, "Copied AI caption draft")}
                  >
                    Copy caption
                  </button>
                </div>
                <p>{aiPlan.summary}</p>
                <div className="ai-pill-row">
                  <span className="ai-pill">{aiPlan.templateId}</span>
                  <span className="ai-pill">{aiPlan.panelSequence.length} panels</span>
                </div>
                <div className="ai-list">
                  {aiPlan.callouts.map((callout) => (
                    <div key={callout} className="ai-list__item">
                      {callout}
                    </div>
                  ))}
                </div>
                <p className="helper-copy">Next step: {aiPlan.nextStep}</p>
              </div>
            ) : null}
          </div>

          {aiSuggestions.length ? (
            <div className="panel">
              <div className="panel__head">
                <h3>AI asset suggestions</h3>
                <span>{aiSuggestions.length} prompts</span>
              </div>
              <div className="ai-suggestion-list">
                {aiSuggestions.map((suggestion) => (
                  <article key={`${suggestion.query}-${suggestion.preferredSourceBucket}`} className="ai-suggestion">
                    <div className="ai-suggestion__head">
                      <div>
                        <h4>{suggestion.query}</h4>
                        <p>{suggestion.rationale}</p>
                      </div>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => focusSuggestionSearch(suggestion)}
                      >
                        Focus search
                      </button>
                    </div>
                    <div className="ai-pill-row">
                      <span className="ai-pill">{suggestion.preferredSourceBucket}</span>
                    </div>
                    <div className="ai-match-list">
                      {suggestion.matches.length ? (
                        suggestion.matches.slice(0, 2).map((asset) => (
                          <button
                            key={asset.id}
                            type="button"
                            className="ai-match-card"
                            onClick={() => addAssetToCanvas(asset)}
                          >
                            <strong>{asset.title}</strong>
                            <span>{asset.sourceLabel}</span>
                          </button>
                        ))
                      ) : (
                        <p className="helper-copy">
                          No local matches yet. Try importing a custom asset or broadening the search.
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          <div className="panel">
            <div className="panel__head">
              <h3>Source-aware library</h3>
              <span>
                {libraryStats.totalAssets
                  ? `${libraryStats.totalAssets} built-in assets across ${libraryStats.packCount} packs`
                  : "Loading library"}
              </span>
            </div>
            {libraryPacks.length ? (
              <div className="pack-list">
                {libraryPacks.map((pack) => (
                  <PackCard
                    key={pack.id}
                    pack={pack}
                    active={packFilter === pack.id}
                    onFocusPack={focusPack}
                  />
                ))}
              </div>
            ) : null}
            <input
              className="text-input"
              value={libraryQuery}
              onChange={(event) => setLibraryQuery(event.target.value)}
              placeholder="Search proteins, microscopy, cell membrane..."
            />
            <div className="filter-row">
              <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
                {SOURCE_FILTERS.map((filter) => (
                  <option key={filter.id} value={filter.id}>
                    {filter.label}
                  </option>
                ))}
              </select>
              <select value={packFilter} onChange={(event) => focusPack(event.target.value)}>
                {packOptions.map((pack) => (
                  <option key={pack.id} value={pack.id}>
                    {pack.title}
                  </option>
                ))}
              </select>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category === "all" ? "All categories" : formatDisplayCategory(category)}
                  </option>
                ))}
              </select>
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
                {SORT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="library-summary">
              <span>{libraryStats.packCount} packs</span>
              <span>{libraryStats.readyPackCount} validated</span>
              <span>{libraryStats.categories} categories</span>
              <span>{favoriteAssetIds.length} saved</span>
              <span>{recentAssetIds.length} recent</span>
              <span>{usedAssetIds.length} on canvas</span>
            </div>
            <AssetShelf title="Saved assets" assets={favoriteAssets} onAdd={addAssetToCanvas} />
            <AssetShelf title="Recent assets" assets={recentAssets} onAdd={addAssetToCanvas} />
            <div className="asset-grid">
              {libraryStatus === "loading" ? <p>Indexing asset packs...</p> : null}
              {libraryStatus === "error" ? (
                <p>
                  The local library pack manifest is missing. Run <code>npm run build:library</code>{" "}
                  after cloning Bioicons.
                </p>
              ) : null}
              {filteredLibrary.slice(0, 80).map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onAdd={addAssetToCanvas}
                  active={selectedNodes.some((node) => node.assetId === asset.id)}
                  onSelectSource={focusSource}
                  onSelectPack={focusPack}
                  onToggleFavorite={toggleFavorite}
                  favorite={favoriteAssetIds.includes(asset.id)}
                  used={usedAssetIds.includes(asset.id)}
                />
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <h3>FigureLabs imports</h3>
              <span>User-owned asset lane</span>
            </div>
            <p className="helper-copy">
              Bundle your own FigureLabs SVG or PNG exports here instead of scraping public
              gallery content with unclear reuse rights.
            </p>
            <label className="upload-button">
              Upload SVG or PNG
              <input type="file" accept=".svg,.png,image/svg+xml,image/png" onChange={importFromFile} />
            </label>
            <div className="stack-row">
              <input
                className="text-input"
                value={importUrl}
                onChange={(event) => setImportUrl(event.target.value)}
                placeholder="Paste a FigureLabs or CDN asset URL"
              />
              <button type="button" className="secondary-button" onClick={importFromUrl}>
                Add URL
              </button>
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <h3>Servier kit downloads</h3>
              <span>{SERVIER_KITS.length} official PPTX bundles</span>
            </div>
            <div className="kit-list">
              {SERVIER_KITS.map((kit) => (
                <KitCard key={kit.id} kit={kit} />
              ))}
            </div>
          </div>
        </aside>

        <main className="workspace__canvas">
          <div className="panel panel--compact">
            <div className="studio-toolbar">
              <div>
                <span className="eyebrow">Workbench</span>
                <h3>{project.name}</h3>
              </div>
              <div className="studio-toolbar__actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={undoProject}
                  disabled={!canUndo}
                >
                  Undo
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={redoProject}
                  disabled={!canRedo}
                >
                  Redo
                </button>
                <button
                  type="button"
                  className={`ghost-button ${snapToGrid ? "is-toggled" : ""}`}
                  onClick={() => setSnapToGrid((value) => !value)}
                >
                  Snap {snapToGrid ? "On" : "Off"}
                </button>
                <button type="button" className="ghost-button" onClick={() => addShape("card")}>
                  Add card
                </button>
                <button type="button" className="ghost-button" onClick={() => addShape("circle")}>
                  Add circle
                </button>
                <button type="button" className="ghost-button" onClick={addText}>
                  Add text
                </button>
                <button type="button" className="ghost-button" onClick={() => addAnnotationBlock("callout")}>
                  Callout
                </button>
                <button type="button" className="ghost-button" onClick={() => addAnnotationBlock("legend")}>
                  Legend
                </button>
                <button type="button" className="ghost-button" onClick={() => addAnnotationBlock("scale-bar")}>
                  Scale bar
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={hasNodeSelection ? addCommentOnSelection : addBoardComment}
                >
                  Comment
                </button>
                <button type="button" className="ghost-button" onClick={addConnector}>
                  Add connector
                </button>
              </div>
            </div>
            <div className="studio-toolbar__footer">
              <div className="zoom-control">
                <span>Zoom</span>
                <input
                  type="range"
                  min="0.45"
                  max="1.3"
                  step="0.01"
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                />
                <strong>{Math.round(zoom * 100)}%</strong>
              </div>
              <div className="toolbar-hints">
                <span>Cmd/Ctrl+Z undo</span>
                <span>Cmd/Ctrl+D duplicate</span>
                <span>Cmd/Ctrl+G group</span>
                <span>Shift+click multi-select</span>
                <span>Comments stay out of exports</span>
                <span>Save selections as components</span>
                <span>Grouped layers move together</span>
                <span>Shift+arrows coarse nudge</span>
              </div>
              <div className="template-row">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className="template-pill"
                    onClick={() => applyTemplate(template)}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="canvas-frame">
            <div className="canvas-stage">
              <div
                className="canvas-board"
                ref={boardRef}
                style={{
                  width: project.board.width,
                  height: project.board.height,
                  background: project.board.background,
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                }}
                onPointerDown={handleCanvasPointerDown}
              >
                <svg
                  className="connector-layer"
                  viewBox={`0 0 ${project.board.width} ${project.board.height}`}
                >
                  <defs>
                    <marker
                      id="arrowhead-live"
                      markerWidth="12"
                      markerHeight="12"
                      refX="10"
                      refY="6"
                      orient="auto"
                    >
                      <path d="M0,0 L12,6 L0,12 z" fill="#155e75" />
                    </marker>
                  </defs>
                  {project.connectors.map((connector) => {
                    const isSelected = selection?.kind === "connector" && selection.id === connector.id;
                    return (
                      <g key={connector.id}>
                        <line
                          x1={connector.from.x}
                          y1={connector.from.y}
                          x2={connector.to.x}
                          y2={connector.to.y}
                          stroke={connector.stroke}
                          strokeWidth={connector.strokeWidth}
                          markerEnd="url(#arrowhead-live)"
                          strokeLinecap="round"
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            setSelection({ kind: "connector", id: connector.id });
                          }}
                        />
                        {isSelected ? (
                          <>
                            <circle
                              cx={connector.from.x}
                              cy={connector.from.y}
                              r="9"
                              fill="#ffffff"
                              stroke={connector.stroke}
                              strokeWidth="3"
                              onPointerDown={(event) => {
                                event.stopPropagation();
                                setDragState({
                                  kind: "connector",
                                  id: connector.id,
                                  handle: "from",
                                });
                              }}
                            />
                            <circle
                              cx={connector.to.x}
                              cy={connector.to.y}
                              r="9"
                              fill="#ffffff"
                              stroke={connector.stroke}
                              strokeWidth="3"
                              onPointerDown={(event) => {
                                event.stopPropagation();
                                setDragState({
                                  kind: "connector",
                                  id: connector.id,
                                  handle: "to",
                                });
                              }}
                            />
                          </>
                        ) : null}
                      </g>
                    );
                  })}
                </svg>

                {project.nodes.map((node) => {
                  const isSelected = isNodeSelected(selection, node.id);

                  if (node.hidden) {
                    return null;
                  }

                  if (node.type === "asset") {
                    return (
                      <button
                        key={node.id}
                        type="button"
                        className={`node node--asset ${isSelected ? "is-selected" : ""} ${
                          node.role === "panel-frame" ? "node--panel" : ""
                        } ${
                          node.groupId ? "is-grouped" : ""
                        } ${
                          node.locked ? "is-locked" : ""
                        }`}
                        style={{
                          left: node.x,
                          top: node.y,
                          width: node.w,
                          height: node.h,
                          opacity: node.opacity,
                          transform: `rotate(${node.rotation}deg)`,
                        }}
                        onPointerDown={(event) => handleNodePointerDown(node, event)}
                      >
                        <img src={node.assetUrl} alt={node.title} draggable="false" />
                      </button>
                    );
                  }

                  if (node.type === "text") {
                    return (
                      <button
                        key={node.id}
                        type="button"
                        className={`node node--text ${isSelected ? "is-selected" : ""} ${
                          node.role === "panel-label" ? "node--panel-label" : ""
                        } ${
                          node.groupId ? "is-grouped" : ""
                        } ${
                          node.locked ? "is-locked" : ""
                        }`}
                        style={{
                          left: node.x,
                          top: node.y - node.fontSize,
                          width: node.w,
                          opacity: node.opacity,
                          transform: `rotate(${node.rotation}deg)`,
                          color: node.color,
                          fontSize: node.fontSize,
                          fontWeight: node.fontWeight,
                        }}
                        onPointerDown={(event) => handleNodePointerDown(node, event)}
                      >
                        {node.text}
                      </button>
                    );
                  }

                  return (
                    <button
                      key={node.id}
                      type="button"
                      className={`node node--shape ${isSelected ? "is-selected" : ""} ${
                        node.role === "panel-frame" ? "node--panel" : ""
                      } ${
                        node.groupId ? "is-grouped" : ""
                      } ${
                        node.locked ? "is-locked" : ""
                      }`}
                      style={{
                        left: node.x,
                        top: node.y,
                        width: node.w,
                        height: node.h,
                        opacity: node.opacity,
                        transform: `rotate(${node.rotation}deg)`,
                        background: node.fill,
                        borderColor: node.stroke,
                        color: node.color,
                        borderRadius: node.shape === "circle" ? "999px" : node.shape === "card" ? "24px" : "16px",
                      }}
                      onPointerDown={(event) => handleNodePointerDown(node, event)}
                    >
                      {node.text}
                    </button>
                  );
                })}

                {commentsVisible
                  ? positionedComments.map(({ comment, position }, index) => {
                      const isSelected =
                        selection?.kind === "comment" && selection.id === comment.id;

                      return (
                        <button
                          key={comment.id}
                          type="button"
                          className={`review-pin ${isSelected ? "is-selected" : ""} ${
                            comment.status === "resolved" ? "is-resolved" : ""
                          }`}
                          style={{
                            left: position.x,
                            top: position.y,
                          }}
                          title={`${position.targetLabel} · ${comment.author}`}
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            setSelection({ kind: "comment", id: comment.id });
                          }}
                        >
                          <span>{index + 1}</span>
                        </button>
                      );
                    })
                  : null}

                {marqueeRect ? (
                  <div
                    className="selection-marquee"
                    style={{
                      left: marqueeRect.left,
                      top: marqueeRect.top,
                      width: marqueeRect.width,
                      height: marqueeRect.height,
                    }}
                  />
                ) : null}

                {dragGuides.map((guide) =>
                  guide.orientation === "vertical" ? (
                    <div
                      key={`vertical-${guide.x}-${guide.start}-${guide.end}`}
                      className="alignment-guide alignment-guide--vertical"
                      style={{
                        left: guide.x,
                        top: guide.start,
                        height: Math.max(0, guide.end - guide.start),
                      }}
                    />
                  ) : (
                    <div
                      key={`horizontal-${guide.y}-${guide.start}-${guide.end}`}
                      className="alignment-guide alignment-guide--horizontal"
                      style={{
                        left: guide.start,
                        top: guide.y,
                        width: Math.max(0, guide.end - guide.start),
                      }}
                    />
                  ),
                )}
              </div>
            </div>
          </div>
        </main>

        <aside className="workspace__inspector">
          <div className="panel">
            <div className="panel__head">
              <h3>Selection inspector</h3>
              <span>{selectionLabel}</span>
            </div>
            {!hasNodeSelection && !selectedConnector && !selectedComment ? (
              <p className="helper-copy">
                Select an object on the board to edit copy, layout, appearance, and citation data.
              </p>
            ) : null}

            {hasNodeSelection && !selectedNode ? (
              <div className="inspector-stack">
                <p className="helper-copy">
                  Batch editing is active for {selectedNodes.length} layers. Use alignment, visibility,
                  locking, duplication, and order controls together.
                </p>
                <div className="stack-row">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={toggleSelectedNodesHidden}
                  >
                    {allSelectedNodesHidden ? "Show selected" : "Hide selected"}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={toggleSelectedNodesLocked}
                  >
                    {allSelectedNodesLocked ? "Unlock selected" : "Lock selected"}
                  </button>
                </div>
                {hasLockedSelectedNodes ? (
                  <p className="helper-copy">
                    One or more selected layers are locked. Unlock them before moving, aligning, or duplicating the set.
                  </p>
                ) : null}
                <div className="stack-row">
                  <button type="button" className="secondary-button" onClick={groupSelection}>
                    Group selection
                  </button>
                  <button type="button" className="ghost-button" onClick={addCommentOnSelection}>
                    Comment on selection
                  </button>
                  <button type="button" className="ghost-button" onClick={saveSelectionAsReusableComponent}>
                    Save as component
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={ungroupSelection}
                    disabled={!selectedNodes.some((node) => node.groupId)}
                  >
                    Ungroup
                  </button>
                  {sharedGroupId && !isWholeGroupSelected ? (
                    <button type="button" className="ghost-button" onClick={selectSharedGroup}>
                      Select full group
                    </button>
                  ) : null}
                </div>
                <div className="batch-action-grid">
                  <button type="button" className="secondary-button" onClick={() => alignSelection("left")}>
                    Align left
                  </button>
                  <button type="button" className="secondary-button" onClick={() => alignSelection("center")}>
                    Align center
                  </button>
                  <button type="button" className="secondary-button" onClick={() => alignSelection("right")}>
                    Align right
                  </button>
                  <button type="button" className="secondary-button" onClick={() => alignSelection("top")}>
                    Align top
                  </button>
                  <button type="button" className="secondary-button" onClick={() => alignSelection("middle")}>
                    Align middle
                  </button>
                  <button type="button" className="secondary-button" onClick={() => alignSelection("bottom")}>
                    Align bottom
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => distributeSelection("horizontal")}
                    disabled={selectedNodes.length < 3}
                  >
                    Distribute X
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => distributeSelection("vertical")}
                    disabled={selectedNodes.length < 3}
                  >
                    Distribute Y
                  </button>
                </div>
                <div className="stack-row">
                  <button type="button" className="secondary-button" onClick={duplicateSelection}>
                    Duplicate selection
                  </button>
                  <button type="button" className="ghost-button" onClick={bringForward}>
                    Bring forward
                  </button>
                  <button type="button" className="ghost-button" onClick={sendBackward}>
                    Send back
                  </button>
                </div>
              </div>
            ) : null}

            {selectedNode ? (
              <div className="inspector-stack">
                <div className="stack-row">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => toggleNodeHidden(selectedNode.id)}
                  >
                    {selectedNode.hidden ? "Show layer" : "Hide layer"}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => toggleNodeLocked(selectedNode.id)}
                  >
                    {selectedNode.locked ? "Unlock layer" : "Lock layer"}
                  </button>
                  {selectedNode.groupId ? (
                    <>
                      <button type="button" className="ghost-button" onClick={selectSharedGroup}>
                        Select group
                      </button>
                      <button type="button" className="ghost-button" onClick={ungroupSelection}>
                        Ungroup
                      </button>
                    </>
                  ) : null}
                  <button type="button" className="ghost-button" onClick={addCommentOnSelection}>
                    Add comment
                  </button>
                  <button type="button" className="ghost-button" onClick={saveSelectionAsReusableComponent}>
                    Save as component
                  </button>
                </div>

                {selectedNode.hidden ? (
                  <p className="helper-copy">
                    This layer is hidden on the canvas and excluded from figure export until you show it again.
                  </p>
                ) : null}

                {selectedNode.locked ? (
                  <p className="helper-copy">
                    This layer is locked. Unlock it to edit, move, duplicate, or delete it.
                  </p>
                ) : null}

                {selectedNode.groupId ? (
                  <p className="helper-copy">
                    {describeGroup(selectedNode.groupId, sharedGroupNodeIds.length || 1)}. Clicking one member selects and drags the full set.
                  </p>
                ) : (
                  <p className="helper-copy">
                    Shift-click additional layers, then use the batch inspector to group them into one movable set.
                  </p>
                )}

                <fieldset className="inspector-fieldset" disabled={selectedNode.locked}>
                  <label>
                    Title
                    <input
                      className="text-input"
                      value={selectedNode.title ?? selectedNode.text ?? ""}
                      onChange={(event) =>
                        updateSelectedNode(
                          selectedNode.type === "text"
                            ? { text: event.target.value }
                            : { title: event.target.value },
                        )
                      }
                    />
                  </label>

                  {selectedNode.type === "text" ? (
                    <>
                      <label>
                        Font size
                        <input
                          type="range"
                          min="12"
                          max="56"
                          value={selectedNode.fontSize}
                          onChange={(event) =>
                            updateSelectedNode({ fontSize: Number(event.target.value) })
                          }
                        />
                      </label>
                      <label>
                        Color
                        <input
                          className="color-input"
                          type="color"
                          value={selectedNode.color}
                          onChange={(event) => updateSelectedNode({ color: event.target.value })}
                        />
                      </label>
                    </>
                  ) : null}

                  {selectedNode.type === "shape" ? (
                    <>
                      <label>
                        Label
                        <input
                          className="text-input"
                          value={selectedNode.text}
                          onChange={(event) => updateSelectedNode({ text: event.target.value })}
                        />
                      </label>
                      <label>
                        Fill
                        <input
                          className="color-input"
                          type="color"
                          value={selectedNode.fill}
                          onChange={(event) => updateSelectedNode({ fill: event.target.value })}
                        />
                      </label>
                      <label>
                        Stroke
                        <input
                          className="color-input"
                          type="color"
                          value={selectedNode.stroke}
                          onChange={(event) => updateSelectedNode({ stroke: event.target.value })}
                        />
                      </label>
                    </>
                  ) : null}

                  {selectedNode.type === "asset" ? (
                    <div className="source-box">
                      <strong>{selectedNode.sourceLabel}</strong>
                      <span>{selectedNode.licenseLabel}</span>
                      {selectedNode.sourcePage ? (
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => openExternalLink(selectedNode.sourcePage)}
                        >
                          Open source page
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="inspector-grid">
                    <label>
                      X
                      <input
                        className="text-input"
                        type="number"
                        value={Math.round(selectedNode.x)}
                        onChange={(event) => updateSelectedNode({ x: Number(event.target.value) })}
                      />
                    </label>
                    <label>
                      Y
                      <input
                        className="text-input"
                        type="number"
                        value={Math.round(selectedNode.y)}
                        onChange={(event) => updateSelectedNode({ y: Number(event.target.value) })}
                      />
                    </label>
                    {"w" in selectedNode ? (
                      <label>
                        Width
                        <input
                          className="text-input"
                          type="number"
                          value={Math.round(selectedNode.w)}
                          onChange={(event) => updateSelectedNode({ w: Number(event.target.value) })}
                        />
                      </label>
                    ) : null}
                    {"h" in selectedNode ? (
                      <label>
                        Height
                        <input
                          className="text-input"
                          type="number"
                          value={Math.round(selectedNode.h)}
                          onChange={(event) => updateSelectedNode({ h: Number(event.target.value) })}
                        />
                      </label>
                    ) : null}
                  </div>

                  <label>
                    Rotation
                    <input
                      type="range"
                      min="-25"
                      max="25"
                      step="1"
                      value={selectedNode.rotation}
                      onChange={(event) =>
                        updateSelectedNode({ rotation: Number(event.target.value) })
                      }
                    />
                  </label>

                  <label>
                    Opacity
                    <input
                      type="range"
                      min="0.2"
                      max="1"
                      step="0.05"
                      value={selectedNode.opacity}
                      onChange={(event) => updateSelectedNode({ opacity: Number(event.target.value) })}
                    />
                  </label>

                  <div className="stack-row">
                    <button type="button" className="secondary-button" onClick={duplicateSelection}>
                      Duplicate
                    </button>
                    <button type="button" className="ghost-button" onClick={bringForward}>
                      Bring forward
                    </button>
                    <button type="button" className="ghost-button" onClick={sendBackward}>
                      Send back
                    </button>
                  </div>
                </fieldset>
              </div>
            ) : null}

            {selectedComment ? (
              <div className="inspector-stack">
                <p className="helper-copy">
                  Review comments are local-first markup for coauthor and PI feedback. They stay in the project and snapshot history, but they are not included in figure export.
                </p>
                <label>
                  Reviewer
                  <input
                    className="text-input"
                    value={selectedComment.author}
                    onChange={(event) => updateSelectedComment({ author: event.target.value })}
                  />
                </label>
                <label>
                  Comment
                  <textarea
                    value={selectedComment.body}
                    onChange={(event) => updateSelectedComment({ body: event.target.value })}
                  />
                </label>
                <div className="library-summary">
                  <span>
                    {
                      resolveReviewCommentPosition(selectedComment, project.nodes).targetLabel
                    }
                  </span>
                  <span>{selectedComment.status === "resolved" ? "Resolved" : "Open"}</span>
                  <span>{new Date(selectedComment.updatedAt).toLocaleString()}</span>
                </div>
                <div className="stack-row">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => toggleReviewCommentStatus(selectedComment.id)}
                  >
                    {selectedComment.status === "resolved" ? "Reopen comment" : "Resolve comment"}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => deleteReviewComment(selectedComment.id)}
                  >
                    Delete comment
                  </button>
                </div>
              </div>
            ) : null}

            {selectedConnector ? (
              <div className="inspector-stack">
                <div className="inspector-grid">
                  <label>
                    Start X
                    <input
                      className="text-input"
                      type="number"
                      value={Math.round(selectedConnector.from.x)}
                      onChange={(event) =>
                        updateSelectedConnector({
                          from: {
                            ...selectedConnector.from,
                            x: Number(event.target.value),
                          },
                        })
                      }
                    />
                  </label>
                  <label>
                    Start Y
                    <input
                      className="text-input"
                      type="number"
                      value={Math.round(selectedConnector.from.y)}
                      onChange={(event) =>
                        updateSelectedConnector({
                          from: {
                            ...selectedConnector.from,
                            y: Number(event.target.value),
                          },
                        })
                      }
                    />
                  </label>
                  <label>
                    End X
                    <input
                      className="text-input"
                      type="number"
                      value={Math.round(selectedConnector.to.x)}
                      onChange={(event) =>
                        updateSelectedConnector({
                          to: {
                            ...selectedConnector.to,
                            x: Number(event.target.value),
                          },
                        })
                      }
                    />
                  </label>
                  <label>
                    End Y
                    <input
                      className="text-input"
                      type="number"
                      value={Math.round(selectedConnector.to.y)}
                      onChange={(event) =>
                        updateSelectedConnector({
                          to: {
                            ...selectedConnector.to,
                            y: Number(event.target.value),
                          },
                        })
                      }
                    />
                  </label>
                </div>
                <label>
                  Color
                  <input
                    className="color-input"
                    type="color"
                    value={selectedConnector.stroke}
                    onChange={(event) =>
                      updateSelectedConnector({ stroke: event.target.value })
                    }
                  />
                </label>
                <label>
                  Thickness
                  <input
                    type="range"
                    min="2"
                    max="10"
                    value={selectedConnector.strokeWidth}
                    onChange={(event) =>
                      updateSelectedConnector({ strokeWidth: Number(event.target.value) })
                    }
                  />
                </label>
                <p className="helper-copy">
                  Connector length: {Math.round(getHandleDistance(selectedConnector.from, selectedConnector.to))} px
                </p>
              </div>
            ) : null}
          </div>

          <div className="panel">
            <div className="panel__head">
              <h3>Figure layout</h3>
              <span>{hasNodeSelection ? `${selectedNodes.length} layers ready` : "Panels + placement"}</span>
            </div>
            <p className="helper-copy">
              Insert manuscript-style panel frames or flow the current selection into a clean grid without hand-placing every element.
            </p>
            <div className="layout-preset-list">
              {PANEL_LAYOUT_PRESETS.map((preset) => {
                const slotCount = preset.columns * preset.rows;
                const canPlaceSelection = hasNodeSelection && selectedNodes.length <= slotCount;

                return (
                  <article key={preset.id} className="layout-preset-card">
                    <div className="layout-preset-card__head">
                      <strong>{preset.title}</strong>
                      <span>{slotCount} slots</span>
                    </div>
                    <p>{preset.description}</p>
                    <div className="stack-row">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => insertPanelLayout(preset.id)}
                      >
                        Insert panels
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => placeSelectionIntoLayout(preset.id)}
                        disabled={!canPlaceSelection}
                      >
                        Place selection
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <h3>Review comments</h3>
              <span>{openCommentCount} open · {(project.comments ?? []).length} total</span>
            </div>
            <p className="helper-copy">
              Pin comments to the board or to a selected layer while you iterate. These notes remain in the local project and snapshots, but exports stay clean.
            </p>
            <div className="stack-row">
              <button type="button" className="secondary-button" onClick={addBoardComment}>
                Add board note
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={addCommentOnSelection}
                disabled={!hasNodeSelection}
              >
                Comment on selection
              </button>
              <button
                type="button"
                className={`ghost-button ${commentsVisible ? "is-toggled" : ""}`}
                onClick={() => setCommentsVisible((value) => !value)}
              >
                {commentsVisible ? "Hide pins" : "Show pins"}
              </button>
            </div>
            <div className="snapshot-list">
              {positionedComments.length ? (
                positionedComments.map(({ comment, position }, index) => (
                  <article
                    key={comment.id}
                    className={`comment-card ${
                      selection?.kind === "comment" && selection.id === comment.id ? "is-active" : ""
                    }`}
                  >
                    <div className="comment-card__head">
                      <strong>Comment {index + 1}</strong>
                      <span className={`severity-chip severity-chip--${comment.status === "resolved" ? "low" : "medium"}`}>
                        {comment.status === "resolved" ? "resolved" : "open"}
                      </span>
                    </div>
                    <p>{comment.body}</p>
                    <div className="library-summary">
                      <span>{position.targetLabel}</span>
                      <span>{comment.author}</span>
                    </div>
                    <div className="stack-row">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => focusReviewComment(comment.id)}
                      >
                        Focus
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => toggleReviewCommentStatus(comment.id)}
                      >
                        {comment.status === "resolved" ? "Reopen" : "Resolve"}
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => deleteReviewComment(comment.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="helper-copy">
                  No review comments yet. Add a board note for general feedback or pin one to a selected layer.
                </p>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <h3>Layer order</h3>
              <span>{project.nodes.length} nodes</span>
            </div>
            <div className="layer-list">
              {project.nodes.map((node, index) => (
                <div
                  key={node.id}
                  className={`layer-item ${
                    isNodeSelected(selection, node.id) ? "is-active" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="layer-item__select"
                    onClick={(event) => handleLayerSelect(node, event)}
                  >
                    <span>{project.nodes.length - index}</span>
                    <div>
                      <strong>{node.title ?? node.text}</strong>
                      <small>
                        {node.type}
                        {node.groupId ? " · grouped" : ""}
                        {node.hidden ? " · hidden" : ""}
                        {node.locked ? " · locked" : ""}
                      </small>
                    </div>
                  </button>
                  <div className="layer-item__actions">
                    <button
                      type="button"
                      className={`layer-icon-button ${node.hidden ? "is-active" : ""}`}
                      onClick={() => toggleNodeHidden(node.id)}
                    >
                      {node.hidden ? "Show" : "Hide"}
                    </button>
                    <button
                      type="button"
                      className={`layer-icon-button ${node.locked ? "is-active" : ""}`}
                      onClick={() => toggleNodeLocked(node.id)}
                    >
                      {node.locked ? "Unlock" : "Lock"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <h3>AI critique</h3>
              <span>{aiCritique ? "Art direction" : "Ready when you are"}</span>
            </div>
            {aiCritique ? (
              <div className="inspector-stack">
                <p className="helper-copy">{aiCritique.overall}</p>
                <div className="ai-list">
                  {aiCritique.strengths.map((strength) => (
                    <div key={strength} className="ai-list__item">
                      {strength}
                    </div>
                  ))}
                </div>
                <div className="ai-issue-list">
                  {aiCritique.issues.map((issue) => (
                    <article key={`${issue.severity}-${issue.title}`} className="ai-issue">
                      <div className="ai-issue__head">
                        <strong>{issue.title}</strong>
                        <span className={`severity-chip severity-chip--${issue.severity}`}>
                          {issue.severity}
                        </span>
                      </div>
                      <p>{issue.recommendation}</p>
                    </article>
                  ))}
                </div>
                <div className="ai-pill-row">
                  {aiCritique.complianceRisks.map((risk) => (
                    <span key={risk} className="ai-pill">
                      {risk}
                    </span>
                  ))}
                </div>
                <div className="ai-list">
                  {aiCritique.missingAssetOpportunities.map((item) => (
                    <div key={`${item.query}-${item.preferredSourceBucket}`} className="ai-list__item">
                      {item.query} - {item.reason}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => copyTextValue(aiCritique.captionRevision, "Copied revised caption")}
                >
                  Copy revised caption
                </button>
              </div>
            ) : (
              <p className="helper-copy">
                Run AI critique to review hierarchy, panel flow, asset provenance, and caption quality against the current board.
              </p>
            )}
          </div>

          <div className="panel">
            <div className="panel__head">
              <h3>Publication compliance</h3>
              <span>License-aware output</span>
            </div>
            <div className="compliance-grid">
              <article>
                <strong>{totalCounts.totalAssets}</strong>
                <span>Total indexed + imported assets</span>
              </article>
              <article>
                <strong>{libraryStats.readyPackCount}</strong>
                <span>Validated built-in packs</span>
              </article>
              <article>
                <strong>{libraryStats.servierVectorAssets}</strong>
                <span>Servier vectors from Bioicons</span>
              </article>
              <article>
                <strong>{totalCounts.figurelabsImports}</strong>
                <span>User-owned imports</span>
              </article>
              <article>
                <strong>{SERVIER_KITS.length}</strong>
                <span>Official Servier kits</span>
              </article>
            </div>
            {selectedSourcePolicy ? <PolicyCard policy={selectedSourcePolicy} /> : null}
            <div className="source-list">
              {SOURCE_POLICIES.map((policy) => (
                <PolicyCard key={policy.id} policy={policy} />
              ))}
            </div>
          </div>
        </aside>
      </section>

      {notice ? <div className="toast">{notice}</div> : null}
    </div>
  );
}

export default App;
