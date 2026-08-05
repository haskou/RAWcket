# ADR 0004: Shared edit operations for humans and AI

- Status: accepted
- Date: 2026-08-05

## Context

AI must not receive a privileged mutation path or bypass project history.

## Decision

The UI, presets, future import flows, and `EditingAdvisor` all produce the same serializable `EditOperation` union. `PhotoProject` validates and applies operations, computes inverses, groups continuous changes, and bounds history.

## Consequences

Undo/redo, auditing, and validation stay uniform. AI adapters only propose operations; the user decides what to apply. Contract changes require schema migration and compatibility tests.
