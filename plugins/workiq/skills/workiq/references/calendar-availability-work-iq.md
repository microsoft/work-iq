# Free/busy availability

## Required before use

- [calendar-base-work-iq](calendar-base-work-iq.md)

## Find a common free/busy slot

- **Intent/prerequisites:** resolve a complete roster of schedulable addresses,
  a date window, duration, timezone, and real working hours. A supplied roster
  takes precedence over an inferred group. Resolve an unspecified group from
  an agreed definition, such as a supplied roster or a requested directory
  hierarchy under [people guidance](people-work-iq.md). That guide does not define
  group membership: use a known supported membership contract for another group,
  or clarify its roster rather than inventing a path. Clarify an ambiguous
  group rather than silently choosing the requester's or manager's reports.
  State the roster definition and follow supported pages for required coverage.
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
