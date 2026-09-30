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

### Step 1: Fetch Profile, Inbox, and Calendar in One Batch

Use the runtime's current date, time, and UTC offset to calculate:

- `<lookback-start>`: the current instant minus the requested email lookback (24 hours by default)
- `<day-start>` and `<day-end>`: the start and end of the requested local calendar day, expressed as ISO 8601 timestamps with the runtime's UTC offset

Fetch all source data in one structured call. Keep the requests in a single
`entityUrls` array so WorkIQ can execute them as a batch:

```text
fetch_work_iq (
  entityUrls: [
    "/me?$select=id,displayName,mail",
    "/me/mailboxSettings?$select=timeZone",
    "/me/mailFolders/inbox/messages?$filter=receivedDateTime ge <lookback-start>&$select=id,subject,from,receivedDateTime,isRead,importance,hasAttachments,bodyPreview&$orderby=receivedDateTime desc&$top=50",
    "/me/calendarView?startDateTime=<day-start>&endDateTime=<day-end>&$select=id,subject,start,end,location,attendees,organizer,isOrganizer,responseStatus,isAllDay,isCancelled,showAs&$orderby=start/dateTime"
  ]
)
```

Do not call `ask` for this structured lookup. A single batched `fetch` avoids
three sequential semantic requests and returns the exact fields needed for local
triage. Do not follow `@odata.nextLink`; this is intentionally a bounded daily
summary. If more than 50 messages match, state that the inbox section covers the
50 most recent messages in the lookback window.

Extract the user's **displayName**, **mail**, and mailbox **timeZone** for the
personalized greeting and meeting-time labels. The runtime offset remains
authoritative for calculating the requested day's boundaries; if the mailbox
time zone differs, note which zone is used in the output.

### Step 2: Analyze Inbox Emails

From the returned inbox messages, prioritize unread and high-importance mail.
Use `bodyPreview` only to identify likely requests or action items; do not make
another call to retrieve full message bodies.

For each relevant email, note:
- Sender name and email
- Subject line
- Received time
- Importance flag (high priority emails)
- Whether it has attachments

### Step 3: Analyze Today's Calendar

Use the calendar events returned by the same batch. Exclude cancelled events
from meeting counts, but mention a cancellation when it is useful context.

For each meeting, capture:
- Subject/title
- Start and end times
- Location (physical or Teams link)
- Attendees
- Whether user is organizer or attendee
- Response status (accepted, tentative, declined)

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
| workiq | `fetch` | Retrieve profile, mailbox time zone, recent inbox messages, and calendar events in one batch |

## Tips for Effective Triage

- Run this skill first thing in the morning
- Use the suggested priorities to plan your day
- Address high-priority emails before your first meeting
- Note any meeting conflicts and resolve them early
- Identify free time blocks for deep work

## Error Handling

### Common Failure Modes

#### Authentication or Permission Errors
- **Symptom**: `fetch` returns an authentication or permission error.
- **Cause**: The user's session token is expired or the required Microsoft Graph permissions (Mail.Read, Calendars.Read, User.Read) have not been granted.
- **Resolution**: Prompt the user to re-authenticate with their Microsoft 365 account and confirm the necessary API permissions are enabled.

#### WorkIQ Unavailable
- **Symptom**: `fetch` fails to respond or returns a connection error.
- **Cause**: The WorkIQ MCP server is unavailable or misconfigured.
- **Resolution**: Notify the user that WorkIQ is unreachable. Suggest verifying the server configuration and retrying.

#### No Emails Returned
- **Symptom**: The inbox result is empty for the requested period.
- **Cause**: No emails were received in the specified lookback window.
- **Resolution**: Report that no recent inbox emails were found. Do not retry automatically with a broader time window.

#### No Calendar Events Found
- **Symptom**: The calendar result contains no events for the requested day.
- **Cause**: The user has no events in the explicit `calendarView` range.
- **Resolution**: Report that the calendar is clear for that day. Do not make a semantic retry.

#### Incorrect or Missing Time Zone
- **Symptom**: Meeting times appear in UTC or are offset by several hours.
- **Cause**: Mailbox settings did not return time zone information.
- **Resolution**: Use the runtime's UTC offset and explicitly label the displayed time zone.

#### Partial Data Retrieved
- **Symptom**: One entity in the batched `fetch` succeeds but another returns an error or incomplete data.
- **Resolution**: Present the sections that did complete successfully. Clearly label any missing section (e.g., "⚠️ Calendar unavailable — could not retrieve today's meetings") so the user knows the summary is incomplete and can take manual action.
