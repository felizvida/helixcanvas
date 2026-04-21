<p align="center">
  <img src="./docs/helixcanvas-banner.svg" alt="HelixCanvas banner" width="100%" />
</p>

<h1 align="center">HelixCanvas</h1>

<p align="center">
  A modern biomedical illustration studio for creating publication-ready research figures from open libraries and user-owned imports.
</p>

<p align="center">
  Bioicons + Servier Medical Art + drag-and-drop composition + SVG export
</p>

## Overview

HelixCanvas is a polished concept for a biomedical figure SaaS. It combines a searchable asset library, a publication-focused composition canvas, and source-aware attribution guidance so researchers can move from raw icon libraries to finished diagrams faster.

## What It Does

- Unifies **Bioicons** into a searchable in-app figure library with preserved per-asset licensing metadata.
- Surfaces the **Servier-authored vector subset** already represented in Bioicons.
- Adds **official Servier Medical Art PPTX kit links** and curated official raster examples.
- Supports **user-owned FigureLabs imports** by upload or URL, without bundling unclear third-party gallery assets.
- Provides a studio-style editor with templates, text, connectors, layering, resizing, and SVG or JSON export.

## Why FigureLabs Is Import-Only

FigureLabs is integrated as a safe import lane rather than a bundled stock library. Public product pages clearly present the service, but this project does not assume the public gallery is openly licensable for redistribution as part of a built-in corpus. If you own the export, you can bring it into HelixCanvas and compose with it.

## Run Locally

1. Clone Bioicons locally:

```bash
git clone --depth 1 https://github.com/duerrsimon/bioicons /tmp/bioicons
```

2. Build the local Bioicons manifest:

```bash
BIOICONS_DIR=/tmp/bioicons npm run build:library
```

3. Install dependencies and run the app:

```bash
npm install
npm run dev
```

## Project Structure

- `src/App.jsx` — main SaaS-style studio experience
- `src/data/servier.js` — Servier metadata, kit links, and source policies
- `src/data/templates.js` — starter figure templates
- `scripts/generate-bioicons-index.mjs` — Bioicons indexing pipeline
- `public/data/bioicons.library.json` — generated searchable Bioicons manifest
- `docs/helixcanvas-banner.svg` — GitHub README banner

## Sources

- [Bioicons](https://bioicons.com/)
- [Bioicons GitHub](https://github.com/duerrsimon/bioicons)
- [Servier Medical Art](https://smart.servier.com/)
- [Servier Image Kits](https://smart.servier.com/image-kits-by-category/)
- [FigureLabs](https://figurelabs.vercel.app/)

## Notes

- Bioicons licenses vary by asset and are preserved in the generated manifest.
- Servier Medical Art content requires attribution and is surfaced with guidance in the UI.
- The editor is intentionally product-like and visually opinionated, but it is still a starter implementation rather than a finished commercial platform.
