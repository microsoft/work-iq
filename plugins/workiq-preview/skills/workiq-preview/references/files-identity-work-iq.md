# File identity

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

These checks also apply to read-only artifact finding and each source in a
comparison. Verify full name/type, location/time constraints and relevant content;
never substitute a near-match for an unresolved target. Use a bounded supported
in-scope refinement or exact content read only when needed for the requested
precision; sufficient evidence does not require a full download.

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
