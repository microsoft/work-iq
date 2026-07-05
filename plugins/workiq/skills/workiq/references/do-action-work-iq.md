# do_action

POST a WorkIQ action — a named operation that performs a task (send mail, copy/move messages, accept/decline a meeting, compute free/busy) rather than creating a resource.

> **📘 Action body shapes live here.** This file is the source of truth for action `jsonBody` shapes. You can also call `get_schema` with `operationType: "action"` to retrieve the schema directly.

> **⚠️ Writes execute immediately.** `/me/sendMail`, `/forward`, `/accept`, `/decline`, `/permanentDelete`, and similar verbs are immediate and visible to others (or unrecoverable). **Summarize the action (recipients, subject, body, target) and get explicit user confirmation before invoking.** Never auto-send drafts or auto-respond to meeting invites.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `actionUrl` | string | Yes | Action path, server-relative (`/me/sendMail`, `/me/messages/{id}/copy`). Start with `/`, no scheme or authority. URL-encode special characters. |
| `jsonBody` | object \| string | No | Action parameters as a JSON object (`{"comment":"FYI"}`) or a JSON-encoded string. Some actions take no body. |

## When to Use

- Send mail (vs. creating a draft) — `/me/sendMail`, `/me/messages/{id}/send`
- Accept / decline / tentatively accept a meeting — `/me/events/{id}/{accept|decline|tentativelyAccept}`
- Copy or move a message — `/me/messages/{id}/{copy|move}`
- Forward or reply — `/me/messages/{id}/{forward|reply}`
- Compute free/busy across multiple users — `/me/calendar/getSchedule`
- React to a Teams message — `/chats/{chatId}/messages/{messageId}/setReaction`
- Set the user's Teams presence — `/me/presence/setUserPreferredPresence`
- Initiate a large file upload session — `/me/drive/.../createUploadSession`
- Subscribe to change notifications

Vs. `create_entity`: use `do_action` for verbs (send, copy, move, accept, reply, getSchedule); use `create_entity` to create a new stored resource. Function-shaped names that still take a JSON body (`getSchedule`, `findMeetingTimes`) are actions — POST them here.

## Examples

### Send an email immediately
```json
{
  "actionUrl": "/me/sendMail",
  "jsonBody": "{\"message\":{\"subject\":\"Hello\",\"body\":{\"contentType\":\"Text\",\"content\":\"Just checking in.\"},\"toRecipients\":[{\"emailAddress\":{\"address\":\"colleague@example.com\"}}]},\"saveToSentItems\":true}"
}
```

### Send a previously created draft
```json
{ "actionUrl": "/me/messages/{id}/send" }
```

### Copy a message to another folder
```json
{
  "actionUrl": "/me/messages/{id}/copy",
  "jsonBody": "{\"destinationId\":\"archive\"}"
}
```

### Move a message to a folder
```json
{
  "actionUrl": "/me/messages/{id}/move",
  "jsonBody": "{\"destinationId\":\"inbox\"}"
}
```

### Accept a meeting invitation
```json
{
  "actionUrl": "/me/events/{id}/accept",
  "jsonBody": "{\"comment\":\"See you there!\",\"sendResponse\":true}"
}
```

### Decline a meeting invitation
```json
{
  "actionUrl": "/me/events/{id}/decline",
  "jsonBody": "{\"comment\":\"Conflict — will catch up on recording.\",\"sendResponse\":true}"
}
```

### Forward a message
```json
{
  "actionUrl": "/me/messages/{id}/forward",
  "jsonBody": "{\"comment\":\"FYI\",\"toRecipients\":[{\"emailAddress\":{\"address\":\"teammate@example.com\"}}]}"
}
```

### Reply to a message
```json
{
  "actionUrl": "/me/messages/{id}/reply",
  "jsonBody": "{\"comment\":\"Thanks for the update!\"}"
}
```

### Get free/busy availability for multiple users (`getSchedule`)
```json
{
  "actionUrl": "/me/calendar/getSchedule",
  "jsonBody": "{\"schedules\":[\"adelev@contoso.com\",\"meganb@contoso.com\"],\"startTime\":{\"dateTime\":\"2024-06-03T09:00:00\",\"timeZone\":\"Pacific Standard Time\"},\"endTime\":{\"dateTime\":\"2024-06-03T18:00:00\",\"timeZone\":\"Pacific Standard Time\"},\"availabilityViewInterval\":60}"
}
```

`availabilityViewInterval` is optional minutes (default 30, min 5, max 1440). `schedules` is a string array of SMTP addresses (users, distribution lists, rooms, or equipment).

### Set my Teams presence to Busy
```json
{
  "actionUrl": "/me/presence/setUserPreferredPresence",
  "jsonBody": "{\"availability\":\"Busy\",\"activity\":\"Busy\",\"expirationDuration\":\"PT1H\"}"
}
```

Use `setUserPreferredPresence` for user requests ("set me to Busy"). The `setPresence` action is the application-session variant and requires a `sessionId` — don't fall back to it without one.

### React to a Teams chat message
```json
{
  "actionUrl": "/chats/{chatId}/messages/{messageId}/setReaction",
  "jsonBody": "{\"reactionType\":\"like\"}"
}
```

For channel messages use the `/teams/{teamId}/channels/{channelId}/messages/{messageId}/setReaction` path. See `references/teams-work-iq.md` for chat-vs-channel resolution.

### Initiate a large file upload session
```json
{
  "actionUrl": "/me/drive/root:/Projects/big-file.zip:/createUploadSession",
  "jsonBody": "{\"item\":{\"@microsoft.graph.conflictBehavior\":\"replace\"}}"
}
```

The response returns an `uploadUrl` you can PUT chunks to. **However, this skill does not expose a binary-upload tool** — see the deny rule in `SKILL.md`. Surface the `uploadUrl` to the user so they can complete the upload themselves; do not attempt to PUT bytes from inside the model.

## Common failures (do not retry)

`do_action` failures from Microsoft Graph are almost always permanent on the same payload. **Do not retry the same call** after any of these — repeated identical POSTs return the exact same error and burn tool budget without producing new information.

| HTTP / code | Meaning | Action |
|---|---|---|
| `403` + `"Missing scope permissions"` | The signed-in user has not consented to the Graph scope this action needs (e.g. `Presence.ReadWrite` for `/me/presence/setPresence`, `Mail.Send` for `/me/sendMail`, `Calendars.ReadWrite` for `/me/events/{id}/accept`). | Stop. Tell the user the consent is missing and identify the missing scope from the error body. See [`troubleshooting.md`](troubleshooting.md#http-403-forbidden-on-an-entity-tool-call). |
| `403` + empty / generic `Forbidden` | Tenant policy or admin-controlled action (e.g. presence write in a managed tenant, send-as another mailbox). The body has no scope hint because the directory denied the call before scope evaluation. | Stop. Tell the user the operation is policy-denied. Do NOT iterate through sibling action verbs (`setUserPreferredPresence` ↔ `setPresence`) — they share the same policy gate. |
| `400` / `BadRequest` on the body | The `jsonBody` wrapper shape is wrong (e.g. `sendMail` expects `{Message, SaveToSentItems}`, not a raw `Message`). | Stop. Re-read this file's JSON sample for that action; do not re-send the same body. |
| `404` on `actionUrl` | The entity ID embedded in the path is stale, or the action verb does not exist on this resource family. | Stop. Re-`fetch` to get the current ID, OR re-check `search_paths` for the right action verb. |

**Especially for `/me/presence/*`:** if the first `setPresence` or `setUserPreferredPresence` POST returns 403, the second will too. Both verbs share the `Presence.ReadWrite[.All]` scope gate. Stop after one 403, surface the failure, and identify the missing consent scope if the error body names one.
