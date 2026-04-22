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
import { collectProjectCitations, downloadText, projectToSvg } from "./lib/exporters.js";
import {
  createHistoryState,
  pushHistoryState,
  redoHistoryState,
  undoHistoryState,
} from "./lib/history.js";
import {
  createProjectDocument,
  parseProjectDocument,
  suggestProjectFilename,
} from "./lib/projectFiles.js";

const STORAGE_KEYS = {
  project: "helixcanvas-project-v1",
  projectMeta: "helixcanvas-project-meta-v1",
  importedAssets: "helixcanvas-imported-assets-v1",
  favoriteAssets: "helixcanvas-favorite-assets-v1",
  recentAssets: "helixcanvas-recent-assets-v1",
  recoveryDraft: "helixcanvas-recovery-draft-v1",
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

function findNode(project, id) {
  return project.nodes.find((node) => node.id === id) ?? null;
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
  const [aiBusy, setAiBusy] = useState({
    planning: false,
    critique: false,
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

      if (dragState.kind === "node") {
        setProject((current) => {
          const node = current.nodes.find((item) => item.id === dragState.id);

          if (!node) {
            return current;
          }

          const nextX = Math.max(0, snapValue(x - dragState.offsetX, snapToGrid));
          const nextY = Math.max(0, snapValue(y - dragState.offsetY, snapToGrid));

          if (nextX === node.x && nextY === node.y) {
            return current;
          }

          if (!dragHistoryCapturedRef.current) {
            historyRef.current = pushHistoryState(historyRef.current, current);
            dragHistoryCapturedRef.current = true;
            setHistoryVersion((value) => value + 1);
          }

          return {
            ...current,
            nodes: current.nodes.map((item) =>
              item.id === dragState.id
                ? {
                    ...item,
                    x: nextX,
                    y: nextY,
                  }
                : item,
            ),
            updatedAt: new Date().toISOString(),
          };
        });
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
      dragHistoryCapturedRef.current = false;
      setDragState(null);
    }

    window.addEventListener("pointermove", updateDrag);
    window.addEventListener("pointerup", stopDrag);

    return () => {
      window.removeEventListener("pointermove", updateDrag);
      window.removeEventListener("pointerup", stopDrag);
    };
  }, [dragState, snapToGrid, zoom]);

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

  const selectedNode = selection?.kind === "node" ? findNode(project, selection.id) : null;
  const selectedConnector =
    selection?.kind === "connector"
      ? project.connectors.find((connector) => connector.id === selection.id) ?? null
      : null;
  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;
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

  function toggleNodeHidden(nodeId) {
    applyProjectChange(
      (current) => ({
        ...current,
        nodes: current.nodes.map((node) =>
          node.id === nodeId ? { ...node, hidden: !node.hidden } : node,
        ),
      }),
      { selection: { kind: "node", id: nodeId } },
    );
  }

  function toggleNodeLocked(nodeId) {
    applyProjectChange(
      (current) => ({
        ...current,
        nodes: current.nodes.map((node) =>
          node.id === nodeId ? { ...node, locked: !node.locked } : node,
        ),
      }),
      { selection: { kind: "node", id: nodeId } },
    );
  }

  function handleNodePointerDown(node, event) {
    setSelection({ kind: "node", id: node.id });

    if (node.locked) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    setDragState({
      kind: "node",
      id: node.id,
      offsetX: (event.clientX - rect.left) / zoom,
      offsetY: (event.clientY - rect.top) / zoom,
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

      if (metaKey && event.key.toLowerCase() === "d" && selectedNode) {
        event.preventDefault();

        if (selectedNode.locked) {
          setNotice("Unlock this layer before duplicating it");
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

        if (selection.kind === "node" && selectedNode?.locked) {
          setNotice("Unlock this layer before deleting it");
          return;
        }

        applyProjectChange(
          (current) =>
            selection.kind === "node"
              ? {
                  ...current,
                  nodes: current.nodes.filter((node) => node.id !== selection.id),
                }
              : {
                  ...current,
                  connectors: current.connectors.filter((connector) => connector.id !== selection.id),
                },
          { selection: null },
        );
        return;
      }

      if (selectedNode && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault();

        if (selectedNode.locked) {
          setNotice("Unlock this layer before moving it");
          return;
        }

        const step = event.shiftKey ? GRID_SIZE : 8;
        const deltaX = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
        const deltaY = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;

        applyProjectChange((current) => ({
          ...current,
          nodes: current.nodes.map((node) =>
            node.id === selectedNode.id
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
  }, [project.updatedAt, selectedNode, selection, snapToGrid, historyVersion]);

  function addAssetToCanvas(asset) {
    const offset = 120 + project.nodes.length * 18;
    const newNode = makeAssetNode(asset, { x: offset, y: 140 + project.nodes.length * 10 });

    applyProjectChange(
      (current) => ({
        ...current,
        nodes: [...current.nodes, newNode],
      }),
      { selection: { kind: "node", id: newNode.id } },
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
      { selection: { kind: "node", id: newNode.id } },
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
      { selection: { kind: "node", id: newNode.id } },
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

  function duplicateSelection() {
    if (!selectedNode) {
      return;
    }

    if (selectedNode.locked) {
      setNotice("Unlock this layer before duplicating it");
      return;
    }

    const duplicate = {
      ...selectedNode,
      id: createId("node"),
      x: selectedNode.x + 32,
      y: selectedNode.y + 32,
      locked: false,
      hidden: false,
    };

    applyProjectChange(
      (current) => ({
        ...current,
        nodes: [...current.nodes, duplicate],
      }),
      { selection: { kind: "node", id: duplicate.id } },
    );
  }

  function bringForward() {
    if (!selectedNode) {
      return;
    }

    if (selectedNode.locked) {
      setNotice("Unlock this layer before reordering it");
      return;
    }

    applyProjectChange((current) => {
      const index = current.nodes.findIndex((node) => node.id === selectedNode.id);

      if (index < 0 || index === current.nodes.length - 1) {
        return current;
      }

      const nodes = [...current.nodes];
      const [item] = nodes.splice(index, 1);
      nodes.splice(index + 1, 0, item);
      return {
        ...current,
        nodes,
      };
    });
  }

  function sendBackward() {
    if (!selectedNode) {
      return;
    }

    if (selectedNode.locked) {
      setNotice("Unlock this layer before reordering it");
      return;
    }

    applyProjectChange((current) => {
      const index = current.nodes.findIndex((node) => node.id === selectedNode.id);

      if (index <= 0) {
        return current;
      }

      const nodes = [...current.nodes];
      const [item] = nodes.splice(index, 1);
      nodes.splice(index - 1, 0, item);
      return {
        ...current,
        nodes,
      };
    });
  }

  function exportProjectSvg() {
    downloadText("helixcanvas-export.svg", projectToSvg(project), "image/svg+xml;charset=utf-8");
    setNotice("Exported SVG");
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
          <button type="button" className="primary-button" onClick={exportProjectSvg}>
            Export SVG
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
                  active={selectedNode?.assetId === asset.id}
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
                onPointerDown={(event) => {
                  if (event.target === event.currentTarget) {
                    setSelection(null);
                  }
                }}
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
                          onPointerDown={() => setSelection({ kind: "connector", id: connector.id })}
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
                              onPointerDown={() =>
                                setDragState({
                                  kind: "connector",
                                  id: connector.id,
                                  handle: "from",
                                })
                              }
                            />
                            <circle
                              cx={connector.to.x}
                              cy={connector.to.y}
                              r="9"
                              fill="#ffffff"
                              stroke={connector.stroke}
                              strokeWidth="3"
                              onPointerDown={() =>
                                setDragState({
                                  kind: "connector",
                                  id: connector.id,
                                  handle: "to",
                                })
                              }
                            />
                          </>
                        ) : null}
                      </g>
                    );
                  })}
                </svg>

                {project.nodes.map((node) => {
                  const isSelected = selection?.kind === "node" && selection.id === node.id;

                  if (node.hidden) {
                    return null;
                  }

                  if (node.type === "asset") {
                    return (
                      <button
                        key={node.id}
                        type="button"
                        className={`node node--asset ${isSelected ? "is-selected" : ""} ${
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
              </div>
            </div>
          </div>
        </main>

        <aside className="workspace__inspector">
          <div className="panel">
            <div className="panel__head">
              <h3>Selection inspector</h3>
              <span>
                {selectedNode ? selectedNode.title : selectedConnector ? "Connector" : "Nothing selected"}
              </span>
            </div>
            {!selectedNode && !selectedConnector ? (
              <p className="helper-copy">
                Select an object on the board to edit copy, layout, appearance, and citation data.
              </p>
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
              <h3>Layer order</h3>
              <span>{project.nodes.length} nodes</span>
            </div>
            <div className="layer-list">
              {project.nodes.map((node, index) => (
                <div
                  key={node.id}
                  className={`layer-item ${
                    selection?.kind === "node" && selection.id === node.id ? "is-active" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="layer-item__select"
                    onClick={() => setSelection({ kind: "node", id: node.id })}
                  >
                    <span>{project.nodes.length - index}</span>
                    <div>
                      <strong>{node.title ?? node.text}</strong>
                      <small>
                        {node.type}
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
