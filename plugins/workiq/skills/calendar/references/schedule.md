# Calendar scheduling and event creation

Use this reference for creating calendar events: normal meetings, all-day events, focus blocks, recurring 1:1s, tentative holds, and create-after-availability flows.

## Creation workflow

1. Resolve the user's timezone first from the runtime-supplied current date/time offset.
2. Expand relative dates/times into explicit local start/end.
3. If the user asked for attendees by name and email is not known, resolve the person before writing.
4. Preview and ask for confirmation. Creating events can send invitations.
5. After confirmation, call `workiq-create_entity` with `parentUrl: "/me/events"`.
6. Report success only from the returned event.

Use `workiq-get_schema` with `path: "/me/events", operationType: "create"` when the user explicitly asks for "right fields"/schema or when the body shape is unfamiliar. Otherwise go direct.

## Minimal event body

```json
{
  "subject": "Team Sync",
  "start": { "dateTime": "2026-08-14T15:00:00", "timeZone": "Pacific Standard Time" },
  "end": { "dateTime": "2026-08-14T15:30:00", "timeZone": "Pacific Standard Time" }
}
```

Always include `timeZone` alongside each `dateTime`.

## Attendees

```json
"attendees": [
  { "emailAddress": { "address": "casey@example.com", "name": "Casey Foster" }, "type": "required" },
  { "emailAddress": { "address": "room@example.com", "name": "Room" }, "type": "resource" }
]
```

Use exact addresses from the prompt or a prior WorkIQ resolution. Do not invent email addresses.

## All-day events

For an all-day event, use local midnight to local midnight on the following day and set `isAllDay`:

```json
{
  "subject": "[WorkIQ Eval Test] Team offsite",
  "isAllDay": true,
  "start": { "dateTime": "2026-08-20T00:00:00", "timeZone": "Pacific Standard Time" },
  "end": { "dateTime": "2026-08-21T00:00:00", "timeZone": "Pacific Standard Time" }
}
```

## Focus time / blocks

Create a normal event with the requested title and a busy state:

```json
{
  "subject": "[WorkIQ Eval Test] Focus time",
  "showAs": "busy",
  "start": { "dateTime": "2026-08-14T09:00:00", "timeZone": "Pacific Standard Time" },
  "end": { "dateTime": "2026-08-14T11:00:00", "timeZone": "Pacific Standard Time" }
}
```

If the user says "tomorrow morning" and gives no duration, choose a reasonable morning block, state it in the confirmation, and let the user correct it before writing.


## Tentative holds

When the user asks to place a tentative hold on their own calendar, create an event with `showAs: "tentative"` and no attendees unless the user names invitees:

```json
{
  "subject": "Tentative hold",
  "showAs": "tentative",
  "start": { "dateTime": "2026-08-14T15:00:00", "timeZone": "Pacific Standard Time" },
  "end": { "dateTime": "2026-08-14T15:30:00", "timeZone": "Pacific Standard Time" }
}
```

For "tentatively accept" an existing invite, do not create a hold; use the RSVP action in [`respond.md`](respond.md#rsvp-actions).

## Recurring 1:1s

Use event `recurrence` with a weekly Monday pattern and a bounded or open-ended range supported by schema. Example shape:

```json
{
  "subject": "1:1 with Casey",
  "start": { "dateTime": "2026-08-17T09:00:00", "timeZone": "Pacific Standard Time" },
  "end": { "dateTime": "2026-08-17T09:30:00", "timeZone": "Pacific Standard Time" },
  "attendees": [{ "emailAddress": { "address": "casey@example.com" }, "type": "required" }],
  "recurrence": {
    "pattern": { "type": "weekly", "interval": 1, "daysOfWeek": ["monday"] },
    "range": { "type": "noEnd", "startDate": "2026-08-17" }
  }
}
```

If the user omits time or duration, confirm a default before writing.

## Online meeting link at creation time

When creating an event that should include a Teams/online link, include online meeting fields only if supported by schema. Common body:

```json
{
  "subject": "Online review",
  "isOnlineMeeting": true,
  "onlineMeetingProvider": "teamsForBusiness",
  "start": { "dateTime": "2026-08-14T15:00:00", "timeZone": "Pacific Standard Time" },
  "end": { "dateTime": "2026-08-14T15:30:00", "timeZone": "Pacific Standard Time" }
}
```

For adding a link to an existing event, use [`respond.md`](respond.md#add-an-online-meeting-link).

## Availability then create

For "check when people are free Thursday, then create an invite":

1. Use `workiq-do_action` `/me/calendar/getSchedule` for the explicit Thursday window.
2. Compute a supported free slot locally.
3. Preview selected slot and attendees.
4. After confirmation, `workiq-create_entity` `/me/events` using that slot and attendee list.

Do not create an invite if free/busy did not return a shared slot unless the user confirms a conflict.
