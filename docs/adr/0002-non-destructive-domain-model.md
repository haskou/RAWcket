# ADR 0002: El JSON de receta es la fuente de verdad no destructiva

- Estado: aceptada
- Fecha: 2026-08-05

## Contexto

Recorte, curvas, ajustes y mascaras deben poder cambiarse despues sin tocar el original. Rasters y embeddings pueden regenerarse.

## Decision

`PhotoProject` conserva una `DevelopmentRecipe` versionada. Valores invalidos se rechazan con Value Objects y objetos de dominio. El original solo se rasterizara durante una futura exportacion final.

## Consecuencias

La receta es portable, testeable y migrable. El renderer debe ser determinista respecto a receta + original + version de pipeline. Caches nunca sustituyen al JSON.
