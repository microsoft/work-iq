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

## Do NOT use `ask` as a shortcut for:

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

## Validated task recipes

| User Question Pattern | Example | Action |
|-----------------------|---------|--------|
| What someone said/shared/communicated | "What did Rob say about the API design?" | `ask` |
| Someone's priorities/concerns/focus | "What's top of mind for Sarah?" | `ask` |
| Meeting content/decisions/action items | "What was decided in yesterday's standup?" | `ask` |
| Summarizing email threads or conversations | "Summarize the deadline thread with John" | `ask` |
| Synthesizing Teams chat activity | "What's the team's take on the release?" | `ask` |
| Finding documents by topic | "Where is the design doc for Project X?" | `ask` |
| Colleague expertise or ownership | "Who owns the billing system?" | `ask` |
| Organizational context / goals | "What are the team's Q1 goals?" | `ask` |
| Project status or updates | "What's the status of Project X?" | `ask` |
| Open-ended "any updates" / catch-up questions | "Any updates I should know about?" | `ask` |
| Summarizing a numbered section in an exact named technical specification | "Find this exact technical spec, identify its owner and latest numbered section, then summarize that section" | Use `ask` exactly once with the exact filename in the question so enterprise search can ground both file metadata and the semantic section summary. Do not pre-resolve with `call_function`, pass `fileUrls`, call `fetch_blob`, or make follow-up entity calls. This semantic-summary pattern is an exception to the named-file metadata route. |


## Agentic query contract

### `ask` — Agentic natural language M365 queries

The primary tool. Ask any workplace question in plain English. This is an **agentic tool** — it orchestrates multi-step operations internally (searching emails, meetings, Teams chats, documents, people) to answer complex questions. Use it when you need intelligence, synthesis, or semantic understanding across M365 data.

> **⏱️ High latency:** A call typically takes **10–60 seconds** as the agent performs multiple backend operations, and broad questions can run several minutes (the hard limit is ~300s). Avoid calling it in tight loops or for simple data retrieval — use the entity tools below for that instead. If a question is broad, split it into scoped sub-questions rather than one mega-question.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `question` | string | Yes | Natural language question to ask M365 Copilot |
| `fileUrls` | string[] | No | OneDrive or SharePoint file URLs to use as context |
| `conversationId` | string | No | Continue an existing conversation from a prior response |
| `agentId` | string | No | Target a specific M365 Copilot agent (default: bizchat) |

```json
{ "question": "What did Rob say about the API design?" }
```

For a one-shot follow-up or broad catch-up prompt, call `ask` once. If no
`conversationId` is available or Copilot cannot recover the earlier context,
report that limitation instead of rebuilding the conversation with broad
`search_paths`, `get_schema`, actions, or many entity calls. At most, make one
focused `fetch` for a concrete source URL/path returned by `ask`; do not loop
back into `ask` or enumerate sites and drives.

For detailed usage and examples, read `ask-work-iq.md`.

---
