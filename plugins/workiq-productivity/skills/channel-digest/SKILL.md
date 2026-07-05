---
name: channel-digest
description: Summarize activity across multiple Teams channels into a single consolidated digest — key discussions, decisions, mentions, and action items.
---

# Channel Digest

Produce a consolidated summary of activity across multiple Microsoft Teams channels. Scans recent messages from each channel, identifies key discussions, decisions made, action items, and @‑mentions — then presents everything in a single, scannable digest. Ideal for managers, leads, or anyone tracking multiple project channels.

## When to Use

- "What happened in my channels today?"
- "Summarize the last 3 days across all my project channels"
- "Give me a digest of Engineering and Product channels"
- "Any decisions made in the team channels this week?"
- "Channel digest for the sprint channels"
- "What did I miss in the channels while I was out?"

## Instructions

### Step 1: Identify the User

```
workiq-ask (
  question: "What is my profile information including display name, email, and time zone?"
)
```

Extract **displayName**, **email**, and **timeZone**.

### Step 2: Discover Teams and Channels

List all teams and their channels:

```
workiq-ask (
  question: "List all Microsoft Teams teams I belong to and their channels."
)
```

If the user specified particular channels (e.g., "Engineering #general and #design-reviews"), filter to only those. Otherwise, include all non‑archived channels across relevant teams.

Build a channel inventory:
- **Team name** → **Channel name**
- Skip channels named "General" in low‑priority teams unless the user explicitly includes them.

### Step 3: Pull Recent Messages from Each Channel

For each target channel, fetch recent messages within the lookback window:

```
workiq-ask (
  question: "Show me the last 30 messages in the '<channel name>' channel of the '<team name>' team including replies. For each message include the sender name, date and time, message content, reply count, any @mentions, reactions count, and any attachments or shared links."
)
```

For each message, capture:
- **Sender** display name
- **Timestamp**
- **Content** (text body for analysis)
- **Reply count** — indicates discussion depth
- **Mentions** — anyone @‑mentioned, especially the current user
- **Reactions** — high reaction count signals importance
- **Attachments** — files or links shared

### Step 4: Analyze and Categorize Messages

For each channel, classify the messages into categories:

**🔑 Key Decisions** — messages containing:
- Decision language: "decided", "approved", "agreed", "going with", "finalized", "confirmed"
- Follow‑up with context about what was decided

**💬 Active Discussions** — threads with:
- 3+ replies indicating substantive conversation
- Multiple participants contributing
- Ongoing debate or open questions

**📌 Action Items** — messages containing:
- Task language: "action item", "TODO", "follow up", "need to", "can you", "please"
- Assignments: "@person please…", "owned by…"
- Deadlines: "by Friday", "due date", "EOD"

**📢 Announcements** — messages that are:
- From team owners or managers
- Posted with high importance
- Information‑sharing without expecting discussion

**📎 Shared Resources** — messages with:
- File attachments (documents, spreadsheets)
- Links to external resources, PRs, or documents

**👤 Your Mentions** — messages where the current user was @‑mentioned or referenced by name.

### Step 5: Search for User Mentions Across Channels

Cast a wider net for the user's mentions:

```
workiq-ask (
  question: "Find all Teams channel messages that mention me or are directed at me in the last <lookback period>. Include the team name, channel name, sender, date, and message content for each."
)
```

Cross‑reference with messages already captured to avoid duplicates. Add any new mentions to the **Your Mentions** category.

### Step 6: Compile the Consolidated Digest

Organize findings by channel, then surface cross‑channel themes at the top.

## Output Format

```
📰 CHANNEL DIGEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Period: {start date} → {end date}
🔍 Channels scanned: {N}  ·  💬 Messages analyzed: {N}

🎯 CROSS‑CHANNEL HIGHLIGHTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔑 {N} decisions made  ·  📌 {N} action items  ·  👤 {N} times you were mentioned

Top Decisions:
  1. {Team} › #{Channel}: "{decision summary}" — {Person}, {date}
  2. {Team} › #{Channel}: "{decision summary}" — {Person}, {date}

Action Items Needing You:
  • {Person} in #{Channel}: "{action item}" — due {date}
  • {Person} in #{Channel}: "{action item}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📢 {Team Name} › #{Channel Name}
   💬 {N} messages  ·  🧵 {N} threads  ·  👥 {N} participants
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   🔑 DECISIONS
   • "{Decision summary}" — {Person}, {date}

   💬 KEY DISCUSSIONS
   • "{Topic summary}" — {N} replies, {participants}
     └─ Status: {resolved / ongoing / needs input}

   📌 ACTION ITEMS
   • {Person}: "{task description}" — {due date or "no deadline"}

   📢 ANNOUNCEMENTS
   • {Person}: "{announcement summary}" — {date}

   📎 SHARED FILES
   • {filename} — shared by {Person}, {date}

   👤 YOUR MENTIONS
   • {Person}: "@you {message preview}" — {date}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📢 {Team Name} › #{Channel Name}
   💬 {N} messages  ·  ⏸️ Low activity
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   • {brief summary of the few messages}

🔇 QUIET CHANNELS (no messages in period)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   • {Team} › #{Channel}
   • {Team} › #{Channel}
```

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| Lookback | No | 24 hours | Time window to scan (e.g., "3 days", "this week") |
| Teams | No | All user's teams | Specific teams to include |
| Channels | No | All channels | Specific channels to include |
| Focus | No | All categories | Filter to "decisions", "action-items", or "mentions" |
| Include Quiet | No | true | Whether to list channels with no activity |
| Max Messages | No | 30 per channel | Maximum messages to pull per channel |

## Required MCP Tools

| MCP Server | Tool | Purpose |
|---|---|---|
| workiq (Local WorkIQ CLI) | `ask` | User identity, team/channel discovery, message retrieval, and mention search |

## Tips

- Say "digest for Engineering channels only" to narrow the scope and speed up results.
- Use "channel digest for the last week" before a Monday planning meeting to see what happened while you were out.
- Use **action-item-extractor** to pull action items from meeting content after reviewing channel activity.
- For recurring digests, establish a cadence: "give me my channel digest every morning."
- Ask "expand on the discussion in #{Channel}" to drill into a specific conversation with full context.

## Examples

**Example 1 — Morning standup prep (default 24-hour window)**

> "Give me a channel digest for today."

Scans all of the user's Teams channels for the past 24 hours, surfaces any decisions made overnight, flags action items assigned to the user, and lists @-mentions — all in a single digest organized by team and channel.

---

**Example 2 — Catch up after time off (multi-day, scoped channels)**

> "Channel digest for the Engineering and Product channels over the last 5 days."

Limits the scan to channels in the Engineering and Product teams, pulls up to 30 messages per channel across the 5-day window, and highlights key decisions (e.g., architecture choices, scope changes), active threads, and any messages that mentioned the user while they were away.

---

**Example 3 — Decision-focused digest before a planning meeting**

> "Show me only decisions and action items from the sprint channels this week."

Uses the `Focus` parameter to filter output to **Key Decisions** and **Action Items** only, skipping announcements and low-activity channel summaries. Ideal for quickly building a pre-meeting agenda from what was agreed or assigned across sprint-related channels.

## Error Handling

**No teams or channels found**
- `ask` returns an empty result if the user is not a member of any team, or if the account lacks access to the Teams API.
- *Resolution:* Confirm the user's account has Microsoft Teams access and is a member of at least one team. Ask the user to specify a team name manually if discovery fails.

**Channel message fetch returns empty or partial results**
- `ask` may return fewer messages than expected if the channel has low activity or if the lookback window predates available message history (Teams message retention policies vary).
- *Resolution:* Proceed with available messages and note in the digest that history may be limited. Surface "No messages in period" for those channels in the **Quiet Channels** section rather than failing silently.

**Permission denied on a channel**
- Private channels require explicit membership; `ask` will indicate an access error if the user is not a member of a private channel even within a team they belong to.
- *Resolution:* Skip the inaccessible channel, log it as "access restricted" in the digest output, and continue processing remaining channels.

**Search for mentions returns no results**
- The mentions query via `ask` may return empty results for broad queries or large tenants.
- *Resolution:* Fall back to the mentions already captured during the per-channel message retrieval. Note that the mention search could not be completed so the **Your Mentions** section may be incomplete.

**Slow responses with many channels**
- Querying messages from a large number of channels requires multiple `ask` calls and may be slow.
- *Resolution:* Process channels in batches. Inform the user of the delay and suggest narrowing scope with the `Teams` or `Channels` parameters.
