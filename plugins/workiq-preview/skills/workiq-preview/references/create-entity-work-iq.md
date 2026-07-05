# create_entity

POST a new WorkIQ entity to a collection — calendar events, draft emails, tasks, Teams messages, other M365 resources.

> **⚠️ Writes are persistent.** Creating an event sends invitations; creating a task or shared-list message is visible to collaborators. **Summarize what you're creating (subject, attendees, due date, parent) and get explicit user confirmation before invoking.**

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `parentUrl` | string | Yes | Parent collection path (`/me/events`, `/me/messages`). No ID — this creates a new item. Server-relative, starts with `/`, no scheme. URL-encode special characters. |
| `jsonBody` | object \| string | Yes | Fields for the new entity, supplied as a JSON object (`{"subject":"Hi"}`) or a JSON-encoded string. Run `get_schema` with `operationType: "create"` first if unsure. |

## When to Use

- New calendar event
- Draft email (use `do_action` `/me/sendMail` to send immediately)
- New Planner task
- New Teams channel message
- Any POST creating a new item in a collection

## Workflow

1. `get_schema` with the collection URL and `operationType: "create"` to confirm required fields
2. `create_entity` with the collection URL and a valid body
3. Save the returned `id` for later updates

## Examples

### Create a calendar event
```json
{
  "parentUrl": "/me/events",
  "jsonBody": "{\"subject\":\"Team Sync\",\"start\":{\"dateTime\":\"2024-06-01T10:00:00\",\"timeZone\":\"Pacific Standard Time\"},\"end\":{\"dateTime\":\"2024-06-01T11:00:00\",\"timeZone\":\"Pacific Standard Time\"},\"attendees\":[{\"emailAddress\":{\"address\":\"colleague@example.com\"},\"type\":\"required\"}]}"
}
```

### Create a draft email
```json
{
  "parentUrl": "/me/messages",
  "jsonBody": "{\"subject\":\"Project update\",\"body\":{\"contentType\":\"HTML\",\"content\":\"<p>Here is the latest update...</p>\"},\"toRecipients\":[{\"emailAddress\":{\"address\":\"manager@example.com\"}}]}"
}
```

### Create a Planner task
```json
{
  "parentUrl": "/planner/tasks",
  "jsonBody": "{\"planId\":\"{planId}\",\"title\":\"Update client list\"}"
}
```
