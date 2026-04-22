# HelixCanvas GitHub Milestone Plan

This document turns the current product strategy into a concrete GitHub planning surface.

It is designed to answer four practical questions:

1. What should the next milestones be?
2. Which issues are aimed at BioRender-style parity?
3. Which issues are meant to make HelixCanvas stronger as an open-source alternative rather than a clone?
4. Which feature areas should stay explicitly out of scope for now?

## Planning Assumptions

- HelixCanvas is an open-source, local-first biomedical illustration tool.
- The product should remain useful with no paid backend and no AI configured.
- The goal is not to copy BioRender feature-for-feature.
- The goal is to close the most painful figure-making gaps while keeping HelixCanvas more transparent, more reproducible, and more extensible.

## Already Landed

The repo already covers part of this plan. These capabilities are now present in the codebase:

- marquee multi-select, grouping, align/distribute, and live alignment guides
- panel layouts, legends, scale bars, and reusable components
- PNG and PDF export alongside SVG, JSON, and citation bundles
- local project save/open flows, recovery drafts, and named snapshots
- inline pinned review comments stored in local project state
- real biology examples and tutorial artifacts

That matters because the next milestone work should build on this footing rather than re-plan features that are already delivered.

## Milestone Naming

Recommended GitHub milestones:

- `v0.3 Core Editor Parity`
- `v0.4 Export And Presentation`
- `v0.5 Library And Retrieval`
- `v0.6 Review And Versioning`
- `v0.7 OSS Differentiators`
- `Later`

## Label Lanes

Recommended labels:

- `parity`
- `differentiator`
- `later`
- `editor`
- `assets`
- `exports`
- `ai-optional`
- `docs`
- `accessibility`
- `good first issue`
- `help wanted`

## v0.3 Core Editor Parity

Goal:
Make HelixCanvas feel like a serious daily-use editor for scientific figures instead of a promising prototype.

Exit criteria:

- common editing flows no longer feel brittle
- users can build a clean 3-5 panel figure without obvious missing affordances
- the canvas supports real refinement work, not just assembly

Status:

- the selection, grouping, layout, and review foundation is now meaningfully in place
- the main remaining parity gaps here are richer text controls and connector semantics

Suggested issues:

- `[parity][editor] Add marquee multi-select for nodes`
  Acceptance:
  Users can click-drag to select multiple objects and perform common operations on the selection.

- `[parity][editor] Add group and ungroup actions`
  Acceptance:
  Grouped items move, duplicate, hide, lock, and export together.

- `[parity][editor] Add align and distribute controls`
  Acceptance:
  Selected items can align left, right, top, middle, center, and distribute evenly.

- `[parity][editor] Add smart guides and object snapping`
  Acceptance:
  Moving objects reveals alignment guides against nearby nodes and common board anchors.

- `[parity][editor] Add richer text controls`
  Acceptance:
  Text supports font family, weight, size, line height, alignment, superscript, and subscript.

- `[parity][editor] Add reusable symbols/components`
  Acceptance:
  Common items like labels, legends, and pathway modules can be duplicated from a reusable palette.

- `[parity][editor] Add connector editing handles and arrow styles`
  Acceptance:
  Users can bend connectors, choose arrowheads, and distinguish activation, inhibition, and neutral flow.

- `[parity][editor] Add panel frames, legends, and scale bars`
  Acceptance:
  Users can create publication-style figure panels and supporting annotation blocks quickly.

- `[parity][editor][accessibility] Expand keyboard-first editing`
  Acceptance:
  Selection, movement, duplication, delete, and layer operations are available through keyboard shortcuts.

## v0.4 Export And Presentation

Goal:
Close the gap between “I made a figure” and “I can actually use this in a manuscript, poster, or talk.”

Exit criteria:

- outputs are appropriate for papers, slides, and posters
- exports preserve the visual intent of the board
- attribution remains easy to retrieve at the point of export

Status:

- direct PNG and PDF export already landed
- the next gap is presets, DPI guidance, and broader presentation formats

Suggested issues:

- `[parity][exports] Add PNG export with transparent background option`
  Acceptance:
  Users can export a raster figure directly from the editor with transparent or solid background.

- `[parity][exports] Add PDF export`
  Acceptance:
  Users can export a print-friendly PDF from the current board.

- `[parity][exports] Add export size and DPI presets`
  Acceptance:
  Export flow supports screen, slide, print, and poster presets.

- `[parity][exports] Add poster board presets`
  Acceptance:
  Users can start from common poster sizes without manual board setup.

- `[parity][exports] Add slide/page presets for presentation workflows`
  Acceptance:
  Users can switch the board to standard slide aspect ratios quickly.

- `[parity][exports] Improve SVG fidelity for grouped and hidden objects`
  Acceptance:
  SVG exports match the board structure more faithfully and remain editable downstream.

- `[differentiator][exports] Add export-side attribution bundle package`
  Acceptance:
  A single export action can include figure output plus citation text and source summary.

## v0.5 Library And Retrieval

Goal:
Make it much easier to find the right scientific visual building blocks quickly.

Exit criteria:

- search is meaningfully better than literal keyword matching
- more scientific domains are represented through packs and templates
- provenance remains clear while scale grows

Suggested issues:

- `[parity][assets] Add synonym and alias search expansion`
  Acceptance:
  Queries like `macrophage`, `monocyte`, and `innate immune cell` can return overlapping relevant results where appropriate.

- `[parity][assets] Add semantic or embedding-backed search prototype`
  Acceptance:
  Natural-language asset retrieval performs better than literal string search on real biology queries.

- `[parity][assets] Add domain starter packs for oncology, immunology, neuroscience, microbiology`
  Acceptance:
  Each domain ships with a coherent pack and a minimal template set.

- `[parity][assets] Add more real-world example projects`
  Acceptance:
  HelixCanvas includes a broader set of editable examples for methods, mechanisms, pathology, and teaching figures.

- `[parity][assets] Add disease-mechanism collection metadata`
  Acceptance:
  Templates and packs can be browsed by disease area and biological story type.

- `[differentiator][assets] Add provenance badges directly on placed canvas assets`
  Acceptance:
  A user can inspect an object already on the board and see source, pack, and license posture clearly.

- `[differentiator][assets] Add community pack publishing guide and examples`
  Acceptance:
  A new contributor can add a valid pack without editing core application code.

- `[differentiator][assets] Add local pack install path for private lab libraries`
  Acceptance:
  Labs can bring in local or internal packs without forking the app.

## v0.6 Review And Versioning

Goal:
Support the real review loop of science figures: draft, annotate, revise, compare versions, and recover work.

Exit criteria:

- users can recover earlier states reliably
- review does not require external screenshot ping-pong
- collaboration can start lightweight without needing a SaaS rewrite

Status:

- local snapshots and inline comments are already in the repo
- the next review/versioning work is compare mode and shareable review artifacts

Suggested issues:

- `[parity][editor] Add local autosave snapshots and browsable history`
  Acceptance:
  Users can restore named or timestamped prior states from inside the editor.

- `[parity][editor] Add revision compare view`
  Acceptance:
  Users can preview older figure states before restoring or duplicating them.

- `[parity][docs] Add shareable review export mode`
  Acceptance:
  Users can generate a view-only artifact for lab feedback without flattening provenance.

- `[parity][editor] Add inline comments/notes on figures`
  Acceptance:
  Users can pin comments to a location or object and toggle their visibility.

- `[differentiator][editor] Add local review notes to project files`
  Acceptance:
  Comments and review context can live inside `.helixcanvas.json` rather than only in a hosted database.

- `[later][collaboration] Add optional shared-workspace backend`
  Acceptance:
  Deferred until solo and local review workflows are strong.

## v0.7 OSS Differentiators

Goal:
Strengthen the areas where HelixCanvas should outperform closed scientific illustration tools.

Exit criteria:

- the product is clearly compelling as an open alternative
- provenance and reproducibility are not just values, but product advantages
- contributors can extend the system without reverse-engineering the whole codebase

Suggested issues:

- `[differentiator][ai-optional] Add AI provider interface for OpenAI and local models`
  Acceptance:
  AI planning and critique run behind a provider boundary with no OpenAI-only assumptions in the UI.

- `[differentiator][ai-optional] Add offline-first mode for unconfigured AI`
  Acceptance:
  The UI clearly degrades to non-AI workflows without dead-end controls.

- `[differentiator][exports] Add deterministic project and asset manifests for reproducibility`
  Acceptance:
  Exported projects and generated manifests are stable across rebuilds unless the real content changes.

- `[differentiator][docs] Expand real-biology tutorials with publication-style walkthroughs`
  Acceptance:
  The repo includes multiple tutorial scenarios with figure, project, and citation artifacts.

- `[differentiator][docs] Add contributor architecture guide for editor, packs, exports, and AI`
  Acceptance:
  New contributors can understand the main system boundaries without code spelunking.

- `[differentiator][accessibility] Add contrast, focus, and screen-reader passes`
  Acceptance:
  Core workflows have visible accessibility improvements and documented limitations.

- `[differentiator][distribution] Evaluate desktop packaging after web parity milestones`
  Acceptance:
  Desktop packaging is only pursued once the browser product is already stable and worth freezing into an app.

## Later

These are valid ideas, but not the right near-term priority.

Suggested issues:

- `[later] Build a BioRender-style graphing product`
- `[later] Build a full poster builder with auto-layout engine`
- `[later] Build institution admin, SSO, usage metrics, and branding controls`
- `[later] Build real-time multi-user collaboration`
- `[later] Build a proprietary hosted asset marketplace`

Why later:

- these features expand product breadth before core figure creation is strong enough
- they increase maintenance cost substantially
- several of them pull HelixCanvas toward a SaaS shape that is not the current strategic goal

## Explicitly Do Not Copy

These are anti-goals even if they exist in commercial products:

- paywalling basic export or figure-editing workflows
- making AI mandatory to use the product well
- hiding provenance in favor of a cleaner but less trustworthy UX
- optimizing for enterprise controls before creator productivity
- bundling assets with unclear redistribution rights just to inflate library counts

## Recommended First Issue Batch

If the project wants a practical next sprint, start here:

1. `[parity][editor] Add richer text controls`
2. `[parity][editor] Add connector editing handles and arrow styles`
3. `[parity][exports] Add export size and DPI presets`
4. `[parity][exports] Add slide/page presets for presentation workflows`
5. `[parity][assets] Add synonym and alias search expansion`
6. `[differentiator][assets] Add provenance badges directly on placed canvas assets`
7. `[differentiator][docs] Add contributor architecture guide for editor, packs, exports, and AI`

That batch would move HelixCanvas from “credible local workbench” toward “something a lab can reach for repeatedly without hesitation.”
