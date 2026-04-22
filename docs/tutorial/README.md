# HelixCanvas Tutorial: Real Biological Figures

This tutorial uses the live HelixCanvas interface and three editable figures built around real biological problems, not placeholder shapes.

The tutorial assets in this folder are generated from the same example projects that ship in the app:

- `egfr-mapk-nsclc`
- `rela-crispr-macrophage`
- `retinal-complement-degeneration`

Run the generator any time you update the examples:

```bash
npm run build:tutorial
```

## Start Here

1. Install dependencies with `npm install`.
2. Build the library manifest with `npm run build:library`.
3. Start HelixCanvas with `npm run dev`.
4. Open `http://127.0.0.1:4173/`.

The examples are available in the `Real-world examples` panel and can also be opened directly with query parameters.

## The Live Interface

This screenshot is taken from the running application rather than a mockup:

![HelixCanvas live interface](./egfr-interface.png)

What to notice:

- the screenshot is from the real browser session, not a design comp
- `Open project`, `Save project`, `Copy attributions`, and `Export SVG` are exposed from the start
- the tutorial examples below take you directly into the same running interface with the workbench centered on the active figure

If you want to skip the landing section, use the direct example URLs below and HelixCanvas will jump straight into the editing workspace.

## Tutorial 1: EGFR to ERK Signaling in NSCLC

Biological problem:
Create a mechanistic figure for ligand-triggered EGFR activation, ERK nuclear entry, and immediate-early transcription in non-small-cell lung cancer.

Open locally:

```text
http://127.0.0.1:4173/?example=egfr-mapk-nsclc&focus=workspace
```

What this example teaches:

- building a pathway schematic from membrane to nucleus
- combining open vector assets with editable explanatory cards
- editing a mechanistic story without breaking attribution

Suggested exercise:
Replace `MYC / CCND1 induction` with your own readout, then duplicate the receptor region to compare ligand-only and inhibitor-treated conditions.

Figure artifact:

![EGFR to ERK signaling in NSCLC](./egfr-mapk-nsclc.svg)

Files:

- [SVG figure](./egfr-mapk-nsclc.svg)
- [Project file](./egfr-to-erk-signaling-in-nsclc.helixcanvas.json)
- [Citations](./egfr-mapk-nsclc.citations.txt)

## Tutorial 2: RELA CRISPR Knockout Workflow

Biological problem:
Lay out an experimental workflow that tests whether `RELA` knockout suppresses `TNF-alpha` induced NF-kappaB signaling in macrophages.

Open locally:

```text
http://127.0.0.1:4173/?example=rela-crispr-macrophage&focus=workspace
```

What this example teaches:

- structuring a methods figure as a left-to-right protocol
- mixing perturbation, stimulation, and orthogonal readouts on one canvas
- turning a dense wet-lab plan into an editorially clean graphic

Suggested exercise:
Duplicate the terminal readout card and add qPCR, ELISA, or single-cell RNA-seq as an additional assay lane.

Figure artifact:

![RELA CRISPR knockout workflow](./rela-crispr-macrophage.svg)

Files:

- [SVG figure](./rela-crispr-macrophage.svg)
- [Project file](./rela-crispr-knockout-workflow.helixcanvas.json)
- [Citations](./rela-crispr-macrophage.citations.txt)

## Tutorial 3: Complement Deposition in Retinal Degeneration

Biological problem:
Build a pathology figure that connects retinal anatomy, photoreceptor stress, complement tagging, and phagocyte recruitment.

Open locally:

```text
http://127.0.0.1:4173/?example=retinal-complement-degeneration&focus=workspace
```

What this example teaches:

- moving from tissue overview to mechanistic pathology on the same board
- using color to separate stress, immune tagging, and downstream degeneration
- adapting a disease-overview figure for papers, lectures, or grant applications

Suggested exercise:
Swap the complement-tagging icon for a cytokine or microglia-specific element and relabel the lower card to track thinning across timepoints or treatment arms.

Figure artifact:

![Complement deposition in retinal degeneration](./retinal-complement-degeneration.svg)

Files:

- [SVG figure](./retinal-complement-degeneration.svg)
- [Project file](./complement-deposition-in-retinal-degeneration.helixcanvas.json)
- [Citations](./retinal-complement-degeneration.citations.txt)

## How To Use The Tutorial Well

For each example, try the same loop:

1. Load the example from the sidebar.
2. Click a few nodes and inspect their provenance and layer controls.
3. Edit one biological label so the figure becomes specific to your own story.
4. Export the SVG and copy the citation bundle.

If AI is configured, click `Use brief` on an example card first, then compare the AI draft against the curated example already on the board. That makes it easy to see where the model is helpful and where editorial judgment still matters.

## Why These Examples Matter

These examples make HelixCanvas more useful for more people because they cover three different figure jobs:

- signaling mechanism figures for papers and graphical abstracts
- experimental workflows for methods sections, protocols, and lab meetings
- disease-overview pathology figures for teaching, grants, and reviews

The goal is that a trainee, educator, or researcher can start from a biologically meaningful figure immediately instead of from a blank canvas.
