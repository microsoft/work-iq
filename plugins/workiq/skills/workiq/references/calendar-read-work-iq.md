# Calendar windows

## Required before use

- [calendar-base-work-iq](calendar-base-work-iq.md)

## Ordinary calendar windows

Resolve start/end and timezone, including requested recurrence instances.
`fetch` the ordinary view, not delta. Verify the deployed read schema supports
this illustrative field set; omit unsupported options, never invent values:

```json
{
  "entityUrls": [
    "/me/calendarView?startDateTime={encodedStartWithOffset}&endDateTime={encodedEndWithOffset}&$select=id,subject,start,end,organizer,attendees,isOrganizer,isAllDay,isCancelled,type,seriesMasterId&$top=50"
  ]
}
```

Read-only: follow pages for requested coverage and compare actual instants
after timezone conversion; do not assume sorted results. `/me/calendarView`
does not cover every shared/secondary calendar. Resolve each requested calendar's
supported view, or report unavailable coverage. Never substitute the default
view or bypass a denied calendar; apply the entrypoint's recovery rules.

## Named event lookup

A known event ID uses its exact entity read directly, without search.
Otherwise resolve the calendar and a bounded date window from the request or
trusted context; clarify missing scope rather than silently widening it. Use the
view above and match returned subject, participants and time locally.
A title alone is not unique; disambiguate matching events before a mutation.
Do not copy mail's `$search` pattern to events unless the live contract supports
it. Use supported recurrence fields such as `type` and `seriesMasterId`, not
invented recurrence flags. Apply the always-loaded
[query contract](../SKILL.md#read-results-and-queries).
