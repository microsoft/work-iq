# File metadata

## Required before use

- [files-identity-work-iq](files-identity-work-iq.md)

## Read metadata or list a folder

- **Intent/prerequisites:** exact file name/ID or an authoritative folder/drive
  context. Apply the [identity contract](files-identity-work-iq.md);
  retain only an exact file/folder match.
- **Operation/query:** `fetch` for a known
  `/drives/{driveId}/items/{itemId}` or
  `/drives/{driveId}/items/{folderId}/children`. Personal root listing can use
  `/me/drive/root/children`. Add only supported requested metadata fields.
- **Effects/completion:** read-only; answer from returned metadata without a
  redundant fetch for the same fields. Keep returned file names paired with actual
  returned user-facing links when available; a URL/item ID is not a file name.
  Do not invent a missing name or reconstruct a source link.
  Continue supported paging for a complete
  list or label the result partial. Missing owner/timestamp fields remain unknown.
- **Failures:** use bounded read recovery; do not switch to semantic search to
  invent missing metadata. [Fetch mechanics](fetch-work-iq.md) govern caps/paging.
