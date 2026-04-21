import { startTransition, useDeferredValue, useEffect, useRef, useState } from "react";
import { SERVIER_KITS, SERVIER_ORIGINALS, SOURCE_POLICIES } from "./data/servier.js";
import { TEMPLATES } from "./data/templates.js";
import { collectProjectCitations, downloadText, projectToSvg } from "./lib/exporters.js";

const STORAGE_KEYS = {
  project: "helixcanvas-project-v1",
  importedAssets: "helixcanvas-imported-assets-v1",
};

const SOURCE_FILTERS = [
  { id: "all", label: "All sources" },
  { id: "bioicons", label: "Bioicons" },
  { id: "servier-vector", label: "Servier vectors" },
  { id: "servier-original", label: "Servier originals" },
  { id: "figurelabs-import", label: "FigureLabs imports" },
];

const BOARD_PRESETS = {
  width: 1400,
  height: 900,
  background: "#f7f2ea",
};

const HERO_KPIS = [
  { label: "Open assets", value: "2.8K+" },
  { label: "Servier vectors", value: "1.3K+" },
  { label: "Official PPT kits", value: "50" },
  { label: "Export modes", value: "SVG + JSON" },
];

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeTemplate(template) {
  const nodeIds = new Map();

  const nodes = template.nodes.map((node) => {
    const id = createId("node");
    nodeIds.set(node, id);
    return {
      id,
      rotation: node.rotation ?? 0,
      opacity: node.opacity ?? 1,
      strokeWidth: node.strokeWidth ?? 2,
      ...node,
    };
  });

  const connectors = template.connectors.map((connector) => ({
    id: createId("connector"),
    stroke: connector.stroke ?? template.palette.accent,
    strokeWidth: connector.strokeWidth ?? 4,
    from: { ...connector.from },
    to: { ...connector.to },
  }));

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

  return {
    id: createId("node"),
    type: "asset",
    title: asset.title,
    assetUrl: asset.assetUrl,
    sourceLabel: asset.sourceLabel,
    citation: asset.citation,
    sourcePage: asset.sourcePage,
    licenseLabel: asset.licenseLabel,
    assetType: asset.assetType,
    x: position.x,
    y: position.y,
    w: defaultWidth,
    h: defaultHeight,
    rotation: 0,
    opacity: 1,
  };
}

function makeShapeNode(shape, text, position) {
  return {
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
    rotation: 0,
    opacity: 1,
  };
}

function makeTextNode(position) {
  return {
    id: createId("node"),
    type: "text",
    text: "Add annotation",
    fontSize: 24,
    fontWeight: 700,
    color: "#12232e",
    x: position.x,
    y: position.y,
    w: 260,
    rotation: 0,
    opacity: 1,
  };
}

function findNode(project, id) {
  return project.nodes.find((node) => node.id === id) ?? null;
}

function openExternalLink(href) {
  window.open(href, "_blank", "noopener,noreferrer");
}

function AssetCard({ asset, onAdd, active, onSelectSource }) {
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
          {asset.originLabel ? <span>{asset.originLabel}</span> : null}
        </div>
      </div>
      <div className="asset-card__actions">
        <button className="secondary-button" type="button" onClick={() => onAdd(asset)}>
          Add
        </button>
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
  const [library, setLibrary] = useState([]);
  const [libraryStats, setLibraryStats] = useState({
    totalAssets: 0,
    bioiconsAssets: 0,
    servierVectorAssets: 0,
  });
  const [project, setProject] = useState(() =>
    typeof window === "undefined" ? createStarterProject() : parseStoredJson(STORAGE_KEYS.project, createStarterProject()),
  );
  const [importedAssets, setImportedAssets] = useState(() =>
    typeof window === "undefined" ? [] : parseStoredJson(STORAGE_KEYS.importedAssets, []),
  );
  const [selection, setSelection] = useState(null);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [brief, setBrief] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [notice, setNotice] = useState("");
  const [zoom, setZoom] = useState(0.78);
  const [dragState, setDragState] = useState(null);

  const boardRef = useRef(null);
  const deferredQuery = useDeferredValue(libraryQuery.trim().toLowerCase());

  useEffect(() => {
    Promise.all([
      fetch("/data/bioicons.library.json").then((response) => response.json()),
      fetch("/data/bioicons.stats.json").then((response) => response.json()),
    ])
      .then(([items, stats]) => {
        setLibrary(items);
        setLibraryStats(stats);
        setLibraryStatus("ready");
      })
      .catch(() => {
        setLibraryStatus("error");
      });
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.project, JSON.stringify(project));
  }, [project]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.importedAssets, JSON.stringify(importedAssets));
  }, [importedAssets]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = window.setTimeout(() => setNotice(""), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

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
        setProject((current) => ({
          ...current,
          nodes: current.nodes.map((node) =>
            node.id === dragState.id
              ? {
                  ...node,
                  x: Math.max(0, x - dragState.offsetX),
                  y: Math.max(0, y - dragState.offsetY),
                }
              : node,
          ),
          updatedAt: new Date().toISOString(),
        }));
      }

      if (dragState.kind === "connector") {
        setProject((current) => ({
          ...current,
          connectors: current.connectors.map((connector) =>
            connector.id === dragState.id
              ? {
                  ...connector,
                  [dragState.handle]: {
                    x,
                    y,
                  },
                }
              : connector,
          ),
          updatedAt: new Date().toISOString(),
        }));
      }
    }

    function stopDrag() {
      setDragState(null);
    }

    window.addEventListener("pointermove", updateDrag);
    window.addEventListener("pointerup", stopDrag);

    return () => {
      window.removeEventListener("pointermove", updateDrag);
      window.removeEventListener("pointerup", stopDrag);
    };
  }, [dragState, zoom]);

  useEffect(() => {
    function handleKeydown(event) {
      if (!selection) {
        return;
      }

      if (event.key !== "Backspace" && event.key !== "Delete") {
        return;
      }

      event.preventDefault();

      setProject((current) => {
        if (selection.kind === "node") {
          return {
            ...current,
            nodes: current.nodes.filter((node) => node.id !== selection.id),
            updatedAt: new Date().toISOString(),
          };
        }

        return {
          ...current,
          connectors: current.connectors.filter((connector) => connector.id !== selection.id),
          updatedAt: new Date().toISOString(),
        };
      });
      setSelection(null);
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [selection]);

  const unifiedLibrary = [...SERVIER_ORIGINALS, ...importedAssets, ...library];
  const totalCounts = summarizeCounts(unifiedLibrary);
  const categories = [
    "all",
    ...[...new Set(unifiedLibrary.map((item) => item.categoryLabel))].sort(),
  ];
  const filteredLibrary = unifiedLibrary.filter((asset) => {
    const matchesSource = sourceFilter === "all" || asset.sourceBucket === sourceFilter;
    const matchesCategory = categoryFilter === "all" || asset.categoryLabel === categoryFilter;
    const matchesQuery =
      !deferredQuery ||
      asset.title.toLowerCase().includes(deferredQuery) ||
      asset.searchText?.includes(deferredQuery);

    return matchesSource && matchesCategory && matchesQuery;
  });

  const selectedNode = selection?.kind === "node" ? findNode(project, selection.id) : null;
  const selectedConnector =
    selection?.kind === "connector"
      ? project.connectors.find((connector) => connector.id === selection.id) ?? null
      : null;

  function addAssetToCanvas(asset) {
    const offset = 120 + project.nodes.length * 18;
    const newNode = makeAssetNode(asset, { x: offset, y: 140 + project.nodes.length * 10 });

    setProject((current) => ({
      ...current,
      nodes: [...current.nodes, newNode],
      updatedAt: new Date().toISOString(),
    }));
    setSelection({ kind: "node", id: newNode.id });
  }

  function addShape(shape) {
    const newNode = makeShapeNode(shape, shape === "circle" ? "Note" : "Step", {
      x: 180 + project.nodes.length * 14,
      y: 180 + project.nodes.length * 10,
    });

    setProject((current) => ({
      ...current,
      nodes: [...current.nodes, newNode],
      updatedAt: new Date().toISOString(),
    }));
    setSelection({ kind: "node", id: newNode.id });
  }

  function addText() {
    const newNode = makeTextNode({
      x: 220 + project.nodes.length * 10,
      y: 120 + project.nodes.length * 12,
    });

    setProject((current) => ({
      ...current,
      nodes: [...current.nodes, newNode],
      updatedAt: new Date().toISOString(),
    }));
    setSelection({ kind: "node", id: newNode.id });
  }

  function addConnector() {
    const connector = {
      id: createId("connector"),
      from: { x: 340, y: 320 },
      to: { x: 520, y: 320 },
      stroke: project.palette?.accent ?? "#155e75",
      strokeWidth: 4,
    };

    setProject((current) => ({
      ...current,
      connectors: [...current.connectors, connector],
      updatedAt: new Date().toISOString(),
    }));
    setSelection({ kind: "connector", id: connector.id });
  }

  function applyTemplate(template) {
    startTransition(() => {
      setProject(normalizeTemplate(template));
      setSelection(null);
      setNotice(`Loaded ${template.name}`);
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
      setProject(draftedProject);
      setSelection(null);
      setNotice("Drafted a layout from your brief");
    });
  }

  function updateSelectedNode(patch) {
    if (!selectedNode) {
      return;
    }

    setProject((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === selectedNode.id ? { ...node, ...patch } : node,
      ),
      updatedAt: new Date().toISOString(),
    }));
  }

  function updateSelectedConnector(patch) {
    if (!selectedConnector) {
      return;
    }

    setProject((current) => ({
      ...current,
      connectors: current.connectors.map((connector) =>
        connector.id === selectedConnector.id ? { ...connector, ...patch } : connector,
      ),
      updatedAt: new Date().toISOString(),
    }));
  }

  function duplicateSelection() {
    if (!selectedNode) {
      return;
    }

    const duplicate = {
      ...selectedNode,
      id: createId("node"),
      x: selectedNode.x + 32,
      y: selectedNode.y + 32,
    };

    setProject((current) => ({
      ...current,
      nodes: [...current.nodes, duplicate],
      updatedAt: new Date().toISOString(),
    }));
    setSelection({ kind: "node", id: duplicate.id });
  }

  function bringForward() {
    if (!selectedNode) {
      return;
    }

    setProject((current) => {
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
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function sendBackward() {
    if (!selectedNode) {
      return;
    }

    setProject((current) => {
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
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function exportProjectSvg() {
    downloadText("helixcanvas-export.svg", projectToSvg(project), "image/svg+xml;charset=utf-8");
    setNotice("Exported SVG");
  }

  function exportProjectJson() {
    downloadText("helixcanvas-project.json", JSON.stringify(project, null, 2), "application/json");
    setNotice("Exported project JSON");
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
    setProject(createStarterProject());
    setSelection(null);
    setBrief("");
    setNotice("Reset to starter project");
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

      setImportedAssets((current) => [asset, ...current]);
      setNotice(`Imported ${file.name}`);
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  }

  const selectedSourcePolicy = selectedNode
    ? describeSourcePolicy(
        selectedNode.sourceLabel?.toLowerCase().includes("figurelabs")
          ? "figurelabs"
          : selectedNode.sourceLabel?.toLowerCase().includes("servier")
            ? "servier"
            : "bioicons",
      )
    : null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">Biomedical figure SaaS concept</span>
          <h1>HelixCanvas</h1>
        </div>
        <div className="topbar__actions">
          <button type="button" className="ghost-button" onClick={copyCitationBundle}>
            Copy attributions
          </button>
          <button type="button" className="secondary-button" onClick={exportProjectJson}>
            Export JSON
          </button>
          <button type="button" className="primary-button" onClick={exportProjectSvg}>
            Export SVG
          </button>
        </div>
      </header>

      <section className="hero">
        <div className="hero__copy">
          <span className="eyebrow">Open biomedical illustration platform</span>
          <h2>Create publication-ready figures from open libraries and user-owned imports.</h2>
          <p>
            HelixCanvas combines Bioicons, the Servier vector subset, official Servier Medical
            Art downloads, and a safe import lane for your own FigureLabs exports into one
            publication-focused editor.
          </p>
          <div className="hero__actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => applyTemplate(TEMPLATES[0])}
            >
              Launch studio
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
              <h3>Quick composer</h3>
              <span>Mind the Graph-style briefing</span>
            </div>
            <textarea
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              placeholder="Describe the figure you need: pathway, assay workflow, graphical abstract, anatomy plate..."
            />
            <div className="stack-row">
              <button type="button" className="primary-button" onClick={draftFromBrief}>
                Draft from brief
              </button>
              <button type="button" className="ghost-button" onClick={resetProject}>
                Reset
              </button>
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <h3>Source-aware library</h3>
              <span>
                {libraryStats.totalAssets
                  ? `${libraryStats.totalAssets} Bioicons vectors indexed`
                  : "Loading library"}
              </span>
            </div>
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
            </div>
            <div className="asset-grid">
              {libraryStatus === "loading" ? <p>Indexing Bioicons...</p> : null}
              {libraryStatus === "error" ? (
                <p>
                  The local Bioicons index is missing. Run <code>npm run build:library</code> after
                  cloning Bioicons.
                </p>
              ) : null}
              {filteredLibrary.slice(0, 80).map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onAdd={addAssetToCanvas}
                  active={selectedNode?.title === asset.title}
                  onSelectSource={setSourceFilter}
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

                  if (node.type === "asset") {
                    return (
                      <button
                        key={node.id}
                        type="button"
                        className={`node node--asset ${isSelected ? "is-selected" : ""}`}
                        style={{
                          left: node.x,
                          top: node.y,
                          width: node.w,
                          height: node.h,
                          opacity: node.opacity,
                          transform: `rotate(${node.rotation}deg)`,
                        }}
                        onPointerDown={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect();
                          setSelection({ kind: "node", id: node.id });
                          setDragState({
                            kind: "node",
                            id: node.id,
                            offsetX: (event.clientX - rect.left) / zoom,
                            offsetY: (event.clientY - rect.top) / zoom,
                          });
                        }}
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
                        className={`node node--text ${isSelected ? "is-selected" : ""}`}
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
                        onPointerDown={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect();
                          setSelection({ kind: "node", id: node.id });
                          setDragState({
                            kind: "node",
                            id: node.id,
                            offsetX: (event.clientX - rect.left) / zoom,
                            offsetY: (event.clientY - rect.top) / zoom,
                          });
                        }}
                      >
                        {node.text}
                      </button>
                    );
                  }

                  return (
                    <button
                      key={node.id}
                      type="button"
                      className={`node node--shape ${isSelected ? "is-selected" : ""}`}
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
                      onPointerDown={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect();
                        setSelection({ kind: "node", id: node.id });
                        setDragState({
                          kind: "node",
                          id: node.id,
                          offsetX: (event.clientX - rect.left) / zoom,
                          offsetY: (event.clientY - rect.top) / zoom,
                        });
                      }}
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
                <button
                  key={node.id}
                  type="button"
                  className={`layer-item ${
                    selection?.kind === "node" && selection.id === node.id ? "is-active" : ""
                  }`}
                  onClick={() => setSelection({ kind: "node", id: node.id })}
                >
                  <span>{project.nodes.length - index}</span>
                  <div>
                    <strong>{node.title ?? node.text}</strong>
                    <small>{node.type}</small>
                  </div>
                </button>
              ))}
            </div>
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
                <strong>{libraryStats.servierVectorAssets}</strong>
                <span>Servier vectors from Bioicons</span>
              </article>
              <article>
                <strong>{SERVIER_KITS.length}</strong>
                <span>Official Servier kits</span>
              </article>
              <article>
                <strong>{totalCounts.figurelabsImports}</strong>
                <span>User-owned imports</span>
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
