# call_function

Invoke an advertised function through WorkIQ. There are two contracts:

- Graph/OData functions are GET-shaped, side-effect-free, with parameters in
  the function URL, such as `delta`, `reminderView(...)`, or file search.
- Enabled provider functions, including native `/sharepoint/` functions,
  accept structured parameters in `jsonBody`. Their advertised operation and
  request schema, not the presence of a body, determine the wrapper.

Use `functionUrl` as a server-relative WorkIQ path. Optional `jsonBody` may
be an object or JSON-encoded string when the provider supports it. A browser
file URL belongs in the native body, not in `functionUrl`.

For native SharePoint request bodies use `get_schema` with the exact path and
`operationType: "function"`. Use `do_action` for advertised actions, such as
Graph `getSchedule`, `findMeetingTimes`, and `sendMail`, or native SharePoint
mutations. Never infer an action just because a provider accepts JSON.

Read [SharePoint native operations](sharepoint-work-iq.md) for site keys,
document passages, structured text, metadata, and the original-file boundary.
For example:

```json
{
  "functionUrl": "/sharepoint/get_site_key",
  "jsonBody": { "siteUrl": "https://contoso.sharepoint.com/teams/Research" }
}
```

For Graph functions, retain the established inline-parameter contracts below.
Use the known route directly; discover/schema-check only genuinely unknown
operations, using the actual operation advertised by the catalog.

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

