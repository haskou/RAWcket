# ADR 0003: IndexedDB for structure and OPFS for binary data

- Status: accepted
- Date: 2026-08-05

## Context

Projects need queries and indexes; originals and future caches are potentially large blobs.

## Decision

IndexedDB stores serialized aggregates, indexes, and settings. `SourceFileRepository` uses OPFS where available and an IndexedDB object store as fallback. The application requests persistent storage without assuming it will be granted.

## Consequences

There is no network dependency. Quota, orphan cleanup, and migrations require active management. Close-time persistence is best effort and does not replace backups.
