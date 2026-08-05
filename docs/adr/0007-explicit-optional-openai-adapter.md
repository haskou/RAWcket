# ADR 0007: Explicit optional OpenAI adapter

## Status

Accepted.

## Context

RAWcket needs genuine visual reasoning for photographic opinions, editable development proposals, and relative multi-image selection. Local histogram heuristics cannot judge subject, framing, focus potential, visual interest, or story, and must not be presented as AI.

## Decision

- OpenAI API is the first explicit cloud provider. RAWcket does not ship a provider key or silently choose a model; the photographer enters both key and model.
- Invoking a cloud action without a session credential opens configuration. A successful configuration resumes the exact pending action.
- Cloud actions send bounded JPEG previews, never original RAW files. Requests use the Responses API with response storage disabled and strict JSON Schema output.
- Infrastructure parses the provider envelope. Provider adapters validate the structured payload again with Zod and convert values through domain Value Objects before producing application results.
- A Companion request returns visual critique, suggested intent, strengths, opportunities, explanation, and the editable proposal in one structured response. It receives rendered clipping ratios so advice can distinguish measured clipping from visual judgment.
- The normalized request/result is recorded in the project-owned bounded AI development journal before presentation offers Apply or Reject. The journal persists in local snapshots and exported bundles; credentials, reduced previews, and raw provider envelopes do not.
- AI proposals use the same `EditOperation` contract and remain unapplied until the photographer accepts selected operations. The structured contract supports global adjustments, monotonic tone curves, viewport/crop geometry, editable radial, linear-gradient, and luminance-range masks, plus point/box-guided smart masks that persist as normal `ai-segmentation` recipe data.
- API keys are never persisted unencrypted. Setup defaults to password-encrypted storage with explicit provider/model metadata; the alternative is tab memory explicitly labelled as never saved.
- Deterministic Auto Enhance, the Development Tutor, point masks, and the installed semantic model remain visibly separate local features. Auto Enhance adds bounded development deltas to the current recipe; it does not replace curves, geometry, masks, or unrelated adjustments.

## Consequences

AI Companion requires network access, a compatible user-selected model, and an OpenAI API account. Reduced previews still may contain identifiable information, so the setup UI describes transmission before configuration. Provider errors do not expose response bodies or credentials. Multi-image evaluation becomes relative across the full selected set and can consider post-edit potential, but remains advice that the photographer can override.
