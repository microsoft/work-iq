# call_function

Invoke a path advertised as a function. Graph-backed OData functions use HTTP GET and return computed results, for example `delta` (change tracking on a collection) or `reminderView` (computed list of upcoming reminders).

For Graph-backed operations, body-based verbs such as `getSchedule`,
`findMeetingTimes`, and `sendMail` are actions and use `do_action`.
Provider-backed operations such as `/sharepoint/*` follow their advertised
operation instead: a `function` uses `call_function` even when its request is
body-based. Do not infer the projection from the HTTP method or presence of a
body, or invoke a provider function as an action.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `functionUrl` | string | Yes | The function path including any required inline parameters (e.g., `/me/reminderView(startDateTime='...',endDateTime='...')`). Must be a server-relative path — start with `/`, no scheme or authority (`https://graph.microsoft.com` ❌, `/me/reminderView(...)` ✅). URL-encode any special characters in inline parameter values. |
| `jsonBody` | object | Only when supported by the connected tool and function schema | Provider function request body. Use the schema's exact fields; do not invent a body or inline-parameter transport. |

## Provider-backed functions

For `/sharepoint/*`, reuse the path, advertised operation, request schema, and
target site's opaque siteKey already validated in the same conversation,
connection, tenant, and user context. Discover only missing prerequisites;
inspect a missing request schema with `get_schema.operationType: "function"`.
Invoke using the argument transport advertised by the connected tool.
If that host cannot invoke the advertised function or transport, report the
incompatibility rather than switching to `do_action`.

For example, after the live catalog and schema confirm this function and the
tool supports `jsonBody`, a minimal known-library metadata read can use:

```json
{
  "functionUrl": "/sharepoint/get_list_schema",
  "jsonBody": {
    "siteKey": "{returnedSiteKey}",
    "listId": "{listId}",
    "includeHidden": false,
    "includeReadOnly": false,
    "includeFields": false,
    "includeContentTypes": false
  }
}
```

Only suppress expansions not needed by the request. Reuse contracts and keys,
not the prior data response: perform a fresh call when current data is requested.
Follow the [provider workflow](sharepoint-work-iq.md#provider-backed-sharepoint-operations)
for context changes, prerequisites, and denial/mutation safeguards.

## When to Use

- For a provider operation explicitly advertised as `function`, including its supported request-body transport
- When you need a computed result that takes no request body (`delta`, `reminderView`)
- Any time the OData path uses function call syntax `functionName(param=value)` and the operation is documented as GET
- When resolving a OneDrive file by exact name with `/me/drive/root/search(q='...')`
- **Any "what's new / what's changed / what was added or removed since X" question** — that is a
  delta query, and this tool is the only correct route for it

If the operation type is unknown, use `search_paths` and inspect the advertised
`operations`, then request only the matching schema if needed. Do not probe
`fetch` and `action` variants to classify a provider operation.

## Delta queries (change tracking)

Delta endpoints exist for mail (`/me/mailFolders/{id}/messages/delta`), calendar
(`/me/calendarView/delta?startDateTime=...&endDateTime=...`), contacts (`/me/contacts/delta`),
and more.

- **Only via this tool.** Calling a delta path through `fetch` fails. Do not approximate
  delta with `fetch` + a `lastModifiedDateTime` filter — that misses deletions and true change
  semantics.
- **First sync:** call the delta path with no token. Page through `@odata.nextLink` responses
  (re-issue each link as a server-relative `functionUrl`) until you get `@odata.deltaLink`.
- **Resume:** if the user has a saved delta token / deltaLink, call **that link's path and query
  verbatim** (as a server-relative path) instead of starting over. The `$deltatoken` /
  `$skiptoken` values are opaque — never invent or modify them.
- Items in a delta response with an `@removed` annotation are deletions — report adds, changes,
  and removals distinctly, and don't report counts the response doesn't support.

## Examples

### Get upcoming meeting reminders
```json
{ "functionUrl": "/me/reminderView(startDateTime='2024-06-01T00:00:00Z',endDateTime='2024-06-30T23:59:59Z')" }
```

### Track changes to a mail folder (delta query)
```json
{ "functionUrl": "/me/mailFolders/inbox/messages/delta" }
```

### Get metadata for a named OneDrive file

Use one function call. URL-encode the exact file name, select the metadata the
user needs, and answer directly from the matching driveItem. Do not call
`search_paths` or `get_schema`, and do not follow a successful search with
`/me/drive/items/{id}`.

```json
{
  "functionUrl": "/me/drive/root/search(q='{urlEncodedExactName}')?$select=id,name,size,createdDateTime,lastModifiedDateTime,webUrl,file,folder,parentReference,createdBy,lastModifiedBy,fileSystemInfo,sharepointIds&$top=10"
}
```
