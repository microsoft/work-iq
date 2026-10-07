# Meeting actions

## Required before use

- [calendar-base-work-iq](calendar-base-work-iq.md)
- [mutation-work-iq](mutation-work-iq.md)

## Cancel, decline, accept, or delete

| Intent | Prerequisites and operation | Inherited body / schema gate | Effects and completion |
|---|---|---|---|
| Cancel a meeting the user organized | Verify `isOrganizer`; `do_action` `/me/events/{eventId}/cancel` | `{"Comment":""}` for the inherited no-comment case; use supported schema for other options | Cancellation can notify attendees; `202` is accepted/pending, not proof all recipients processed it |
| Decline an invitation | Confirm attendee role, event/occurrence, and response preference; `do_action` `/me/events/{eventId}/decline` | `{"sendResponse":false}` only when no response was requested; omit an empty `comment` | Declines participation; not organizer cancellation |
| Tentatively accept | Confirm invitation/occurrence and response preference; `do_action` `/me/events/{eventId}/tentativelyAccept` | Inherited no-response body `{"sendResponse":false}` | Changes participation; a response is sent only as authorized and supported |
| Accept | Confirm invitation/occurrence and response preference; `do_action` `/me/events/{eventId}/accept` | Inherited response body `{"comment":"{confirmedComment}","sendResponse":true}`; other options require the supported action schema | Changes participation and potentially notifies organizer |
| Delete a calendar event | Confirm deletion scope and organizer/attendee effects; `delete_entity` `/me/events/{eventId}` | No body; required conditional headers only when supported | Deletion is not interchangeable with decline or cancellation; establish notification implications before execution |

Preserve inherited `Comment` on cancel; this does not establish parameter casing
for other actions. Do not silently convert "cancel my meeting" into an attendee
decline or delete. Missing role/scope requires clarification. For definitive final
success, report only the effect supported by that response. For ambiguous status,
use a supported reconciliation read or report outcome unknown, never replay.

The inherited decline-with-response variant uses
`{"comment":"{confirmedComment}","sendResponse":true}` on the same decline
action. Use it only when that response/comment is authorized; do not silently
replace the requested no-response variant.


## Forward an invitation

- **Intent/prerequisites:** forward the exact calendar invite to an exact
  resolved recipient. Verify event identity and forwarding permissions; resolve
  duplicate recipient names. Event and directory lookups can share a `fetch`
  batch when independent. Obtain required confirmation of recipient and comment.
- **Operation/body:** forward the **event**, not a mail message:

```json
{
  "actionUrl": "/me/events/{eventId}/forward",
  "jsonBody": {
    "ToRecipients": [
      {"emailAddress": {"name": "{resolvedDisplayName}", "address": "{resolvedAddress}"}}
    ],
    "Comment": ""
  }
}
```

- **Effects/completion:** `do_action` sends the invitation forward. `ToRecipients`
  and `Comment` are inherited casing for this recipe only. Acceptance is not
  delivery confirmation; report the returned final/accepted/pending state.
- **Failures:** do not switch to mail forwarding, change recipients, or replay an
  ambiguous request. A restriction on forwarding remains a stop.


## Create or edit event details

- **Intent/prerequisites:** resolve the target calendar, requested subject,
  actual start/end timezone, and any attendee addresses. Confirm the prepared
  event and invitation effects; availability discovery is not permission to book.
- **Operation/body:** `create_entity` on `/me/events` for the inherited personal
  calendar example below. Replace all placeholders with confirmed values; inspect
  unfamiliar options or a different calendar's create schema before use.

```json
{
  "parentUrl": "/me/events",
  "jsonBody": {
    "subject": "{confirmedSubject}",
    "start": {"dateTime": "{confirmedStart}", "timeZone": "{confirmedTimeZone}"},
    "end": {"dateTime": "{confirmedEnd}", "timeZone": "{confirmedTimeZone}"},
    "attendees": [
      {"emailAddress": {"address": "{resolvedAttendeeAddress}"}, "type": "required"}
    ]
  }
}
```

- For an explicitly requested subject/location edit, resolve the exact existing
  event and occurrence/series scope, then use `update_entity` on
  `/me/events/{eventId}` with the inherited body
  `{"subject":"{confirmedSubject}","location":{"displayName":"{confirmedLocation}"}}`.
  Omit fields the user did not ask to change.
- **Effects/completion/failures:** creation persists an event and can send
  invitations; editing can notify attendees. Obtain required confirmation before
  either operation. Preserve the returned event ID and report only observed
  success, accepted/pending, or unknown state. Neither event creation nor update
  proves attendees accepted. Do not replay ambiguous creation/update or replace
  an existing event with a new one to work around a failed edit.


## Reschedule an event

- **Intent/prerequisites:** confirm organizer authority and whether the request
  changes one occurrence/exception or the whole recurring series. Resolve the
  corresponding authoritative event ID; do not replace an occurrence ID with
  its series master automatically.
- **Operation/body:** `update_entity` on the resolved `/me/events/{eventId}`.
  Inspect its `operationType: "update"` schema for supported `start` and `end`
  dateTime/timeZone structures and required headers. This refactor does not
  establish a newly live-validated reschedule payload.
- **Prepare/confirm:** compute both new start and end in the resolved timezone;
  retain the duration unless the user requests a new duration. Validate end
  after start, DST ambiguity, all-day semantics, recurrence bounds, and possible
  attendee notifications. Show both times and occurrence/series scope.
- **Effects/completion/failures:** execute the confirmed update once. Report the
  supported result, not that invitees accepted the change. Reconcile 412 with
  current state and renewed confirmation if the change differs; do not retry
  timeout/null blindly or delete/create to simulate a reschedule.
