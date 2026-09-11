# Files and drive items

Canonical contract for exact file metadata and drive-item operations. Use
[fetch_blob](fetch-blob-work-iq.md) for bytes.

## Contract and evidence provenance

The examples below are inherited from the baseline guidance, with explicit
identity and safety prerequisites; they are not new live schema/response
validation. Resolve the connected tool schema before use. For unfamiliar
operation details, use [get_schema](get-schema-work-iq.md); do not extrapolate
support from general Graph knowledge.

For every mutation: resolve the exact entity, prepare the requested change,
obtain required confirmation, execute once, and report observed completion.
Confirmation, identity disambiguation, and requested completeness override a
nominal lookup/write budget. Read the [central recovery policy](troubleshooting.md):
denials stop; ambiguous mutations are not replayed.

## Exact source and destination identity

Known drive/item IDs or exact folder paths use structured reads directly, without
retrieval. For an exact personal OneDrive filename, use `call_function`, not
`fetch`, on the inherited search function:

```json
{
  "functionUrl": "/me/drive/root/search(q='{odataEscapedAndUrlEncodedName}')?$select=id,name,parentReference,file,folder&$top=10"
}
```

1. Match the full returned `name` and required facet: a source file has `file`;
   a destination folder has `folder`. A search hit is not an exact match merely
   because it ranks first. Preserve Unicode and punctuation.
2. Duplicate names in different folders require parent/location disambiguation.
   `$top=10` is a bounded candidate page, not a uniqueness guarantee. Follow
   supported pages or a focused parent read if necessary; otherwise ask for a
   location and leave the mutation awaiting clarification.
3. Keep **source** `id` and `parentReference.driveId` independently from
   **destination** `id` and `parentReference.driveId`. Do not overwrite the source
   drive with the destination drive or assume an item ID identifies its drive.
4. A missing drive ID blocks a drive-scoped mutation until a bounded structured
   drive/parent read establishes it. Reuse an already authoritative drive ID
   from the containing drive-scoped response; never guess from a sharing URL,
   semantic citation, or the other item.
5. Copy opaque IDs intact, including trailing `=`. Apply only supported path
   transport encoding, not normalization, reconstruction, or repeated encoding
   attempts. Do not proactively double-encode an already encoded value.

For a filename containing an apostrophe, the transformations are separate:
`Owner's plan.txt` becomes OData literal contents `Owner''s plan.txt`, then
URL-encoded contents `Owner%27%27s%20plan.txt`. Put those contents inside `q='...'`.
Encode literal Unicode with UTF-8 URL encoding once. Escape OData literals
before encoding; encoding an apostrophe alone does not escape an OData string.

**Indexing lag:** an empty successful search for a newly created item permits
one bounded exact-parent lookup in the same authorized scope. For a known root
item, the inherited example is `fetch` `/me/drive/root/children`; for another
known parent, use its supported children path. Do not recursively enumerate the
drive, search other stores, or use this repair after access/policy denial.
If still absent, report "not found in searched scope," not globally nonexistent.

## Read metadata or list a folder

- **Intent/prerequisites:** exact file name/ID or an authoritative folder/drive
  context. Resolve identity as above; retain only an exact file/folder match.
- **Operation/query:** `call_function` for named search; `fetch` for a known
  `/drives/{driveId}/items/{itemId}` or
  `/drives/{driveId}/items/{folderId}/children`. Personal root listing can use
  `/me/drive/root/children`. Add only supported requested metadata fields.
- **Effects/completion:** read-only; answer from returned metadata without a
  redundant fetch for the same fields. Continue supported paging for a complete
  list or label the result partial. Missing owner/timestamp fields remain unknown.
- **Failures:** use bounded read recovery; do not switch to semantic search to
  invent missing metadata. [Fetch mechanics](fetch-work-iq.md) govern caps/paging.

## Rename, move, delete, and copy

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

## Download content

Resolve an exact file with the identity rules above, then use
[fetch_blob](fetch-blob-work-iq.md) on its content path. A metadata read or
returned download URL is not downloaded bytes. Preserve supported OneDrive and
SharePoint downloads and file-attachment selection via [Mail](mail-work-iq.md).
