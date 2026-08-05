# ADR 0006: Consented local semantic model

## Status

Accepted.

## Context

RAWcket needs category-based masks without silently transferring photographs or downloading opaque model assets. Model weights, inference runtimes, browser quota, supply-chain provenance, and model terms are material user decisions. A generated raster alone would also violate the non-destructive recipe contract because it cannot explain how the selection was produced or be reconstructed after cache loss.

## Decision

The first semantic adapter uses `Xenova/segformer-b0-finetuned-ade-512-512` at immutable revision `d3e5499fa8701ff0453ca940a8dfeae39b2f1504` through Transformers.js and ONNX Runtime Web.

- RAWcket shows source, revision, model download size, possible WASM compatibility-runtime size, storage location, and the model-card/terms link before installation.
- The install action remains disabled until the user checks a specific local-storage consent control.
- Four pinned resources are verified against exact byte sizes and SHA-256 digests before entering a dedicated Cache Storage namespace.
- Inference resolves only from that verified cache. Remote model loading is disabled after installation.
- WebGPU is preferred; WASM is a compatibility fallback. Both run locally.
- Installation and inference accept abort signals. Aborting active inference disposes the pipeline.
- Removal disposes the pipeline and deletes the dedicated model cache.
- The model returns normalized points, boxes, and confidence. The application service creates a normal `MaskDefinition` containing the semantic category, model identifier, immutable revision, prompts, and geometry. The raster remains disposable.
- Deterministic point-guided and manual masks remain available when storage, WebGPU, WASM, quota, model output, or consent is unavailable.

The first public categories are limited to sky, water, vegetation, people, and buildings. RAWcket does not claim categories the model contract does not expose.

## Consequences

The initial semantic workflow adds an on-demand JavaScript inference chunk and a large WASM compatibility asset, while the pinned model itself is approximately 4.4 MB. The consent UI must continue to disclose both costs. Cache Storage deletion is a browser-level request and cannot promise forensic erasure from physical media. Updating weights, hashes, categories, or the cache namespace requires an explicit reviewed change; it must never follow an unpinned upstream branch.
