# HelixCanvas Open-Source Roadmap

## Mission

HelixCanvas aims to be a local-first, zero-cost biomedical figure tool built for open science, teaching, and research communication. The project should be useful without any paid service, transparent about asset provenance, and welcoming to contributors.

## Product Direction

We are intentionally optimizing for:

- local-first editing
- no mandatory cloud account
- no required paid backend
- provenance-aware asset workflows
- optional, bring-your-own AI
- durable open-source maintainability

We are intentionally **not** optimizing for:

- SaaS billing or subscriptions
- proprietary stock-library lock-in
- AI-only workflows
- shipping fast at the cost of trust or clarity

## Release Philosophy

A release is considered mature when it is:

- easy to install
- easy to understand
- hard to lose work in
- transparent about sources and licenses
- useful without paid services
- maintainable by more than one person

## Where The Repo Stands Now

The project has already crossed a meaningful threshold from concept to usable local workbench.

Shipped foundation:

- validated built-in asset packs with provenance summaries
- local project files, recovery drafts, and named snapshots
- marquee selection, grouping, align/distribute, alignment guides, and panel layouts
- reusable components plus common annotation blocks
- inline local review comments that stay out of exports
- SVG, PNG, PDF, JSON, and attribution export paths
- real biology examples and tutorial artifacts

That means the near-term roadmap is now about refinement and trust: better text and connector controls, stronger export presets, improved retrieval, and clearer contributor architecture.

## Milestones

### v0.2 Product Polish

Goal: make HelixCanvas dependable for solo use on a single machine.

Focus areas:

- multi-select, grouping, and stronger layer controls
- alignment guides, better snapping, cleaner zoom/pan behavior
- richer text and annotation tools
- local project save/open flows
- autosave and crash-recovery behavior
- stronger SVG and PNG export quality

Release criteria:

- a user can create and export a clean 3-5 panel figure locally
- no common editing path feels brittle or confusing
- project state survives normal refreshes and interruptions

### v0.3 Asset Platform Maturity

Goal: make the asset system trustworthy and extensible.

Focus areas:

- normalized manifest schema for packs and assets
- improved search taxonomy, aliases, and deduping
- pack-based library architecture
- visible attribution and license UX
- contributor tooling for metadata validation

Release criteria:

- every surfaced asset has clear provenance metadata
- attribution output is reliable and reviewable
- new asset packs can be added without modifying core editor logic

Status:

- built-in packs, pack validation, and contributor-facing pack docs are already in place
- the next work here is retrieval quality, private/local pack install paths, and richer on-canvas provenance UX

### v0.4 Community Release

Goal: make the repository easy to adopt and contribute to.

Focus areas:

- contributor docs and GitHub templates
- architecture notes for editor, assets, exports, and AI boundaries
- broader automated tests and fixtures
- reproducible sample figures and walkthroughs
- issue labels and contributor lanes

Release criteria:

- a new contributor can get the project running quickly
- contribution expectations are documented and consistent
- maintainers have enough automation to review changes confidently

Status:

- contributor docs, templates, tutorial assets, and CI are already present
- the remaining lift is sharper architecture docs, more examples, and easier contribution lanes

### v0.5 Optional AI Providers

Goal: keep AI useful without making it part of the core cost model.

Focus areas:

- provider abstraction for OpenAI and local-model integrations
- offline-first behavior when AI is unavailable
- schema validation and clearer AI feature boundaries
- BYO key setup and local model documentation

Release criteria:

- HelixCanvas remains fully useful without AI enabled
- AI support is plug-in style rather than hard-coded product logic
- users understand what the AI does and does not guarantee

### v1.0 Public-Good Launch

Goal: ship a stable open-source tool that labs, educators, and students can rely on.

Focus areas:

- stable project-file expectations
- stable asset schema and pack format
- polished onboarding and tutorials
- versioned releases and release notes
- optional desktop packaging if the web app is already strong

Release criteria:

- stable installs
- stable local workflows
- stable export behavior
- clear contributor and maintainer handoff paths

## Recommended GitHub Milestones

- `v0.2 Product Polish`
- `v0.3 Asset Platform`
- `v0.4 Community Release`
- `v0.5 Optional AI`
- `v1.0 Public-Good Launch`

For a more operational issue-by-issue plan aimed at closing the gap with BioRender while preserving HelixCanvas's open-source direction, see [GITHUB_MILESTONES.md](./GITHUB_MILESTONES.md).

## Recommended Label Lanes

- `editor`
- `assets`
- `exports`
- `docs`
- `good first issue`
- `help wanted`
- `design`
- `ai-optional`
- `bug`
- `accessibility`

## Contribution Lanes

People should be able to help in clearly scoped ways:

- editor UX and interaction polish
- asset metadata, packs, and taxonomy
- export fidelity and citation workflows
- documentation and tutorials
- optional AI provider integrations
- accessibility and keyboard support

## Next Concrete Steps

1. Finish richer text and connector controls.
2. Add export presets for paper, slide, and poster workflows.
3. Improve search and retrieval across packs.
4. Add contributor architecture docs for editor, packs, exports, and AI boundaries.
5. Keep building toward a stable public-good release rather than a hosted service.
