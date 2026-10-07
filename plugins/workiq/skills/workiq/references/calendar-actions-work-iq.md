# Meeting actions

## Required before use

- [calendar-base-work-iq](calendar-base-work-iq.md)
- [mutation-work-iq](mutation-work-iq.md)

## Known endpoint recipes

Call counts below describe an unambiguous, authorized happy path, not a hard limit.
Identity, required confirmation, supported paging and requested completeness take
precedence. Endpoint query restrictions and payload shapes remain binding.

| Request | Example | Contract |
| --- | --- | --- |
| Tentatively accepting a meeting by title | "Mark the Office hours sync as tentative" | `fetch` the exact event ID, then `do_action` `/me/events/{id}/tentativelyAccept` with `{"sendResponse":false}`. Do not include an empty `comment`; do not call `get_schema` for this known contract. |
| Declining a meeting by title without a response message | "Decline the upcoming Daily standup invite" | `fetch` the exact event ID, then `do_action` `/me/events/{id}/decline` with `{"sendResponse":false}`. Omit `comment`; do not call `get_schema` or retry alternate payloads. |
| Cancelling an organizer-owned meeting by title | "Cancel the Friday staff meeting I organized" | `fetch` the exact event ID, then `do_action` `/me/events/{id}/cancel` with `{"Comment":""}`. This is a known contract: do not call `search_paths` or `get_schema`. A `202` response confirms acceptance; do not fetch again solely to verify. |
| Forwarding a calendar invite by title | "Forward the Sprint Planning invite to Casey Foster" | Use one batched `fetch` to resolve both the exact event (`/me/events?$filter=subject%20eq%20'{odataEscapedAndUrlEncodedSubject}'&$select=id,subject,start,end,organizer,attendees,isOrganizer&$top=10`) and the exact recipient (`/users?$filter=displayName%20eq%20'{odataEscapedAndUrlEncodedDisplayName}'&$select=id,displayName,mail,userPrincipalName&$top=5`). Copy the returned event `id` verbatim, including any trailing `=`, and call `do_action` `/me/events/{eventId}/forward` with `{"ToRecipients":[{"emailAddress":{"name":"{displayName}","address":"{mailOrUserPrincipalName}"}}],"Comment":""}`. This is a known contract: skip `get_schema`, `calendarView`, mail lookup, `ask`, and verification fetches; do not rewrite `=` as `%3D` or retry encoded ID variants. |

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
