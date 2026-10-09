# Teams meetings

Use with `references/teams-routing.md` (query limits, write outcomes). This
file covers finding meetings, join links, meeting chats, transcripts, and AI
insights.

## Paths

| Operation | Tool | Path |
| --- | --- | --- |
| Teams meetings in a window | `fetch` | `/me/calendarView?startDateTime=...&endDateTime=...&$select=subject,start,end,isOnlineMeeting,onlineMeeting,organizer` (list only `isOnlineMeeting` events with their `onlineMeeting.joinUrl`; mention other events only as excluded) |
| A meeting by title | `fetch` | `/me/events?$filter=startswith(subject,%27{odataEscapedAndUrlEncodedTitle}%27)&$select=subject,start,end,organizer,onlineMeeting` (or a bounded calendarView); the join link is `onlineMeeting.joinUrl` |
| Online meeting from a join URL | `fetch` | `/me/onlineMeetings?$filter=JoinWebUrl%20eq%20%27{urlEncodedJoinUrl}%27` (read `subject`, `startDateTime`, `endDateTime`, and `participants.organizer`) |
| Meeting chat | `fetch` | by topic `/me/chats?$filter=topic%20eq%20%27{odataEscapedAndUrlEncodedTitle}%27` (chatType `meeting`) or the online meeting's `chatInfo.threadId`, then `/chats/{chatId}/messages` |
| List transcripts | `fetch` | `/me/onlineMeetings/{meetingId}/transcripts` |
| Download a transcript | `fetch_blob` | `/me/onlineMeetings/{meetingId}/transcripts/{transcriptId}/content` with `format: "text/vtt"` |
| AI insights | `fetch` | `/copilot/users/{userId}/onlineMeetings/{meetingId}/aiInsights` |
| Schedule a Teams meeting | `create_entity` | parentUrl `/me/events` with `"isOnlineMeeting":true,"onlineMeetingProvider":"teamsForBusiness"`, the attendees, and `start`/`end` in the user's time zone; report the returned `onlineMeeting.joinUrl` |

## Resolving a meeting

Fetch a bounded `/me/calendarView` with
`$select=id,subject,start,end,onlineMeeting` and select exactly one occurrence
before requesting rich fields such as `body`, `attendees`, or `organizer`. If
it returns `onlineMeeting: null` for a Teams meeting, read that event once
through `/me/events/{id}` (or the by-title route) with
`$select=subject,onlineMeeting`.

## Transcripts and AI insights

1. Resolve one calendar occurrence.
2. Resolve the online meeting from its `onlineMeeting.joinUrl`.
3. List its transcripts and select the matching one.
4. Download it with `fetch_blob` as `text/vtt`.

For AI insights, fetch them after step 2.

Do not call `ask`, `get_schema`, `getAllTranscripts`, AI insights, or meeting
chat endpoints before one occurrence and one online-meeting ID are resolved. A
chat ID is never an online-meeting ID. If a required ID cannot be resolved,
stop and report the missing prerequisite rather than trying other meeting or
chat identifiers. If a meeting has no transcript or recap, say so rather than
inferring its outcome.
