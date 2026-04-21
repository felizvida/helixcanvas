# Contributing to HelixCanvas

HelixCanvas is an open-source, local-first biomedical illustration tool. Contributions are welcome from people working on editor UX, asset metadata, exports, accessibility, documentation, and optional AI integrations.

## Project Values

Please keep these principles in mind when contributing:

- the app should stay useful without paid services
- provenance and attribution matter
- local-first reliability matters more than flashy features
- optional AI should support, not replace, user control
- contributor ergonomics matter too

## Ways to Help

- fix editor bugs or interaction rough edges
- improve SVG/PNG export fidelity
- add documentation, tutorials, or sample figures
- improve asset metadata, taxonomy, and provenance handling
- propose optional AI provider integrations
- improve accessibility and keyboard workflows

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm run dev
```

3. Run the local checks:

```bash
npm run check
```

If you want AI features locally, configure `OPENAI_API_KEY` using [.env.example](./.env.example). The editor should still work without it.

## Working Agreement

- Keep changes focused.
- Prefer clear, boring reliability over cleverness.
- Do not add required paid dependencies without discussion.
- Keep AI integrations optional.
- Preserve source and license metadata when touching the asset pipeline.

## Pull Requests

For a PR to be easy to review, please include:

- what changed
- why it changed
- any product or UX impact
- how you tested it
- screenshots or short clips for meaningful UI changes

## Asset Contributions

Asset-related contributions need extra care.

- Do not add assets unless their provenance and license are clear.
- Keep attribution metadata attached to the asset manifest.
- Prefer adding new sources as structured packs instead of mixing raw files into the app ad hoc.
- If a source has unclear redistribution rights, open an issue first instead of submitting a direct asset PR.

## Issues

Before opening a large feature PR, start with an issue if the scope is non-trivial. That helps keep roadmap decisions aligned with the project mission.

Useful issue types:

- editor bug
- export bug
- asset provenance improvement
- accessibility improvement
- documentation gap
- optional AI provider idea

## Style and Scope

- Keep user-facing copy concise and clear.
- Match the existing design direction unless the goal is an intentional UI improvement.
- Prefer small composable utilities over deep framework abstractions.
- Add tests when changing reusable logic or release-critical behavior.

## Release Mindset

HelixCanvas is not trying to become a proprietary hosted design tool. Contributions should make the project more trustworthy, more maintainable, and more useful to researchers working with zero-cost tools.
