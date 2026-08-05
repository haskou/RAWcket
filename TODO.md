# RAWcket product roadmap

This document tracks product capabilities that are still incomplete. Tooling, the architectural foundation, CI, initial persistence, portable bundles, encryption, and the first automated test suite are already in place.

## Current progress

- [x] Versioned preview contract with validated resolution.
- [x] Cancellable Web Worker with progress, timeout, and bounded concurrency.
- [x] Reference CPU pipeline for every current global adjustment and RGB/luminance tone curves.
- [x] Sliders, exact numeric entry, reset, grouped history, and per-adjustment enable/disable state.
- [x] Navigable Active Recipe sidebar, preview pan/zoom, and keyboard shortcuts.
- [x] English UI and user-facing errors.
- [x] Interactive RGB/R/G/B/luminance curve graph with draggable and exact points.
- [x] Rendered non-destructive crop/geometry, before/after, masks, histogram, and clipping.
- [x] Local reviewable AI proposals, measurement-backed tutor, and deterministic smart-point masks.
- [x] JPEG/PNG/TIFF worker export with resize, progress, and cancellation.
- [x] ARW embedded-preview extraction while preserving the original RAW.
- [x] Versioned LRU previews, quota preflight, SHA-256 snapshots, and corruption recovery.
- [x] Safe, postponable PWA updates and a production CSP without `unsafe-eval`.
- [ ] Full LibRaw/WASM A6600 demosaicing and high-depth linear development.
- [x] WebGPU-first global-development/curve compute pipeline, WebGL2 fallback, and explicit CPU fallback for masks and spatial stages.
- [ ] Complete GPU mask/spatial-stage coverage and the remaining capabilities below.

## Recommended implementation order

1. Prototype LibRaw/WASM in a worker with a redistributable Sony A6600 ARW fixture.
2. Establish golden-image tests for the versioned sRGB CPU/WASM reference pipeline.
3. Extend the WebGPU and WebGL2 renderers behind the existing preview boundary to cover masks and spatial stages.
4. Add consented ONNX model management and semantic segmentation after manual/local deterministic masks.
5. Add optional cloud assistance only after privacy, cost, and structured-output contracts are complete.

---

## 1. RAW engine and input formats

**Goal.** Convert camera originals into a reproducible, high-depth linear image prepared for the development pipeline, starting with Sony A6600 ARW.

**Scope.** Evaluate existing LibRaw wrappers against a first-party build; compile LibRaw to WebAssembly; open A6600 ARW files; extract embedded previews and EXIF; read camera white balance, black/white levels, and Bayer pattern; implement reference demosaicing and high-depth linear output. Keep the codec boundary extensible for other RAW formats and additional JPEG/PNG/TIFF inputs. Run decoding in a worker with progress, cancellation, explicit limits, and careful WASM memory management.

**Dependencies.** The existing `PreviewRenderer` boundary; Emscripten; redistributable RAW fixtures; worker protocol; memory/cache policy; LibRaw and wrapper license review.

**Acceptance.** A known A6600 ARW opens without blocking the main thread; metadata and levels match trusted reference tools; an embedded preview appears before full development; cancellation releases memory; corrupt files produce actionable errors; golden tests detect regressions; JPEG/PNG keep working.

**Risks.** WASM download and startup cost; RAM peaks; camera color differences; codec licensing; Safari constraints; malicious or truncated files; expensive WASM/JS copies.

## 2. GPU pipeline, color, and previews

**Goal.** Apply the recipe interactively without sacrificing quality or blocking the interface.

**Scope.** Use WebGPU first, WebGL2 as the graphics fallback, and CPU/WASM where appropriate. Produce 512 px thumbnails, 2048–3072 px interactive previews, and full resolution only for final export. Add 1024/4096-entry curve LUTs, initial sRGB color management, future Display P3 support, clipping warnings, RGB/luminance histograms, optional scopes, before/after comparison, intelligent caches, and incremental rendering.

**Implemented.** The worker now selects a WebGPU compute shader first for compatible global adjustments, RGB/R/G/B/luminance LUTs, and vignette, then a real WebGL2 fragment shader when WebGPU is unavailable. Recipes with masks, texture, sharpening, or noise reduction deliberately fall back to the reference CPU pipeline and the active backend is visible in the canvas. The same boundary already provides 2560 px interactive previews, full-resolution export, versioned LRU caching, histograms, clipping, and before/after.

**Remaining.** WebGPU/WebGL2 mask and spatial-filter passes, formal CPU/GPU golden-image tolerances, device-loss recovery, Display P3/ICC work, optional scopes, and incremental tiled rendering.

**Dependencies.** Linear RAW engine; capability detection; preview boundary and worker protocol; color fixtures; documented operation order; versioned caches.

**Acceptance.** GPU and CPU reference results remain visually equivalent within a stated tolerance; edits update without jank; resolution switches without visible jumps; histograms and clipping describe the rendered frame; missing WebGPU produces a clear fallback.

**Risks.** Driver/shader divergence; texture precision; ICC handling; GPU memory and device loss; histogram readback cost; inconsistent P3 support.

## 3. Global development tools

**Goal.** Provide a predictable, educational, reversible photographic pipeline.

**Implemented.** Exposure, temperature, tint, contrast, highlights, shadows, whites, blacks, saturation, vibrance, clarity, dehaze, sharpening, and noise reduction affect pixels in the reference renderer. Each has a slider, exact numeric entry, reset, undo/redo, and a non-destructive enable switch.

**Implemented.** Texture and vignette render through the reference pipeline. Natural, Cinematic, and Monochrome presets replace portable development settings as one reversible operation. Copy/paste excludes source, geometry, masks, IDs, and caches.

**Remaining.** Lens profiles, chromatic aberration, distortion, stronger production-grade algorithms, and a future batch-editing foundation.

**Acceptance.** Every control changes recipe and pixels consistently; reset is identity; undo/redo does not drift; ranges and units are documented; presets remain auditable operations; copy/paste excludes IDs and caches; optical corrections can be disabled.

**Risks.** Similar tool names masking different algorithms; halos/noise; operation order; denoise/sharpen performance; lens database licensing; destructive-looking presets.

## 4. Tone curves

**Goal.** Offer precise tonal editing with fluid, mathematically stable interaction.

**Implemented.** Master RGB, independent R/G/B, and optional luminance curves are versioned domain values. Linear and monotonic-cubic evaluators produce bounded LUTs and render through the CPU worker. Basic RGB presets are undoable.

**Implemented.** Interactive channel graph, draggable/addable/removable points, RGB/R/G/B/luminance selector, per-channel reset, exact numeric editing, interpolation choice, and presets. The rendered histogram and clipping measurements remain visible alongside it.

**Remaining.** Per-channel copy/paste, local mask curves, deeper educational channel help, dedicated keyboard point manipulation, and final touch audit.

**Acceptance.** X coordinates never cross or duplicate; a drag is one history action; monotonic cubic interpolation does not overshoot; LUT and CPU evaluator agree; reset/copy preserve the channel; clipping is not communicated by color alone.

**Risks.** Overshoot, banding, 8/16-bit precision, canvas accessibility, dense points, interactive performance, LUT divergence.

## 5. Crop, framing, and geometry

**Goal.** Reframe without physically altering the original until export.

**Implemented.** Fixed crop frame, free image translation, development scale, rotation/straightening, aspect ratios, flips, persistence, undo/redo, and identical preview/export rasterization.

**Remaining.** Perspective/vertical/horizontal correction, direct-manipulation crop handles, rule-of-thirds/golden-ratio overlays, and touch gesture polish.

**Dependencies.** Existing `ViewportTransform`; renderer integration; pointer/touch/trackpad gestures; homography math; EXIF orientation.

**Acceptance.** Crop never discards source pixels; reset reproduces the initial frame; keyboard and touch can manipulate frame and image; persisted geometry reopens identically; final export matches preview; locked ratios never deform.

**Risks.** Coordinates after rotation/flip; straightening gaps; precision; conflicting gestures; degenerate homographies; double-applied EXIF orientation.

## 6. Manual masks

**Goal.** Apply precise local changes from editable vector sources with disposable raster caches.

**Implemented.** Editable brush strokes, radial and linear gradients, luminance ranges, local exposure, opacity, feather, density, invert, overlay, vector persistence, and deterministic CPU rasterization.

**Remaining.** Eraser/pressure interaction, color sampling, expand/contract, local curves, composition UI, disposable raster caches, and GPU rasterization.

**Dependencies.** Existing `MaskDefinition`; local render stages; Pointer Events pressure; GPU/CPU rasterizer; versioned caches; curve editor.

**Acceptance.** Strokes remain editable; erasing never damages the original; GPU/CPU feather and density agree; boolean operations are deterministic; cache loss never loses a mask; overlays are accessible; long strokes do not freeze the UI.

**Risks.** Point volume; device pressure differences; edge precision; memory growth; nested composition; cache migration.

## 7. Local AI masks

**Goal.** Select by clicking without sending the photograph off-device.

**Implemented foundation.** Positive/negative points and editable bounding boxes persist as normal AI-mask recipe data. The current `local-spatial-luminance` strategy is deterministic, offline, requires no download, and is labeled honestly rather than presented as SAM.

**Remaining.** Evaluate SAM, SAM 2, or a compatible alternative on ONNX Runtime Web/WebGPU. Download models only after consent into Cache Storage or OPFS; compute one embedding per preview; decode subsequent prompts quickly; offer light/advanced models and manual fallback.

**Acceptance.** Nothing downloads without consent; cancellation stops network and compute; embeddings reuse a preview/model hash; the project preserves prompts/points/boxes/model/version rather than depending on a raster; the model works offline after download; unsupported devices retain manual tools.

**Risks.** Model size, RAM/VRAM, WebGPU support, warm-up time, output quality, model supply chain, quota, obsolete weights.

## 8. Semantic segmentation

**Goal.** Create local masks for common photographic categories.

**Scope.** Subject, sky, water, vegetation, people, background, buildings, skin, hair, and clothing; local model; confidence; manual refinement; category composition.

**Acceptance.** Available categories are explicitly tied to a model/version; confidence is visible; all results remain refinable and composable; missing categories are not presented as certainty.

**Risks.** Bias; ambiguous classes; sensitive person/skin categories; large models; weak low-light results; false confidence.

## 9. Natural-language masks

**Goal.** Translate text intent into inspectable regions, not an opaque generated mask.

**Scope.** Accept requests such as “select the red reflection in the water.” An optional cloud model—and later a local VLM—returns boxes, positive/negative points, and exclusions; local segmentation produces the precise mask. Persist prompt, regions, model, and version. Support boolean exclusions and uncertainty warnings.

**Acceptance.** The consent screen lists exactly what will leave the device; responses are schema-validated; outputs become normal `EditOperation` values; regions can be inspected and corrected; rejection changes nothing; full RAW data is never uploaded.

**Risks.** Spatial ambiguity; metadata prompt injection; cloud cost/privacy; hallucinated regions; language differences; provider dependency.

## 10. Optional AI development

**Goal.** Propose explainable, bounded edits without giving AI direct authority over a project.

**Implemented locally.** The prominent AI Studio translates intent into bounded, validated operations locally; every operation is individually reviewable and unapplied proposals change nothing. No pixels or metadata leave the browser.

**Remaining optional cloud scope.** OpenAI as the first replaceable adapter and a future local VLM. With explicit consent, send only a reduced preview plus selected EXIF, histograms, clipping, percentiles, estimated noise, current values, and user intent. Structured output produces validated operations. Add weaker variants, cost display, cancellation, and provider-specific explanations. Never send full RAW or log images.

**Acceptance.** RAWcket works with no key; every call describes data and estimated cost; invalid output is rejected; operations pass through the aggregate and history; an unapplied proposal changes nothing; keys/previews never enter logs, errors, projects, or bundles.

**Risks.** Variable cost, hallucinations, privacy, evolving structured-output contracts, EXIF prompt injection, model dependency, identifiable previews.

## 11. Development tutor

**Goal.** Teach photographic decisions without replacing the user’s judgment.

**Implemented.** The Local Development Tutor distinguishes measured facts from suggestions, explains rendered clipping, flags likely noise after strong shadow lift, warns when clarity and sharpening compound, and links directly to the relevant panel. It never auto-applies advice.

**Remaining.** White-balance/curve lessons, unrecoverable RAW-data analysis after LibRaw, guided/copilot/manual modes, consequence previews, and opt-in local preference learning.

**Acceptance.** Explanations link to visible measurements; facts and suggestions are clearly distinguished; the tutor can be silenced; preference learning is opt-in and local; deletion is complete; advice is never auto-applied.

**Risks.** Prescriptive advice, false positives, excessive jargon, accessibility, sensitive local profiles, aesthetic bias.

## 12. Final photographic export

**Goal.** Rasterize original plus recipe into a high-quality image while keeping project export separate.

**Implemented.** JPEG, PNG, and uncompressed baseline RGB 8-bit TIFF; JPEG quality; exact longest-edge resize; full source size by default; recipe/geometry parity; worker execution; progress; cancellation; and extension/MIME agreement. Canvas/worker encoding strips source metadata by construction.

**Remaining.** 16-bit TIFF after a high-depth pipeline, output sharpening, explicit ICC profiles, selective metadata preservation, watermarking, and tiled full-resolution export.

**Acceptance.** Export preview and file agree within tolerance; cancellation leaves no partial file; metadata follows choices; full resolution does not block the main thread; sharpening follows output dimensions; extension, MIME, and bytes agree.

**Risks.** Extreme memory use; canvas limits; TIFF/16-bit support; ICC profiles; private metadata; partial writes; resize artifacts.

## 13. Advanced project management

**Goal.** Make the library resilient to interrupted writes, quota pressure, corruption, and large collections.

**Implemented.** Five per-project SHA-256 snapshots, newest-valid corruption recovery without overwriting damaged data, portable checksummed bundles, OPFS/IndexedDB original storage, persistent-storage request, quota visibility, and import safety reserve.

**Remaining.** Write-ahead journaling across IndexedDB/OPFS, `.rawcket.json` sidecars, optional File System Access links, orphan cleanup, search, tags, ratings, and future collections.

**Acceptance.** Interrupted saves recover the last consistent snapshot; corruption never overwrites the backup; cleanup never deletes a referenced original; quota errors are explained early; sidecars and bundles migrate by version; revoked file permissions fall back to OPFS.

**Risks.** Limited `pagehide`; non-atomic IndexedDB/OPFS transactions; orphan races; filesystem permissions; stale sidecars; large indexes.

## 14. Security and privacy

**Goal.** Reduce local and optional-integration risk with understandable controls.

**Implemented.** In-memory and password-encrypted API keys, AES-GCM/PBKDF2-SHA-256 with a non-persisted master password, deletion from session/device settings, no analytics, storage transparency, and a production CSP that excludes `unsafe-eval`, external scripts, frames, and objects.

**Remaining.** Trusted Types compatibility, automated dependency/supply-chain auditing, verifiable browser-storage deletion caveats, opt-in telemetry controls if telemetry is ever added, and cloud-preview minimization/consent when a provider adapter exists.

**Acceptance.** Production CSP excludes `unsafe-eval`; secrets never enter serializable state, logs, or telemetry; a removed key cannot be recovered; cloud previews are minimized and consented; telemetry off means zero telemetry requests; CI audits dependencies.

**Risks.** XSS defeating an unlocked vault; browser extensions; dependency exfiltration; misleading encryption expectations; HTTP caches; physical storage deletion limits.

## 15. PWA and offline operation

**Goal.** Keep the website useful offline and make installation optional.

**Implemented.** The service-worker app shell, offline-ready notice, outdated-cache cleanup, and a new-version prompt that can be postponed rather than auto-activating while editing.

**Remaining.** Downloadable AI models, schema-aware rollback, model size/status, and optional non-intrusive install prompts.

**Acceptance.** The library opens offline after first load; incompatible code never activates before data can migrate; updates can be postponed; failed updates recover the previous shell; model size/status is visible; the normal website keeps every capability.

**Risks.** Stale caches, stuck service workers, shared quota, irreversible migration, huge models, iOS browser constraints.

## 16. Performance and compatibility

**Goal.** Keep interaction fluid with large files across heterogeneous devices.

**Implemented.** Bounded worker concurrency, OffscreenCanvas/ImageBitmap, cancellation, timeouts, 2560 px interactive previews, full-size export, versioned recipe/source/size LRU caching, and quota preflight.

**Remaining.** Bounded WASM memory, tiled rendering, multi-level preview scheduling, profiling UI, low-memory modes, expanded Safari/Firefox fallbacks, and explicit decode-memory limits.

**Acceptance.** Frame budget is measured; obsolete work is cancelled; memory returns near baseline after close; visible tiles are prioritized; low-RAM mode reduces resolution with notice; limits are detected before OOM; a browser/device matrix is documented.

**Risks.** Unreliable memory APIs, uneven OffscreenCanvas, competing workers, buffer copies, thermal throttling, immature WebGPU implementations.

## 17. Design, learning, and accessibility

**Goal.** Preserve initial simplicity while revealing power without excluding keyboard, touch, or assistive-technology users.

**Implemented.** Simple/Advanced modes, collapsible tools, exact labels, reduced-motion support, keyboard shortcuts, pan/zoom gestures, visible save/render states, English UI, and a navigable Active Recipe that never hides applied state.

**Implemented.** Before/after comparison, histogram/clipping display, brush/radial/linear/smart-point overlays, and AI tutor explanations now join the existing keyboard, pan/zoom, responsive, and Active Recipe work.

**Remaining.** Visual history, favorites, onboarding, complete touch/trackpad polish, accessible non-visual alternatives for every canvas interaction, full responsive review, and WCAG audit.

**Acceptance.** Primary flows work entirely by keyboard; focus, labels, and live regions are correct; contrast is WCAG AA; meaning never relies on color alone; touch targets are adequate; pending features never appear active.

---

## Definition of Done for every roadmap slice

- Versioned domain model and contracts, with no invalid primitives or React/provider coupling.
- Serializable operations, migration, and compatibility documentation whenever the schema changes.
- Direct unit coverage for non-trivial classes, integration coverage for the workflow, and persistence E2E when applicable.
- Cancellation, progress, actionable errors, accessibility, and privacy designed into the slice.
- README, ADRs, and this roadmap updated; `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and relevant E2E checks all green.
