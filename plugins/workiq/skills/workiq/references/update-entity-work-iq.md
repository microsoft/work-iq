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
- Any partial update to an existing M365 entity

## Gotchas

- **`entityUrl` must address exactly one entity by ID.** A collection or query URL (`/me/planner/tasks?$filter=startswith(title,'...')`) is rejected with "Write requests are only supported on contained entities" — resolve the ID with `fetch` first, then PATCH `/.../{id}`.
- The ID must come from a real tool response for the **same entity type** — a directory user ID does not work on `/me/contacts/{id}`, and an ID scraped from a search-result URL is not an entity ID.
- Updating one entity means one PATCH. If it fails, fix the request and retry once or twice — do not loop the same PATCH or fan it out across other entities.
- **Planner writes need an `If-Match` etag** — fetch the task first; on a 412/precondition error, re-fetch and retry (see `references/tasks-work-iq.md`).

## Workflow

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

`update_entity` failures from Microsoft Graph are almost always permanent on the same payload. **Do not retry the same call** after any of these -- repeated identical PATCHes return the exact same error.

| HTTP / code | Meaning | Action |
|---|---|---|
| `403` + `"Missing scope permissions"` | The signed-in user has not consented to the Graph scope this PATCH needs (e.g. `ChannelMessage.ReadWrite` for editing channel messages, `Mail.ReadWrite` for marking mail). | Stop. Tell the user the consent is missing and identify the missing scope from the error body. See [`troubleshooting.md`](troubleshooting.md#http-403-forbidden-on-an-entity-tool-call). |
| `403` + `"Authorization_RequestDenied"` + `"Insufficient privileges"` on `/me` | Directory-managed property (`jobTitle`, `department`, `officeLocation`, `manager`, etc.) is read-only via delegated `/me` scopes. End users cannot change these even with extra consent. | Stop. Tell the user the property is directory-managed and an admin change is required. **Additional end-user consent will not help.** |
| `400` with field name | The field is not in the PATCH-able set for that entity (e.g. computed/read-only) or value type is wrong. | Stop. Re-read [`get_schema`](get-schema-work-iq.md) for the writable-field list before reissuing. |
| `404` | The entity ID is stale / wrong / from a different mailbox. | Stop. Re-`fetch` to get the current ID; do not retry the same URL. |
