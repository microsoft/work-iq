# Teams meetings, transcripts and AI insights

## Required before use

- [calendar-base-work-iq](calendar-base-work-iq.md)

## Paths

| Operation | Tool | Path |
| --- | --- | --- |
| Teams meetings in a window | `fetch` | `/me/calendarView?startDateTime=...&endDateTime=...&$select=subject,start,end,isOnlineMeeting,onlineMeeting,organizer` (list only `isOnlineMeeting` events with their `onlineMeeting.joinUrl`; mention other events only as excluded) |
| A meeting by title | `fetch` | `/me/events?$filter=startswith(subject,%27{odataEscapedAndUrlEncodedTitle}%27)&$select=subject,start,end,organizer,onlineMeeting` (or a bounded calendarView); the join link is `onlineMeeting.joinUrl` |
| Online meeting from a join URL | `fetch` | `/me/onlineMeetings?$filter=JoinWebUrl%20eq%20%27{urlEncodedJoinUrl}%27` (read `subject`, `startDateTime`, `endDateTime` and `participants.organizer`) |
| Meeting chat | `fetch` | By topic `/me/chats?$filter=topic%20eq%20%27{odataEscapedAndUrlEncodedTitle}%27` (chatType `meeting`) or the online meeting's `chatInfo.threadId`, then `/chats/{chatId}/messages` |
| List transcripts | `fetch` | `/me/onlineMeetings/{meetingId}/transcripts` |
| Download a transcript | `fetch_blob` | `/me/onlineMeetings/{meetingId}/transcripts/{transcriptId}/content` with `format: "text/vtt"` |
| AI insights | `fetch` | `/copilot/users/{userId}/onlineMeetings/{meetingId}/aiInsights` |

To schedule a Teams meeting, use the [calendar actions route](calendar-actions-work-iq.md)
with `"isOnlineMeeting":true,"onlineMeetingProvider":"teamsForBusiness"`, the
attendees, and `start`/`end` in the user's time zone, then report the returned
`onlineMeeting.joinUrl`.

## Resolving a meeting

When the user names the meeting, use the by-title `/me/events` route above first;
it returns `onlineMeeting.joinUrl` directly. Use a bounded `/me/calendarView` only
for date- or time-based requests. Reads need no `get_schema`.

For a time-based request, fetch a bounded `/me/calendarView` with
`$select=id,subject,start,end,onlineMeeting` and select exactly one occurrence
before requesting rich fields such as `body`, `attendees` or `organizer`. If it
returns `onlineMeeting: null` for a Teams meeting, read that event once through
`/me/events/{id}` (or the by-title route) with `$select=subject,onlineMeeting`.

## Transcripts and AI insights

1. Resolve one calendar occurrence.
2. Resolve the online meeting from its `onlineMeeting.joinUrl`.
3. List its transcripts with `/me/onlineMeetings/{meetingId}/transcripts` and
   select the matching one. If you use `getAllTranscripts(...)` instead, call it
   without `$select` and select locally.
4. Before the transcript `fetch_blob` call, read
   [binary download](fetch-blob-work-iq.md); then download it as `text/vtt`.

For AI insights, fetch them after step 2. Do not call `retrieve`, `ask`,
`get_schema`, `getAllTranscripts`, AI insights or meeting chat endpoints before
one occurrence and one online-meeting ID are resolved. A chat ID is never an
online-meeting ID. If a required ID cannot be resolved, stop and report the
missing prerequisite rather than trying other identifiers. On
`GraphAccessToTranscriptsDisabled`, name the transcript policy and stop. If a
meeting has no transcript or recap, say so rather than inferring its outcome.
