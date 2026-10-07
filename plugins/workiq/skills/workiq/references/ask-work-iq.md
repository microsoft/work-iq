# ask

Query Microsoft 365 Copilot for workplace intelligence using natural language.
When both plugins are installed, `workiq-preview` takes precedence; load its skill
instead of using this public ask-first policy for overlapping requests.
Standalone public `workiq` is ask-first for semantic synthesis and discovery. Exact entities,
known-date calendar, library columns, complete structured collections and bytes
use their entity tools. An exposed `retrieve` alone does not change public policy.

> **Recovery:** Latency/timeout does not establish a cause. Do not automatically
> fan out a failed question. Honor actual backoff and the shared objective budget
> in [troubleshooting](troubleshooting.md); explicit denial stops all alternatives.
>
> **Grounding:** Synthesize your answer only from what the response actually contains. If `ask` reports no accessible results or weak evidence, say so — do not pad the answer with specifics the response doesn't support.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `question` | string | Yes | A natural language question. Be specific about people, topics, or timeframes for better results. |
| `fileUrls` | string[] | No | Optional list of OneDrive or SharePoint file URLs to use as context for the question. |
| `conversationId` | string | No | Optional conversation ID from a prior `ask` response to continue an existing conversation. |
| `agentId` | string | No | Optional agent ID to target a specific M365 Copilot agent. Defaults to bizchat. Use `list_agents` to discover available agent IDs. |
| `timeZone` | string | No | Advertised IANA time zone for interpreting/returning times; use the host/user's known zone context, not a raw offset or abbreviation. Omit when unavailable. |


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

Establish the requested effect before that chain: a search-like "reply emails"
phrase does not authorize creation or sending. Exact-thread summary plus reply
draft uses [Mail](mail-work-iq.md), not an `ask` mutation resolver. All actions
remain subject to exact identity and required confirmation.


## Source verification and response handling

Verify each requested source's identity/name, type, location/time and relevant
content before answering or comparing. A near-match is not the requested file;
resolve both sides independently and name unresolved targets rather than silently
substituting. For a numbered-section summary, put the exact filename in the
initial question. If returned evidence supports it, answer without more calls;
otherwise permit one supported in-scope refinement or exact content read for the
specific gap. Do not require a download or enumerate entire sites/drives.

Check actual referents, required facts, comparator and coverage before synthesis.
Distinguish absent, not retrieved, outside scope and deliberately excluded.
Preserve citations and uncertainty; do not infer full source content from a
snippet or invent "these attendees"/"that week". Reuse only the appropriate
returned `conversationId` for a same-agent follow-up. If earlier context is
unavailable, disclose it or clarify rather than reconstructing it through a sweep.


Optional examples: [examples](ask-examples-work-iq.md).
