# Asset Pack Spec

HelixCanvas uses versioned asset packs so contributors can add new illustration libraries without patching the editor itself.

This document is the source of truth for:

- where pack files live
- what fields a pack should contain
- how licensing and attribution are modeled
- how local assets should be stored
- what CI validates before a pack can ship

## Quick Start

1. Create a pack file in `packs/` using the `.pack.json` suffix.
2. Put any local SVG or PNG files under `public/packs/<pack-id>/`.
3. Run:

```bash
npm run check:packs
npm run build:library
```

4. Confirm the generated manifest updates in `public/data/library.packs.json`.

If you want a concrete starting point, copy [packs/examples/community-demo.pack.json](../packs/examples/community-demo.pack.json) and its local assets in [public/packs/community-demo](../public/packs/community-demo).

## Repo Layout

Recommended structure:

```text
packs/
  builtins/
    servier-originals.pack.json
  examples/
    community-demo.pack.json

public/
  packs/
    community-demo/
      signal-relay.svg
      cell-dialogue.svg
```

Rules:

- Pack manifests live under `packs/`.
- Pack filenames should normally match the pack id, for example `community-demo.pack.json`.
- Local asset URLs should point into `public/` with root-relative paths such as `/packs/community-demo/signal-relay.svg`.

## Pack Shape

Each pack file is a single JSON object.

Example:

```json
{
  "id": "community-demo",
  "title": "Community Demo Pack",
  "description": "A tiny self-authored example pack.",
  "version": "1.0.0",
  "homepage": "https://github.com/felizvida/helixcanvas/tree/main/packs/examples",
  "sourceBucket": "community",
  "sourceLabel": "Community Pack",
  "kind": "example",
  "provenance": "community-curated",
  "licenseStrategy": "shared",
  "attributionStrategy": "shared",
  "primaryLicenseLabel": "CC0 1.0",
  "primaryLicenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
  "defaultCitation": "Community Demo Pack by HelixCanvas contributors is released under CC0 1.0.",
  "maintainedBy": "HelixCanvas",
  "tags": ["example", "community", "local-assets"],
  "assets": [
    {
      "id": "community-demo:signal-relay",
      "title": "Signal relay",
      "categoryLabel": "Cellular biology",
      "originLabel": "HelixCanvas contributors",
      "assetType": "svg",
      "assetUrl": "/packs/community-demo/signal-relay.svg",
      "previewUrl": "/packs/community-demo/signal-relay.svg",
      "sourcePage": "https://github.com/felizvida/helixcanvas/tree/main/packs/examples"
    }
  ]
}
```

## Required Fields

Pack-level:

- `id`: lowercase letters, numbers, and hyphens only
- `title`
- `assets`: non-empty array
- `licenseStrategy`: one of `per-asset`, `shared`, `user-owned`
- `attributionStrategy`: one of `per-asset`, `shared`, `manual`

Asset-level:

- `title`
- `category` or `categoryLabel`
- `assetType`: `svg` or `png`
- `assetUrl`

Additional requirements depend on strategy:

- `shared` license packs must set `primaryLicenseLabel`
- `shared` attribution packs must set `defaultCitation`
- `per-asset` license packs must set `licenseLabel` on each asset
- `per-asset` attribution packs must set `citation` on each asset

## Recommended Fields

These are not always required, but you should usually include them:

- `description`
- `homepage`
- `maintainedBy`
- `tags`
- `sourceBucket`
- `sourceLabel`
- `originLabel`
- `sourcePage`
- `previewUrl`
- `licenseUrl`

## Strategy Guidance

### `licenseStrategy`

- `per-asset`: use when assets come from a source like Bioicons where each asset may differ
- `shared`: use when the whole pack shares one license, such as a self-authored pack or a curated official source
- `user-owned`: use only for packs whose redistribution rights depend on the user, not the repository

### `attributionStrategy`

- `per-asset`: use when each asset needs its own citation text
- `shared`: use when one citation covers the whole pack
- `manual`: use only when attribution must be handled outside the pack metadata

For open-source HelixCanvas contributions, `shared` or `per-asset` are strongly preferred over `manual`.

## URL Rules

Allowed asset URL styles:

- `https://...`
- `http://...`
- `/packs/...` for local files stored under `public/`
- `data:...` for generated or embedded data URLs

For committed packs, local `/public` paths or stable `https://` URLs are preferred. CI checks that local `/public` files actually exist.

## Validation Rules

`npm run check:packs` validates:

- JSON parseability
- required pack and asset fields
- allowed strategy values
- duplicate asset ids inside a pack
- local `/public` asset references actually exist
- pack filename roughly matches the pack id

`npm run build:library` will also fail if any committed pack has validation errors.

## Provenance Policy

Please keep these standards:

- Do not submit a pack unless redistribution rights are clear.
- Do not hide asset origin behind a generic pack label.
- Prefer explicit attribution text over vague notes.
- If a source is useful but legally ambiguous, open an issue first instead of landing the pack directly.

## Built-In vs Community Packs

Current patterns in the repo:

- Bioicons is generated into a built-in pack during `npm run build:library`
- Servier originals live as a first-class built-in pack file in [packs/builtins/servier-originals.pack.json](../packs/builtins/servier-originals.pack.json)
- The example community pack lives in [packs/examples/community-demo.pack.json](../packs/examples/community-demo.pack.json)

That mix is intentional for now: some sources are generated, some are curated, and the same manifest format can represent both.
