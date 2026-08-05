# Arquitectura de RAWcket

## Mapa

```mermaid
flowchart LR
  UI["Presentacion React"] --> APP["Casos de uso y mensajes"]
  APP --> DOMAIN["PhotoProject + receta + historial"]
  APP --> PORTS["Puertos de salida"]
  IDB["IndexedDB"] -. implementa .-> PORTS
  OPFS["OPFS / fallback"] -. implementa .-> PORTS
  BUNDLE["Bundle .rawcket"] -. implementa .-> PORTS
  ADVISOR["DisabledEditingAdvisor"] -. implementa .-> PORTS
  IDB --> ZOD["Zod + migraciones"]
  BUNDLE --> ZOD
```

Las flechas de dependencia apuntan hacia dominio/aplicacion. El dominio solo depende de `@haskou/value-objects` y conceptos propios.

## Agregado

`PhotoProject` es la frontera de consistencia. Posee nombre, referencia al original, metadata, `DevelopmentRecipe`, `EditHistory` y `ProjectUiState`. Toda mutacion editorial pasa por `EditOperation`; el agregado calcula la inversa antes de registrar el cambio y emite un evento de dominio.

`DevelopmentRecipe` contiene:

- `GlobalAdjustments`: catorce ajustes con rangos por concepto.
- `CurveSet`: RGB, R, G, B y luminancia opcional; puntos 0..1 e interpolacion validada.
- `ViewportTransform`: marco fijo y transformacion reversible del original.
- `MaskDefinition[]`: formas vectoriales/semanticas; raster y embeddings son caches, no verdad.

## Limites

- Zod valida JSON y persistencia antes de `fromPrimitives`.
- Los mappers de persistencia son los unicos consumidores normales de serializacion completa.
- OPFS se usa solo detras de `SourceFileRepository`; IndexedDB es el fallback.
- `PreviewRenderer` es la futura frontera del worker/pipeline. La UI actual no lo suplanta con filtros CSS.
- `EditingAdvisor` solo puede devolver propuestas de `EditOperation`; nunca recibe capacidad de mutar el agregado.

## Flujo de guardado

```mermaid
sequenceDiagram
  participant User as Usuario
  participant UI as Editor React
  participant Project as PhotoProject
  participant Save as Autosave
  participant DB as IndexedDB
  User->>UI: aumenta exposicion
  UI->>Project: apply(SetGlobalAdjustment)
  Project->>Project: valida + calcula inversa + registra historial
  UI->>Save: marca revision
  Save-->>DB: save tras debounce
  Note over UI,DB: visibilitychange, pagehide y cierre fuerzan flush
```
