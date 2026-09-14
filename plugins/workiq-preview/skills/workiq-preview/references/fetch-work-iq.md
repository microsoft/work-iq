# fetch

Read precise structured entities/collections with HTTP GET. Known URLs/IDs,
exact named entities, complete lists, and exact-thread summaries use entity
reads directly, without retrieval preflight. Ordinary caller-owned semantic
context instead uses [retrieve](retrieve-work-iq.md); [ask](ask-work-iq.md)
requires intentional delegation, not merely a request to summarize.

## Parameters and effects

| Parameter | Contract |
|---|---|
| `entityUrls` | Required array of supported server-relative entity paths, starting with `/`, without scheme, authority, or API-version prefix |

`fetch` reads JSON; it does not send, mark read, draft, update, or download file
bytes. Resolve authoritative IDs here before mutations, then prepare and obtain
required confirmation under the domain contract. Reading a target is not
completion of a requested write, nor authorization for it.

Use [call_function](call-function-work-iq.md) for named drive search, reminders,
and explicit delta. Ordinary `/me/calendarView` belongs to `fetch`; its
`/me/calendarView/delta` variant does not. Use [fetch_blob](fetch-blob-work-iq.md)
for `/content` or `/$value` bytes, not JSON metadata envelopes.

## Queries and identity

Use `$select`, `$top`, `$filter`, `$orderby`, and `$expand` **only where the
specific endpoint supports them**. A page size is not a completeness or
uniqueness guarantee. Domain exceptions override generic query suggestions:
[Teams](teams-work-iq.md) member endpoints restrict selected fields and paging
options. Do not probe unsupported variants after a rejection.

- Retain full opaque IDs from structured responses; do not fabricate, normalize,
  or scrape semantic citations to construct mutation IDs.
- Escape embedded apostrophes in OData literal values by doubling them, then
  URL-encode the value once. Do not blindly double-encode.
- Keep OData property paths (such as `start/dateTime`) and comma-separated
  `$select` fields intact. A `/` inside a string-literal value is different
  from a property-path separator.
- Use [get_schema](get-schema-work-iq.md) for unknown supported fields/query
  details or an explicit schema request, not as a mandatory preflight for every
  inherited known read.

## Batches, paging, and host caps

1. Batch independent exact reads when useful. Check the **individual result
   status** and payload for every URL; a batch-level success/error alone cannot
   determine whether each source succeeded. Retain successful results.
2. An `@odata.nextLink` means a partial collection. Follow returned continuations
   when needed for the requested completeness, identity disambiguation, or
   reliable ordering. Do not invent `$skip` or pagination tokens; many endpoints,
   notably calendar views and member collections, restrict paging.
3. Convert an absolute next link only for an expected supported service/path:
   remove the verified authority and known API-version prefix, preserving the
   rest of the path/query and opaque tokens exactly. Do not decode/re-encode,
   follow unexpected hosts, or broaden the collection.
4. For a host-truncated/capped response, inspect available saved output first
   using a host file reader or bounded local parsing. A display cap is neither
   zero results nor an API page boundary.
5. Stop when the evidence satisfies the request. Happy-path call/page budgets
   are efficiency guidance, not authority to omit requested "all/every/complete"
   coverage. If a runtime/service limit prevents completion, report the searched
   scope, partial coverage, and remaining continuation without exposing tokens.

A "latest" or "next" answer requires reliable chronological coverage; the first
returned item/page is not necessarily latest/earliest. Do not enumerate unrelated
collections just because the available page lacks the desired fact.

## Failure and recovery

Apply the [central operation-aware recovery table](troubleshooting.md).
Explicit authentication/access/policy denial stops the operation, including
alternate entity paths, strategies, agents, or semantic fallbacks. Generic null
or 403 does not establish a specific permission diagnosis.

For a supported read with transient failure or throttling, honor returned delay
and bounded recovery. In a batch, reconsider only failed reads that qualify for
safe recovery; never indiscriminately replay every failed URL or discard prior
successes. A definitive invalid query may be corrected only when its diagnostic
and supported schema establish the fix. Preserve errors and missing results in
the final answer rather than converting them into "not found."

## Canonical read contracts

- [Files](files-work-iq.md): exact file/folder identity and listing.
- [Calendar](calendar-work-iq.md): ordinary windows, next/latest meeting, people
  comparisons, and reminder/free-busy distinctions.
- [Mail](mail-work-iq.md): concrete filters, complete exact exchanges, attachments.
- [Teams](teams-work-iq.md): exact chats/channels/messages and supported query limits.
- [Tasks](tasks-work-iq.md): structured Planner discovery and task reads.
- [People and setup](workflows-work-iq.md): directory/contact identities and photos.

### Read a supplied exact message

```json
{"entityUrls": ["/me/messages/{messageId}"]}
```

Replace placeholders with authoritative IDs before invocation. For multiple
supplied entities, include their supported exact paths in the same array and
synthesize locally; do not start semantic retrieval merely to summarize them.
