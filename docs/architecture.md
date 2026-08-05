# RAWcket architecture

## Map

```mermaid
flowchart LR
  UI["React presentation"] --> APP["Use cases and messages"]
  APP --> DOMAIN["PhotoProject + recipe + history"]
  APP --> PORTS["Outbound ports"]
  IDB["IndexedDB"] -. implements .-> PORTS
  OPFS["OPFS / fallback"] -. implements .-> PORTS
  BUNDLE[".rawcket bundle"] -. implements .-> PORTS
  RENDER["Worker preview renderer"] -. implements .-> PORTS
  ADVISOR["DisabledEditingAdvisor"] -. implements .-> PORTS
  IDB --> ZOD["Zod + migrations"]
  BUNDLE --> ZOD
```

Dependency arrows point toward the application and domain layers. The domain depends only on `@haskou/value-objects` and its own concepts.

## Aggregate

`PhotoProject` is the consistency boundary. It owns the name, original reference, metadata, `DevelopmentRecipe`, `EditHistory`, and `ProjectUiState`. Every editorial mutation passes through an `EditOperation`; the aggregate computes the inverse before recording history and emits a domain event.

`DevelopmentRecipe` contains:

- `GlobalAdjustments`: fourteen adjustments with concept-specific ranges and independent enabled state.
- `CurveSet`: RGB, R, G, B, and optional luminance; normalized points and validated interpolation.
- `ViewportTransform`: a fixed crop frame and reversible original-image transform.
- `MaskDefinition[]`: vector/semantic source definitions; rasters and embeddings are caches, never source of truth.

## Boundaries

- Zod validates JSON and persistence data before `fromPrimitives` hydration.
- Persistence mappers are the normal consumers of complete primitive serialization.
- OPFS is used only behind `SourceFileRepository`; IndexedDB is the fallback.
- `PreviewRenderer` isolates worker and image-pipeline concerns from React and the domain.
- `EditingAdvisor` can return only `EditOperation` proposals and never receives authority to mutate an aggregate.

## Save flow

```mermaid
sequenceDiagram
  participant User
  participant UI as React editor
  participant Project as PhotoProject
  participant Save as Autosave
  participant DB as IndexedDB
  User->>UI: change exposure
  UI->>Project: apply(SetGlobalAdjustment)
  Project->>Project: validate + compute inverse + record history
  UI->>Save: increment revision
  Save-->>DB: save after debounce
  Note over UI,DB: visibilitychange, pagehide, and close force a flush
```

## Preview flow

`RenderProjectPreview` accepts a validated application message. `WorkerPreviewRenderer` owns scheduling, cancellation, timeout, and source lookup. The worker decodes the source into an `OffscreenCanvas`, applies the complete versioned global recipe and tone-curve LUTs with `CpuPixelDeveloper`, and returns an encoded WebP preview. Future WebGPU, WebGL2, and RAW adapters must preserve this port contract.
