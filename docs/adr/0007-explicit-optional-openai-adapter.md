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
- AI proposals use the same `EditOperation` contract and remain unapplied until the photographer accepts selected operations.
- The API key remains in session memory by default. Persistent storage is optional, password-encrypted, and contains explicit provider/model metadata.
- Deterministic Auto Enhance, the Development Tutor, point masks, and the installed semantic model remain visibly separate local features.

## Consequences

AI Companion requires network access, a compatible user-selected model, and an OpenAI API account. Reduced previews still may contain identifiable information, so the setup UI describes transmission before configuration. Provider errors do not expose response bodies or credentials. Multi-image evaluation becomes relative across the full selected set and can consider post-edit potential, but remains advice that the photographer can override.
