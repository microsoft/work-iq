# Calendar delta

## Required before use

- [calendar-base-work-iq](calendar-base-work-iq.md)
- [call-function-work-iq](call-function-work-iq.md)

## Explicit calendar delta

Only an explicit structured change-tracking request uses calendar delta through
[call_function](call-function-work-iq.md). Initial sync starts the supported
`/me/calendarView/delta` with a resolved start/end window. Resume the exact saved
delta link and its original window; without a prior checkpoint, do not claim
historical changes "since yesterday." An ordinary calendar question stays on
`fetch`; an open-ended project catch-up stays on the retrieval route.
