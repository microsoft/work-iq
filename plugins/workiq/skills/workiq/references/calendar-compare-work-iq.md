# Calendar selection and comparisons

## Required before use

- [calendar-base-work-iq](calendar-base-work-iq.md)
- [calendar-read-work-iq](calendar-read-work-iq.md)

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
