# ask

Delegate a natural-language workplace question to Microsoft 365 Copilot for retrieval, reasoning, and a synthesized answer. For work context that you will reason over or synthesize yourself, prefer preview [`retrieve`](retrieve-work-iq.md) when available. `retrieve` with `strategy: "copilot"` still returns grounding evidence, not an `ask` answer.

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
- You want Microsoft 365 Copilot to synthesize a workplace answer across accessible sources.
- You are continuing a Copilot conversation using a returned `conversationId`.
- Preview `retrieve` is unavailable and a synthesized answer meets the user's need; disclose the fallback rather than presenting it as raw retrieval evidence.

An open-ended question alone does not determine the tool: use `retrieve` for caller-owned reasoning and `ask` for Copilot-owned synthesis. Use entity tools for precise structured data or mutations. Do not use either semantic tool to bypass an access or policy denial.

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

For an exact schedule ("What meetings do I have today?"), use `fetch` on a bounded `/me/calendarView` rather than `ask` or `retrieve`.

### Priorities and goals
```json
{ "question": "Based on discussions with my manager, what are my top priorities?" }
{ "question": "What are the team's goals for this quarter?" }
{ "question": "What's blocking the release?" }
```

### Delegating a requirements summary

This asks Copilot to synthesize the requirements. To gather evidence for your own implementation reasoning instead, use `retrieve` as described in [its reference](retrieve-work-iq.md).
```json
{ "question": "Based on the latest spec for Project X, what are the backend requirements?" }
```
