# Calendar responses, updates, cancellation, forwarding, and deletion

Use this reference for acting on an existing event: RSVP, cancel, forward, reschedule, add a Teams link, update location/body/attendees, resolve conflicts, and delete blocks/events.

## Resolve first

For every mutation:

1. Resolve timezone.
2. Fetch the target event with a bounded `/me/calendarView` or `/me/events` query.
3. If multiple candidates match, ask the user to choose.
4. Preview the resolved subject and actual time before writing.
5. Execute only after confirmation.

Common fetch:

```text
/me/calendarView?startDateTime={windowStart}&endDateTime={windowEnd}&$select=id,subject,start,end,organizer,attendees,location,bodyPreview,body,isOnlineMeeting,onlineMeeting,onlineMeetingUrl,responseStatus,showAs,isAllDay,webLink,isCancelled&$orderby=start/dateTime%20asc&$top=50
```

## RSVP actions

Use `workiq-do_action`; these notify the organizer when `sendResponse` is true.

```json
{ "actionUrl": "/me/events/{eventId}/accept", "jsonBody": { "comment": "", "sendResponse": true } }
{ "actionUrl": "/me/events/{eventId}/decline", "jsonBody": { "comment": "", "sendResponse": true } }
{ "actionUrl": "/me/events/{eventId}/tentativelyAccept", "jsonBody": { "comment": "", "sendResponse": true } }
```

Fetch first. Do not call an RSVP action with a guessed ID.

## Cancel organizer-owned meetings

Use `workiq-do_action` on the resolved event:

```json
{ "actionUrl": "/me/events/{eventId}/cancel", "jsonBody": { "comment": "Canceled." } }
```

Warn that attendees will be notified. If the user asks to remove a personal block from their own calendar, use delete instead.

## Forward an invite

Resolve the event and recipient, confirm, then use the event forward action:

```json
{
  "actionUrl": "/me/events/{eventId}/forward",
  "jsonBody": {
    "comment": "Forwarding this invite.",
    "toRecipients": [{ "emailAddress": { "address": "casey@example.com", "name": "Casey Foster" } }]
  }
}
```

If the action body is rejected, call `workiq-get_schema` with `operationType: "action"` on `/me/events/{eventId}/forward` and retry once with the corrected body. Do not substitute the event update schema for the action body.

## Reschedule or move an event

Patch `start` and `end` together; preserve duration unless the user asks otherwise.

```json
{
  "entityUrl": "/me/events/{eventId}",
  "jsonBody": {
    "start": { "dateTime": "2026-08-14T16:00:00", "timeZone": "Pacific Standard Time" },
    "end": { "dateTime": "2026-08-14T16:30:00", "timeZone": "Pacific Standard Time" }
  }
}
```

For conflict resolution, fetch both events, compute the first non-overlapping later slot for the event the user told you to move, then patch that event.

## Update location

```json
{
  "entityUrl": "/me/events/{eventId}",
  "jsonBody": { "location": { "displayName": "Conf Room Suzhou-SIP-B25/F82" } }
}
```

Confirm the returned location before reporting success.

## Update invite body or agenda

Fetch the existing body when preserving content matters. Patch the `body` field and include the requested marker/text.

```json
{
  "entityUrl": "/me/events/{eventId}",
  "jsonBody": {
    "body": { "contentType": "HTML", "content": "<p>[WorkIQ Eval Test] Agenda...</p>" }
  }
}
```

Do not claim the agenda was added unless the update response or a follow-up read shows the body contains it.

## Add an online meeting link

Patch the existing event:

```json
{
  "entityUrl": "/me/events/{eventId}",
  "jsonBody": { "isOnlineMeeting": true, "onlineMeetingProvider": "teamsForBusiness" }
}
```

Report the returned online-meeting state and join link/provider when present. If the schema rejects provider fields, inspect `/me/events/{eventId}` with `operationType: "update"` and retry once with supported fields.

## Delete an event or block

Use `workiq-delete_entity` after resolving the exact event:

```json
{ "entityUrl": "/me/events/{eventId}" }
```

Use for "delete", "remove", "drop", "old focus block", "placeholder", and duplicate cleanup. For duplicate deletes, fetch all matches first and identify which one is the extra copy. Event deletion may send cancellation notices if the user organized a meeting; call that out in confirmation.

## Notify someone a meeting was cancelled

If the request is only to notify a person, not cancel the event, route to a send-mail action after confirmation:

```json
{
  "actionUrl": "/me/sendMail",
  "jsonBody": {
    "message": {
      "subject": "Meeting cancelled: <subject>",
      "body": { "contentType": "Text", "content": "<message>" },
      "toRecipients": [{ "emailAddress": { "address": "person@example.com" } }]
    },
    "saveToSentItems": true
  }
}
```

Use [`mail`](../../mail/SKILL.md) for richer mail drafting/replying workflows.
