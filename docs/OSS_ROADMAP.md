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

1. Complete the local-first editor polish loop.
2. Define the pack and manifest format for assets.
3. Add example projects and tutorial docs.
4. Split optional AI behind a provider boundary.
5. Build toward a stable public release rather than a hosted service.
