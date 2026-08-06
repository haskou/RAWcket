# ADR 0002: Recipe JSON is the non-destructive source of truth

- Status: accepted
- Date: 2026-08-05

## Context

Crop, curves, adjustments, and masks must remain editable without changing the original. Rasters and embeddings can be regenerated.

## Decision

`PhotoProject` owns a versioned `DevelopmentRecipe`. Value Objects and domain objects reject invalid values. The original is rasterized only for previews and explicit final export; it is never overwritten.

Boolean mask composition is recipe data rather than a baked raster. A composite stores an ordered set of complete child definitions and an Add, Subtract, or Intersect operation. The first child is the primary mask. Releasing a composite restores the exact children, and composition/decomposition each enter history as one atomic edit.

## Consequences

The recipe is portable, testable, and migratable. A renderer must be deterministic for recipe + original + pipeline version. Caches never replace the JSON source of truth.
