# HelixCanvas Editor Guide

This guide documents the current editor surface for contributors and users who want to understand what the canvas can do today.

HelixCanvas is still intentionally local-first and zero-cost. The editor is now well beyond a drag-and-drop prototype: it supports structured scene editing, graph-aware connectors, publication-oriented exports, local review loops, and keyboard-first refinement.

## Selection And Transform

- Click a layer to select it.
- Shift-click to add or remove layers from the current selection.
- Drag on empty canvas space to marquee-select visible layers.
- Drag selected layers to move them together.
- Use the transform box to resize a single layer or a multi-layer selection.
- Use corner handles with aspect lock enabled for proportional scaling.
- Use the rotate handle for free rotation.
- Hold Shift while rotating from the handle to snap rotation.
- Flip, match size, fit-to-board, and fixed 90-degree rotation are available in the inspector.
- Graph connectors enclosed by a transformed selection move, resize, rotate, and flip with the selected graph.

## Layout Tools

Batch selection exposes two levels of layout help:

- Precision tools: align left/center/right/top/middle/bottom and distribute horizontally or vertically.
- Tidy tools: arrange selected layers as a row, column, grid, or radial ring.

The tidy tools are meant for common biomedical figure structures:

- `Tidy row` for methods workflows and signaling relays.
- `Tidy column` for sequential decision trees or vertical cascades.
- `Tidy grid` for assay panels, microscopy tiles, and condition matrices.
- `Radial ring` for receptor complexes, pathway hubs, circular mechanisms, and overview diagrams.

Panel-layout presets remain available separately for manuscript-style figure framing.

## Connectors

Connectors are no longer just static lines.

- Select two layers and click `Add connector` to create an anchored curved connector between them.
- Select one layer and click `Add connector` to start a connector from that layer edge.
- Drag connector endpoints near layer edges to attach them.
- Hold Alt while dragging an endpoint to keep it free.
- Choose connector meaning: activation, inhibition, or neutral link.
- Choose route: straight, elbow, or curve.
- Choose line style: solid, dashed, or dotted.
- Curved routes expose a teal on-canvas bend handle.
- Hold Shift while bending a curved connector for clean 10-step increments.
- `Auto anchor ends` attaches a selected connector to nearby layers.
- `Detach anchors` turns a connector back into a free line.

Anchored connectors resolve their endpoints from current layer bounds, so they stay meaningful when connected layers move.

## Asset Styling

Asset layers can be designed without leaving the editor.

- Image fit: fit inside, crop to fill, or stretch.
- Masks: none, rounded card, circle, or hexagon.
- Crop X/Y and zoom controls for imported, generated, or library bitmap content.
- Visual effects: soft shadow, lifted paper, signal glow, and white halo.

Exports preserve rotation, flipping, opacity, masks, crop/zoom, connector routes, dash styles, and node effects.

## Clipboard Workflows

HelixCanvas has two separate clipboard concepts.

### Fragment Clipboard

Use this for actual figure objects.

- `Cmd/Ctrl+C`: copy selected fragment.
- `Cmd/Ctrl+X`: cut selected fragment.
- `Cmd/Ctrl+V`: paste selected fragment.
- `Cmd/Ctrl+D`: duplicate selected fragment.

Fragments preserve:

- selected nodes
- internal connectors
- remapped connector anchors
- group relationships
- linked review comments

Deleting or cutting selected nodes also removes attached connectors and node-linked comments so the graph does not leave dangling relationships.

### Style Clipboard

Use this for appearance only.

- `Cmd/Ctrl+Shift+C`: copy selected layer or connector style.
- `Cmd/Ctrl+Shift+V`: paste compatible style to the current selection.

Layer style paste respects locked layers. Connector style paste transfers stroke, route, meaning, line style, thickness, and curve bend.

## Layer Order

The Layer Order panel shows the visual stack top-first.

- `Up` / `Down` on each layer moves that layer one step in the visual stack.
- `Bring forward` / `Send back` move the selected layer or selection one step.
- `To front` / `To back` jump the selected layer or selection to the top or bottom of the stack.
- Locked layers must be unlocked before reordering.

Shortcuts:

- `Cmd/Ctrl+]`: bring selection forward.
- `Cmd/Ctrl+[`: send selection backward.
- `Cmd/Ctrl+Shift+]`: bring selection to front.
- `Cmd/Ctrl+Shift+[`: send selection to back.

## Keyboard Reference

- `Cmd/Ctrl+K`: open command palette.
- `Cmd/Ctrl+Z`: undo.
- `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y`: redo.
- `Cmd/Ctrl+S`: save project file.
- `Cmd/Ctrl+O`: open project file.
- `Cmd/Ctrl+A`: select all layers.
- `Cmd/Ctrl+G`: group selection.
- `Cmd/Ctrl+Shift+G`: ungroup selection.
- `Cmd/Ctrl+C`: copy fragment.
- `Cmd/Ctrl+X`: cut fragment.
- `Cmd/Ctrl+V`: paste fragment.
- `Cmd/Ctrl+D`: duplicate fragment.
- `Cmd/Ctrl+Shift+C`: copy style.
- `Cmd/Ctrl+Shift+V`: paste style.
- `Delete` / `Backspace`: delete selection.
- Arrow keys: nudge selected layers.
- Shift + arrow keys: larger nudge.
- `[` / `]`: rotate selected layers by 15 degrees.
- Shift + `[` / `]`: rotate selected layers by 90 degrees.
- Alt+H / Alt+V: flip selected layers horizontally or vertically.

## Review And Export

- Review comments can be pinned to a layer or the board.
- Review comments persist in project files and snapshots.
- Review comments stay out of SVG, PNG, and PDF figure exports.
- Snapshot compare helps review changes before and after a revision.
- Review bundles collect comments, citations, and export context for coauthor handoff.

Export paths currently include SVG, PNG, PDF, project JSON, and citation bundles.
