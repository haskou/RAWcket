# ADR 0005: Image processing behind PreviewRenderer

- Status: accepted
- Date: 2026-08-05

## Context

LibRaw/WASM, WebGPU, WebGL2, and CPU rendering have different lifecycles, capabilities, and failure modes. They must not leak into the domain or React.

## Decision

`PreviewRenderer` is the application port for previews. A bounded, versioned LRU decorator reuses immutable preview/analysis results. `WorkerPreviewRenderer` coordinates resolution, progress, cancellation, timeout, and concurrency using `@haskou/flow`. WebGPU compute shaders apply compatible global adjustments, ordered local masked adjustments, curve LUTs, denoise, texture, and sharpening first, with equivalent WebGL2 fragment-shader passes as the graphics fallback. A deterministic CPU adapter derives disposable weight planes from every current vector/semantic mask source; WebGL2 accepts four planes and WebGPU 32 before falling back. Device acquisition or loss also returns control to the next renderer. The reference CPU pipeline remains authoritative. All backends feed the same geometry, analysis, and JPEG/PNG/TIFF export stages. Full GPU-stage and LibRaw pipelines remain replaceable adapters.

## Consequences

The domain remains independent and the renderer is replaceable. Mask rasters remain caches rather than recipe state. New implementations must match the documented progress/cancellation contract and deterministic golden-image tolerances before becoming the default. SHA-256 fixtures lock neutral, tonal/channel, and masked-spatial CPU output. The accelerated masked-spatial fixture permits a maximum per-channel delta of eight from that reference; a real-camera/color-target corpus must still expand this evidence.
