# Calendar prerequisites and date boundaries

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


## Date-specific window boundaries

Resolve the requested local start/end dates and the user's named timezone
before constructing a calendar query. **Compute each boundary's offset on that
boundary's date. Never reuse the current session's UTC offset or assume both
boundaries share one offset.** Prefer a safe timezone-aware conversion helper
provided by the host when available; do not invent a WorkIQ conversion endpoint.

For offset-bearing URL parameters such as `calendarView.startDateTime` and
`endDateTime`, use an explicit ISO 8601 offset (or the equivalent UTC `Z` instant),
then URL-encode the complete value once. Round-trip each instant through the
requested timezone: it must reproduce the intended local date and wall time.
Do not use offset-less URL timestamps unless the live contract explicitly
establishes their interpretation.

For example, in `America/Los_Angeles`:

| Requested local boundary | Correct offset-bearing timestamp |
| --- | --- |
| November 4, 2030 at 00:00 | `2030-11-04T00:00:00-08:00` |
| November 9, 2030 at 00:00 | `2030-11-09T00:00:00-08:00` |
| November 2, 2030 at 00:00 (before the fall transition) | `2030-11-02T00:00:00-07:00` |

A November 4–9 window uses `-08:00` at both ends even if today's offset is
`-07:00`. A November 2–4 window crosses the transition and uses different
offsets at its two boundaries. Do not force local-day windows to be 24 hours.

An action body such as `getSchedule` may instead accept a local `dateTime`
paired with a supported `timeZone` identifier. Preserve that schema-defined
pair; it does not establish a timezone for a separate `calendarView` URL.
For nonexistent spring-forward or repeated fall-back wall times, clarify the
intended instant rather than silently shifting the time or choosing an occurrence.
If a required conversion cannot be established reliably, state the limitation
instead of guessing.
