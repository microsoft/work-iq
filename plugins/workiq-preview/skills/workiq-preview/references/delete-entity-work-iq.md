# delete_entity

DELETE a WorkIQ entity. Permanent — use with care, especially for emails and calendar events.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entityUrl` | string | Yes | Entity path including ID (`/me/events/{id}`). Server-relative, starts with `/`, no scheme. URL-encode special characters. |
| `headers` | object | No | Optional HTTP request headers. If the operation's schema declares an `If-Match` header parameter, you MUST set it to the `@odata.etag` value from the latest read of the same entity. |

## When to Use

- Delete a calendar event
- Delete a draft email
- Remove a Planner task
- Delete a Teams message (where permitted)

## Gotchas

- **Email delete moves to Deleted Items** — that's the right default for any "delete / remove / get rid of this email" request. Reach for `do_action` with `/me/messages/{id}/permanentDelete` only when the user explicitly asks for permanent, unrecoverable removal, and only against the **single resolved message ID** — never loop `permanentDelete` across a list of messages.
- **Event delete** sends cancellation notices if it was an organized meeting.
- Confirm the entity ID with `fetch` before deleting.

## Workflow

1. `fetch` to confirm the correct entity and ID
2. `delete_entity` with the entity's full path including ID

## Examples

### Delete a calendar event
```json
{ "entityUrl": "/me/events/{id}" }
```

### Delete a draft email
```json
{ "entityUrl": "/me/messages/{id}" }
```

### Delete a Planner task
```json
{ "entityUrl": "/planner/tasks/{taskId}" }
```
