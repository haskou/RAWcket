# ADR 0005: Image processing behind PreviewRenderer

- Status: accepted
- Date: 2026-08-05

## Context

LibRaw/WASM, WebGPU, WebGL2, and CPU rendering have different lifecycles, capabilities, and failure modes. They must not leak into the domain or React.

## Decision

`PreviewRenderer` is the application port for previews. A bounded, versioned LRU decorator reuses immutable preview/analysis results. `WorkerPreviewRenderer` coordinates resolution, progress, cancellation, timeout, and concurrency using `@haskou/flow`. A provider-neutral numeric mask program represents brush segments, gradients, luminance/source-color ranges, smart points/boxes, mask modifiers, and nested add/subtract/intersect composition. WebGPU compute rasterizes that program to storage-buffer planes; WebGL2 rasterizes it to an RGBA32F texture. Color-range coordinates remain recipe data, while every renderer reads their sRGB samples from the unchanged source during disposable rasterization; subsequent development cannot shift coverage. The following GPU passes apply compatible global adjustments, ordered local adjustments, curve LUTs, denoise, texture, and sharpening. WebGL2 accepts four top-level planes and WebGPU 32 before falling back. Program node/data limits, shader validation, device acquisition/loss, and graphics errors also return control to the next renderer rather than dropping instructions. The deterministic CPU pipeline remains authoritative. All backends feed the same geometry, analysis, and JPEG/PNG/TIFF export stages. Full GPU-stage and LibRaw pipelines remain replaceable adapters.

## Consequences

The domain remains independent and the renderer is replaceable. Mask rasters remain disposable render products rather than recipe state; the program is rebuilt from the editable vector recipe for each uncached render. New implementations must match the documented progress/cancellation contract and deterministic golden-image tolerances before becoming the default. SHA-256 fixtures lock neutral, tonal/channel, and masked-spatial CPU output. The accelerated fixture disables the CPU weight rasterizer, covers every current mask shape plus nested boolean operations, and permits a maximum per-channel delta of eight from the reference. A real-camera/color-target corpus must still expand this evidence.
