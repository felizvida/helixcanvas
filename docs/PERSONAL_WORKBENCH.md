# HelixCanvas Personal Workbench Direction

## Thesis

HelixCanvas should optimize for one scientist on one machine who wants to go from an idea to a polished figure quickly, with strong provenance and modern AI help, without needing an account or a hosted workflow.

This is not an enterprise product strategy.

It is a personal-workstation strategy:

- faster creation for one person
- better defaults and better taste
- richer figure-specific tools
- local-first reliability
- AI that edits structure rather than generating opaque pixels

## Product Goal

The near-term goal is not “replace every part of BioRender.”

The better goal is:

**Become the best personal biomedical figure workstation for pathways, methods diagrams, graphical abstracts, pathology overviews, and teaching figures.**

## What Matters Most

### 1. Editor flow must feel excellent

- silky selection, dragging, resizing, zooming, and snapping
- richer text controls that feel publication-ready
- connector semantics that can express activation, inhibition, and neutral flow clearly
- reusable motifs, fast duplication, and panel-aware layout tools
- keyboard-first control where it meaningfully speeds work up

### 2. Reliability must disappear into the background

- local files should feel safe
- autosave, recovery, snapshots, and branching should reduce anxiety
- export should feel dependable for paper, slide, and poster use

### 3. AI should operate on the scene, not above it

The figure is a structured scene graph. AI should work by producing plans, patches, critiques, and retrieval hints that act on that structure.

That enables:

- prompt-to-editable figure drafts
- edit-by-instruction on the current figure
- layout critique and cleanup
- semantic retrieval across local assets and packs
- provenance-aware checks before export

## Current Personal-Workbench Priorities

### Top slice now

- one-click domain presets that bundle the right flow, theme, and scaffold together
- starter-template entry points for concrete figure archetypes instead of only generic templates
- guided Figure Flows for pathways, methods workflows, and microscopy panels
- insertable scientific builders for membranes, compartments, assay strips, and timecourse layouts, with domain-aware variants and style presets
- figure themes and smarter search follow-ups for faster refinement
- export targets and review bundles that make handoff cleaner
- richer text controls
- stronger connector system
- command palette and AI-native figure editing
- snapshot compare and safe figure branching
- semantic starter-kit workflows and offline-first app shell
- desktop-grade macOS packaging with native project-file dialogs

### Next slices

1. more semantic retrieval coverage and pack discovery polish
2. deepen compare/review workflows for iterative figure authorship
3. expand desktop support beyond the current macOS packaging path
4. more domain-specific figure recipes for additional biology problems
5. publication-polish defaults for legends, annotations, and final export cleanup

## Design Rules

- AI remains optional
- exports stay clean and review notes stay local
- provenance always beats convenience shortcuts
- editable structure beats opaque generation
- speed should come from better tools, not hidden magic

## Success Standard

HelixCanvas is succeeding on this path when a single researcher can:

- sketch a real biological story quickly
- refine it into a polished figure without fighting the editor
- use AI for planning and revision without losing trust or control
- export confidently for manuscript, slide, or poster use
