# ADR 0006: Automatically prepared local semantic model

## Status

Accepted.

## Context

RAWcket needs category-based masks without transferring photographs. Model weights and inference runtimes are a local application dependency whose progress, source, supply-chain provenance, and terms must remain visible. A generated raster alone would also violate the non-destructive recipe contract because it cannot explain how the selection was produced or be reconstructed after cache loss.

## Decision

The first semantic adapter uses `Xenova/segformer-b0-finetuned-ade-512-512` at immutable revision `d3e5499fa8701ff0453ca940a8dfeae39b2f1504` through Transformers.js and ONNX Runtime Web.

- RAWcket automatically prepares the model when a model-dependent surface is opened and shows source, revision, progress, storage location, and the model-card/terms link.
- A single shared installation coordinates all callers. Model-dependent controls remain blocked until every resource is verified; unrelated manual editing remains available.
- Four pinned resources are verified against exact byte sizes and SHA-256 digests before entering a dedicated Cache Storage namespace.
- Inference resolves only from that verified cache. Remote model loading is disabled after installation.
- WebGPU is preferred; WASM is a compatibility fallback. Both run locally.
- Installation and inference accept abort signals. Aborting active inference disposes the pipeline.
- Removal disposes the pipeline and deletes the dedicated model cache.
- The model returns normalized points, boxes, and confidence. The application service creates a normal `MaskDefinition` containing the semantic category, model identifier, immutable revision, prompts, and geometry. The raster remains disposable.
- The same installed model can run one semantic pass during import and return only supported categories that meet bounded confidence and image-coverage thresholds. The application validates them as normal editable `ProjectTags`; inference failure never blocks import.
- Deterministic point-guided and manual masks remain available when storage, WebGPU, WASM, quota, or model output is unavailable.

The first public categories are limited to sky, water, vegetation, people, and buildings. RAWcket does not claim categories the model contract does not expose.

## Consequences

The initial semantic workflow adds an on-demand JavaScript inference chunk and a large WASM compatibility asset, while the pinned model itself is approximately 4.4 MB. The UI must continue to disclose installation status and provenance. Cache Storage deletion is a browser-level request and cannot promise forensic erasure from physical media. Updating weights, hashes, categories, or the cache namespace requires an explicit reviewed change; it must never follow an unpinned upstream branch.
