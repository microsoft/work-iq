---
name: channel-audit
description: Audit Teams channels across your teams — identify inactive channels, low‑engagement conversations, channels with no recent posts, and recommend cleanup actions.
---

# Channel Audit

Audit all Microsoft Teams channels across your teams to assess activity levels and engagement health. Identifies inactive channels, stale conversations, and low‑engagement spaces — then presents a prioritized audit report with recommended cleanup actions such as archiving, merging, or reviving channels.

## When to Use

- "Audit my Teams channels"
- "Which channels are inactive?"
- "Find dead channels across my teams"
- "Teams channel cleanup report"
- "Show me channels with no posts in the last month"
- "Which channels should we archive?"
- "Channel health check for the Engineering team"

## Instructions

### Step 1: Identify the User

```
workiq-ask (
  question: "What is my profile information including display name, email, and time zone?"
)
```

Extract **displayName**, **email**, and **timeZone** for date calculations.

### Step 2: Discover All Teams and Channels

List every team and their channels:

```
workiq-ask (
  question: "List all Microsoft Teams teams I belong to. For each team, list all channels including the channel name, description, type (standard, private, shared), and creation date."
)
```

Build an inventory of every channel:
- **Team name**
- **Channel name**, **description**
- **Channel type** (standard, private, shared)
- **Created date** (from channel metadata)

If the response is too large or truncated, query teams individually:

```
workiq-ask (
  question: "List all channels in the '<team name>' team including channel name, description, type, and creation date."
)
```

### Step 3: Assess Channel Activity

For each channel (or batch of channels within a team), pull recent messages to measure activity:

```
workiq-ask (
  question: "Show me the 10 most recent messages in the '<channel name>' channel of the '<team name>' team. For each message include the sender, date, content summary, reply count, and whether it was from a bot or connector."
)
```

For each channel, calculate:
- **Last message date** — when the most recent message was posted
- **Days since last post** — time delta from today
- **Message count** (in the sample) — indicator of volume
- **Unique authors** — how many distinct people posted
- **Reply depth** — are messages getting replies or going unanswered?
- **Content type** — are posts substantive or just bot notifications?

### Step 4: Get Channel Membership Data

For each channel (especially those flagged as low‑activity):

```
workiq-ask (
  question: "How many members are in the '<channel name>' channel of the '<team name>' team? List the member count."
)
```

Record:
- **Member count** — total members in the channel
- **Activity ratio** — unique posters vs. total members (engagement metric)

### Step 5: Classify Channel Health

Categorize each channel based on activity metrics:

**🟢 Active** — Messages within the last 7 days, multiple authors, replies present
- Engagement: healthy, no action needed

**🟡 Slow** — Last message 7–30 days ago, limited authors
- Recommendation: monitor, consider consolidating

**🟠 Stale** — Last message 30–90 days ago, very few participants
- Recommendation: notify channel owners, consider archiving

**🔴 Dead** — No messages in 90+ days
- Recommendation: archive or delete

**⚪ Bot‑Only** — Recent messages, but only from automated bots or connectors
- Recommendation: review if the channel serves a purpose beyond bot notifications

### Step 6: Identify Potential Duplicates

Compare channel names and descriptions across teams to find potential duplicates:
- Channels with similar names (e.g., "#design" and "#design-team")
- Channels with overlapping membership and similar topics
- Flag these as merge candidates

### Step 7: Compile the Audit Report

## Output Format

```
🔍 CHANNEL AUDIT REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Audit date: {date}
👤 Audited by: {displayName}
🏢 Teams scanned: {N}  ·  📢 Channels audited: {N}

📊 HEALTH OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 Active:    {N} channels  ({percentage}%)
🟡 Slow:      {N} channels  ({percentage}%)
🟠 Stale:     {N} channels  ({percentage}%)
🔴 Dead:      {N} channels  ({percentage}%)
⚪ Bot‑only:  {N} channels  ({percentage}%)

🔴 DEAD CHANNELS — Recommend Archive ({count})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {Team} › #{Channel}
     📅 Last post: {date} ({N} days ago)
     👥 Members: {N}  ·  💬 Last author: {name}
     💡 Action: Archive
  
  {Team} › #{Channel}
     📅 Last post: {date} ({N} days ago)
     👥 Members: {N}  ·  💬 Last author: {name}
     💡 Action: Archive

🟠 STALE CHANNELS — Monitor / Consider Archiving ({count})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {Team} › #{Channel}
     📅 Last post: {date} ({N} days ago)
     👥 Members: {N}  ·  📝 Active posters: {N} ({ratio}%)
     💡 Action: Notify owner, review purpose

🟡 SLOW CHANNELS — Watch List ({count})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {Team} › #{Channel}
     📅 Last post: {date} ({N} days ago)
     👥 Members: {N}  ·  📝 Active posters: {N}

⚪ BOT‑ONLY CHANNELS ({count})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {Team} › #{Channel}
     🤖 Only automated posts detected
     💡 Action: Review if bot output is still needed

🔄 POTENTIAL DUPLICATES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • {Team1} › #{Channel A}  ↔  {Team2} › #{Channel B}
    Reason: Similar names, overlapping members
    💡 Action: Consider merging

🟢 HEALTHY CHANNELS ({count})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {Team} › #{Channel} — {N} posts last 7d, {N} authors
  {Team} › #{Channel} — {N} posts last 7d, {N} authors

📋 RECOMMENDED ACTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. 🗑️ Archive {N} dead channels
  2. 📧 Notify owners of {N} stale channels
  3. 🔄 Review {N} potential duplicate pairs
  4. 🤖 Review {N} bot‑only channels
```

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| Teams | No | All user's teams | Specific teams to audit |
| Inactive Threshold | No | 30 days | Days without posts to flag as stale |
| Dead Threshold | No | 90 days | Days without posts to flag as dead |
| Include Healthy | No | true | Show healthy channels in the report |
| Include General | No | false | Include default "General" channels |
| Sort By | No | Last activity | Sort order: "last-activity", "member-count", "team" |

## Required MCP Tools

| MCP Server | Tool | Purpose |
|---|---|---|
| workiq (Local WorkIQ CLI) | `ask` | User identity, team/channel discovery, message activity retrieval, and membership data |

## Tips

- Run monthly to keep your Teams workspace clean and navigable.
- Say "audit Engineering team only" to scope to a single team for faster results.
- Use "show only dead channels" to skip healthy channels and focus on cleanup.
- After identifying channels to archive, coordinate with team owners before taking action.
- After identifying channels to clean up, coordinate with team owners to take action.
- General channels cannot be archived or deleted — they are skipped by default.

## Examples

**Full workspace audit**
> "Audit all my Teams channels and tell me which ones I should clean up."

Scans every team the user belongs to, classifies all channels by health status, detects bot-only and duplicate channels, and produces a complete prioritized report with archive and merge recommendations.

---

**Single-team audit with narrow threshold**
> "Do a channel health check for the Engineering team — flag anything with no posts in the last 2 weeks."

Scopes the audit to the Engineering team only and applies a custom inactive threshold of 14 days instead of the default 30, surfacing slow channels that would otherwise be missed.

---

**Dead channels only, ready for archiving**
> "Show me only the dead channels across all teams — nothing healthy, just what we should archive."

Runs a full scan but filters the output to dead channels (90+ days without posts), listing each with member count, last author, and a direct archive recommendation — ideal for a quick cleanup session.

## Error Handling

**Cannot retrieve user details**
- Cause: `ask` returns an authentication or permission error.
- Action: Re-authenticate and retry. Ensure the WorkIQ CLI has proper Microsoft 365 permissions.

**Team list is empty or incomplete**
- Cause: `ask` returns no teams or only a subset of expected teams.
- Action: Confirm the user is an active member of the expected teams in the Teams admin center. Guest accounts may have restricted visibility.

**Channel message retrieval fails for one or more channels**
- Cause: `ask` returns an error or no data for private or shared channels where the user lacks membership.
- Action: The audit skips inaccessible channels and notes them in the report as `⚠️ Access Restricted`. Request channel membership or ask a channel owner to run the audit.

**No messages returned but channel exists**
- Cause: The channel was created but never had any posts, or messages were deleted.
- Action: The channel is treated as **Dead** (0 days activity) and flagged for archiving. Verify manually before archiving if the channel was recently created.

**Member list unavailable**
- Cause: `ask` cannot retrieve membership data for a private channel due to permission restrictions.
- Action: Member count and activity ratio are omitted for that channel; all other metrics are still reported. The channel is still classified by message activity alone.

**Large workspace timeouts**
- Cause: Auditing teams with dozens of channels may require many `ask` calls and take significant time.
- Action: Scope the audit to a single team (e.g., "audit the Marketing team only") to reduce call volume, or run the audit during off-peak hours.
