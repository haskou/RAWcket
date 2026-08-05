# ADR 0005: Image processing behind PreviewRenderer

- Status: accepted
- Date: 2026-08-05

## Context

LibRaw/WASM, WebGPU, WebGL2, and CPU rendering have different lifecycles, capabilities, and failure modes. They must not leak into the domain or React.

## Decision

`PreviewRenderer` is the application port for previews. A bounded, versioned LRU decorator reuses immutable preview/analysis results. `WorkerPreviewRenderer` coordinates resolution, progress, cancellation, timeout, and concurrency using `@haskou/flow`. WebGPU compute shaders apply compatible global adjustments, curve LUTs, denoise, texture, and sharpening first, with equivalent WebGL2 fragment-shader passes as the graphics fallback. Device acquisition or loss returns control to the next renderer. The reference CPU pipeline remains authoritative and handles masks until equivalent GPU stages pass parity checks. All backends feed the same geometry, analysis, and JPEG/PNG/TIFF export stages. Full GPU-stage and LibRaw pipelines remain replaceable adapters.

## Consequences

The domain remains independent and the renderer is replaceable. New implementations must match the documented progress/cancellation contract and deterministic golden-image tolerances before becoming the default. The first accelerated spatial fixture permits a maximum per-channel delta of eight from the CPU reference; the corpus must expand before that tolerance is considered comprehensive.
