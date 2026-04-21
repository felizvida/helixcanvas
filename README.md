<p align="center">
  <img src="./docs/helixcanvas-banner.svg" alt="HelixCanvas banner" width="100%" />
</p>

<h1 align="center">HelixCanvas</h1>

<p align="center">
  AI-assisted biomedical illustration studio for publication-ready research figures.
</p>

<p align="center">
  Open libraries, source-aware imports, structured AI planning, and export-ready composition in one workspace.
</p>

## What HelixCanvas Is

HelixCanvas is a product-style biomedical figure studio that combines:

- a searchable open illustration library based on **Bioicons**
- curated **Servier Medical Art** assets and kit links
- a safe import lane for **user-owned FigureLabs exports**
- a drag-and-drop editor for research diagrams
- a **server-side AI copilot** that drafts layouts and critiques figure clarity

The goal is simple: help researchers move from a rough scientific idea to a clean, publication-ready visual without losing track of source provenance or attribution.

For the deeper product rationale and architecture, see [docs/PRODUCT_OVERVIEW.md](/Users/liux17/codex/figurender/docs/PRODUCT_OVERVIEW.md).

## Why It Matters

Most biomedical illustration tools fall into one of two buckets:

- polished editors with closed or unclear asset provenance
- open asset collections without a strong composition workflow

HelixCanvas is designed to bridge that gap. It treats **library provenance, licensing, and figure composition** as part of the same workflow, then uses AI in a controlled way to accelerate planning rather than replace editorial judgment.

## Core Capabilities

- Unified in-app library for Bioicons assets with preserved licensing metadata
- Servier-authored vector subset surfaced through Bioicons
- Official Servier Medical Art raster examples and PPTX kit links
- Drag-and-drop canvas with text, shapes, connectors, layers, resizing, and export
- FigureLabs handled as **import-only**, avoiding redistribution of unclear third-party gallery assets
- AI drafting from a research brief into a structured figure plan
- AI critique for hierarchy, narrative flow, provenance risk, and caption quality
- Citation bundle export for attribution-ready outputs

## AI Design

HelixCanvas uses AI in a way that is architecturally meaningful:

- The OpenAI API key stays on the **server**, not in the browser.
- `POST /api/ai/plan` converts a research brief into structured JSON: template choice, panel plan, callouts, compliance notes, caption draft, and asset queries.
- `POST /api/ai/critique` reviews the current board and returns actionable design feedback.
- The client remains deterministic: it applies plans to the local canvas, matches suggested assets against the local library, and preserves export/citation behavior.

This design keeps AI useful without making the editor opaque or unsafe.

## Library Strategy

### Bioicons

Bioicons is the main searchable vector library. Asset-level source and license metadata are preserved in the generated manifest.

### Servier Medical Art

Servier is surfaced in two ways:

- Servier-authored vectors already represented in Bioicons
- official Servier raster assets and downloadable PPTX kits

### FigureLabs

FigureLabs is intentionally treated as a **user-owned import lane**. HelixCanvas does not bundle public FigureLabs gallery content as a built-in stock corpus because reuse rights are not assumed to be openly redistributable.

## Local Development

1. Clone Bioicons locally:

```bash
git clone --depth 1 https://github.com/duerrsimon/bioicons /tmp/bioicons
```

2. Build the local Bioicons manifest:

```bash
BIOICONS_DIR=/tmp/bioicons npm run build:library
```

3. Configure environment variables:

```bash
export OPENAI_API_KEY=your_key_here
```

Use [.env.example](/Users/liux17/codex/figurender/.env.example) as the reference for local configuration.

4. Install dependencies and start the app plus local API:

```bash
npm install
npm run dev
```

5. Build for production:

```bash
npm run build
npm start
```

## Project Structure

- `src/App.jsx` — main editor experience
- `src/lib/ai.js` — browser client for local AI endpoints
- `src/data/templates.js` — starter layouts and design presets
- `src/data/servier.js` — Servier metadata, source policy, and kit links
- `src/lib/exporters.js` — SVG, JSON, and attribution export helpers
- `server/index.mjs` — local API server and production host
- `server/aiService.mjs` — OpenAI orchestration and structured output contracts
- `scripts/generate-bioicons-index.mjs` — Bioicons indexing pipeline
- `public/data/bioicons.library.json` — generated searchable asset manifest
- `docs/PRODUCT_OVERVIEW.md` — long-form product and architecture document

## Sources

- [Bioicons](https://bioicons.com/)
- [Bioicons GitHub](https://github.com/duerrsimon/bioicons)
- [Servier Medical Art](https://smart.servier.com/)
- [Servier Image Kits](https://smart.servier.com/image-kits-by-category/)
- [FigureLabs](https://figurelabs.vercel.app/)

## Notes

- Bioicons licenses vary by asset and are preserved in the generated manifest.
- Servier Medical Art content requires attribution and is surfaced with compliance guidance.
- AI suggestions are intentionally **source-aware** and designed to support, not override, editorial control.
- This is a strong MVP and product direction, not yet a full commercial SaaS deployment.
