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
- Delete a resolved OneDrive or SharePoint driveItem through `/drives/{driveId}/items/{itemId}`, where permitted
- Delete a Teams message (where permitted)

## Gotchas

- **Email delete moves to Deleted Items** — that's the right default for any "delete / remove / get rid of this email" request. Reach for `do_action` with `/me/messages/{id}/permanentDelete` only when the user explicitly asks for permanent, unrecoverable removal, and only against the **single resolved message ID** — never loop `permanentDelete` across a list of messages.
- **Event delete** sends cancellation notices if it was an organized meeting.
- Resolve the exact entity before deleting; use `fetch` for ordinary entities or
  `call_function` search for a named OneDrive file. Do not add a redundant read
  when the exact identity is already confirmed.

## Workflow

1. Resolve the correct entity and ID, then obtain confirmation for the specific deletion.
2. `delete_entity` with the entity's full path including ID.

For a named OneDrive file, use
`call_function` `/me/drive/root/search(q='{urlEncodedExactName}')?$select=id,name,parentReference,file&$top=10`.
Select the exact file, retain `parentReference.driveId` and `id` verbatim, then
delete `/drives/{driveId}/items/{itemId}`. Do not use `/me/drive/items/{id}` or
add `eTag` / `@odata.etag` to `$select`; pass the normal response's eTag as
`If-Match` when supplied. If a newly created file is not indexed yet, allow at
most one bounded `/me/drive/root/children` fallback. For an already resolved
SharePoint driveItem, use the same drive-scoped delete path, subject to policy.

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
