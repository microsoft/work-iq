# Free/busy availability

## Required before use

- [calendar-base-work-iq](calendar-base-work-iq.md)

## Known endpoint recipes

Call counts below describe an unambiguous, authorized happy path, not a hard limit.
Identity, required confirmation, supported paging and requested completeness take
precedence. Endpoint query restrictions and payload shapes remain binding.

| Request | Example | Contract |
| --- | --- | --- |
| Finding a 30-minute slot for the whole team | "Find a 30-min slot when the whole team is free this week" | Do not use `ask`. Resolve `/me`, `/me/manager`, and the manager's `/users/{managerId}/directReports` with at most two `fetch` calls, then call `do_action` `/me/calendar/getSchedule` exactly once with all schedulable addresses and `AvailabilityViewInterval: 30`. Compute the earliest common working-hours slot from that response; skip `search_paths`, `get_schema`, `findMeetingTimes`, and a second verification action. |

### Get free/busy availability for multiple users (`getSchedule`)
```json
{
  "actionUrl": "/me/calendar/getSchedule",
  "jsonBody": "{\"schedules\":[\"adelev@contoso.com\",\"meganb@contoso.com\"],\"startTime\":{\"dateTime\":\"2024-06-03T09:00:00\",\"timeZone\":\"Pacific Standard Time\"},\"endTime\":{\"dateTime\":\"2024-06-03T18:00:00\",\"timeZone\":\"Pacific Standard Time\"},\"availabilityViewInterval\":60}"
}
```

`availabilityViewInterval` is optional minutes (default 30, min 5, max 1440). `schedules` is a string array of SMTP addresses (users, distribution lists, rooms, or equipment).

#### Find a 30-minute slot for my whole team

This is a structured calendar calculation, not semantic synthesis. Do not call
`ask`, `search_paths`, `get_schema`, or `findMeetingTimes`.

1. Resolve the roster with at most two `fetch` calls:
   - Fetch `/me?$select=id,displayName,mail,userPrincipalName` and
     `/me/manager?$select=id,displayName,mail,userPrincipalName` together.
   - Fetch `/users/{managerId}/directReports?$select=id,displayName,mail,userPrincipalName`.
   - Treat the manager plus those direct reports as the whole team. Keep one
     non-empty `mail` or `userPrincipalName` per person and remove duplicates.
2. Call `/me/calendar/getSchedule` exactly once for the remaining working-time
   window this week. Use `AvailabilityViewInterval: 30`.
3. Find the earliest working-hours interval whose corresponding availability
   view is free for every returned schedule. Do not make a second action call
   solely to verify the chosen interval.

```json
{
  "actionUrl": "/me/calendar/getSchedule",
  "jsonBody": {
    "Schedules": ["manager@contoso.com", "member1@contoso.com"],
    "StartTime": {"dateTime": "YYYY-MM-DDT09:00:00", "timeZone": "China Standard Time"},
    "EndTime": {"dateTime": "YYYY-MM-DDT17:00:00", "timeZone": "China Standard Time"},
    "AvailabilityViewInterval": 30
  }
}
```

Replace each `YYYY-MM-DD` with the current remaining-workweek boundary at
runtime; never reuse a literal date from this example.
