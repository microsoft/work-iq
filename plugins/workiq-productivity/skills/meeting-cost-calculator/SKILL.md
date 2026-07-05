---
name: meeting-cost-calculator
description: Calculate time spent in meetings per week or month — total hours, percentage of work time, attendee‑hours, and identify your most expensive recurring meetings.
---

# 💰 Meeting Cost Calculator

Analyzes your calendar to compute exactly how much time you spend in meetings over a given period. Breaks down total hours, percentage of your work week consumed, average meeting duration, attendee-hours (a proxy for organizational cost), and ranks your most expensive recurring meetings so you can make data-driven decisions about which to keep, shorten, or cancel.

## When to Use

- "How much time do I spend in meetings?"
- "Calculate my meeting load for this week"
- "What percentage of my time is in meetings this month?"
- "Show me my most expensive meetings"
- "Analyze my meeting costs for the last 4 weeks"
- "Which recurring meetings consume the most time?"

## Instructions

### Step 1: Get User Profile, Timezone, and Working Hours

```
workiq-ask (
  question: "What is my display name, email address, time zone, and configured working hours (start time, end time, and working days of the week)?"
)
```

Extract `displayName`, `mail`, `timeZone`, working hours start/end, and working days from the response. Calculate the total available work hours per week (e.g. 5 days × 8 hours = 40 hours).

### Step 2: Pull Calendar Data for the Period

Determine the analysis period from the user's request (default: current week). For multi-week analysis, pull the full range.

```
workiq-ask (
  question: "List all my calendar events from {period start date} to {period end date} including the subject, start time, end time, attendees list with count, whether it is an all-day event, whether it is cancelled, recurrence details, organizer, showAs status, and event type."
)
```

Filter out cancelled events, all-day events, and events where `showAs` is `"free"`. These do not count as meeting time.

### Step 3: Compute Core Metrics

For each qualifying event, compute:
- **Duration** in minutes: `(end - start)`
- **Attendee count**: length of `attendees` array + 1 (organizer)
- **Attendee-hours**: `duration_hours × attendee_count`
- **Is recurring**: check if `type` is `"seriesMaster"` or `recurrence` is populated

Aggregate across the period:
- **Total meeting hours**: sum of all durations
- **Meeting count**: total number of events
- **Average meeting duration**: total hours / meeting count
- **Work hours in period**: working days × daily work hours
- **Meeting percentage**: (total meeting hours / work hours) × 100
- **Total attendee-hours**: sum of all attendee-hours

### Step 4: Break Down by Day

Group meetings by day and compute daily meeting load:
- Total hours per day
- Number of meetings per day
- Longest consecutive meeting streak

Build a per-day bar chart for visual display.

### Step 5: Identify Most Expensive Recurring Meetings

Group recurring meeting instances by their series subject. For each series:
- Count occurrences in the period
- Total hours consumed
- Average attendee count
- Total attendee-hours across all instances
- Frequency (daily, weekly, biweekly, monthly)

Sort by total hours descending. The top entries are the "most expensive" meetings.

### Step 6: Generate Cost Insights

Compute actionable insights:
- If meeting % > 60%: flag as "⚠️ Meeting overload — consider auditing recurring meetings"
- If any single recurring meeting > 3 hours/week: flag as a reduction candidate
- If average meeting length > 45 min: suggest defaulting to 25-minute or 50-minute meetings
- If any day has > 6 hours of meetings: flag that day as a risk for burnout

## Output Format

```
💰 MEETING COST CALCULATOR
═══════════════════════════════════════════════════════

📅 Period: July 14 – 18, 2025 (1 week)
👤 User: Firstname1 Lastname1
⏰ Work week: 40 hours (Mon–Fri, 9 AM – 5 PM PST)

───────────────────────────────────────────────────────
📊 SUMMARY
───────────────────────────────────────────────────────

  Total meeting time:     22.5 hours
  Meeting count:          18 meetings
  Work time in meetings:  56.3%  ⚠️  Above 50% threshold
  Average duration:       1h 15m
  Total attendee-hours:   112.5 hours
  Longest meeting streak: 3h 30m (Tuesday)

───────────────────────────────────────────────────────
📊 DAILY MEETING LOAD
───────────────────────────────────────────────────────

  Mon │ ████████████░░░░░░░░  3.0h (37%)   4 meetings
  Tue │ ██████████████████░░  6.5h (81%)   5 meetings ⚠️
  Wed │ ██████████████░░░░░░  5.0h (62%)   4 meetings
  Thu │ ████████░░░░░░░░░░░░  4.0h (50%)   3 meetings
  Fri │ ████████░░░░░░░░░░░░  4.0h (50%)   2 meetings
      └────────────────────
        0h   2h   4h   6h   8h

───────────────────────────────────────────────────────
🔄 MOST EXPENSIVE RECURRING MEETINGS
───────────────────────────────────────────────────────

  #  Meeting                  Freq     Dur    Attend  Hours/Wk
  ─────────────────────────────────────────────────────────────
  1  Sprint Planning          Weekly   2h 00m    12   2.0h  ⚠️
  2  Team Standup             Daily    0h 30m     8   2.5h  ⚠️
  3  Design Review            Weekly   1h 30m     6   1.5h
  4  1:1 with Manager         Weekly   0h 30m     2   0.5h
  5  All-Hands                Weekly   1h 00m    50   1.0h

───────────────────────────────────────────────────────
💡 INSIGHTS & RECOMMENDATIONS
───────────────────────────────────────────────────────

  ⚠️  56% of your work week is in meetings — aim for < 40%
  ⚠️  Tuesday is dangerously overloaded (6.5h of meetings)
  💡  Team Standup costs 2.5h/wk across the team — consider
      async standups 2 days/week to save 1h
  💡  Sprint Planning at 2h may benefit from a 90-min timebox
  💡  Consider "No Meeting Tuesday" to reclaim 6.5h
```

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `period` | No | `"this week"` | Analysis period: `"this week"`, `"last week"`, `"this month"`, `"last 4 weeks"`, or custom date range |
| `startDate` | No | Auto | Custom start date in ISO 8601 |
| `endDate` | No | Auto | Custom end date in ISO 8601 |
| `includeDeclined` | No | `false` | Whether to include meetings you declined |
| `meetingOverloadThreshold` | No | `50` | Percentage above which to flag meeting overload |

## Required MCP Tools

| MCP Server | Tool | Purpose |
|------------|------|---------|
| workiq (Local WorkIQ CLI) | `ask` | Get user profile, timezone, working hours, and retrieve calendar events for the analysis period |

## Tips

- Run monthly to track trends — are your meetings growing or shrinking?
- Share the output with your manager to justify meeting pruning.
- Use the "Most Expensive" table to decide which recurring meetings to audit, shorten, or cancel.
- Attendee-hours is the best proxy for organizational cost — a 1-hour meeting with 10 people costs 10 person-hours.
- After identifying days with low meeting load, consider blocking focus time on your calendar.
- Events with `showAs: "free"` are excluded since they don't block your calendar.

## Examples

### Example 1: Analyze the current week

> "How much of my time is in meetings this week?"

Claude fetches your calendar for the current Mon–Fri, computes total meeting hours against your configured work hours, and returns a full breakdown including daily load chart, recurring-meeting rankings, and any overload flags.

---

### Example 2: Monthly analysis with custom threshold

> "Analyze my meeting costs for this month and flag anything above 40% of my time."

Claude sets `meetingOverloadThreshold` to `40`, pulls the full month of calendar data, aggregates all metrics, and highlights any day or week where meetings exceeded that threshold — plus surfaces the top recurring meetings driving the highest attendee-hours.

---

### Example 3: Last 4 weeks trend

> "Which recurring meetings have cost me the most time over the last 4 weeks?"

Claude retrieves four weeks of calendar data, groups recurring series across the entire range, and ranks them by total hours consumed. Useful for preparing a meeting-audit conversation with your manager or team.

## Error Handling

### Calendar data unavailable or empty

If `ask` returns no events for the requested period, confirm the date range is correct and that the authenticated account has calendar read permissions. Remind the user that events on secondary or shared calendars are not included unless those calendars are surfaced in the primary view.

### Timezone or working-hours settings missing

If `ask` returns no working hours information, fall back to a standard 40-hour work week (Mon–Fri, 9 AM – 5 PM UTC) and inform the user that results may not reflect their actual schedule. Prompt them to verify timezone settings in their Microsoft 365 profile.

### Attendee count is zero or undefined

Some events (e.g., personal blocks or private meetings) may omit the `attendees` field. In these cases, default attendee count to `1` (the user only) so attendee-hours still accumulate correctly. Flag these events in a footnote as "attendee data unavailable."

### Period spans a holiday or non-working period

If work hours for a given day are zero (weekend, public holiday), exclude that day from the work-hours denominator to avoid inflating the meeting percentage. If the entire requested period falls outside normal working days, notify the user and suggest choosing a different range.

### Insufficient permissions

If MCP tool calls return a `403` or permission error, instruct the user to ensure the Claude integration has `Calendars.Read` scope granted in their Microsoft 365 tenant admin settings.
