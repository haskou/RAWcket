# ADR 0009: Optional Google Drive storage

## Status

Accepted.

## Context

RAWcket is local-first, but photographers need an optional off-device copy of originals, project process, and photo exports. A browser-only application has no backend capable of safely holding refresh tokens, and it must not ship a shared OAuth client identity or disguise cloud storage as local persistence.

## Decision

- Google Drive is the first optional cloud-storage adapter. The photographer configures their own OAuth Web Client ID; RAWcket contains no hardcoded client ID or client secret.
- Google Identity Services uses its browser token model with the minimal `drive.file` scope plus basic identity. Google owns account selection, consent, and the browser account session. The short-lived access token exists only in gateway memory and is never written to IndexedDB, a project, a bundle, a recipe preset, logs, or errors.
- The non-secret Client ID and automatic-export preference may persist in local settings. Changing Client ID clears the in-memory session.
- RAWcket creates visible `RAWcket/Projects`, `RAWcket/Originals`, and `RAWcket/Exports` folders. The `drive.file` scope limits the adapter to files created or opened by RAWcket instead of granting broad Drive access.
- Project backup uploads the checksummed `.rawcket` bundle, which already contains the original and project process. Original and final photo uploads are explicit; future exports upload automatically only after the photographer enables that preference.
- Local IndexedDB/OPFS state remains authoritative. Upload failure never deletes or rewrites local data.

## Consequences

Without a backend refresh-token service, an expired access token must be reacquired from a user action. Google can normally reuse its existing browser account session, so reconnecting need not mean typing the Google password again, but RAWcket does not claim a permanent silent session. Google receives only the file selected for upload. CSP permits only the Google Identity script/frame and the exact Google identity/Drive REST origins required by this adapter.

## References

- [Google Identity Services token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model)
- [Google Drive upload guide](https://developers.google.com/workspace/drive/api/guides/manage-uploads)
- [Google Identity Services setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)
