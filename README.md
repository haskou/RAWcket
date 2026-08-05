[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

# RAWcket

RAWcket is the foundation of a non-destructive, local-first RAW photo editor that runs entirely in the browser. It combines a simple entry point with progressively disclosed professional depth and an AI-first workflow in which every proposal remains inspectable and reversible.

The original is never modified. Every human, preset, or AI change becomes a serializable operation in a versioned recipe.

## Current status

Implemented:

- Strict TypeScript React/Vite application with responsive, accessible foundations.
- Local library with JPEG/PNG import, a Canvas-generated demo, reopening, rename, duplicate, confirmed deletion, and portable project bundles.
- Editor with Simple/Advanced modes, exact numeric entry, sliders, reset, undo/redo, keyboard shortcuts, and draggable/zoomable preview.
- Navigable Active Recipe sidebar with a reversible enable switch for every global parameter.
- Reference CPU renderer in a cancellable Web Worker for all current global adjustments, independent RGB/luminance curves, progress, timeout, and bounded concurrency.
- Non-destructive domain model for global adjustments, curves, viewport geometry, and seven mask families.
- One shared operation contract for human and AI edits, schema validation, serialization, continuous-change grouping, bounded history, undo, and redo.
- IndexedDB project/index/settings persistence and OPFS originals with an IndexedDB fallback.
- Debounced autosave plus saves on `visibilitychange`, `pagehide`, and explicit close.
- `.rawcket` ZIP bundles containing `manifest.json`, `project.json`, the original, and SHA-256 integrity data.
- Versioned schema migrations through version 2.
- AI disabled by default, with an optional AES-GCM/PBKDF2 key vault whose master password is never stored.
- Optional PWA installation and an offline app shell after the first successful load.
- Unit, integration, and Chromium E2E coverage; CI for lint, typecheck, tests, build, and E2E.

Not implemented yet:

- RAW/ARW decoding, demosaicing, or a high-depth linear pipeline.
- WebGPU/WebGL2 rendering, interactive curve graph, geometry rasterization, histograms, and rendered masks.
- Local AI segmentation, a connected editing advisor, or provider calls.
- Final photographic JPEG/PNG/TIFF export. The current Export action creates a portable project bundle.

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

Projects, indexes, and preferences live in IndexedDB. JPEG/PNG originals use OPFS when available and an IndexedDB object store otherwise. RAWcket requests persistent storage but remains functional when the browser rejects it.

A browser may purge data because of quota, policy, or user action. **Local storage is not a replacement for a backup.** Export `.rawcket` bundles regularly.

## `.rawcket` format

A `.rawcket` file is a ZIP containing:

```text
manifest.json    format, versions, sizes, and SHA-256 values
project.json     versioned recipe, metadata, history, and UI state
original.jpg     or original.png
```

Import validates the manifest, format version, every hash, and the Zod schema before hydrating the domain model. If an ID already exists, RAWcket generates a new one to prevent overwriting.

## Privacy and security

- There is no backend, account, authentication, analytics, or mandatory SaaS.
- No image or metadata leaves the device without an explicit future consent flow.
- AI is disabled by default and its disabled adapter fails explicitly.
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

- Only JPEG and PNG can currently be imported.
- The reference CPU algorithms prioritize deterministic architecture and testability over production photographic quality.
- OPFS, persistent-storage requests, workers, and PWA behavior depend on browser capabilities and degrade safely.
- `pagehide` cannot guarantee completion of asynchronous writes when a process terminates abruptly; debouncing reduces the loss window.
- The vault protects data at rest, not against XSS executing in the same origin.
- The experience prioritizes desktop while retaining a functional tablet/mobile layout.

## Contributing

1. Create a branch; never work directly on `main`.
2. Keep domain behavior out of React and infrastructure.
3. Add explicit application messages to new entry points and direct tests for non-trivial classes.
4. Run lint, typecheck, tests, build, and relevant E2E checks.
5. Use conventional commits with gitmoji, for example `feat(editor): ✨ Add curve interaction`.

## License

MIT. See [LICENSE](LICENSE).
