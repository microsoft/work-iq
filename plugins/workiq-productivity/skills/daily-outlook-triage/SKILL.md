---
name: daily-outlook-triage
description: Get a quick summary of your day by pulling your inbox emails and calendar meetings. Helps you triage and prioritize your workday.
---

# Daily Outlook Triage

This skill provides a comprehensive overview of your day by analyzing your inbox emails and calendar meetings, helping you quickly triage and prioritize your workday.

## What This Skill Does

1. **Identifies you** using Microsoft Graph to get your profile and time zone
2. **Pulls inbox emails** to surface unread and important messages requiring attention
3. **Retrieves today's meetings** from your calendar with details
4. **Generates a triage summary** highlighting priorities, conflicts, and action items

## Instructions

### Step 1: Get User Profile and Time Zone

```
workiq-ask (
  question: "What is my profile information including display name, email address, and time zone settings?"
)
```

Extract the user's **displayName**, **email**, and **timeZone** from the response. This provides:
- User identity for personalized greeting
- Time zone for accurate meeting times

### Step 2: Pull Inbox Emails

Search for recent emails in the inbox:

```
workiq-ask (
  question: "Show me my unread and recent inbox emails from the last 24 hours. For each email include the sender name and email, subject line, received time, importance level, and whether it has attachments."
)
```

For each relevant email, note:
- Sender name and email
- Subject line
- Received time
- Importance flag (high priority emails)
- Whether it has attachments

### Step 3: Get Today's Calendar

Retrieve today's meetings with a **structured calendar read** — not `ask`. Use `fetch` on `/me/calendarView` for the day's window, which returns each event's real time instant as `{ "dateTime": "...", "timeZone": "UTC" }` instead of a pre-formatted, unlabeled string:

```
workiq-fetch (
  entityUrls: ["/me/calendarView?startDateTime=<today's local midnight, ISO 8601 with offset>&endDateTime=<tomorrow's local midnight, ISO 8601 with offset>&$select=subject,start,end,location,onlineMeeting,attendees,organizer,isOrganizer,responseStatus,isAllDay,showAs&$orderby=start/dateTime"]
)
```

Substitute the placeholders with real ISO 8601 datetimes for the user's day — local midnight today through local midnight tomorrow (a half-open `[start, end)` window), each with its **own** UTC offset (e.g. `2026-07-15T00:00:00-04:00` to `2026-07-16T00:00:00-04:00`). Don't send offset-less values: Graph treats those as UTC, which shifts the window off the user's actual day. URL-encode the query values.

For each meeting, capture:
- Subject/title
- Start and end times (as the UTC instants returned in `start`/`end` — see the conversion note below)
- Location — physical location from `location`, or the Teams join URL from `onlineMeeting.joinUrl` when present (`location` alone usually holds only a display name, not the join link)
- Attendees
- Whether user is organizer or attendee (`isOrganizer`)
- Response status — read `responseStatus.response` (values include `organizer`, `accepted`, `tentativelyAccepted`, `declined`, `notResponded`, `none`; treat `notResponded`/`none` as an unresponded invite)

Notes:
- **Use `/me/calendarView`, not `/me/events`, for a date window.** `calendarView` expands recurring series into individual occurrences within the window; `/me/events` does not expand occurrences — it returns single events and recurring *series masters* at the master's original date, so the day's actual instances would be missing or misdated.
- **Convert times yourself, and mind the tz format.** Each `start`/`end` is an unambiguous UTC instant (`{ dateTime, timeZone: "UTC" }`). Convert it to the user's time zone (from Step 1) so the result is daylight-saving-correct. Note the user's `mailboxSettings.timeZone` is often a **Windows** zone ID (e.g. `Eastern Standard Time`), not an IANA name (`America/New_York`) — map it to IANA (or use a library that accepts both) before converting. **Do not** rely on `ask` to format meeting times or "report in my local time zone" — its human-formatted times are unlabeled and can be off by the DST offset (e.g. rendered one hour early during summer months), and it doesn't expose the underlying instant to check against.
- **Don't paginate with `$skip`** — `calendarView` rejects it. If the response includes an `@odata.nextLink`, follow it with another `fetch`, converting it to a server-relative path first (strip the scheme, authority, and API-version prefix; keep the path and the opaque query string, including `$skiptoken`).

### Step 4: Generate Triage Summary

Create a structured summary with the following sections:

#### 📅 Today's Schedule Overview
- Total number of meetings
- First meeting start time
- Any back-to-back meetings (potential conflicts)
- Total meeting hours vs free time
- Highlight all-day events

#### 📧 Inbox Highlights
- Count of unread emails
- High-importance emails requiring immediate attention
- Emails from VIPs (manager, skip-level, key stakeholders)
- Action items or requests identified in subject lines

#### ⚠️ Attention Required
- Meeting conflicts or overlaps
- Meetings starting soon (within 30 minutes)
- Unresponded meeting invites
- High-priority unread emails

#### 📋 Suggested Priorities
Based on the analysis, suggest:
1. Urgent items to address first
2. Meetings to prepare for
3. Emails that need responses
4. Blocks of free time for focused work

## Output Format

Present the summary in a clear, scannable format:

```
Good morning, {Name}! Here's your day at a glance:

📅 MEETINGS ({count} today)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ 9:00 AM - 9:30 AM | Team Standup
   📍 Teams | 👥 5 attendees
   
⏰ 10:00 AM - 11:00 AM | 1:1 with Manager
   📍 Teams | 👥 2 attendees
   
⏰ 2:00 PM - 3:00 PM | Sprint Planning
   📍 Conference Room A | 👥 8 attendees

📧 INBOX ({unread} unread)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 HIGH: Budget approval needed - CFO (2 hours ago)
📩 RE: Project timeline - PM Lead (4 hours ago)
📩 Weekly report - Auto-generated (6 hours ago)

⚠️ NEEDS ATTENTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Meeting conflict: 2:00-3:00 PM overlaps with another invite
• Pending invite: Design Review (no response yet)
• 1 high-priority email awaiting reply

💡 SUGGESTED PRIORITIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Respond to CFO's budget email before 9 AM standup
2. Prepare for 1:1 - review last week's action items
3. Block 11:00-12:00 for focused work (no meetings)
```

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| Time Range | No | Today | Date range for calendar (default: today) |
| Email Lookback | No | 24 hours | How far back to search emails |
| Include Low Priority | No | No | Whether to include low-priority emails |

## Example Usage

User: "What does my day look like?" or "Help me triage my day" or "Daily outlook summary"

The skill will:
1. Identify the user (e.g., "Firstname1 Lastname1")
2. Pull unread/recent inbox emails
3. Get all meetings scheduled for today
4. Generate a prioritized triage summary

## Required MCP Tools

| MCP Server | Tool | Purpose |
|---|---|---|
| workiq (Local WorkIQ CLI) | `ask` | User profile and inbox email retrieval |
| workiq (Local WorkIQ CLI) | `fetch` | Exact calendar reads via `/me/calendarView` (returns UTC instants for DST-correct conversion) |

## Tips for Effective Triage

- Run this skill first thing in the morning
- Use the suggested priorities to plan your day
- Address high-priority emails before your first meeting
- Note any meeting conflicts and resolve them early
- Identify free time blocks for deep work

## Error Handling

### Common Failure Modes

#### Authentication or Permission Errors
- **Symptom**: `ask` returns an authentication or permission error.
- **Cause**: The user's session token is expired or the required Microsoft Graph permissions (Mail.Read, Calendars.Read, User.Read) have not been granted.
- **Resolution**: Prompt the user to re-authenticate with their Microsoft 365 account and confirm the necessary API permissions are enabled.

#### WorkIQ CLI Unavailable
- **Symptom**: `ask` fails to respond or returns a connection error.
- **Cause**: The local WorkIQ CLI MCP server is not running or misconfigured.
- **Resolution**: Notify the user that the WorkIQ CLI is unreachable. Suggest verifying the server configuration and retrying.

#### No Emails Returned
- **Symptom**: `ask` returns no email results for the requested period.
- **Cause**: No emails were received in the specified lookback window, or the question did not match any messages.
- **Resolution**: Inform the user that no recent inbox emails were found. Retry with a broader time window (e.g., "last 48 hours") before concluding the inbox is empty.

#### No Calendar Events Found
- **Symptom**: `fetch` on `/me/calendarView` returns no events for today.
- **Cause**: The user genuinely has no meetings, or the date window was built for the wrong day.
- **Resolution**: Double-check that `startDateTime` and `endDateTime` bound the intended local day. If the window is correct and the response is still empty, report that the calendar is clear for today.

#### Incorrect or Missing Time Zone
- **Symptom**: Meeting times appear offset by an hour (often exactly the DST delta) or in UTC.
- **Cause**: The event times were read from `ask`'s pre-formatted string instead of the `calendarView` UTC instant; the user's `timeZone` from Step 1 was missing; or a Windows zone ID (e.g. `Eastern Standard Time`) was passed to an IANA-only converter and silently failed.
- **Resolution**: Always read `start`/`end` from the `calendarView` response and convert the UTC instant to the user's zone — never format meeting times via `ask`. Map a Windows zone ID to IANA (or use a converter that accepts both) before converting. If the user's time zone is unavailable or unmappable, show times in UTC, label them clearly as UTC, and prompt the user to confirm their preferred time zone.

#### Partial Data Retrieved
- **Symptom**: One call succeeds (e.g. the `ask` inbox pull) but another returns an error or incomplete data (e.g. the `fetch` calendar read).
- **Resolution**: Present the sections that did complete successfully. Clearly label any missing section (e.g., "⚠️ Calendar unavailable — could not retrieve today's meetings") so the user knows the summary is incomplete and can take manual action.
