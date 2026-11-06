# File identity

Canonical contract for exact file metadata and drive-item operations. Use
[fetch_blob](fetch-blob-work-iq.md) for bytes.
## Contract and evidence provenance

Inherited examples are not live validation. Resolve unfamiliar details with
[get_schema](get-schema-work-iq.md); general Graph knowledge does not prove support.

Identity is not write authorization. Writes require the
[action contract](files-actions-work-iq.md). Disambiguation/completeness override
lookup budgets; failures use [recovery](troubleshooting.md).


## Exact source and destination identity

For artifact finding and each comparison side, verify name/type, location/time
and relevant content; never substitute a near-match. Use bounded in-scope
refinement/content reads only for missing requested precision, not unconditional
downloads.
Preserve quoted names verbatim, including internal whitespace, case, punctuation
and Unicode. Validate requested extension/MIME, version, author and period with
returned metadata or relevant content; missing qualifiers remain unresolved.
Show bounded relevant candidates with actual IDs/parent locations when selection
is needed, not a fabricated exact match.

Resolve requested personal versus team/SharePoint scope before selecting a route.
A personal-drive search cannot prove non-personal or all-source coverage.
Use [site/library routes](sharepoint-sites-work-iq.md) for known sites and
[structured search](sharepoint-search-work-iq.md) only for requested listings;
unlocated content evidence stays retrieve-first. A site page is not a document
unless that page was requested.

Known drive/item IDs or exact folder paths use structured reads directly, without
retrieval.

1. Match full returned `name` and `file`/`folder` facet, not first-hit rank.
2. Duplicate names need parent/location disambiguation. A page bound is not proof
   of uniqueness. Follow supported pages/focused parent reads or ask for location.
3. Keep source and destination `id`/`parentReference.driveId` pairs separate.
   An item ID does not identify its drive; never overwrite source with destination.
4. Missing drive ID blocks drive-scoped mutation until a bounded structured
   parent/drive read establishes it. Reuse authoritative containing drive context,
   not guesses from sharing URLs, semantic citations or the other item.
5. Copy complete opaque IDs, including trailing `=`, using supported transport
   encoding. Never reconstruct, normalize or double-encode them.

<a id="escape-then-encode-example"></a>
For an OData literal containing an apostrophe, the transformations are separate:
`Owner's plan` becomes OData literal contents `Owner''s plan`, then
URL-encoded contents `Owner%27%27s%20plan`.
Encode literal Unicode with UTF-8 URL encoding once. Escape OData literals
before encoding; encoding an apostrophe alone does not escape an OData string.

**Empty search, known parent:** an empty successful search for an exact item permits
one bounded exact-parent lookup in the same authorized scope. For a known root
item, the inherited example is `fetch` `/me/drive/root/children`; for another
known parent, use its supported children path. Do not recursively enumerate the
drive, search other stores, or use this repair after access/policy denial.
If still absent, report "not found in searched scope," not globally nonexistent.
Search-empty/direct-read success is an observation, not proof of index lag or
permission failure. Before batching/continuation/cap handling, read
[fetch mechanics](fetch-work-iq.md#batches-paging-and-host-caps).

Before URL-equivalence comparison, read
[comparison rules](fetch-work-iq.md#url-identity-comparison). Never rewrite IDs/links.
