# ADR 0009: Optional Google Drive storage

## Status

Accepted.

## Context

RAWcket is local-first, but photographers need an optional Google account for backups and passwordless restoration of their OpenAI API configuration. A browser-only application has no backend refresh-token service.

## Decision

- The RAWcket deployer supplies the public OAuth Web Client ID through `VITE_GOOGLE_CLIENT_ID`. Photographers never enter a Google token or Client ID.
- Google Identity Services uses its browser token model with `drive.file`, `drive.appdata`, and basic identity. Short-lived access tokens exist only in gateway memory.
- The optional OpenAI credential may be stored as versioned JSON in Google's hidden, per-app `appDataFolder`. This avoids a RAWcket master password but is not end-to-end encryption by RAWcket.
- RAWcket creates visible `RAWcket/Projects`, `RAWcket/Originals`, and `RAWcket/Exports` folders. The `drive.file` scope limits the adapter to files created or opened by RAWcket instead of granting broad Drive access.
- Project backup uploads the checksummed `.rawcket` bundle, which already contains the original and project process. Original and final photo uploads are explicit; future exports upload automatically only after the photographer enables that preference.
- Local IndexedDB/OPFS state remains authoritative. Upload failure never deletes or rewrites local data.

## Consequences

Without a backend refresh-token service, an expired access token must be reacquired from a user action. Google can normally reuse its browser account session, but RAWcket does not claim a permanent silent session. Removing the application from Google Drive also removes its app-data folder.

## References

- [Google Identity Services token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model)
- [Google Drive upload guide](https://developers.google.com/workspace/drive/api/guides/manage-uploads)
- [Google Identity Services setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)
- [Google Drive application data](https://developers.google.com/workspace/drive/api/guides/appdata)
