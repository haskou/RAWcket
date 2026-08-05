# ADR 0005: Image processing behind PreviewRenderer

- Status: accepted
- Date: 2026-08-05

## Context

LibRaw/WASM, WebGPU, WebGL2, and CPU rendering have different lifecycles, capabilities, and failure modes. They must not leak into the domain or React.

## Decision

`PreviewRenderer` is the application port for previews. A bounded, versioned LRU decorator reuses immutable preview/analysis results. `WorkerPreviewRenderer` coordinates resolution, progress, cancellation, timeout, and concurrency using `@haskou/flow`. A WebGL2 fragment shader applies compatible global adjustments and curve LUTs. The reference CPU pipeline remains authoritative and handles masks and spatial filters until equivalent GPU stages pass parity checks. Both feed the same geometry, analysis, and JPEG/PNG/TIFF export stages. WebGPU and full LibRaw pipelines will be added as replaceable adapters.

## Consequences

The domain remains independent and the renderer is replaceable. New implementations must match the documented progress/cancellation contract and deterministic golden-image tolerances before becoming the default.
