# File mutations

## Required before use

- [files-identity-work-iq](files-identity-work-iq.md)
- [mutation-work-iq](mutation-work-iq.md)

## Rename, move, delete, and copy

For library columns, use the distinct metadata contract below rather than
assuming drive-item fields carry custom columns.

These recipes use the resolved IDs above. Show the selected source, destination
when relevant, and exact change before required confirmation. If the schema
requires `If-Match`, use the current authoritative eTag; do not add `eTag` or
`@odata.etag` to the inherited drive search `$select`. Use returned tags when
available or a supported exact read if required. A 412 requires reconciliation,
not a blind overwrite.

| Intent | Logical operation and path | Body | Preconditions and observed completion |
|---|---|---|---|
| Rename a file | `update_entity` `/drives/{sourceDriveId}/items/{sourceItemId}` | `{"name":"{requestedNewName}"}` | Confirm new name; a successful final PATCH response supports completion |
| Move into a folder | `update_entity` `/drives/{sourceDriveId}/items/{sourceItemId}` | `{"parentReference":{"id":"{destinationFolderId}"}}` | **Same-drive move only:** verify sourceDriveId equals destinationDriveId before execution; final successful PATCH supports completion |
| Delete a file | `delete_entity` `/drives/{sourceDriveId}/items/{sourceItemId}` | No body; supported conditional header when applicable | Confirm deletion scope; final successful delete supports removal, not an unsupported claim of permanent erasure |
| Copy into a folder | `do_action` `/drives/{sourceDriveId}/items/{sourceItemId}/copy` | See below | Confirm copy/destination; acceptance or a monitor link is not completed copy |

A move is a parent-reference update, not an invented `/move` action. If the
drives differ, report the same-drive limitation; **never implicitly copy then
delete** to simulate a cross-drive move. Cross-drive **copy** support is a
separate schema/permission gate: verify the connected operation supports the
specific source and destination drives before executing it. Correct destination
identity alone is not evidence that cross-drive copy is supported.

```json
{
  "actionUrl": "/drives/{sourceDriveId}/items/{sourceItemId}/copy",
  "jsonBody": {
    "parentReference": {
      "driveId": "{destinationDriveId}",
      "id": "{destinationFolderId}"
    }
  }
}
```

The URL addresses the source drive; the body contains the **destination** drive.
Do not use `/me/drive/items/{id}` aliases for these drive-scoped mutations.
Do not invent conflict behavior or overwrite an existing destination without
the corresponding supported contract and authorization.

For copy, `202` means **accepted/pending**. Follow only a returned, supported
monitor through a safe host mechanism within a bound; never invent a polling
endpoint. Report completion only from a final operation result or supported
authoritative state evidence. A read can establish current state without proving
which request caused it. On timeout/null/transport ambiguity, do not repeat the
copy, move, rename, or delete; reconcile safely or report outcome unknown.


## Create a folder

- **Intent/prerequisites:** user requests a folder in the specified personal root
  or a resolved writable parent; confirm its name and location.
- **Operation/body:** inherited personal-root example:

```json
{
  "parentUrl": "/me/drive/root/children",
  "jsonBody": {
    "name": "{requestedName}",
    "folder": {},
    "@microsoft.graph.conflictBehavior": "fail"
  }
}
```

- **Effects/completion:** `create_entity` persists a folder; a confirmed creation
  result supplies its identity. A conflict is not permission to rename or replace.
- **Failures:** follow central recovery; do not replay an ambiguous creation.
  Other parent paths or conflict policies require their supported schema.


## Create an upload session for an existing file

- **Intent/prerequisites:** create a session only for the exact existing file;
  resolve its file facet, `sourceDriveId`, and `sourceItemId`. Confirm session
  creation and distinguish it from a request to upload/replace content.
- **Operation/body:** inherited baseline empty-body recipe, not newly live-validated:

```json
{
  "actionUrl": "/drives/{sourceDriveId}/items/{sourceItemId}/createUploadSession",
  "jsonBody": {}
}
```

- **Effects:** `do_action` creates an upload session. Do not add an `item` wrapper
  or other options without a supporting operation schema.
- **Completion:** a successful session response means **session created**, not
  **bytes uploaded**, and not **existing file replaced**. Report returned
  non-secret metadata such as `expirationDateTime` and `nextExpectedRanges`
  accurately. Session/upload URLs are preauthenticated credentials: never
  quote, display, return, log, or publish `uploadUrl`.
- **Failures:** never invent a raw upload tool or send bytes through `do_action`,
  `fetch`, or a guessed HTTP upload flow. The current documented WorkIQ surface
  does not expose `upload_blob`; session support does not change that. If the
  user wanted replacement, disclose the remaining byte-transfer limitation and
  provide an authorized destination `webUrl` for manual upload when useful.
  Do not recreate an ambiguous session automatically.
