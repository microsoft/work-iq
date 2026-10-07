# Calendar windows

## Required before use

- [calendar-base-work-iq](calendar-base-work-iq.md)

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
