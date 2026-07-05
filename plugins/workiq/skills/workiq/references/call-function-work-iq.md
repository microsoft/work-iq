# call_function

Call an OData function via HTTP GET. Functions are **side-effect-free** named operations that return computed results — for example, `delta` (change tracking on a collection) or `reminderView` (computed list of upcoming reminders).

**Use this tool only for true GET-shaped OData functions.** If the operation is invoked with a request body (e.g. `getSchedule`, `findMeetingTimes`, `sendMail`), it's an **action**, not a function — use `do_action` instead, even when the path looks function-like.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `functionUrl` | string | Yes | The function path including any required inline parameters (e.g., `/me/reminderView(startDateTime='...',endDateTime='...')`). Must be a server-relative path — start with `/`, no scheme or authority (`https://graph.microsoft.com` ❌, `/me/reminderView(...)` ✅). URL-encode any special characters in inline parameter values. |

## When to Use

- When you need a computed result that takes no request body (`delta`, `reminderView`)
- Any time the OData path uses function call syntax `functionName(param=value)` and the operation is documented as GET
- **Any "what's new / what's changed / what was added or removed since X" question** — that is a
  delta query, and this tool is the only correct route for it

If you're not sure whether something is a function or an action, run `get_schema` on the path with `operationType: "fetch"` first. If no `fetch` schema is returned but `action` is, route to `do_action`.

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

