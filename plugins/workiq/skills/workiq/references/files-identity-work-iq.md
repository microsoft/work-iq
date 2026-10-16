# File identity

## Exact identity, intent and outcomes

Apply identity checks to read-only finding and each comparison source as well as
mutations: full filename, file/folder type, parent location, requested time and
relevant content. A first-ranked near-match is not exact. Disambiguate duplicate
names; a bounded search cannot prove uniqueness or global absence.

Retain source and destination drive IDs separately. The copy recipe below is
same-drive; if drives differ, verify supported cross-drive copy before acting
and use the destination drive in the body. Move uses `update_entity`
`/drives/{sourceDriveId}/items/{sourceId}` with
`{"parentReference":{"id":"{folderId}"}}`, not a `/move` action. Verify same-drive
identity for move; never implicitly copy/delete to simulate a cross-drive move.
See [updates](update-entity-work-iq.md).

Escape embedded apostrophes in OData names by doubling them, then URL-encode
the literal once. Retain opaque IDs verbatim. A concrete unresolved source can
use one supported in-scope refinement or exact read, not recursive enumeration,
an always-download rule or denial bypass. Confirm the exact effect before writes.
`202` means accepted/pending; ambiguous results are not permission to replay.
Upload-session creation is not uploaded bytes. Do not expose preauthenticated
upload URLs. Apply [recovery](troubleshooting.md).
