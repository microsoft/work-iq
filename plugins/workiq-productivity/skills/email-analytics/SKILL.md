---
name: email-analytics
description: Analyze your email patterns over a time period — volume trends, top senders, response time estimates, busiest days, and unread backlog statistics.
---

# Email Analytics

Get a data‑driven view of your email life. This skill scans your inbox and sent folder over a time period, crunches the numbers, and presents a formatted analytics dashboard — volume by day, top senders, response patterns, busiest hours, flagged backlogs, and unread trends. Use it to understand your communication load and identify where your email time goes.

## When to Use

- "Analyze my email patterns this month"
- "How many emails did I get last week?"
- "Who sends me the most email?"
- "Show me my email volume trends"
- "Give me inbox statistics for the last 30 days"
- "What does my email workload look like?"

## Instructions

### Step 1: Identify the User

```
workiq-ask (
  question: "What is my profile information including display name and email address?"
)
```

Extract **displayName** and **mail** for report personalization.

### Step 2: Retrieve Received Emails

Pull all received emails across the analysis period:

```
workiq-ask (
  question: "List all emails I received in the last <time period>. For each email include the sender name and email, subject, received date and time, read/unread status, importance level, whether it has attachments, and flag status."
)
```

For longer periods, run multiple queries to capture the full window:
- `"List all emails I received this week with sender, subject, date, read status, importance, attachments, and flag status"`
- `"List all emails I received last week with sender, subject, date, read status, importance, attachments, and flag status"`
- etc.

### Step 3: Retrieve Sent Emails

Pull all sent emails for response analysis:

```
workiq-ask (
  question: "List all emails I sent in the last <time period>. For each email include the recipients, subject, sent date and time, and whether it has attachments."
)
```

Collect for each message (received and sent):
- **From / To** — sender and recipient addresses
- **ReceivedDateTime** — timestamp for volume trends
- **IsRead** — read vs. unread status
- **Importance** — high/normal/low
- **HasAttachments** — attachment tracking
- **Flag status** — flagged items count
- **Subject** — for thread grouping

### Step 4: Compute Analytics

Aggregate the data into the following metrics:

**Volume Metrics:**
- Total received, total sent
- Daily average received / sent
- Ratio of received to sent

**Temporal Patterns:**
- Volume by day of week (Mon–Sun)
- Peak hours (morning, afternoon, evening)
- Busiest single day

**People Metrics:**
- Top 10 senders by volume
- Top 10 recipients you email most
- Emails from direct manager

**Status Metrics:**
- Unread count and percentage
- Flagged count
- High importance count
- Emails with attachments

### Step 5: Present the Analytics Dashboard

```
📊 EMAIL ANALYTICS — {displayName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Period: {start date} → {end date} ({N} days)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📬 VOLUME OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📥 Received:     {total received}    ({daily avg}/day)
  📤 Sent:         {total sent}        ({daily avg}/day)
  📈 Ratio:        {received:sent ratio}
  📬 Unread:       {unread count}      ({unread %}%)
  🚩 Flagged:      {flagged count}
  ⚡ High Priority: {high importance count}

📅 VOLUME BY DAY OF WEEK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mon │ ████████████████████░░░░░  82
  Tue │ ███████████████████████░░  94  ← busiest
  Wed │ ██████████████████░░░░░░░  73
  Thu │ █████████████████████░░░░  86
  Fri │ ██████████████░░░░░░░░░░░  58
  Sat │ ███░░░░░░░░░░░░░░░░░░░░░  12
  Sun │ ██░░░░░░░░░░░░░░░░░░░░░░   8

👤 TOP SENDERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  #1  Firstname1 Lastname1    │ 34 emails │ ████████████████
  #2  notifications@jira     │ 28 emails │ █████████████
  #3  Firstname2 Lastname2   │ 22 emails │ ██████████
  #4  Firstname3 Lastname3   │ 18 emails │ ████████
  #5  build-alerts@ci        │ 15 emails │ ███████
  #6  Firstname4 Lastname4   │ 14 emails │ ██████
  #7  calendar@outlook       │ 12 emails │ █████
  #8  Firstname5 Lastname5   │ 10 emails │ ████
  #9  newsletter@company     │  9 emails │ ████
  #10 help-desk@contoso      │  7 emails │ ███

👤 TOP RECIPIENTS (your sent mail)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  #1  Firstname1 Lastname1    │ 19 emails
  #2  Firstname2 Lastname2   │ 14 emails
  #3  Manager: Firstname6 Lastname6 │ 11 emails
  #4  Firstname3 Lastname3   │  9 emails
  #5  Team DL                │  8 emails

📎 ATTACHMENT STATS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📎 Emails with attachments: {count} ({percentage}%)
  📊 Most common types:       PDF, XLSX, DOCX

🔍 INSIGHTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  💡 Tuesday is your busiest email day — consider blocking focus time.
  💡 {unread count} unread emails — consider triaging your inbox.
  💡 {percentage}% of received email is from automated systems.
  💡 You send {ratio} emails for every {N} received.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Output Format

A formatted analytics dashboard with bar charts for volume trends, ranked sender/recipient tables, attachment statistics, and actionable insights. Bar charts use Unicode block characters for visual representation.

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| Time period | No | Last 7 days | Analysis window (e.g., "this month", "last 30 days", "this quarter") |
| Include sent | No | true | Whether to analyze outgoing emails too |
| Detail level | No | full | `summary` (volume only) or `full` (all sections) |
| Show insights | No | true | Include AI‑generated insights and recommendations |

## Required MCP Tools

| MCP Server | Tool | Purpose |
|---|---|---|
| workiq (Local WorkIQ CLI) | `ask` | User identity, email retrieval (received and sent), and message metadata for analytics |

## Tips

- Run weekly for a quick health check on your email workload, or monthly for trend spotting.
- High automated‑email percentage? Consider unsubscribing or filtering newsletter noise.
- Compare week‑over‑week by running twice with different date ranges.
- The insights section auto‑detects patterns like automated senders, unread backlogs, and busiest days to give you actionable advice.
- If email peaks align with meeting‑heavy days, you may need more focus time.

## Examples

**Last 7 days at a glance**
> "Analyze my email patterns for the last week"

Returns a full dashboard covering the past 7 days — total received and sent, top senders, busiest day, unread count, and key insights like automated-email percentage.

---

**Monthly deep-dive**
> "Give me inbox statistics for March"

Runs a 31-day analysis, identifying volume trends by day of week, ranking your top 10 senders, and flagging any growing unread backlog. Useful for end-of-month reporting or planning the next sprint.

---

**Quick sender check**
> "Who sends me the most email this quarter?"

Focuses the output on the Top Senders table. Even when requesting a narrow slice, the full dashboard is generated — scroll to the **TOP SENDERS** section or ask for `detail level: summary` to limit output to volume and sender rankings only.

## Error Handling

**No emails found for the requested period**
If `ask` returns no email results, verify the time period phrasing (e.g., use "last 30 days" instead of a specific date range). The query is natural-language driven — overly precise date strings may not match. Retry with a broader phrase.

**Incomplete or partial data**
If `ask` returns fewer results than expected or omits certain metadata fields, compute analytics on the available data. Append a note to the dashboard: *"Some messages could not be fully retrieved and were excluded from analysis."*

**Large volumes causing slow response**
For periods longer than 90 days or inboxes with very high traffic (1 000+ messages), a single query may return incomplete results. In this case:
- Reduce the analysis window (e.g., analyze one month at a time with separate `ask` calls).
- Use `detail level: summary` to rely on aggregate counts only.

**Sent folder unavailable**
If the sent-mail query returns no results and the user expects sent data, confirm that the account's Sent Items folder is accessible. Set `include sent: false` to proceed with received-email analytics only.

**Identity lookup failure**
If `ask` cannot resolve the user profile, the dashboard still generates but displays the email address (from email results) instead of the display name. No analytics data is lost.
