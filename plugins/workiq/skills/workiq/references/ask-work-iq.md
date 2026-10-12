# ask

Query Microsoft 365 Copilot for workplace intelligence using natural language. This is the primary tool for all M365 data questions — it grounds answers in real organizational data via Microsoft Graph.

> **⏱️ Latency:** Typical calls take 10–60 seconds; broad questions can run several minutes (hard limit ~300s). Don't chain many `ask` calls where one scoped call or a fast entity tool would do, and split overly broad questions into focused sub-questions.
>
> **Backoff:** If `ask` returns busy/throttled with `retryAfterSeconds`, never retry before that delay. Follow any documented bounded fallback immediately. Otherwise, make at most one identical retry only when the runtime can wait the full delay; if it cannot, report the transient failure. Do not retry immediately, alter the question, or fan out into broad entity fetches.
>
> **Grounding:** Synthesize your answer only from what the response actually contains. If `ask` reports no accessible results or weak evidence, say so — do not pad the answer with specifics the response doesn't support.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `question` | string | Yes | A natural language question. Be specific about people, topics, or timeframes for better results. |
| `fileUrls` | string[] | No | Optional list of OneDrive or SharePoint file URLs to use as context for the question. |
| `conversationId` | string | No | Optional conversation ID from a prior `ask` response to continue an existing conversation. |
| `agentId` | string | No | Optional agent ID to target a specific M365 Copilot agent. Defaults to bizchat. Use `list_agents` to discover available agent IDs. |

## When to Use

Use `ask` when:
- You need information that exists somewhere in M365 (emails, meetings, documents, Teams, Calendar, people)
- The user asks about what someone said, shared, or communicated
- You need organizational context before implementing something
- Any question that could be answered by Outlook, Teams, SharePoint, OneDrive, or Calendar

Prefer `ask` over entity tools when the question is open-ended or exploratory. Switch to entity tools when you need precise, structured data or need to write/modify data.

**Specific Teams chat exception:** "get my conversation with Alex", chat
history by date, and summaries/decisions/action items from a named group,
meeting, or 1:1 **chat** use
[Teams chat BotDoc grounding](teams-grounding-work-iq.md), not `ask`.
Resolve the existing chat read-only, fetch its grounding content, and synthesize
locally. Broad topic discovery without a specific chat, channel-wide synthesis,
meeting transcripts, email, and cross-workload questions retain the `ask` route.

## Do NOT use `ask` as a shortcut for:

- **Reading or summarizing a specific Teams chat** → `/m365-grounding/fetch` with the resolved `threadId` and requested time window
- **API / path questions** ("endpoint", "available operations", "what can I do with…") → `search_paths`
- **Schema / field / body-shape questions** ("what does sendMail take?", "what fields are required?") → `get_schema`
- **Exact mutations by title / name / thread / channel** ("delete the X event", "react to the Y message") → resolve with `fetch`, then call the write/action tool directly
- **A "summarize then draft/send/create/update/delete/forward/react" chain** — continue with the mutation tool after `ask`. The `ask` answer alone does not satisfy the second half of the request.

## Examples

### People and expertise
```json
{ "question": "Who is the expert on authentication in our team?" }
{ "question": "What has Sarah been focused on lately?" }
{ "question": "What are the latest top of mind from Rob I should be aware of?" }
```

### Meetings and decisions
```json
{ "question": "What decisions were made in my meeting last week about the new feature?" }
{ "question": "What action items came out of the sprint planning?" }
{ "question": "Summarize the architecture discussion from yesterday's standup" }
```

### Emails and messages
```json
{ "question": "Any recent emails from Rob about the deadline?" }
{ "question": "What did the team discuss in Teams about the release?" }
{ "question": "Summarize my unread messages from today" }
```

### Documents and specs
```json
{ "question": "Find the design doc for the authentication system" }
{ "question": "What's the latest spec for Project X?" }
{ "question": "Where is the API documentation for the payments service?" }
```

### Calendar and schedule
```json
{ "question": "What meetings do I have today?" }
{ "question": "What's on my calendar tomorrow?" }
```

### Priorities and goals
```json
{ "question": "Based on discussions with my manager, what are my top priorities?" }
{ "question": "What are the team's goals for this quarter?" }
{ "question": "What's blocking the release?" }
```

### Grounding implementation work
```json
{ "question": "Based on the latest spec for Project X, what are the backend requirements?" }
```
