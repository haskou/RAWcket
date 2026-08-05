# ADR 0003: IndexedDB for structure and OPFS for binary data

- Status: accepted
- Date: 2026-08-05

## Context

Projects need queries and indexes; originals and future caches are potentially large blobs.

## Decision

IndexedDB stores serialized aggregates, indexes, settings, and the five newest checksummed project snapshots. `SourceFileRepository` uses OPFS where available and an IndexedDB object store as fallback. The application requests persistent storage without assuming it will be granted and performs a quota/safety-reserve assessment before importing an original.

## Consequences

There is no network dependency. A corrupt current record can recover from the newest verified snapshot without overwriting the damaged bytes. Orphan cleanup and migrations still require active management. Close-time persistence is best effort and does not replace backups.
