# ADR 0008: Deterministic local horizon estimation

## Status

Accepted.

## Context

Automatic straightening is useful before detailed cropping, but it does not require a cloud model and must not silently rotate a project from weak visual evidence. Camera originals may also be large enough that full-resolution analysis would waste memory and block interaction.

## Decision

`HorizonEstimator` is an application-owned analysis port. `BrowserHorizonEstimator` decodes a preview locally, limits its longest edge to 512 pixels, calculates luminance and Sobel gradients, and votes with strong near-horizontal and near-vertical edges. The result contains the proposed inverse rotation, directional confidence, supporting-edge ratio, and an explicit reliability decision.

`EstimateHorizon` rejects out-of-range or invalid results. Presentation applies a reliable correction through the existing `set-viewport-transform` operation, so history, undo, Active Recipe, preview, persistence, sidecars, and export all use the same domain path. Weak evidence changes nothing and directs the photographer to the dense grid and exact rotation field. Analysis is cancellable and never uploads pixels.

## Consequences

The implementation is fast, explainable, offline, and deterministic, but it is an edge estimator rather than scene understanding. Strong diagonals or repeated textures can be ambiguous, so the confidence gate and visible numeric result remain mandatory. Perspective correction is a separate future transform and must not be disguised as horizon rotation.
