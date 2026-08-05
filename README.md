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
- Adaptive renderer with cancellable scheduling: LibRaw/WASM develops supported camera mosaics to linear 16-bit RGB in its isolated browser worker, then a render worker applies the recipe. WebGPU compute runs compatible global development, local masked adjustments, curve LUTs, denoise, texture, and sharpening; real WebGL2 shaders provide the graphics fallback. Deterministic CPU weight rasters cover every current mask family, while the reference CPU backend handles high-depth RAW input and bounded fallbacks. Geometry, histograms, clipping analysis, progress, timeout, bounded concurrency, device-loss fallback, and a versioned LRU preview cache share the same boundary.
- Non-destructive domain model for global adjustments, curves, viewport geometry, and seven mask families.
- Bounded Companion history stored with each local project and checksummed bundle: original request, suggested intent, critique, strengths, opportunities, explanation, editable operations, and applied/rejected state. API keys, reduced previews, and provider envelopes are never project data.
- One shared operation contract for human and AI edits, schema validation, serialization, continuous-change grouping, bounded history, undo, and redo.
- IndexedDB project/index/settings persistence, five verified SHA-256 snapshots per project, corruption recovery, and OPFS originals with an IndexedDB fallback.
- A persistent cross-store write-ahead journal reconciles interrupted create, duplicate, import, and delete operations and removes only originals proven orphaned.
- Debounced autosave plus saves on `visibilitychange`, `pagehide`, and explicit close.
- `.rawcket` ZIP bundles containing `manifest.json`, `project.json`, the original, and SHA-256 integrity data.
- Versioned schema migrations through version 8.
- Safe TIFF/EXIF inspection for Sony ARW camera, lens, exposure, aperture, ISO, focal length, orientation, white balance, color space, sensor levels, and CFA pattern, with an honest in-editor source-information view.
- AI-first workspace with a one-request OpenAI visual critique, suggested intent, and reviewable proposal for sliders, tone curves, crop/geometry, radial, linear-gradient, luminance-range, and point/box-guided smart masks; a measurement-backed local tutor; deterministic positive/negative-point smart masks; and optional consented on-device semantic selection for sky, water, vegetation, people, and buildings. Cloud AI remains unconfigured by default.
- Explicit OpenAI API provider and user-entered model configuration. Missing configuration opens the setup dialog and resumes the pending action after setup. The setup defaults to AES-GCM/PBKDF2 encrypted storage; the only alternative is tab memory that is explicitly never persisted. The master password is never stored.
- Real JPEG, PNG, and baseline uncompressed RGB 8-bit TIFF export in a worker, with full-size/resize options, progress, and cancellation.
- Interactive curves with histogram and aligned black/shadow/midtone/highlight/white input regions; before/after; workspace-relative Fit; image-anchored thirds/golden guides; workspace-wide dense grid/diagonals; local edge-based auto straightening; and drag-to-crop with an outside veil, locked ratios, reusable corner handles, and a contextual canvas toolbar. Active masks are highlighted both on-canvas and in the mask list.
- A clearly separated AI Companion and Manual workspace, visibly pending one-call Companion review, additive deterministic no-AI Auto Enhance, OpenAI-authored editable briefs, one-click recipe clearing, and comparative multi-photo review based on post-edit potential with photographer override.
- Local library search across names and tags, optional semantic tags derived from the installed pinned local model, validated editable comma-separated tags, and reversible zero-to-five-star ratings.
- Persistent favorites with instant filtering and a visual editor history derived from real undo/redo operations.
- Optional, browser-gated PWA installation from the library header, an offline app shell after first load, and user-controlled update activation.
- Unit, integration, and Chromium E2E coverage; CI for lint, typecheck, tests, build, and E2E.
- Versioned SHA-256 CPU golden fixtures for neutral, tonal/channel, and masked-spatial recipes, plus live WebGL2/WebGPU parity against the CPU reference.

Not implemented yet:

- A legally redistributable Sony A6600 fixture and trusted-reference color/matrix golden corpus. The current external verification fixture is a locally downloaded Sony FX30 ARW and is intentionally not committed because its image license is unclear.
- Native GPU vector-mask rasterization and a real-camera/color-target GPU parity corpus. Synthetic CPU goldens and masked-spatial accelerated parity are enforced already; masked local development and spatial filters run on both accelerated paths from deterministic disposable weight rasters, and WebGPU device loss falls back cleanly.
- Larger promptable segmentation models. The first pinned local semantic model is available on demand; it is never downloaded automatically.
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

Recipe-only sidecars use the separate `.rawcket.json` format. They contain a versioned recipe and source dimensions, never the original image, project identity, history, ratings, or tags. Applying one is a single undoable edit.

## Privacy and security

- There is no backend, account, authentication, analytics, or mandatory SaaS.
- Manual editing, Auto Enhance, horizon estimation, the Development Tutor, point masks, installed Semantic Select, and automatic import tags run locally. The semantic model downloads pinned weights only after consent, verifies each resource, then performs inference on-device; automatic import tags are skipped unless that model is already installed and enabled.
- OpenAI-powered opinions, editable proposals, and multi-photo comparison are optional cloud actions. They send reduced JPEG previews plus the visible task context to the OpenAI Responses API with response storage disabled; originals, RAW files, complete recipes, and API keys are not sent as request content.
- RAWcket never silently selects an OpenAI model. The provider and user-entered model are visible in setup, which links directly to [OpenAI API key management](https://platform.openai.com/api-keys).
- RAWcket never persists an unencrypted API key. Setup defaults to AES-GCM encrypted storage with a PBKDF2-SHA-256-derived key; the explicit session-only alternative stays in memory and is never saved. The master password is never stored. Browser-side keys remain exposed to the risks of the active page and installed browser extensions.
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
