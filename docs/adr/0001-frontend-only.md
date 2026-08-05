# ADR 0001: Frontend-only, local-first application

- Status: accepted
- Date: 2026-08-05

## Context

RAWcket must work without accounts, a backend, an API key, or mandatory SaaS, and it must never send photographs without explicit user action.

## Decision

The initial architecture is a Vite/React SPA. Projects, originals, preferences, and encrypted secrets remain in browser storage. A PWA caches the app shell, but installation is always optional.

## Consequences

Privacy, offline use, and static deployment remain straightforward. Quota, eviction, and storage portability become product risks; `.rawcket` bundles provide the backup and transport mechanism.
