# SharePoint library metadata

## SharePoint library columns

For explicitly requested library columns or filtering/counting/grouping/sorting
by them, use structured list-item fields, not retrieved document text. A document
author/owner mention is not the library's Owner column.

1. Resolve the exact site and library from supplied/returned identity using
   supported paths, e.g. `/sites/{host}:/sites/{siteName}` then
   `/sites/{siteId}/lists?$select=id,name,displayName`.
2. Read `/sites/{siteId}/lists/{listId}/columns?$select=name,displayName,indexed,hidden`.
   Map display labels to actual internal names; do not guess a field or silently
   substitute a similarly named column. A missing column differs from an empty
   field and from a failed read.
3. Read `/sites/{siteId}/lists/{listId}/items?$expand=fields&$top=100`.
   Custom columns live under `fields`, not a bare list-item `$select`. Only
   report values actually returned under confirmed internal field names.
4. Continue supported `@odata.nextLink` for required completeness. The documented
   page cap is 100: a full capped page without usable continuation is not proof
   of all items. Respect user/runtime budgets and report partial/lower-bound
   counts if coverage is incomplete; do not infer empty/all/earliest/latest.
5. If a diagnostic specifically rejects a non-indexed filter or sort, read supported
   field pages and process locally within scope. A generic 400 is not that
   diagnostic. Explicit denial stops; no alternate addressing or recursive
   sweep to bypass it.

Before batching independent item/field reads, read
[batch mechanics](fetch-work-iq.md#batches-paging-and-host-caps).

Verify requested item identity and comparison population before aggregating.
Distinguish a deliberately excluded population, absent column, not-retrieved
field and empty value. Content summaries may still use sufficient retrieved
evidence, but metadata claims require these structured values.

For a mixed column/content request, read the column values structurally, then
use sufficient retrieved evidence and write the summary locally. Use ask only
if the user intentionally requested a delegated answer.

## Field values and arithmetic

Resolve display labels to returned internal names, including encoded spaces.
Disclose a surprising mapping; do not merge similarly named columns.
Use webUrl/name and returned field values together to identify each result.
Treat empty, missing and not-read fields separately; never infer a value from
document text, publication level or a different metadata field.

Define the requested population before counting or grouping. Keep distinct item
IDs, deduplicate repeated results and track exclusions explicitly. Check that
group totals match the counted population, and label lower bounds/partial
coverage. Do not silently restrict an "all documents" count to an invented
governed subset. Earliest/latest claims require the relevant fields and complete
coverage or a known supported server-side ordering/filter.

## Deliver the requested table

Put the requested inventory, breakdown and aggregates in the message, not merely
a sample, attachment pointer or reference to an earlier turn. Reproduce the
needed table for a follow-up. If the user requests a file instead, honor that
format and verify the actual artifact.

If message limits prevent a full inline table, keep every requested aggregate
inline, state the exact number of omitted rows, and provide the complete
remainder only through an available authorized artifact/output mechanism.
If that mechanism is unavailable, disclose the undelivered rows instead of
claiming a complete deliverable. Never present incomplete source coverage as
complete just because every retrieved row was shown.
