# RAWcket product roadmap

This document tracks product capabilities that are still incomplete. Tooling, the architectural foundation, CI, initial persistence, portable bundles, encryption, and the first automated test suite are already in place.

## Current progress

- [x] Versioned preview contract with validated resolution.
- [x] Cancellable Web Worker with progress, timeout, and bounded concurrency.
- [x] Reference CPU pipeline for every current global adjustment and RGB/luminance tone curves.
- [x] Sliders, exact numeric entry, reset, grouped history, and per-adjustment enable/disable state.
- [x] Navigable Active Recipe sidebar, preview pan/zoom, and keyboard shortcuts.
- [x] Workspace-relative Fit, collapsible recipe column, fixed dense composition guides, contextual mask help, and modified-control indicators.
- [x] English UI and user-facing errors.
- [x] Interactive RGB/R/G/B/luminance curve graph with draggable and exact points.
- [x] Rendered non-destructive crop/geometry, before/after, masks, histogram, and clipping.
- [x] Local reviewable AI proposals, measurement-backed tutor, and deterministic smart-point masks.
- [x] Consented, pinned, integrity-verified ONNX semantic model with removable local storage and WebGPU/WASM execution.
- [x] Dedicated import/dropzone dialog with consented on-device semantic tags applied as editable project tags.
- [x] JPEG/PNG/TIFF worker export with resize, progress, and cancellation.
- [x] ARW embedded-preview extraction while preserving the original RAW.
- [x] LibRaw/WASM mosaic development to linear 16-bit RGB, bounded input/output memory, camera white balance/matrix settings, visible embedded-preview fallback, and no silent export fallback.
- [x] Bounded TIFF/EXIF extraction and a persisted photo-information view for camera, lens, exposure, aperture, ISO, focal length, orientation, white balance, color space, sensor levels, and CFA pattern.
- [x] Versioned LRU previews, quota preflight, SHA-256 snapshots, and corruption recovery.
- [x] Safe, postponable PWA updates and a production CSP without `unsafe-eval`.
- [ ] Sony A6600-specific redistributable fixture and trusted-reference color/matrix golden verification.
- [x] WebGPU-first global-development/curve/spatial pipeline, WebGL2 fallback, GPU device-loss recovery, and bounded masked local-development passes from deterministic weight rasters.
- [ ] Move vector-mask rasterization itself to GPU and complete the remaining capabilities below.

## Recommended implementation order

1. Secure a redistributable Sony A6600 ARW fixture and establish trusted color/matrix golden references for the working LibRaw path.
2. Establish golden-image tests for the versioned sRGB CPU/WASM reference pipeline.
3. Move disposable vector-mask weight rasterization to WebGPU/WebGL2 and broaden the current masked spatial parity corpus.
4. Extend semantic selection with embedding reuse, model tiers, more categories, and mask composition.
5. Add per-request cost estimates, cancellation, and capability discovery to the implemented optional OpenAI adapter.

---

## 1. RAW engine and input formats

**Goal.** Convert camera originals into a reproducible, high-depth linear image prepared for the development pipeline, starting with Sony A6600 ARW.

**Scope.** Evaluate existing LibRaw wrappers against a first-party build; compile LibRaw to WebAssembly; open A6600 ARW files; extract embedded previews and EXIF; read camera white balance, black/white levels, and Bayer pattern; implement reference demosaicing and high-depth linear output. Keep the codec boundary extensible for other RAW formats and additional JPEG/PNG/TIFF inputs. Run decoding through an isolated worker runtime with progress, cancellation, explicit limits, and careful WASM memory management.

**Implemented.** A bounded TIFF reader extracts the embedded JPEG and validated capture facts. Schema version 5 persists camera/lens identity, exposure, aperture, ISO, focal length, EXIF orientation, white-balance mode, color-space tag, black/white levels, and CFA pattern. `libraw-wasm` now develops supported sensor mosaics with camera white balance/matrix data, linear gamma, no automatic brightness, and 16-bit RGB output. Exposure is applied before sRGB companding and preview quantization. Input is capped at 256 MB and developed output at 60 MP. Preview failure uses an explicitly labelled embedded JPEG with the exact reason; final export never silently uses it. Vite keeps the wrapper out of dependency prebundling so its worker/WASM URLs remain valid, and COOP/COEP/CORP headers enable shared WASM memory. An external 31.8 MB Sony FX30 ARW passes Chromium development in roughly two seconds; the fixture is not committed because its photo license is unclear.

**Remaining.** A legally redistributable A6600 fixture, trusted-reference metadata/color/matrix comparisons, explicit as-shot-neutral parity, cancellation wired through the LibRaw worker, and peak-memory profiling across target browsers/devices.

**Dependencies.** The existing `PreviewRenderer` boundary; Emscripten; redistributable RAW fixtures; worker protocol; memory/cache policy; LibRaw and wrapper license review.

**Acceptance.** A known A6600 ARW opens without blocking the main thread; metadata and levels match trusted reference tools; an embedded preview appears before full development; cancellation releases memory; corrupt files produce actionable errors; golden tests detect regressions; JPEG/PNG keep working.

**Risks.** WASM download and startup cost; RAM peaks; camera color differences; codec licensing; Safari constraints; malicious or truncated files; expensive WASM/JS copies.

## 2. GPU pipeline, color, and previews

**Goal.** Apply the recipe interactively without sacrificing quality or blocking the interface.

**Scope.** Use WebGPU first, WebGL2 as the graphics fallback, and CPU/WASM where appropriate. Produce 512 px thumbnails, 2048–3072 px interactive previews, and full resolution only for final export. Add 1024/4096-entry curve LUTs, initial sRGB color management, future Display P3 support, clipping warnings, RGB/luminance histograms, optional scopes, before/after comparison, intelligent caches, and incremental rendering.

**Implemented.** The worker now selects WebGPU compute shaders first for compatible global adjustments, ordered local masked adjustments, RGB/R/G/B/luminance LUTs, vignette, denoise, texture, and sharpening, then real WebGL2 fragment shaders when WebGPU is unavailable. `CpuMaskWeightRasterizer` produces disposable weights from every current brush, gradient, range, AI, and composite source using the unchanged image luminance; no raster enters the project recipe. WebGL2 packs up to four mask planes into one RGBA32F texture and WebGPU accepts up to 32 storage-buffer planes, with an explicit CPU fallback beyond those bounds. A Chromium parity fixture combines radial and luminance masks with spatial filters and enforces a maximum eight-channel-value delta from the CPU reference. Device acquisition or loss returns control to the normal fallback pipeline. The active backend is visible in the canvas. The same boundary already provides 2560 px interactive previews, full-resolution export, versioned LRU caching, histograms, clipping, and before/after.

**Remaining.** Native WebGPU/WebGL2 vector-mask rasterization, a larger representative CPU/GPU golden-image corpus, Display P3/ICC work, optional scopes, and incremental tiled rendering.

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

**Implemented.** Every visible control point is keyboard-focusable. Arrow keys move it in precise 0.001 increments, Shift increases the step to 0.01, Delete removes an internal point, and held-key repeats collapse into one history gesture. Exact X/Y fields remain the non-visual alternative.

**Implemented.** A validated in-editor channel clipboard can copy the complete point/interpolation definition and paste it into RGB, R, G, B, or luminance as one reversible operation.

**Remaining.** Local mask curves, deeper educational channel help, and final touch audit.

**Acceptance.** X coordinates never cross or duplicate; a drag is one history action; monotonic cubic interpolation does not overshoot; LUT and CPU evaluator agree; reset/copy preserve the channel; clipping is not communicated by color alone.

**Risks.** Overshoot, banding, 8/16-bit precision, canvas accessibility, dense points, interactive performance, LUT divergence.

## 5. Crop, framing, and geometry

**Goal.** Reframe without physically altering the original until export.

**Implemented.** Fixed crop frame, free image translation, development scale, rotation/straightening, aspect ratios, flips, persistence, undo/redo, and identical preview/export rasterization.

**Implemented.** Rule-of-thirds, dense twenty-division grid, diagonal, and golden-ratio overlays are available from both the canvas and geometry panel. The overlay stays fixed while the photograph moves below it, replacing a redundant separate level toggle. Guides are editing-only and excluded from export. Fit recalculates against the live canvas after either sidebar changes size.

**Implemented.** Direct corner-to-corner crop selection, translucent excluded area, free/original/common locked aspect ratios, persistence, and one-step undo.

**Remaining.** Perspective/vertical/horizontal pixel correction, automatic horizon estimation, resizable crop handles after placement, and touch gesture polish.

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

**Implemented.** An optional pinned SegFormer ONNX model is disclosed before download, stored in a dedicated Cache Storage namespace, and checked against exact byte sizes and SHA-256 hashes. Installation, inference, and removal are explicit; network and active inference are cancellable; WebGPU is preferred with a WASM fallback; the deterministic point-guided and manual paths remain available.

**Remaining.** Evaluate SAM 2 or a compatible promptable alternative; compute one embedding per preview; decode subsequent prompts quickly; offer light/advanced models; and add preview/model-hash cache reuse.

**Acceptance.** Nothing downloads without consent; cancellation stops network and compute; embeddings reuse a preview/model hash; the project preserves prompts/points/boxes/model/version rather than depending on a raster; the model works offline after download; unsupported devices retain manual tools.

**Risks.** Model size, RAM/VRAM, WebGPU support, warm-up time, output quality, model supply chain, quota, obsolete weights.

## 8. Semantic segmentation

**Goal.** Create local masks for common photographic categories.

**Implemented.** The pinned local model exposes sky, water, vegetation, people, and buildings. Results persist category, model identifier, immutable revision, confidence, points, and bounding boxes as editable AI-mask recipe data. The same single-pass inference can suggest these categories as normalized, editable project tags during import when the photographer has already installed and enabled the model. Missing or low-confidence regions produce no fabricated mask or tag.

**Remaining.** Subject/background, skin, hair, and clothing categories; direct confidence presentation on the mask row; category composition; and deeper vector refinement controls.

**Acceptance.** Available categories are explicitly tied to a model/version; confidence is visible; all results remain refinable and composable; missing categories are not presented as certainty.

**Risks.** Bias; ambiguous classes; sensitive person/skin categories; large models; weak low-light results; false confidence.

## 9. Natural-language masks

**Goal.** Translate text intent into inspectable regions, not an opaque generated mask.

**Scope.** Accept requests such as “select the red reflection in the water.” An optional cloud model—and later a local VLM—returns boxes, positive/negative points, and exclusions; local segmentation produces the precise mask. Persist prompt, regions, model, and version. Support boolean exclusions and uncertainty warnings.

**Acceptance.** The consent screen lists exactly what will leave the device; responses are schema-validated; outputs become normal `EditOperation` values; regions can be inspected and corrected; rejection changes nothing; full RAW data is never uploaded.

**Risks.** Spatial ambiguity; metadata prompt injection; cloud cost/privacy; hallucinated regions; language differences; provider dependency.

## 10. Optional AI development

**Goal.** Propose explainable, bounded edits without giving AI direct authority over a project.

**Implemented.** OpenAI is the first provider adapter. Provider, key, and vision-capable model are configured explicitly; no model is silently selected. Missing configuration opens setup and resumes the pending opinion, proposal, or contact-sheet comparison after success. AI Companion sends a reduced JPEG preview through the Responses API with `store: false`, requests strict structured JSON, validates it again with Zod and domain Value Objects, and returns ordinary reviewable operations. Proposals can combine global adjustments, monotonic-cubic RGB/channel/luminance curves, crop/translation/scale/rotation/flips/aspect ratio, and editable radial, linear-gradient, or luminance-range masks. A visual opinion evaluates subject, framing, focus, light, and story before filling the editable brief. Classic Auto Enhance remains clearly labelled deterministic non-AI behavior.

**Remaining optional cloud scope.** A future local VLM, per-request cost/token estimates, cancellation, provider/model capability discovery, weaker proposal variants, and selected opt-in EXIF/noise facts. Never send full RAW or log images.

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

**Implemented.** Schema version 4 adds domain-validated ratings and normalized tags. Both are reversible operations, persist in projects and the lightweight library index, survive bundles, and can be filtered through name/tag search plus a minimum-rating query. Schema version 5 adds immutable capture metadata without changing existing recipes. Schema version 6 adds reversible favorites and an indexed favorites-only filter.

**Implemented.** Versioned `.rawcket.json` sidecars export only source dimensions and validated recipe data. They exclude the original, project identity, history, ratings, and tags; applying one is a single undoable aggregate operation with a 5 MB input limit.

**Implemented.** A persistent write-ahead journal covers create, duplicate, bundle import, and delete across IndexedDB/OPFS. All mutations and startup reconciliation share one FIFO queue. Recovery completes interrupted deletes and removes only sources proven orphaned by journal state; missing referenced originals produce an actionable warning instead of deletion.

**Remaining.** Optional File System Access links and future collections.

**Acceptance.** Interrupted saves recover the last consistent snapshot; corruption never overwrites the backup; cleanup never deletes a referenced original; quota errors are explained early; sidecars and bundles migrate by version; revoked file permissions fall back to OPFS.

**Risks.** Limited `pagehide`; non-atomic IndexedDB/OPFS transactions; orphan races; filesystem permissions; stale sidecars; large indexes.

## 14. Security and privacy

**Goal.** Reduce local and optional-integration risk with understandable controls.

**Implemented.** API keys are either session-only and never persisted or saved with AES-GCM/PBKDF2-SHA-256 encryption and a non-persisted master password. Encrypted storage is the setup default and no unencrypted persistence path exists. Removal clears session/device settings. RAWcket has no analytics and its production CSP excludes `unsafe-eval`, external scripts, frames, and objects.

**Implemented.** The OpenAI adapter reduces previews to bounded JPEGs, sets API response storage off, keeps the model explicit, schema-validates every result, never reads keys from serializable project state, and returns provider failures without response bodies or secret-bearing errors. The CSP permits only the explicit OpenAI endpoint in addition to pinned local-model hosts.

**Remaining.** Trusted Types compatibility, automated dependency/supply-chain auditing, verifiable browser-storage deletion caveats, a per-request confirmation mode, opt-in telemetry controls if telemetry is ever added, and clearer provider retention/account-policy links.

**Acceptance.** Production CSP excludes `unsafe-eval`; secrets never enter serializable state, logs, or telemetry; a removed key cannot be recovered; cloud previews are minimized and consented; telemetry off means zero telemetry requests; CI audits dependencies.

**Risks.** XSS defeating an unlocked vault; browser extensions; dependency exfiltration; misleading encryption expectations; HTTP caches; physical storage deletion limits.

## 15. PWA and offline operation

**Goal.** Keep the website useful offline and make installation optional.

**Implemented.** The service-worker app shell, offline-ready notice, outdated-cache cleanup, and a new-version prompt that can be postponed rather than auto-activating while editing.

**Implemented.** The semantic model is downloaded only from an explicit AI control that shows its source, pinned revision, model size, possible compatibility-runtime size, status, terms link, progress, cancellation, and removal.

**Implemented.** Chromium-compatible installation is offered as a quiet library-header action only after the browser emits its installability event. RAWcket suppresses the browser's ambient prompt and never opens installation without an explicit click; unsupported or already-installed environments show nothing.

**Remaining.** Schema-aware rollback.

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

**Implemented.** Simple/Advanced modes, collapsible tools and recipe column, exact labels, reduced-motion support, keyboard shortcuts, pan/zoom gestures, workspace-relative Fit, visible save/render states, English UI, and a navigable Active Recipe that lists every non-default instruction while automatically removing reset values.

**Implemented.** Before/after comparison, histogram/clipping display, fixed dense composition guides, drag-to-crop with an outside veil, brush/radial/linear/smart-point overlays, per-mask workflow explanations, modified-control marks, and AI tutor explanations now join the keyboard, pan/zoom, responsive, and Active Recipe work. Active Recipe can be cleared as one undoable operation. Luminance masks explicitly disclose that their per-pixel colored overlay is still pending even though their effect renders.

**Implemented.** Multi-file import opens an OpenAI-powered AI Companion contact sheet. All reduced previews are compared together and ranked by predicted post-edit potential: focus, recoverability, crop/reframing options, visual interest, and story—not pixel count alone. Category explanations and reasons are visible, and the photographer can override the recommendation before any project is created. The editor exposes a visual timeline derived directly from cloned undo/redo operations, while library favorites persist and filter instantly.

**Remaining.** Onboarding, complete touch/trackpad polish, accessible non-visual alternatives for every canvas interaction, full responsive review, and WCAG audit.

**Acceptance.** Primary flows work entirely by keyboard; focus, labels, and live regions are correct; contrast is WCAG AA; meaning never relies on color alone; touch targets are adequate; pending features never appear active.

---

## Definition of Done for every roadmap slice

- Versioned domain model and contracts, with no invalid primitives or React/provider coupling.
- Serializable operations, migration, and compatibility documentation whenever the schema changes.
- Direct unit coverage for non-trivial classes, integration coverage for the workflow, and persistence E2E when applicable.
- Cancellation, progress, actionable errors, accessibility, and privacy designed into the slice.
- README, ADRs, and this roadmap updated; `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and relevant E2E checks all green.
