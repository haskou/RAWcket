[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

# RAWcket

RAWcket is the foundation of a non-destructive, local-first RAW photo editor that runs entirely in the browser. It combines a simple entry point with progressively disclosed professional depth and an AI-first workflow in which every proposal remains inspectable and reversible.

The original is never modified. Every human, preset, or AI change becomes a serializable operation in a versioned recipe.

## Current status

Implemented:

- Strict TypeScript React/Vite application with responsive, accessible foundations.
- Local library with JPEG/PNG/Sony ARW import, a Canvas-generated demo, reopening, rename, duplicate, confirmed deletion, quota preflight, and portable project bundles.
- Editor with Simple/Advanced modes, exact numeric entry, sliders, reset, undo/redo, keyboard shortcuts, and draggable/zoomable preview.
- Collapsible, navigable Active Recipe sidebar that lists only non-default instructions, with reversible enable switches and links back to each editor.
- Adaptive renderer in a cancellable Web Worker: WebGPU compute runs compatible global development and curve LUTs first, a real WebGL2 shader provides the graphics fallback, and the reference CPU backend handles masks and spatial stages. Geometry, histograms, clipping analysis, progress, timeout, bounded concurrency, and a versioned LRU preview cache share the same boundary.
- Non-destructive domain model for global adjustments, curves, viewport geometry, and seven mask families.
- One shared operation contract for human and AI edits, schema validation, serialization, continuous-change grouping, bounded history, undo, and redo.
- IndexedDB project/index/settings persistence, five verified SHA-256 snapshots per project, corruption recovery, and OPFS originals with an IndexedDB fallback.
- Debounced autosave plus saves on `visibilitychange`, `pagehide`, and explicit close.
- `.rawcket` ZIP bundles containing `manifest.json`, `project.json`, the original, and SHA-256 integrity data.
- Versioned schema migrations through version 4.
- AI-first workspace with local, reviewable recipe proposals, a measurement-backed development tutor, deterministic positive/negative-point smart masks, and optional consented on-device semantic selection for sky, water, vegetation, people, and buildings. Optional cloud AI remains disabled by default.
- Optional AES-GCM/PBKDF2 API-key vault whose master password is never stored.
- Real JPEG, PNG, and baseline uncompressed RGB 8-bit TIFF export in a worker, with full-size/resize options, progress, and cancellation.
- Interactive curves, before/after, workspace-relative Fit, composition/level guides, exact geometry, explained brush/radial/linear/luminance masks, portable development settings, and built-in reversible presets.
- Local library search across names and tags, validated comma-separated tags, and reversible zero-to-five-star ratings.
- Optional PWA installation, an offline app shell after first load, and user-controlled update activation.
- Unit, integration, and Chromium E2E coverage; CI for lint, typecheck, tests, build, and E2E.

Not implemented yet:

- Full LibRaw/WASM demosaicing and a high-depth linear RAW pipeline. Sony ARW currently uses its embedded JPEG preview while preserving the original `.arw` in storage and bundles.
- WebGPU/WebGL2 passes for masks and spatial filters, device-loss recovery, and a complete GPU/CPU golden-image parity corpus.
- A consented optional cloud provider and larger promptable segmentation models. The first pinned local semantic model is available on demand; it is never downloaded automatically.
- Lens profiles, chromatic-aberration/distortion correction, perspective controls, and production-grade denoise/sharpen algorithms.
- 16-bit TIFF, ICC profiles, metadata selection, output sharpening, and watermarking.
- Collections, sidecars, filesystem links, complete orphan cleanup, and a full WCAG/browser-device audit.

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

## Privacy and security

- There is no backend, account, authentication, analytics, or mandatory SaaS.
- No image or metadata leaves the device. Future cloud assistance requires a separate explicit consent flow.
- Local proposals and point masks require no network. Semantic Select downloads pinned model weights only after consent, verifies each resource, then performs inference on-device. Optional provider access is disabled by default.
- An API key can remain in session memory or be encrypted with AES-GCM; its decryption key is derived from a master password that is never stored.
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

- Sony ARW development currently uses the embedded JPEG preview; sensor mosaics are not demosaiced yet.
- The reference CPU algorithms prioritize deterministic architecture and testability over production photographic quality.
- OPFS, persistent-storage requests, workers, and PWA behavior depend on browser capabilities and degrade safely.
- `pagehide` cannot guarantee completion of asynchronous writes when a process terminates abruptly; debouncing reduces the loss window.
- The vault protects data at rest, not against XSS executing in the same origin.
- TIFF export is currently uncompressed RGB 8-bit because the reference pipeline is 8-bit.
- The experience prioritizes desktop while retaining a functional tablet/mobile layout.

## Contributing

1. Create a branch; never work directly on `main`.
2. Keep domain behavior out of React and infrastructure.
3. Add explicit application messages to new entry points and direct tests for non-trivial classes.
4. Run lint, typecheck, tests, build, and relevant E2E checks.
5. Use conventional commits with gitmoji, for example `feat(editor): ✨ Add curve interaction`.

## License

MIT. See [LICENSE](LICENSE).
