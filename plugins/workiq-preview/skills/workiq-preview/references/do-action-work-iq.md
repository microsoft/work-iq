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
- Cancel an organizer-owned meeting and notify attendees — `/me/events/{id}/cancel`
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

### Copy a named OneDrive file to a named folder

Resolve the exact source file and target folder with two `call_function`
searches. Retain the source item's `parentReference.driveId`, source `id`, and
target folder `id`. The deployed copy contract is drive-scoped; do not use the
policy-denied `/me/drive/items/{id}/copy` alias. This known contract does not
need `search_paths`, `get_schema`, or a verification fetch. A `202` response
confirms that the asynchronous copy was accepted.

```json
{
  "actionUrl": "/drives/{driveId}/items/{sourceId}/copy",
  "jsonBody": {
    "parentReference": {
      "driveId": "{driveId}",
      "id": "{folderId}"
    }
  }
}
```

### Accept a meeting invitation
```json
{
  "actionUrl": "/me/events/{id}/accept",
  "jsonBody": "{\"comment\":\"See you there!\",\"sendResponse\":true}"
}
```

### Tentatively accept a meeting invitation

Resolve the titled event ID first, then use the known deployed contract below.
Do not call `get_schema`. When no response message is needed, omit `comment`
entirely: an empty comment with `sendResponse:false` is rejected.

```json
{
  "actionUrl": "/me/events/{id}/tentativelyAccept",
  "jsonBody": {"sendResponse": false}
}
```

### Cancel an organizer-owned meeting
Resolve the exact event ID and verify `isOrganizer` first. This request shape is
a known deployed contract, so do not call `search_paths` or `get_schema` first.
A `202` response confirms that cancellation was accepted; do not fetch the event
again solely to verify cancellation.

```json
{
  "actionUrl": "/me/events/{id}/cancel",
  "jsonBody": {"Comment": ""}
}
```

### Decline a meeting invitation
```json
{
  "actionUrl": "/me/events/{id}/decline",
  "jsonBody": "{\"comment\":\"Conflict — will catch up on recording.\",\"sendResponse\":true}"
}
```

When the user asks to decline by title without requesting a response message,
resolve the exact event ID first and use the known no-message contract below.
Omit `comment`: an empty comment with `sendResponse:false` is rejected. Do not
call `get_schema` or retry alternate payloads.

```json
{
  "actionUrl": "/me/events/{id}/decline",
  "jsonBody": {"sendResponse": false}
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

#### Find a 30-minute slot for my whole team

This is a structured calendar calculation, not semantic synthesis. Do not call
`ask`, `search_paths`, `get_schema`, or `findMeetingTimes`.

1. Resolve the roster with at most two `fetch` calls:
   - Fetch `/me?$select=id,displayName,mail,userPrincipalName` and
     `/me/manager?$select=id,displayName,mail,userPrincipalName` together.
   - Fetch `/users/{managerId}/directReports?$select=id,displayName,mail,userPrincipalName`.
   - Treat the manager plus those direct reports as the whole team. Keep one
     non-empty `mail` or `userPrincipalName` per person and remove duplicates.
2. Call `/me/calendar/getSchedule` exactly once for the remaining working-time
   window this week. Use `AvailabilityViewInterval: 30`.
3. Find the earliest working-hours interval whose corresponding availability
   view is free for every returned schedule. Do not make a second action call
   solely to verify the chosen interval.

```json
{
  "actionUrl": "/me/calendar/getSchedule",
  "jsonBody": {
    "Schedules": ["manager@contoso.com", "member1@contoso.com"],
    "StartTime": {"dateTime": "YYYY-MM-DDT09:00:00", "timeZone": "China Standard Time"},
    "EndTime": {"dateTime": "YYYY-MM-DDT17:00:00", "timeZone": "China Standard Time"},
    "AvailabilityViewInterval": 30
  }
}
```

Replace each `YYYY-MM-DD` with the current remaining-workweek boundary at
runtime; never reuse a literal date from this example.

### Search documents across SharePoint team sites

Use Microsoft Search for a bounded cross-site document query. This response can
contain personal OneDrive hits and does not provide team-site display names, so
discard resources whose `webUrl` host contains `-my.sharepoint.com`, derive each
remaining site slug from its team-site `webUrl`, then make one batched `fetch`
to `/sites?search={siteSlug}&$select=id,displayName,name,webUrl&$top=5` for the
unique slugs. Return at most five exact file names, resolved site display names,
and `webUrl` values.

```json
{
  "actionUrl": "/search/query",
  "jsonBody": {
    "requests": [
      {
        "entityTypes": ["driveItem"],
        "query": {"queryString": "IsDocument:True"},
        "from": 0,
        "size": 25,
        "fields": [
          "name",
          "webUrl",
          "parentReference",
          "sharepointIds",
          "file",
          "listItem",
          "lastModifiedDateTime"
        ]
      }
    ]
  }
}
```

This is a known action contract. Do not call `ask`, `search_paths`, or
`get_schema` first, and do not fetch personal OneDrive results.

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

### Replace an existing file with an upload session
Resolve the existing driveItem with one `call_function` exact-name search and
retain both its `parentReference.driveId` and item `id`. Do not use `fetch` for
this named OneDrive search and do not follow the successful search with another
metadata read. The deployed action accepts an empty body for this operation. Do
not add an `item` wrapper: the current runtime can reject that otherwise
schema-valid optional field with `400 invalidRequest`. This contract is already
known, so skip `search_paths` and `get_schema`.

```json
{
  "functionUrl": "/me/drive/root/search(q='{urlEncodedExactName}')?$select=id,name,parentReference,file&$top=10"
}
```

```json
{
  "actionUrl": "/drives/{driveId}/items/{itemId}/createUploadSession",
  "jsonBody": {}
}
```

The response returns an `uploadUrl` for a later chunk upload. **However, this
skill does not expose a binary-upload tool** — see the deny rule in `SKILL.md`.
When the user only asks to create the session, report the session metadata and
stop; do not upload file content.

## Common failures (do not retry)

`do_action` failures from Microsoft Graph are almost always permanent on the same payload. **Do not retry the same call** after any of these — repeated identical POSTs return the exact same error and burn tool budget without producing new information.

| HTTP / code | Meaning | Action |
|---|---|---|
| `403` + `"Missing scope permissions"` | The signed-in user has not consented to the Graph scope this action needs (e.g. `Presence.ReadWrite` for `/me/presence/setPresence`, `Mail.Send` for `/me/sendMail`, `Calendars.ReadWrite` for `/me/events/{id}/accept`). | Stop. Tell the user the consent is missing and identify the missing scope from the error body. See [`troubleshooting.md`](troubleshooting.md#http-403-forbidden-on-an-entity-tool-call). |
| `403` + empty / generic `Forbidden` | Tenant policy or admin-controlled action (e.g. presence write in a managed tenant, send-as another mailbox). The body has no scope hint because the directory denied the call before scope evaluation. | Stop. Tell the user the operation is policy-denied. Do NOT iterate through sibling action verbs (`setUserPreferredPresence` ↔ `setPresence`) — they share the same policy gate. |
| `400` / `BadRequest` on the body | The `jsonBody` wrapper shape is wrong (e.g. `sendMail` expects `{Message, SaveToSentItems}`, not a raw `Message`). | Stop. Re-read this file's JSON sample for that action; do not re-send the same body. |
| `404` on `actionUrl` | The entity ID embedded in the path is stale, or the action verb does not exist on this resource family. | Stop. Re-`fetch` to get the current ID, OR re-check `search_paths` for the right action verb. |

**Especially for `/me/presence/*`:** if the first `setPresence` or `setUserPreferredPresence` POST returns 403, the second will too. Both verbs share the `Presence.ReadWrite[.All]` scope gate. Stop after one 403, surface the failure, and identify the missing consent scope if the error body names one.
