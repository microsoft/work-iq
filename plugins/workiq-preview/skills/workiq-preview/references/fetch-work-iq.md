# fetch

Read authoritative Microsoft 365 resources using a known path, ID, or deterministic collection/filter. Use `fetch` when exact records, counts, ordering, IDs, or fields matter, including one bounded mutation-target lookup. Do not use it for semantic relevance ranking, indexed grounding, reasoning, or answer synthesis.

The primary test is whether the agent can express the requested result as a resource path plus deterministic query semantics. A natural-language request can still use `fetch` when it maps cleanly to a deterministic query such as an OData filter, ordering clause, or exact keyword `$search`.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entityUrls` | string[] | Yes | One or more entity paths to fetch. Must be relative to the domain root (start with `/`, no scheme or authority). Supports OData query parameters (`$filter`, `$select`, `$top`, `$orderby`, `$expand`). All query parameter values must be URL-encoded. |

## When to Use

- Read an entity whose ID or exact entity URL is already known
- Read a known collection path with explicit fields or deterministic OData filters
- Run an exact keyword search when the resource collection and search expression are known
- Resolve the exact target of a requested mutation with one bounded collection/filter read
- For multi-fetch: pass multiple URLs to retrieve several entities in one call

Do not use `fetch` for semantic discovery, relevance ranking, indexed grounding, or answer synthesis.

- Ranked M365 indexed evidence, citations, and grounding for another agent/RAG workflow → `retrieve`
- Summaries, explanations, comparisons, recommendations, and conversational answers → `ask`

Use `fetch` for exact recent/latest/last-N requests when count and chronological ordering are requirements. For example, "get my last five emails" is a deterministic collection read; "find the most relevant recent emails about launch risk for another agent" is indexed grounding and belongs to `retrieve`.

`fetch` and `retrieve` may be combined only for distinct purposes. A semantic `retrieve` can identify a relevant hit before `fetch` reads exact authoritative fields from that selected resource. Do not add either tool merely to verify or broaden a sufficient result.

Use `fetch` to resolve exact targets before mutations — find an event ID before deleting/updating, a draft before adding recipients or sending, a Teams chat/channel/message before editing/reacting/posting, or a mail thread before reply/forward/move/mark-read. Keep the lookup bounded; ask the user to choose when multiple entities match, and stop when none match.

For literal structured reads such as "list members," "show my chats," or "get event AAMk...," use filtered `fetch` or a known function path. Do not answer from general knowledge or local SQL.

> **⚠️ Not for delta queries.** Calling `/.../delta` or `/.../delta()` through `fetch`
> fails — delta is an OData **function** and must go through `call_function`. See
> `references/call-function-work-iq.md`.

> **Named OneDrive search is also a function.** For a file identified by exact
> name, call `/me/drive/root/search(q='...')` through `call_function` once and
> answer from that result. Do not follow it with `/me/drive/items/{id}` merely
> to retrieve the same metadata again.

## Multi-fetch caveats

- The batch result can report an error when **any one** URL fails, even if the other URLs
  returned data. If a multi-fetch errors, don't discard it — check for successful payloads
  inside the response, and re-issue only the failing URL on its own to isolate the problem.
  When a URL might fail (permissions, existence unknown), prefer small batches or single URLs.
- Large URL lists also stack per-URL latency into a single tool-call window and raise the
  odds of one failure poisoning the batch. Prefer focused batches over speculative bulk
  fetches.

## Pagination

Collection responses are **pages**, not the full result set. When a response contains
`@odata.nextLink`, more results exist:

- To get the next page, call `fetch` again with the `@odata.nextLink` value converted to
  a server-relative path (strip the scheme/authority/version prefix, keep the path and query
  string — including the opaque `$skiptoken`).
- **Do not paginate with `$skip`** — many collections (notably `/me/calendarView`) do not
  support it and the call fails.
- If you stop before exhausting pages, **tell the user the list is partial** ("first 25 of
  more") — never present one page as the complete answer.
- **Cap your paging.** For bounded structured collection reads, one page is usually enough;
  otherwise stop after 2–3 pages unless the user explicitly asked for the complete set. Do not follow
  `@odata.nextLink` for dozens of pages to enumerate an entire mailbox or message history.

## URL Format

Paths must:
- Start with `/` (relative to the domain root)
- **Not** include a scheme or authority — `https://graph.microsoft.com/v1.0/me/messages` ❌, `/me/messages` ✅
- Have all query parameter values URL-encoded

Common URL encodings for OData query values:

| Character | Encoded | Example |
|-----------|---------|---------|
| Space | `%20` | `$filter=isRead%20eq%20false` |
| Single quote `'` | `%27` | `$filter=subject%20eq%20%27Hello%27` |
| `(` | `%28` | `$filter=startsWith%28subject%2C%27Re%3A%27%29` |
| `)` | `%29` | (same as above) |
| `:` | `%3A` | (in string literals) |
| `/` *(only inside string-literal values)* | `%2F` | (e.g. inside a quoted `$filter` value) |
| `,` *(only inside string-literal values)* | `%2C` | (in string literals; **not** in `$select=a,b,c` lists) |

> **Important — what NOT to encode:**
> - OData **property paths** like `start/dateTime`, `from/emailAddress/address`: leave the `/` raw. Use `$orderby=start/dateTime`, never `$orderby=start%2FdateTime`.
> - **Comma-separated `$select` lists** like `$select=subject,from,receivedDateTime`: leave the `,` raw. Only encode commas that appear inside a quoted value.
> - OData keywords and field names (`$filter=`, `isRead`, `eq`, `desc`): standard ASCII, no encoding needed.

## OData Query Tips

**Always include `$select`** with only the fields you need to reduce response size (e.g., `/me/messages?$select=id,subject,from`). For collection endpoints, include `$top` to bound results.

| Parameter | Purpose | Example |
|-----------|---------|---------|
| `$top` | Limit result count (some APIs reject `$top` — e.g., `/me/chats/{id}/members`; omit it there) | `$top=10` |
| `$filter` | Filter results | `$filter=isRead%20eq%20false` |
| `$select` | Return only specified fields | `$select=subject,from,receivedDateTime` |
| `$orderby` | Sort results | `$orderby=receivedDateTime%20desc` |
| `$expand` | Include related entities inline | `$expand=attachments` |

## Binary file content is not available

This skill **cannot** download file bytes, attachment payloads, profile photo bytes, or any other binary content. There is no `fetch_blob` tool exposed.

Do **not** call `fetch` against paths ending in `/content` or `$value` (e.g. `/me/drive/items/{id}/content`, `/me/messages/{id}/attachments/{id}/$value`) — `fetch` only returns JSON metadata envelopes, and it will not give you the raw bytes either.

When the user asks for a file's content:

1. Tell the user this skill cannot return the binary content directly.
2. `fetch` the item's metadata (e.g. `/me/drive/items/{id}`) and return the `webUrl` so the user can open and download it in OneDrive / SharePoint / Outlook directly.
3. For an attachment, return the parent message's `webLink` so the user can open it in Outlook.

Never fabricate base64 content, `@odata.mediaContentType`, or an `@microsoft.graph.downloadUrl` value to satisfy the request.

## Examples

These are literal structured reads against known paths or deterministic filters. For semantic
search, relevance ranking, citations, or downstream-agent grounding, use `retrieve` instead.

### Get the signed-in user's profile
```json
{ "entityUrls": ["/me"] }
```

### Get the signed-in user's profile photo metadata

Resolve the signed-in user's id, then read the photo through the exposed
user-id path. Do not call the policy-denied `/me/photo` alias, and do not call
`/$value`, which is binary content.

```json
{ "entityUrls": ["/me?$select=id"] }
```

```json
{ "entityUrls": ["/users/{id}/photo?$select=id,width,height"] }
```

Do not put `@odata.mediaContentType` or `@odata.type` in `$select`; Graph rejects
those annotations in a select expression. Read the media content type annotation
from the metadata response when a profile photo exists. A `404 ImageNotFound`
means the selected user currently has no profile photo.

### Get unread emails (top 10)
```json
{ "entityUrls": ["/me/messages?$top=10&$filter=isRead%20eq%20false&$select=subject,from,receivedDateTime"] }
```

### Get upcoming calendar events
```json
{ "entityUrls": ["/me/events?$top=5&$orderby=start/dateTime&$select=subject,start,end,location"] }
```

### Get a specific message by ID
```json
{ "entityUrls": ["/me/messages/{id}"] }
```

### Fetch multiple entities in one call
```json
{ "entityUrls": ["/me", "/me/mailFolders/inbox"] }
```

### Get files from OneDrive
```json
{ "entityUrls": ["/me/drive/root/children?$select=name,size,lastModifiedDateTime"] }
```

### Get the first accessible SharePoint site's default drive or lists

For prompts that say "the first SharePoint site I can access," use the first
item returned by the exact site search below. Microsoft Graph's site collection
uses the `search` parameter without a `$` prefix. Do not try `$search=*`, an
empty search, guessed terms, or `ask`.

```json
{
  "entityUrls": [
    "/sites?search=*&$select=id,displayName,name,webUrl&$top=1"
  ]
}
```

Then use the returned site `id` in exactly one of these reads:

```json
{
  "entityUrls": [
    "/sites/{siteId}/drive?$select=id,name,driveType,owner,quota,webUrl,createdDateTime,lastModifiedDateTime,description,system"
  ]
}
```

```json
{
  "entityUrls": [
    "/sites/{siteId}/lists?$select=id,displayName,name,webUrl&$top=200"
  ]
}
```

### Get Teams channels for a group
```json
{ "entityUrls": ["/teams/{teamId}/channels"] }
```
