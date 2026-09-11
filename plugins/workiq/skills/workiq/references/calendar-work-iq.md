# Calendar and meeting contracts

Exact events, calendar windows, reminders, and free/busy use entity tools, not
semantic retrieval preflights. Use [retrieval](retrieve-work-iq.md) for open-ended
meeting evidence and [ask](ask-work-iq.md) only for intentional delegation.

## Shared prerequisites and provenance

Routes and labeled inherited payloads below come from baseline guidance, not
new live endpoint validation. Illustrative query field sets and unvalidated
payload details require the connected [schema](get-schema-work-iq.md) or an
explicit limitation; do not invent an endpoint or universalize example casing.

Resolve the calendar/mailbox, exact event, organizer/attendee role, and requested
occurrence versus series. A subject is not a unique event ID. Use a bounded
date window or supplied exact ID, retain returned IDs without reconstruction or
blind double encoding, and disambiguate repeated titles before any action.

Resolve dates, timezone, and DST offsets at runtime. "Today" is the user's local
day, "rest of workday" is now through their actual workday end, and "next 24
hours" is a rolling 24-hour interval. These are not equivalent. Obtain real
work hours from supplied or supported authoritative settings; never guess 9–5.
Outside those hours or on a non-working day, do not turn "rest of workday" into
tomorrow's schedule silently; report no remaining working interval or clarify.
If the necessary zone, hours, or series intent is missing, clarify or state the
limitation rather than silently selecting it.

For every mutation, prepare the precise effect and obtain required confirmation
before executing once. Applicable prior confirmation may cover that specific
action. The [central recovery policy](troubleshooting.md) overrides call budgets:
denial stops, ambiguous writes are not replayed, and `202` is accepted/pending,
not completed. A supported read can reconcile state without proving causality.

## Ordinary calendar windows

- **Intent/prerequisites:** list events in a resolved start/end window and
  timezone, including the appropriate recurrence instances.
- **Operation/query:** `fetch` the ordinary calendar view, not delta. Confirm
  the selected fields against the deployed read schema before using this
  illustrative field set; omit unsupported options without inventing values:

```json
{
  "entityUrls": [
    "/me/calendarView?startDateTime={encodedStartWithOffset}&endDateTime={encodedEndWithOffset}&$select=id,subject,start,end,organizer,attendees,isOrganizer,isAllDay,isCancelled,type,seriesMasterId&$top=50"
  ]
}
```

- **Effects/completion:** read-only. Select only fields supported by the deployed
  endpoint, follow returned pages for the requested coverage, and compare actual
  instants after timezone conversion. Do not assume the response is sorted.
- **Scope/failures:** `/me/calendarView` does not prove coverage of every shared
  or secondary calendar. Resolve requested calendars and their supported view
  paths explicitly; if unavailable, report coverage rather than treating the
  default view as equivalent. Follow [fetch recovery](fetch-work-iq.md), never
  bypass a denied calendar through another tool.

## Next event, latest meeting, and exact comparisons

- **Next event:** fetch an appropriate future calendar window. Exclude cancelled
  instances; compare actual `start` instants and sort ascending locally if
  server ordering is unavailable. Do not choose by creation/modification time.
  Distinguish an already-running event from the next starting event. Handle
  all-day events explicitly: include them for a general calendar listing, but
  do not treat local midnight as the next timed meeting without explaining it.
  Use occurrence/exception instances, not a recurrence master as the next event.
  A capped page cannot prove the earliest event if ordering/coverage is unknown.
- **Latest meeting with a person:** resolve their actual address, read bounded
  past candidates with `subject,start,end,body,bodyPreview,attendees,organizer`,
  filter to supported participant matches, then sort start descending. Explain
  the selected agenda from its body; missing details stay unknown.
- **People in two exact events:** batch `fetch` for supplied exact event paths
  selecting supported organizer/attendee fields. Build each people set from
  organizer plus attendees, compare addresses case-insensitively, and report
  intersection and non-overlaps without unrelated directory enrichment.

These are read-only local calculations. An empty complete window means no
matching event in that window; incomplete reads mean an incomplete answer, not
"no upcoming events." No semantic lookup or calendar mutation is needed.

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

## Reminders

- **Intent/prerequisites:** determine today, remaining workday, or rolling
  24-hour window using the rules above. Establish requested calendar coverage.
- **Operation/query:** `call_function`, not `fetch`. The inherited candidate
  syntax is `/me/reminderView(startDateTime='...',endDateTime='...')`.
  Confirm the deployed GET function's live path and inline parameter syntax
  with `get_schema` (and focused `search_paths` if necessary) before using
  unvalidated details; URL-encode resolved timestamp values once. No body.
- **Effects/completion:** read-only reminders, not a meeting listing. Interpret
  only returned reminder fields and documented boundaries.
- **Coverage/failures:** actual multi-calendar reminder coverage is **unverified**
  by these examples. Disclose that limitation; never claim the default calendar
  listing or a single reminder function is equivalent to reminders across all
  calendars. Do not invent per-calendar reminder paths. If the required
  coverage cannot be established, report that rather than silently substituting
  ordinary events. Denials stop; read transient recovery stays bounded.

## Find a common free/busy slot

- **Intent/prerequisites:** resolve a complete roster of schedulable addresses,
  a date window, duration, timezone, and real working hours. A supplied roster
  takes precedence over assumptions about "my team." If the intended team is
  the management team, batch `/me` and `/me/manager`, then fetch the manager's
  `/users/{managerId}/directReports` and necessary pages. Explicitly state that
  roster scope; do not silently equate it with every project team.
- Preserve the requester and all required participants, deduplicate addresses,
  and use returned supported mail/UPN identity. A missing address or
  unschedulable participant is unresolved, not permission to drop them.
- **Operation/body:** `do_action` `/me/calendar/getSchedule` is **read-only**
  free/busy computation despite POST. The inherited template below uses
  operation-specific casing; follow the live action schema if it differs.

```json
{
  "actionUrl": "/me/calendar/getSchedule",
  "jsonBody": {
    "Schedules": ["{resolvedAddress1}", "{resolvedAddress2}"],
    "StartTime": {"dateTime": "{resolvedWindowStart}", "timeZone": "{resolvedTimeZone}"},
    "EndTime": {"dateTime": "{resolvedWindowEnd}", "timeZone": "{resolvedTimeZone}"},
    "AvailabilityViewInterval": 30
  }
}
```

- **Effects/confirmation:** this reads availability; it does not book a meeting
  and does not require mutation confirmation merely because the tool is
  `do_action`. Booking requires a separate requested, prepared, confirmed action.
- **Completion:** check every requested schedule for errors/missing results.
  Use documented availability states and returned work-hours fields when
  available, otherwise explicitly supplied authoritative hours. Convert each
  participant's working hours correctly; calculate the earliest contiguous
  interval long enough for the requested duration that is free and within
  working hours for everyone. Unknown availability is not free.
- **Failures/limits:** honor documented limits on addresses and windows with
  supported focused batches if necessary; combine every participant's result.
  No guessed business hours, dropped addresses, or single-page completeness
  claims. Report partial coverage when any schedule/hours cannot be established.
  Do not substitute `findMeetingTimes` or create an event to "verify" a slot.

## Explicit calendar delta

Only an explicit structured change-tracking request uses calendar delta through
[call_function](call-function-work-iq.md). Initial sync starts the supported
`/me/calendarView/delta` with a resolved start/end window. Resume the exact saved
delta link and its original window; without a prior checkpoint, do not claim
historical changes "since yesterday." An ordinary calendar question stays on
`fetch`; an open-ended project catch-up stays on the retrieval route.
