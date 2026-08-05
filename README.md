[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

# RAWcket

RAWcket is the foundation of a non-destructive, local-first RAW photo editor that runs entirely in the browser. It combines a simple entry point with progressively disclosed professional depth and an AI-first workflow in which every proposal remains inspectable and reversible.

The original is never modified. Every human, preset, or AI change becomes a serializable operation in a versioned recipe.

## Current status

Implemented:

- Strict TypeScript React/Vite application with responsive, accessible foundations.
- Local library with a dedicated JPEG/PNG/Sony ARW dropzone dialog, direct library drag and drop, multi-photo selection, optional on-device automatic tags, a Canvas-generated demo, reopening, rename, duplicate, confirmed deletion, quota preflight, and portable project bundles.
- Editor with Simple/Advanced modes, exact numeric entry, sliders, reset, undo/redo, keyboard shortcuts, and draggable/zoomable preview.
- Collapsible, navigable Active Recipe sidebar that lists only non-default instructions, with reversible enable switches and links back to each editor.
- Adaptive renderer with cancellable scheduling: LibRaw/WASM develops supported camera mosaics to linear 16-bit RGB in its isolated browser worker, then a render worker applies the recipe. WebGPU compute and real WebGL2 shaders natively rasterize brush, gradient, range, smart-point, and nested composite masks before applying compatible global development, ordered local adjustments, curve LUTs, denoise, texture, and sharpening. The deterministic CPU evaluator remains the reference and bounded fallback. Geometry, histograms, clipping analysis, progress, timeout, bounded concurrency, validation/device-loss fallback, and a versioned LRU preview cache share the same boundary.
- Non-destructive domain model for global adjustments, curves, viewport geometry, and seven mask families.
- Bounded Companion history stored with each local project and checksummed bundle: original request, suggested intent, critique, strengths, opportunities, explanation, editable operations, and applied/rejected state. API keys, reduced previews, and provider envelopes are never project data.
- One shared operation contract for human and AI edits, schema validation, serialization, continuous-change grouping, bounded history, undo, and redo.
- IndexedDB project/index/settings persistence, five verified SHA-256 snapshots per project, corruption recovery, and OPFS originals with an IndexedDB fallback.
- A persistent cross-store write-ahead journal reconciles interrupted create, duplicate, import, and delete operations and removes only originals proven orphaned.
- Debounced autosave plus saves on `visibilitychange`, `pagehide`, and explicit close.
- `.rawcket` ZIP bundles containing `manifest.json`, `project.json`, the original, and SHA-256 integrity data.
- Versioned schema migrations through version 9.
- Safe TIFF/EXIF inspection for Sony ARW camera, lens, exposure, aperture, ISO, focal length, orientation, white balance, color space, sensor levels, and CFA pattern, with an honest in-editor source-information view.
- AI-first workspace with OpenAI visual critique and reviewable proposals for sliders, tone curves, crop/geometry, radial, linear-gradient, luminance-range, and point/box-guided smart masks. The current rendered state and active recipe are supplied as context. Explicit crop/curve requests are contract-checked and repaired once instead of silently dropping the requested tool.
- OpenAI defaults to the editable `gpt-5.6-luna` model identifier. Keys can remain tab-only, use the existing AES-GCM/PBKDF2 device vault, or be stored without a RAWcket master password in the app's private Google Drive `appDataFolder` after Google sign-in.
- Optional Google sign-in uses a deployment-configured public OAuth Web Client ID, never a token or Client ID entered by the photographer. The same session enables private OpenAI-key restoration and visible RAWcket/Projects, Originals, and Exports backups.
- Real JPEG, PNG, and baseline uncompressed RGB 8-bit TIFF export in a worker, with full-size/resize options, progress, and cancellation.
- Interactive curves with histogram and aligned black/shadow/midtone/highlight/white input regions; before/after; workspace-relative Fit; image-anchored thirds/golden guides; workspace-wide dense grid/diagonals; local edge-based auto straightening; and drag-to-crop with an outside veil, locked ratios, reusable corner handles, and a contextual canvas toolbar. Active masks are highlighted both on-canvas and in the mask list.
- A clearly separated AI Companion and Manual workspace, visibly pending one-call Companion review, conservative histogram-based no-AI Auto Enhance, OpenAI-authored editable briefs, one-click recipe clearing, and comparative multi-photo review based on post-edit potential with photographer override.
- Local library search across names and tags, optional semantic tags derived from the installed pinned local model, validated editable comma-separated tags, and reversible zero-to-five-star ratings.
- Persistent favorites with instant filtering and a visual editor history derived from real undo/redo operations.
- Optional, browser-gated PWA installation from the library header, an offline app shell after first load, and user-controlled update activation.
- Unit, integration, and Chromium E2E coverage; CI for lint, typecheck, tests, build, and E2E.
- Versioned SHA-256 CPU golden fixtures for neutral, tonal/channel, and masked-spatial recipes, plus live WebGL2/WebGPU parity against the CPU reference.

Not implemented yet:

- A legally redistributable Sony A6600 fixture and trusted-reference color/matrix golden corpus. The current external verification fixture is a locally downloaded Sony FX30 ARW and is intentionally not committed because its image license is unclear.
- A real-camera/color-target GPU parity corpus. Synthetic CPU goldens and native vector-mask WebGL2/WebGPU parity are enforced already across brush, radial, linear, luminance, color-point, smart-point, and nested add/subtract/intersect masks; validation or device loss falls back cleanly without dropping a mask.
- Larger promptable segmentation models. The first pinned local semantic model downloads and verifies itself automatically with visible progress before its dependent controls unlock.
- Lens profiles, chromatic-aberration/distortion correction, and production-grade denoise/sharpen algorithms. Horizontal and vertical perspective correction are implemented.
- 16-bit TIFF, ICC profiles, copyright/contact metadata fields, and tiled full-resolution export. RAW sensor development is already high-depth, but current file encoders quantize their output to 8-bit. Output sharpening, configurable text watermarks, and privacy-first camera/capture XMP selection are available today.
- Collections, optional filesystem links, and a full WCAG/browser-device audit.

The detailed, actively maintained plan is in [TODO.md](TODO.md).

## Run locally

Requirements: Node.js 22+ and pnpm 10+.

```bash
pnpm install
pnpm dev
```

After dependencies are installed, `pnpm dev` is the only command required to start RAWcket. Vite prints the local URL.

## Quality and production build

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium   # first run only
pnpm test:e2e
```

`pnpm preview` serves the production build locally.

LibRaw uses shared WebAssembly memory and pthread workers. Any production host must return the COOP/COEP/CORP headers recorded in [`public/_headers`](public/_headers); Vite development and preview already apply the same policy.

## Architecture

RAWcket applies practical DDD and hexagonal architecture in its initial `projects` bounded context:

- `domain`: `PhotoProject` aggregate, Value Objects, recipe, operations, history, and repository contracts. It does not import React, IndexedDB, WebGPU, OpenAI, or browser APIs.
- `application`: use cases with explicit application messages and ports for rendering, import/export, and optional AI advice.
- `infrastructure`: IndexedDB, OPFS, Zod, migrations, ZIP bundles, hashing, encryption, and worker rendering.
- `presentation`: routes, React components, session/autosave hooks, and CSS.
- `app`: declarative composition root connecting contracts to implementations.

See [docs/architecture.md](docs/architecture.md) and the [ADRs](docs/adr/).

## Local storage

Projects, indexes, snapshots, and preferences live in IndexedDB. JPEG/PNG/ARW originals use OPFS when available and an IndexedDB object store otherwise. RAWcket requests persistent storage, reports quota and eviction status, and refuses unsafe imports before exhausting the browser quota.

A browser may purge data because of quota, policy, or user action. **Local storage is not a replacement for a backup.** Export `.rawcket` bundles regularly.

## `.rawcket` format

A `.rawcket` file is a ZIP containing:

```text
manifest.json    format, versions, sizes, and SHA-256 values
project.json     versioned recipe, metadata, history, and UI state
original.jpg     or original.png / original.arw
```

Import validates the manifest, format version, every hash, and the Zod schema before hydrating the domain model. If an ID already exists, RAWcket generates a new one to prevent overwriting.

Browser-owned recipe presets use the separate `.rawcket-recipe.json` format. They contain validated recipe data, never the original image, project identity, history, ratings, tags, AI history, or credentials. My presets supports create, apply, update-from-current, rename, delete, import, and export; applying one is a single undoable edit. Legacy `.rawcket.json` sidecars remain decode-compatible but are no longer exposed as editor controls.

## Privacy and security

- There is no RAWcket backend, mandatory account, analytics, or mandatory SaaS. Optional Google Drive storage uses Google Identity Services directly in the browser.
- Manual editing, conservative histogram-based Auto Enhance, horizon estimation, technical checks, point masks, Semantic Select, and automatic import tags run locally. The semantic model downloads automatically, shows progress, verifies every pinned resource, and then performs inference on-device.
- OpenAI-powered opinions, editable proposals, and multi-photo comparison are optional cloud actions. They send reduced JPEG previews plus the visible task context to the OpenAI Responses API with response storage disabled; originals, RAW files, complete recipes, and API keys are not sent as request content.
- Google Drive is a separate optional cloud action. Only an explicitly selected original/bundle or an export covered by the enabled auto-upload preference is sent. The public OAuth Client ID is configured once at deployment through `VITE_GOOGLE_CLIENT_ID`; access tokens remain memory-only.
- The OpenAI model remains visible and editable, with `gpt-5.6-luna` as the initial value. Setup links directly to [OpenAI API key management](https://platform.openai.com/api-keys).
- Google-account key storage uses the hidden per-app Drive space and avoids a RAWcket master password, but is not RAWcket end-to-end encryption. Device storage remains AES-GCM/PBKDF2 encrypted; session-only storage remains memory-only.
- Keys never become part of projects, bundles, logs, or errors.

Storing secrets in a shared browser still carries risk. The threat model and planned hardening are documented in [TODO.md](TODO.md).

## Main structure

```text
src/
  app/                         composition root
  contexts/projects/
    domain/                    non-destructive model and repositories
    application/               use cases, messages, and ports
    infrastructure/            persistence, bundles, schemas, workers
  presentation/                React routes, components, hooks, and styles
  shared/infrastructure/       database, settings, encryption, storage
tests/
  unit/                        domain, application, and infrastructure
  integration/                 library workflow
  e2e/                         persistent Chromium workflow
docs/adr/                      architecture decisions
```

## Known limitations

- Supported Sony ARW files use LibRaw/WASM 16-bit linear development. If preview decoding fails, RAWcket visibly labels an embedded-JPEG fallback and its reason; final photo export fails rather than silently exporting that fallback.
- The reference CPU algorithms prioritize deterministic architecture and testability over production photographic quality.
- OPFS, persistent-storage requests, workers, and PWA behavior depend on browser capabilities and degrade safely.
- `pagehide` cannot guarantee completion of asynchronous writes when a process terminates abruptly; debouncing reduces the loss window.
- The vault protects data at rest, not against XSS executing in the same origin.
- TIFF export is currently uncompressed RGB 8-bit because the reference pipeline is 8-bit.
- The experience prioritizes desktop while retaining a functional tablet/mobile layout.

Third-party codec licenses and source links are recorded in [docs/third-party-notices.md](docs/third-party-notices.md) and included in production output.

## Contributing

1. Create a branch; never work directly on `main`.
2. Keep domain behavior out of React and infrastructure.
3. Add explicit application messages to new entry points and direct tests for non-trivial classes.
4. Run lint, typecheck, tests, build, and relevant E2E checks.
5. Use conventional commits with gitmoji, for example `feat(editor): ✨ Add curve interaction`.

## License

MIT. See [LICENSE](LICENSE).
