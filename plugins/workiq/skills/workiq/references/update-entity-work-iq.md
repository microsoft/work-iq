# update_entity

PATCH an existing WorkIQ entity. Only fields in the body are changed; other fields are untouched.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entityUrl` | string | Yes | Entity path including ID (`/me/events/{id}`). Get the ID from `fetch` or `create_entity`. Server-relative, starts with `/`, no scheme. URL-encode special characters. |
| `jsonBody` | object \| string | Yes | Fields to update, supplied as a JSON object (`{"isRead":true}`) or a JSON-encoded string. Omit fields you don't want to change. |
| `headers` | object | No | Optional HTTP request headers. If the operation's schema declares an `If-Match` header parameter, you MUST set it to the `@odata.etag` value from the latest read of the same entity. |

## When to Use

- Mark email read/unread
- Update event subject, time, location
- Change task status or due date
- Update document metadata
- Move a OneDrive driveItem by changing `parentReference`
- Any partial update to an existing M365 entity

## Gotchas

- **`entityUrl` must address exactly one entity by ID.** A collection or query URL (`/me/planner/tasks?$filter=startswith(title,'...')`) is rejected with "Write requests are only supported on contained entities" — resolve the ID with `fetch` first, then PATCH `/.../{id}`.
- The ID must come from a real tool response for the **same entity type** — a directory user ID does not work on `/me/contacts/{id}`, and an ID scraped from a search-result URL is not an entity ID.
- Updating one entity means one PATCH. Retry once only after a definitive
  pre-execution validation error that you corrected. For `null`, timeout, or
  another ambiguous outcome, do not replay the PATCH; reconcile with a safe
  read and report an indeterminate outcome if the resulting state cannot be
  determined.
- **Planner writes need an `If-Match` etag** — fetch the task first; on a 412,
  reread, compare concurrent changes and reconcile. Reconfirm a changed action
  before execution, not a blind overwrite (see `references/troubleshooting.md`).

## Workflow

Apply the entrypoint intent/confirmation gate before resolving then acting.

1. Get the entity's `id` from `fetch` or `create_entity`
2. (Optional) `get_schema` with `operationType: "update"` to confirm updatable fields
3. `update_entity` with only the fields to change

## Examples

### Mark a message as read
```json
{
  "entityUrl": "/me/messages/{id}",
  "jsonBody": "{\"isRead\":true}"
}
```

### Update a calendar event's subject and location
```json
{
  "entityUrl": "/me/events/{id}",
  "jsonBody": "{\"subject\":\"Updated: Team Sync\",\"location\":{\"displayName\":\"Conference Room B\"}}"
}
```

### Rename a OneDrive file

This is a known drive-scoped update contract. Do not call `search_paths` or
`get_schema`, and do not PATCH `/me/drive/items/{id}` because that alias is not
exposed for update in the deployed WorkIQ policy.

1. Resolve the exact filename with one `call_function` call:
   - `/me/drive/root/search(q='{urlEncodedExactName}')?$select=id,name,parentReference,file&$top=10`
2. Retain the result's `id` and `parentReference.driveId`.
3. Rename it with `update_entity`:

```json
{
  "entityUrl": "/drives/{driveId}/items/{itemId}",
  "jsonBody": {"name": "Final filename.txt"}
}
```

Use the complete bounded lookup URL above, including `$top=10`. Stop after the
successful PATCH because its response contains the renamed driveItem. The
workflow is exactly `call_function` then `update_entity`.

### Move a OneDrive file into a folder

This is a known update contract, not a `/move` action. Do not call
`search_paths` or `get_schema` for it.

1. Resolve both names with two `call_function` calls:
   - `/me/drive/root/search(q='{urlEncodedSourceName}')?$select=id,name,parentReference,file,folder&$top=10`
   - `/me/drive/root/search(q='{urlEncodedFolderName}')?$select=id,name,parentReference,file,folder&$top=10`
2. Confirm the source result has a `file` facet and the target has a `folder`
   facet. Keep the source `parentReference.driveId`, source `id`, and target
   `id`. Do not put `eTag` or `@odata.etag` in `$select`; Graph rejects those
   terms on drive search.
3. Move the source with `update_entity`:

```json
{
  "entityUrl": "/drives/{driveId}/items/{sourceId}",
  "jsonBody": {"parentReference": {"id": "{folderId}"}}
}
```

Do not fetch again solely to obtain an etag or verify the move. A successful
drive-scoped PATCH response is sufficient unless the user explicitly requests
verification.

### Update a Planner task's due date
```json
{
  "entityUrl": "/planner/tasks/{taskId}",
  "jsonBody": "{\"dueDateTime\":\"2024-06-10T17:00:00Z\"}"
}
```

### Mark a Planner task as complete
```json
{
  "entityUrl": "/planner/tasks/{taskId}",
  "jsonBody": "{\"percentComplete\":100}"
}
```

### Move a message to a different category
```json
{
  "entityUrl": "/me/messages/{id}",
  "jsonBody": "{\"categories\":[\"Project Alpha\"]}"
}
```

## Common failures (do not retry)

Use observed diagnostics, not a status-code guess. Follow the shared
[recovery policy](troubleshooting.md), including no ambiguous mutation replay.

| HTTP / code | Meaning | Action |
|---|---|---|
| `403` + `"Missing scope permissions"` | The operation reports a missing scope | Stop and quote the returned scope; do not promise end-user consent will fix it. |
| `403` + `"Authorization_RequestDenied"` | Insufficient privileges; exact remediation may be unspecified | Stop. Do not invent an administrator remedy or alternate endpoint. |
| Generic `400`, even mentioning a field | Rejected; cause is not established without a specific diagnostic | Inspect the actual schema/diagnostic; correct at most one demonstrated pre-execution defect if still authorized. |
| `404` | Not found at that path | Report the scoped result, not an assumed stale ID, deletion or wrong mailbox. |
