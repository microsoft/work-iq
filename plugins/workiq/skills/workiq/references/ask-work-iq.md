# ask

Ask Microsoft 365 Copilot to produce a synthesized, conversational answer grounded in workplace data. Use it when the caller wants reasoning or a coherent narrative rather than raw evidence or a literal structured read.

> **⏱️ Latency:** Typical calls take 10–60 seconds; broad questions can run several minutes (hard limit ~300s). Don't chain many `ask` calls where one scoped call or a fast entity tool would do, and split overly broad questions into focused sub-questions.
>
> **Grounding:** Synthesize your answer only from what the response actually contains. If `ask` reports no accessible results or weak evidence, say so — do not pad the answer with specifics the response doesn't support.
>
> **Mutually exclusive with `retrieve`:** Choose one of these tools for the current user turn. Once `ask` is called, do not call `retrieve` afterward for fallback, verification, broadening, or retry. Use at most one `ask` call per turn; if it returns empty, weak, or failed results, report that outcome.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `question` | string | Yes | A natural language question. Be specific about people, topics, or timeframes for better results. |
| `fileUrls` | string[] | No | Optional list of OneDrive or SharePoint file URLs to use as context for the question. |
| `conversationId` | string | No | Optional conversation ID from a prior `ask` response to continue an existing conversation. |
| `agentId` | string | No | Optional agent ID to target a specific M365 Copilot agent. Defaults to bizchat. Use `list_agents` to discover available agent IDs. |

## When to Use

Use `ask` when the caller wants a synthesized or conversational response, including:

- Summarize or explain workplace content
- Compare sources, viewpoints, plans, or decisions
- Identify which documents or messages cover a topic for a human-facing answer
- Summarize the top semantic matches and explain why they matter
- Answer a question by reasoning across multiple M365 sources
- Identify themes, priorities, concerns, ownership, blockers, or implications
- Decide, recommend, or suggest next steps
- Draft suggested prose that does not need to be persisted in Outlook
- Respond conversationally to prompts such as "tell me what happened," "what should I know,"
  "what is the team's take," or "catch me up"

The important boundary is the requested output. Use `ask` when the caller expects a final,
human-facing answer or narrative. The underlying data may come from emails, meetings,
documents, Teams, Calendar, or people, but data location alone does not qualify a request
for `ask`.

Route directly to `ask` for that synthesized deliverable. Do not call `retrieve` first merely
to gather grounding. A request for citations or source names does not make the evidence package
the primary deliverable. Use `retrieve` only when the caller explicitly requests a separate
ranked package of hits, snippets, or grounding for downstream use; synthesize directly from that
package if needed. Never call both `ask` and `retrieve` in the same turn or alternate them in a
loop.

## Do NOT use `ask` as a shortcut for:

- **Ranked M365 indexed evidence, snippets, citations, or grounding for another agent/RAG workflow** → `retrieve`
- **Known-resource reads or authoritative structured records, exact counts, ordering, or filters** → `fetch` / `call_function`
- **API / path questions** ("endpoint", "available operations", "what can I do with…") → `search_paths`
- **Schema / field / body-shape questions** ("what does sendMail take?", "what fields are required?") → `get_schema`
- **Exact mutations by title / name / thread / channel** ("delete the X event", "react to the Y message") → resolve with `fetch`, then call the write/action tool directly
- **A "summarize then draft/send/create/update/delete/forward/react" chain** — continue with the mutation tool after `ask`. The `ask` answer alone does not satisfy the second half of the request.

## Examples

### People, priorities, and expertise
```json
{ "question": "Based on our recent discussions, who appears to own authentication and why?" }
{ "question": "Summarize what Sarah has been focused on lately." }
{ "question": "What should I know about Rob's current priorities and concerns?" }
```

### Meetings and decisions
```json
{ "question": "What decisions were made in my meeting last week about the new feature?" }
{ "question": "What action items came out of the sprint planning?" }
{ "question": "Summarize the architecture discussion from yesterday's standup" }
```

### Emails and messages
```json
{ "question": "Summarize what Rob's recent emails say about the deadline." }
{ "question": "What is the team's overall take on the release?" }
{ "question": "Summarize my unread messages from today" }
{ "question": "Find emails semantically related to release risk and summarize the top matches." }
```

### Documents and specs
```json
{ "question": "Explain the authentication approach described across the latest design documents." }
{ "question": "Compare the current Project X spec with the decisions from the architecture review." }
{ "question": "Based on the payments API documentation, what should an implementer know?" }
{ "question": "Which documents cover Project X?" }
{ "question": "Compare recent supporting files, explain what changed, and cite them." }
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

### Conversational catch-up
```json
{ "question": "Catch me up on the release and tell me what needs my attention." }
{ "question": "What should I know before tomorrow's planning meeting?" }
```

## Requests that belong to other tools

```text
"Find relevant emails from Rob about deadline risk for another agent" → retrieve
"Get my last five emails in chronological order"  → fetch
"Return ranked M365 snippets about Project X"     → retrieve (copilot; omit strategy)
"Get event AAMk... with its start and attendees"   → fetch
"List the members of channel 19:abc..."            → fetch
"Create an Outlook draft to Alex"                  → create_entity
```
