# SharePoint document-library metadata

Use this reference when a user asks about SharePoint library columns or wants
files filtered, counted, grouped, sorted, or compared by metadata.

## Content search and library metadata are different

Semantic retrieval/delegated answers and general SharePoint search can supply
document content and embedded file properties. SharePoint document-library columns are
list-item fields and must be read through `fetch`.

For example, document text may contain `Document Owner: Sofia Ricci` while the
library's `Owner` column contains `HR Team`. A question about the library column
must use the latter.

Use this route whenever the user mentions:

- metadata, column, field, or property;
- `Owner =`, `Status =`, `City =`, or another named attribute;
- count/group/breakdown by a column;
- earliest/latest by a date column; or
- which documents have a specified column value.

Do not use semantic evidence as the source of truth for those column claims.
Once exact files are identified, synthesize from their supported reads. Ordinary
caller-owned semantic evidence follows [retrieval policy](retrieve-work-iq.md)
with explicit Grounding; [ask](ask-work-iq.md) requires intentional delegation.

The routes and endpoint limits below are inherited contracts, not new live
schema/response validation. Preserve their source-truth and completeness rules.
Use [canonical recovery](troubleshooting.md) for failures; explicit denial always
stops, even where an alternative addressing mode is documented.

## Canonical resolution recipe

Given:

```text
https://contoso.sharepoint.com/sites/Finance/Shared%20Documents
```

### 1. Resolve the site once

```text
/sites/contoso.sharepoint.com:/sites/Finance
```

Read the returned `id`, which has the composite form:

```text
contoso.sharepoint.com,{siteGuid},{webGuid}
```

Reuse it for the rest of the conversation. Do not construct
`/sites/contoso.sharepoint.com,Finance`; a site name is not a site id.

### 2. Resolve the document library once

```text
/sites/{siteId}/lists?$select=id,name,displayName
```

Choose the list whose `name` or `displayName` matches the target document
library, commonly `Documents` or `Shared Documents`. Retain its `id`.

### 3. Resolve columns before querying items

```text
/sites/{siteId}/lists/{listId}/columns?$select=name,displayName,indexed,hidden
```

Build a mapping from the user-facing `displayName` to the internal `name`.

| User asks for | `/columns` may return | Use in item fields |
|---|---|---|
| Owner | `displayName: Owner`, `name: Owner` | `fields.Owner` |
| Review Date | `displayName: Review Date`, `name: Review_x0020_Date` | `fields.Review_x0020_Date` |
| Document Type | `displayName: Document Type`, `name: DocumentType` | `fields.DocumentType` |

Use case-insensitive/space/underscore-normalized comparison only to find candidates;
if multiple columns match, resolve the ambiguity rather than conflating them.
Use the internal `name` exactly as `/columns` returns it — spaces and special
characters are encoded (e.g. `Review_x0020_Date`). Never assume the internal
name from the display label; read it from `/columns`, and disclose a surprising
mapping such as: “The library's Review Date column is stored internally as
`Review_x0020_Date`.”

If no column matches a complete successful columns response, stop and say that the
library has no requested column. A partial or failed column read cannot establish absence.
List the relevant available display names from `/columns`; do not guess,
substitute, or relabel another field.

### 4. Read item fields

`$top` is silently clamped to 100 (see [Enumerating a library](#enumerating-a-library)),
so `$top=100` is the effective maximum — never rely on a larger page.

Full fields:

```text
/sites/{siteId}/lists/{listId}/items?$expand=fields&$top=100
```

Selected fields:

```text
/sites/{siteId}/lists/{listId}/items?$expand=fields($select=FileLeafRef,Owner,Status)&$top=100
```

Columns on a `listItem` live below `fields`. A bare list-item
`$select=Owner,Status` is invalid.

## Grounding contract

`/columns` is authoritative for what the library carries. GET it before
answering about any property; if the property is not in that set, no further
retrieval will produce it.

Before reporting each metadata value:

1. Confirm that `/columns` contains the requested column.
2. Confirm that this item's tool result literally contains the internal field
   name and value.
3. Keep absent, empty, and unreadable distinct:
   - absent column: “This library has no `<X>` column”;
   - present field with an empty value: report it as empty;
   - failed call: “Could not read this value because the call failed.”
4. Never derive a column value from a filename, folder path, URL segment,
   document text, or a related field.
5. Never relabel another field as the requested field.

### Absent-field protocol

Declare the requested property absent only when a complete, successful `/columns`
read does not contain it.
In that case:

- state plainly, in the **first sentence**, that the library has no such column;
- contain **no** per-file table or illustrative row for that property;
- name the closest columns that DO exist, clearly labelled as different data,
  and ask whether the user wants those instead.

If the column exists, say it is empty for every item only after examining a
complete candidate set. For partial results, state only that the retrieved
items had empty values and identify the coverage limitation. Do not pad the
answer with a substitute field or invent example values; when showing shape for
another property, use only a row actually retrieved and name the item.

### Never substitute one field for another

- `Modified` / `Modified By` is not checkout state, and not review activity.
- `publication.level` is not a sensitivity label, and not checkout status.
- `Created` / `Created By` is not an approval record.
- any date column is not a view or access count.

Examples of invalid grounding:

- `Seattle.docx` does not prove `City = Seattle`.
- `/Projects/Project_Beta/file.pdf` does not prove `Owner = Project Team B`.
- `lastModifiedDateTime` is not `Review Date`.

If you must offer an inference, label it explicitly and keep it separate from
the values read from SharePoint.

## Scope and denominator

This kind of library often holds two populations, and merging them yields wrong
denominators:

- **GOVERNED** — in-scope items that participate in the library's relevant
  metadata scheme, as shown by one or more of its applicable columns.
- **UNGOVERNED** — in-scope items with none of those applicable metadata
  columns populated.

For each query, use `/columns` to resolve the requested display name to its
internal name and derive the requested criteria from that query. For example,
`fields/Owner ne null` is appropriate only when the user explicitly asks about
files with recorded ownership, such as a percentage among files owned by
particular people or teams; it is not a universal metadata precondition. For a
Status breakdown, use the resolved Status column rather than Owner and process
the criteria client-side if Status is not indexed. Unless the user explicitly
says “the whole library” or “including unclassified”, scope metadata questions
to the relevant GOVERNED population. A governed item whose requested field is
empty remains in that denominator as a real gap; do not silently reclassify it
as ungoverned. If both populations are relevant, give both numbers and label
them. Every percentage names its denominator in the same sentence.

## Filtering and sorting

Use the confirmed internal column name in server-side queries.

```text
/sites/{siteId}/lists/{listId}/items?$expand=fields&$filter=fields/Status%20eq%20%27In%20Progress%27&$top=100
```

Indexing varies by library. When WorkIQ returns:

```text
Field 'X' cannot be referenced in filter or orderby as it is not indexed.
```

the values are still readable. Do this:

1. Remove `$filter` or `$orderby`.
2. Enumerate with `$expand=fields&$top=100` and follow accepted
   `@odata.nextLink` continuations. Use folder traversal only if a continuation
   specifically fails because `$skiptoken` is rejected (see
   [Enumerating a library](#enumerating-a-library)).
3. Filter, sort, count, or group the returned values client-side.

Do not retry cosmetic variants of the rejected query, and do not switch to
`ask` or general SharePoint search tools.

## Enumerating a library

The gateway silently caps every page at 100 rows. Follow `@odata.nextLink` when
the current WorkIQ endpoint accepts it. A continuation call can reject its
carried `$skiptoken`, returning:

```text
Query parameter $skip is not permitted. Use $filter instead.
```

If that specific rejection occurs, stop that paging strategy and use the
fallback below; do not treat the first page as complete. Other rejected query
shapes cannot be made to work by rewording:

| Blocked shape | Result |
|---|---|
| `$filter=id gt 'N'` | HTTP 500 “General exception while processing” |
| `$filter=fields/ID gt N` | HTTP 400 type mismatch |
| Rejected `@odata.nextLink` continuation carrying `$skiptoken` | HTTP 400, `$skip` rejected |
| `$count=true` | HTTP 400 “$count is not supported on this API” |

If you see one of these, the shape is unsupported; do not retry it with
different quoting, casing, or ordering. Enumerate in this order instead.

### 1. Filtered query (preferred whenever the question has a filter)

```text
/sites/{siteId}/lists/{listId}/items?$expand=fields&$filter=fields/{Col}%20eq%20%27{Value}%27&$top=100
```

A filtered result under 100 rows with **no** `@odata.nextLink` is COMPLETE and
authoritative — report it as-is. Most questions need nothing more. When
`@odata.nextLink` is present, follow it as described in (2). If the column is
not indexed you get “... cannot be referenced in filter or orderby as it is not
indexed” — do not retry the filter; enumerate unfiltered list-item pages and
process the resolved column client-side.

### 2. Continuation paging

Follow each returned `@odata.nextLink` while the current endpoint accepts it,
preserving its opaque continuation parameters. If a continuation specifically
fails because `$skiptoken` is rejected, stop this paging strategy and continue
with folder traversal.

### 3. Folder traversal (fallback when continuation paging is rejected)

```text
/drives/{driveId}/items/{folderItemId}/children
```

Recurse depth-first; anything with a `folder` facet is a container. Treat the
returned drive items as candidate discovery only. For each file candidate,
obtain its list-item identity or relationship through a WorkIQ-supported
response or path, then fetch the corresponding list item with
`?$expand=fields` before filtering, sorting, counting, or grouping metadata. Do
not infer column values from drive-item properties. If the relationship cannot
be resolved, disclose the limitation instead of claiming a complete metadata
result. Resolve the root folder item ID from supported list-drive metadata before
traversal. If a root alias or any other read returns “Access denied for GET path”,
stop the affected workflow. Do not try a different addressing mode, and do not
conclude that the folder is empty.

### 4. Targeted item read (single known item only)

```text
/sites/{siteId}/lists/{listId}/items/{id}?$expand=fields
```

Never use this to sweep an id range. Probing ids 1..N one at a time is not
enumeration — it is slow, it silently drops items that return 500, and it will
exhaust the turn budget.

## Truncation tripwire and completeness

Check EVERY list response. A page is TRUNCATED if any of these holds:

- it contains exactly 100 rows;
- it contains an `@odata.nextLink`;
- it contains 0 rows **and** an `@odata.nextLink` (this happens; it does NOT
  mean zero).

`$top` is silently clamped to 100, so asking for 200 and receiving 100 is
truncation, not a complete result — no field in the response tells you this.
From one truncated page you MUST NOT report its row count as a total, compute a
percentage / `most` / `least` / max / min, or conclude a value does not exist.

Follow every `@odata.nextLink` accepted by the current endpoint. The candidate
set is COMPLETE only after all pages have been retrieved and the final page has
fewer than 100 rows with no nextLink. If a continuation specifically fails
because `$skiptoken` is rejected, use folder traversal and keep the result
partial unless traversal enumerates every candidate and each candidate is
rehydrated with its list-item `fields`. Only then may you state a total as fact.
When you cannot get a complete set, disclose coverage and give the partial
figure as a lower bound:

> Retrieved 115 items by folder traversal; the complete set could not be
> enumerated, so this is a lower bound.

Never present a partial set as a total, and never claim `all`, `earliest`,
`latest`, or `most` unless the complete candidate set was read. Say “of the N
items retrieved” instead. Do not use `?$count=true` for the expected total — it
is rejected (HTTP 400); use folder `childCount` from drive metadata instead. A
request for a metadata total, percentage, extrema, or all-empty conclusion
requires a complete set and therefore overrides the general 2–3-page cap in
[Fetch](fetch-work-iq.md).

## Per-result status codes

`fetch` returns `success:true` and `isError:false` even when the underlying
SharePoint call failed. Inspect `structuredContent.results[].statusCode` for
every entry in every response:

- `200` — usable.
- `404` — not found at the requested path; do not assume why or count it as read.
- `500` — the item was not successfully read. Follow the bounded read-only retry
  policy, honoring the actual returned delay; preserve all successful batch entries.
- `400` — rejected request; its specific diagnostic, not the code alone, determines
  whether a supported query correction is possible.
- `401` / `403` or explicit access/policy denial — stop the affected workflow.
  A generic forbidden response does not identify an underlying cause.

When you send N `entityUrls`, count the 200s. If fewer than N came back 200,
your data set is short by the difference — recover the item or state how many
could not be read. Before stating any total, reconcile: items counted == items
requested == items returned 200. If those disagree, say so.

## SharePoint error decoder and bounded recovery

| Error text | Meaning | Correct response |
|---|---|---|
| `Access denied for GET path: /sites/{name}?...` | Explicit access denial; the message alone does not prove a name/ID defect | Stop and report the observed denial; no addressing-mode bypass |
| `Access denied for GET path: /drives/{id}/root:/X:/children` or `/drives/{id}/root/children` | Explicit access denial, not an empty folder | Stop; do not traverse a different path to recover the denied target |
| `Access denied` on a SharePoint read | Explicit denial without evidence of its underlying cause | Stop the affected workflow; do not try another tool, strategy, agent, or path |
| `Query parameter $skip is not permitted` on a continuation call | This continuation's `$skiptoken` was rejected | Stop that paging strategy; use folder traversal with list-item rehydration, and keep the result partial unless traversal produces the complete candidate set. Do not id-range page — `$filter=id gt` is also blocked (HTTP 500) |
| `Field 'X' cannot be referenced in filter or orderby` | The column is not indexed | Enumerate fields and process client-side |
| Error on a bare list-item `$select` of custom columns | List columns live under `fields` | Use `$expand=fields($select=...)` |
| 403 from `call_function` for an ODSP path | Forbidden; cause unspecified unless the diagnostic says more | Stop the affected workflow; do not switch to `fetch` |
| 500 or `assistant is busy, retry in 120 seconds` on a read | Read failure; the latter explicitly supplies a delay | Honor the actual delay (120 seconds in this diagnostic), retry the failed read at most once, then report failure |

For a demonstrated pre-execution query-validation defect, make at most one
supported correction when safe. Unsupported query/paging correction is not
authorization to bypass an access or policy denial. Do not use generic `400`/`500`
as proof that another route is needed. Follow [recovery](troubleshooting.md);
retain successful independent reads and disclose gaps without probing denied targets.

An error is not an empty value. Never report “the folder is empty” or “there
are no matching files” solely because a call failed.

## Batching

`fetch` accepts at most 50 URLs in one `entityUrls` call. Split larger batches
into chunks of 50 or fewer. Prefer batching related, known-good reads over
sequential single-URL calls. Preserve successful entries and isolate only failed
reads within the single bounded recovery budget; never retry a successful batch
entry or replay mutations to recover a read.
