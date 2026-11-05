# SharePoint library columns and complete aggregates

Use this reference when the user asks about document-library columns, or to
filter, count, group, sort, or compare files by them. Use native
`/sharepoint/get_list_schema` and `/sharepoint/list_items`, not document content
search, `ask`, Graph list-item recipes, or downloaded files.

Column values and document content are different sources. An owner named in a
technical specification is content; the library's `Owner` column is list-item
metadata. If both are requested, retrieve each with its proper native route.
For content use [Document text and passages](sharepoint-document-text.md).

## Resolve schema before values

1. Resolve the site with `get_site_key`, preserving its returned opaque key.
2. Resolve the requested library with `discover_sharepoint_lists`, retaining
   its `listId`, library URLs, and item count. Do not substitute a drive id or
   an invented library id.
3. Read the authoritative schema:

```json
{
  "functionUrl": "/sharepoint/get_list_schema",
  "jsonBody": {
    "siteKey": "<returned siteKey>",
    "listId": "<returned listId>",
    "includeHidden": false,
    "includeReadOnly": true
  }
}
```

Map the user's display labels to the schema's internal names and field types.
Match display labels case-insensitively and tolerate spaces/underscores while
matching, but copy the actual internal name exactly. For example, a display
label `Review Date` may map to `Review_x0020_Date`; `Status` may map to a
different internal name entirely. Never construct the internal name from the
label. Resolve choice values, people/lookup identifiers, and date/currency
types from returned evidence too.

The schema is authoritative for what columns exist. If the requested column
is absent, state that in the first sentence; do not produce a per-file table or
invent illustrative values for that column. You may name actual neighboring
columns, clearly labelled as different data, without substituting them.

## Read values with internal names and CAML

Call `list_items` with an explicit `rowLimit` covering the requested candidate
set and `viewFields` containing the requested custom internal field names.
Include item identity and filename fields needed to connect values to files.
The default field set is not proof that a custom column is empty.

```json
{
  "functionUrl": "/sharepoint/list_items",
  "jsonBody": {
    "siteKey": "<returned siteKey>",
    "listId": "<returned listId>",
    "rowLimit": 50000,
    "viewFields": ["ID", "FileLeafRef", "<internal status name>"]
  }
}
```

Use the known library item count as the limit when appropriate, or the
documented 50000 limit rather than silently accepting a short default. Inspect
the current schema and result for supported paging and limits.

Native `filter` uses **CAML**, not OData `$filter`, `$expand`, `$select`, or
`fields/Status eq ...`. Inspect `list_items` usage/schema for its accepted CAML
envelope, and use the schema-resolved internal names and field types. Escape
user-supplied values as XML; do not concatenate unescaped CAML. Use the native
recursive/folder/item-type options to match the user's requested scope.

If an unindexed field prevents server filtering, read the authoritative
list-item values without that filter and process them locally. Do not retry
cosmetic query variants, change to content search, or treat a failed query as
an empty library.

## Grounding contract

Before reporting each metadata value, confirm that the schema contains the
column and this item's result actually contains its internal name and value.
Keep these outcomes distinct:

- Column absent: the schema has no requested column.
- Value absent from this response: not read; inspect selection/coverage.
- Present but null/empty: report empty, not absent.
- Read failed: report the observed failure, not an empty value.

Never infer a column from a filename, URL segment, folder name, document text,
or a related property. `Modified` is not review activity; `Modified By` is not
checkout state; publication level is not a sensitivity label; `Created` is not
an approval record; a date is not a view count. Do not relabel another field.
If an inference is useful, label it separately from actual SharePoint values.

## Scope, completeness, and arithmetic

State the population being counted: the requested folder/library, files versus
folders, any explicit filter, and whether governed/unclassified items are
included. Derive governance criteria from the relevant resolved columns, not
from an unrelated universal `Owner` filter. A governed item with an empty
requested field remains in its denominator as a real gap. Every percentage
must name its denominator; distinguish missing, blank, and populated values.

Do not filter away rows needed by an all-items sum or breakdown. Preserve
zeros, false values, nulls, multiple-choice values, and original currency/date
types. For totals and percentages, enumerate every candidate; for earliest,
latest, most, least, and all-empty claims, complete coverage is also required.

Inspect every result's inner status, item count, continuation, `complete`,
`truncated`, and limit/coverage indications. Reaching a result limit is not
proof that the result is complete. Compare returned coverage with the
discovered item count where meaningful; a filtered count is not the whole
library count. Follow only supported returned continuations and preserve their
opaque values. Do not invent cursor/id-range paging or fall back to Graph
folder traversal after a failed native read.

If coverage cannot be completed, say "of the N items retrieved" and identify
the gap. A partial count is a lower bound, not a total; do not compute a
population-wide percentage, maximum, or absence claim from it.

Before answering, reconcile rows counted with rows successfully read, grouped
totals with the stated denominator, and numeric totals with the actual field
values. Do not silently drop unreadable items or count duplicates twice.
Use explicit numeric/date parsing, retain appropriate precision, and separate
incompatible currencies or units rather than summing unlike values.

## Failures and result delivery

Inspect nested provider/per-item errors even under a successful outer MCP
response. An error is not an empty value. For 401/403 or policy denial, stop:
do not try different Graph addressing modes, `ask`, or downloads. For invalid
inputs, correct the specific schema mismatch once; for throttling respect the
reported delay. On an ambiguous write outcome, read back rather than replay.
State only diagnostic causes actually returned by the tool.

Deliver the requested list, breakdown, and coverage in the answer, not solely
an attached file. A convenience export does not replace the message. Keep
filenames clickable using returned links where available. For very large
tables, explicitly label any displayed subset and provide the complete
retrieved result without claiming more coverage than was verified.
