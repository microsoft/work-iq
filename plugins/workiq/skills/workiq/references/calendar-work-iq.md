# Calendar

Read this reference for calendar lookups, meeting comparisons, scheduling, and
meeting actions. Use the validated task recipes below before generic discovery.
For an unfamiliar action body, inspect its live schema or the relevant section
of [do_action](do-action-work-iq.md); do not load unrelated workload references.

## Validated task recipes

| User Question Pattern | Example | Action |
|-----------------------|---------|--------|
| Listing meetings on a known date/range | "What meetings do I have Monday?" | `fetch` (`/me/calendarView`) |
| Finding a 30-minute slot for the whole team | "Find a 30-min slot when the whole team is free this week" | Do not use `ask`. Resolve `/me`, `/me/manager`, and the manager's `/users/{managerId}/directReports` with at most two `fetch` calls, then call `do_action` `/me/calendar/getSchedule` exactly once with all schedulable addresses and `AvailabilityViewInterval: 30`. Compute the earliest common working-hours slot from that response; skip `search_paths`, `get_schema`, `findMeetingTimes`, and a second verification action. |
| Finding the most recent meeting with a person and explaining its agenda | "Which candidate event was my latest meeting with Alex, and what was it about?" | Use structured `fetch`, not `ask`. Fetch bounded candidates or a calendar window with `subject,start,end,body,bodyPreview,attendees,organizer`; retain actual attendee matches, sort by start descending, and answer from the selected event body. |
| Comparing people across two exact calendar events | "Who appears in both of these two event URLs?" | Use one batched `fetch` for both exact `/me/events/{id}?$select=subject,organizer,attendees` URLs. Build each people set from organizer plus attendees, normalize by lowercase email, compute the intersection locally, and report non-overlaps. Do not use `ask`. |
| Tentatively accepting a meeting by title | "Mark the Office hours sync as tentative" | `fetch` the exact event ID, then `do_action` `/me/events/{id}/tentativelyAccept` with `{"sendResponse":false}`. Do not include an empty `comment`; do not call `get_schema` for this known contract. |
| Declining a meeting by title without a response message | "Decline the upcoming Daily standup invite" | `fetch` the exact event ID, then `do_action` `/me/events/{id}/decline` with `{"sendResponse":false}`. Omit `comment`; do not call `get_schema` or retry alternate payloads. |
| Cancelling an organizer-owned meeting by title | "Cancel the Friday staff meeting I organized" | `fetch` the exact event ID, then `do_action` `/me/events/{id}/cancel` with `{"Comment":""}`. This is a known contract: do not call `search_paths` or `get_schema`. A `202` response confirms acceptance; do not fetch again solely to verify. |
| Forwarding a calendar invite by title | "Forward the Sprint Planning invite to Casey Foster" | Use one batched `fetch` to resolve both the exact event (`/me/events?$filter=subject%20eq%20'{odataEscapedAndUrlEncodedSubject}'&$select=id,subject,start,end,organizer,attendees,isOrganizer&$top=10`) and the exact recipient (`/users?$filter=displayName%20eq%20'{odataEscapedAndUrlEncodedDisplayName}'&$select=id,displayName,mail,userPrincipalName&$top=5`). Copy the returned event `id` verbatim, including any trailing `=`, and call `do_action` `/me/events/{eventId}/forward` with `{"ToRecipients":[{"emailAddress":{"name":"{displayName}","address":"{mailOrUserPrincipalName}"}}],"Comment":""}`. This is a known contract: skip `get_schema`, `calendarView`, mail lookup, `ask`, and verification fetches; do not rewrite `=` as `%3D` or retry encoded ID variants. |


## Resolve then act

After required confirmation and target resolution, complete the requested action; a preparatory lookup alone is not completion.

| User request | Step 1: resolve | Step 2: act (required) |
|---|---|---|
| "Cancel the X meeting I organized" | `fetch` to find the event and verify `isOrganizer` | `do_action` `/me/events/{id}/cancel` with `{"Comment":""}`; accept `202` as success without a verification fetch |
