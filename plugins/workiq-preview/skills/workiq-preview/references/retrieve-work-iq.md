# retrieve

Semantically search Microsoft 365 and connected tools for grounding data (emails, files, meetings, Teams messages, people) for the current user when the desired content cannot be expressed as a deterministic resource query. Returns ranked evidence, snippets, citations, source metadata, structured hits, and model-friendly grounding markdown. `retrieve` supports user-facing semantic discovery as well as grounding another agent, model, or RAG workflow; it does not synthesize a final conversational answer or guarantee authoritative count, ordering, or completeness.

> **When to reach for `retrieve`:** use it when the requested deliverable is relevant grounding evidence selected by meaning or conceptual relevance rather than a resource path plus deterministic query. This includes finding emails, files, meetings, messages, people, or passages about a topic and searching within a known document or container by meaning.
>
> **Strategy default:** Use `copilot` by default. Omit `strategy` for the normal `copilot` path. Use `grounding` only when the user explicitly asks for faster, optimized-for-latency, or low-latency retrieval, or explicitly names the grounding strategy. Ambiguous requests to "optimize" stay on `copilot` unless the user ties optimization to speed or latency. If connected or external sources may be required, keep `copilot` and explain that `grounding` would narrow coverage even when speed is requested.
>
> **Output boundary:** route to `ask`, not `retrieve`, when the requested deliverable is a synthesized conclusion or narrative — for example, comparing sources or versions, identifying which sources cover a topic, summarizing the top semantic matches, identifying ownership, a point of contact, expertise, dependencies, blockers, implications, priorities, a career timeline, or whether something needs the user's attention. Citations do not change this boundary: supporting sources can accompany an `ask` answer without turning the request into a ranked-evidence deliverable. The fact that evidence must be found across multiple sources does not make the final-answer request a retrieval task. Use `fetch` / `call_function` when the result can be expressed as authoritative deterministic records, fields, counts, ordering, or filters.
>
> **Precision and recall:** Semantic results are ranked and truncated, so recall and precision are not guaranteed. Relevant items may be omitted, and weakly related items may be returned. Do not present retrieval hits as exhaustive or as a deterministic filter result.
>
> **Not a prerequisite:** Do not call `retrieve` before `ask`, an exact entity read, or a mutation. Natural-language phrasing alone does not make a request a retrieval task.
>
> **Mutually exclusive with `ask`:** Choose one of these tools for the current user turn. Once `retrieve` is called, do not call `ask` afterward for synthesis, fallback, verification, broadening, or retry. If synthesis is requested, produce it directly from the cited retrieval evidence. Never alternate the two tools in a loop.
>
> **Distinct-purpose chaining:** `retrieve` may precede `fetch` when semantic discovery identifies a hit whose exact fields are then required. It may follow `fetch` when a deterministic read identifies a document or container whose content must then be searched semantically. Do not chain the tools merely to verify, broaden, or retry a sufficient result.
>
> **Stop at the requested deliverable:** For a grounding request, return sufficient cited retrieval evidence and stop unless a distinct exact read is also required. For a synthesized answer, choose `ask` instead of `retrieve`, even when citations or source names are requested. Use `retrieve` and synthesize directly from its evidence only when the caller explicitly requests a separate ranked package of hits, snippets, citations, or grounding for downstream consumption; do not call `ask` afterward.
>
> **Mutation target resolution:** Do not use `retrieve` to identify a mutation target. Use one bounded `fetch` against the relevant entity collection or filter, ask the user to choose if multiple entities match, and perform the write only with the confirmed ID.
>
> **⏱️ Latency:** Typically 15–60 seconds depending on strategy. Lower than `ask` because it skips conversational synthesis. Prefer `fetch` when you already know the exact resource ID or entity URL.
>
> **Grounding:** Base your answer only on what the response actually contains. If `retrieve` reports no accessible results or weak evidence, say so — do not pad the answer with information the response does not support.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string[] | Yes | One or more natural-language search queries. Each string becomes a separate retrieval query. At least one non-empty, non-whitespace entry is required after stripping. |
| `strategy` | string | No | Retrieval strategy. `copilot` (default) or `grounding`. Any other value is rejected. Case-insensitive. |
| `includeDeveloperCard` | boolean | No | When `true`, requests orchestration diagnostics (agent metadata, tool invocations, retrieval summary) from Sydney. Defaults to `false`. |
| `agentId` | string | No | Only `bizchat-as-gpt-scenario` is accepted; any other value is rejected without reaching Sydney. Omit to use the default. |

## Strategies

The strategy controls **where data comes from**, not how results are ranked or how the response is shaped. Both strategies return the same `RetrievalResponse` envelope — the response parser does not need to change when switching.

### `copilot` (default)

Semantically discover relevant enterprise content and return structured evidence, snippets, citations, and metadata. It can use M365 indexed content plus federated connectors, external connected data sources, plugins, MCP tools, and other supported enterprise systems. Another agent should reason over the returned evidence; `retrieve` does not produce the final conversational answer. Omitting `strategy` selects `copilot`.

Use `copilot` when:
- The request may need data beyond the M365 index (e.g., a Salesforce connector, ServiceNow, a connected enterprise system, or an MCP tool)
- Data location is unknown or requirements may expand beyond M365 indexed content
- You want the broadest possible coverage as a safe default

### `grounding`

Return ranked grounding snippets and citations for a focused query over M365 indexed content only — SharePoint, OneDrive, Teams chats and messages, Outlook mail, and other content in the Microsoft 365 semantic index. Use it for low-latency RAG context assembly. It does not synthesize an answer or perform full agent reasoning. No connected connectors, external sources, plugins, or tools are invoked.

Use `grounding` when:
- The user explicitly asks for faster, optimized-for-latency, or low-latency retrieval
- The user explicitly requests `grounding`
- The request does not require connected or external sources

> **Decision rule: default to `copilot`; opt into `grounding` only for an explicit speed/latency preference.** M365-only data location is not enough by itself to choose `grounding`. If connected or external sources are needed or possible, use `copilot`.

## Response structure

The tool returns two content forms:

1. **Text block** (`content[0].text`) — the `markdown` field verbatim. Contains the grounding summary with inline citation markers like `[^h1]`. This is suitable for direct inclusion in a response without further processing.
2. **Structured content** (`structuredContent["application/vnd.ms-workiq.retrieval"]`) — the full typed payload for programmatic consumers.

> **Choose the response form for the consumer.** Model and prompt consumers should usually receive the citation-bearing `markdown`. Programmatic clients that need fields, IDs, URLs, scores, or facets should consume `structuredContent` / `retrievalHits` directly. Do not force a programmatic caller to re-parse prose.

### Envelope shape (`application/vnd.ms-workiq.retrieval`)

```json
{
  "markdown": "## Found 3 relevant sources\n\n...[^h1]...[^h2]...",
  "resultCount": 3,
  "stoppedReason": "completed",
  "retrievalHits": [ ... ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `markdown` | string | Model-friendly grounding summary with inline citation markers (`[^id]`) that reference hits by their `id`. |
| `resultCount` | integer | Number of surviving hits after Sydney's shim/filter/trim pass. |
| `stoppedReason` | string | Terminal state: `completed`, `cancelled`, or `error`. |
| `retrievalHits` | RetrievalHit[] | Per-source references. May be absent when Sydney returns no hits. |

### RetrievalHit

Each element in `retrievalHits` represents one M365 source:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Hit ID that cross-references the markdown citations (`[^h1]` → `id: "h1"`). |
| `webUrl` | string? | URL the user can navigate to in order to view the source. |
| `resourceMetadata` | ResourceMetadata? | Per-resource metadata facets (see below). |
| `sensitivityLabel` | object? | MIP sensitivity label for the source: `id`, `displayName`, `isEncrypted`. Present only when Sydney supplies it. |
| `relevanceScore` | number? | Sydney relevance score. Present only when Sydney supplies it. |

### ResourceMetadata facets

Only the facet(s) matching the resource type are present on a given hit. Multiple facets may appear simultaneously.

| Facet | Present for | Fields |
|-------|-------------|--------|
| `document` | Files, OneDrive/SharePoint documents | `title`, `authorName`, `occurrenceTime` (ISO-8601 last-modified) |
| `email` | Emails | `subject`, `senderName`, `sentTime` (ISO-8601) |
| `meeting` | Calendar meetings | `title`, `organizerName`, `startTime` (ISO-8601) |
| `video` | Videos | `title`, `durationSeconds` |
| `web` | Web pages, external links, connector content | `title`, `siteName` |
| `chat` | Teams chat/channel messages | `title` |
| `image` | Images | `title` |
| `general` | **Non-contractual fallback** for resource types without a dedicated facet | `title`, `authorName`, `occurrenceTime` |


### Runtime handling (large responses)

Some MCP hosts (including the GitHub Copilot CLI) surface an MCP tool result as a **single concatenated blob** — the `markdown` text block followed by the JSON `structuredContent`. When the combined payload exceeds the host's inline output cap (typically ~20 KB), the entire blob is spilled to a temporary file and the agent only sees a short preview. In that case:

- **Read the spilled payload once.** Do not repeatedly inspect the same payload with `view`, `rg`, or shell commands.
- **Do not** reparse the structured JSON to rebuild a summary — the `snippet` / discussion fields are long and noisy, and doing so drops the built-in `[^h1]` citations.
- **Do** slice the spilled file to isolate the leading `markdown` segment and use it verbatim. The markdown ends immediately before the JSON tail, which starts with a line like:

  ```
  {"application/vnd.ms-workiq.retrieval":{"markdown":"…
  ```

  Everything above that line is the model-friendly summary already formatted with inline `[^id]` citations that map to `retrievalHits[*].id`.
- If you need one or two specific fields (e.g., `webUrl`, `sensitivityLabel`) from a particular hit, fetch just that hit's block from the JSON tail — do not dump the whole structured payload back into the response.

The markdown-first path is the intended contract; the structured payload is a supplementary machine-readable view, not a replacement for the markdown summary.

## When to use `retrieve`, `ask`, or `fetch`

> `retrieve` searches by meaning, `ask` returns synthesis, and `fetch` executes an expressible deterministic resource query.

**Rule of thumb:** use `retrieve` when intent depends on semantic meaning; use `fetch` / `call_function` when the agent can express the desired result as a known resource path and deterministic query.

| Caller / scenario | Tool | Why |
|---|---|---|
| Another agent or LLM needs enterprise grounding | `retrieve` (`copilot`, omit `strategy`) | Broadest evidence coverage is the default |
| RAG pipeline, grounding step, or agent-to-agent handoff | `retrieve` | Per-source metadata + IDs are the native input format |
| Programmatic client needs semantic M365 evidence | `retrieve` | Consume `structuredContent` / `retrievalHits` directly |
| Need inline per-result metadata (subject, author, dates, URL, sensitivity label) | `retrieve` | Facets are surfaced on each hit |
| Need access to connected data sources beyond M365 | `retrieve` (`strategy: copilot`) | Federated connectors + MCP tools included |
| User explicitly asks for faster / low-latency M365-only retrieval | `retrieve` (`strategy: grounding`) | Narrows retrieval to the M365 index for latency |
| Find semantically relevant recent indexed items for grounding | `retrieve` (`copilot`, omit `strategy`) | Relevance-ranked evidence with broad coverage |
| Search within a known document or container by meaning | `retrieve` (`copilot`, omit `strategy`) | Semantic content matching cannot be expressed as an entity metadata filter |
| Summarize, explain, compare, draft, answer, decide, or recommend | `ask` | Produces the synthesized conversational result |
| Read exact records, ordered last-N items, exact keyword searches, complete filtered collections, IDs, or fields | `fetch` / `call_function` | Performs an authoritative deterministic query |

`ask` and `retrieve` serve different outputs and are mutually exclusive within one user turn. Never chain or alternate them. When both evidence and synthesis are requested, use `retrieve` and synthesize directly from its cited evidence. `retrieve` and `fetch` may be chained only when semantic discovery/content search and an exact resource read are both independently required.

## Examples

### Documents and files (default → `copilot`)

```json
{
  "query": ["authentication design spec", "auth architecture for Project X"]
}
```

### Emails about a topic

```json
{
  "query": ["emails about the Q3 release deadline"]
}
```

### Relevant recent emails for agent grounding

```json
{
  "query": ["recent emails with James Doe that provide grounding about launch risk"]
}
```

### Meeting notes and decisions

```json
{
  "query": ["decisions from the architecture review meeting last week"]
}
```

### Teams messages and chats

```json
{
  "query": ["Teams discussion about the deployment rollback"]
}
```

### People-related evidence

```json
{
  "query": ["messages and documents mentioning billing service ownership", "project content about authentication work"]
}
```

### Explicit low-latency request (→ `grounding`)

```json
{
  "query": ["Use grounding strategy for the following query: documents about the authentication redesign"],
  "strategy": "grounding"
}
```

### M365 content plus a connected data source (→ `copilot`)

```json
{
  "query": ["SharePoint implementation plan and the Salesforce account records for Contoso"],
  "strategy": "copilot"
}
```

### M365 plus an MCP tool or connected enterprise system

```json
{
  "query": ["deployment plan and the current rollout state from the deployment tracker"],
  "strategy": "copilot"
}
```

### Unknown data location — safe default (`copilot`)

```json
{
  "query": ["latest status on the token minting feature"],
  "strategy": "copilot"
}
```

### Multi-query search (each string is a separate retrieval query)

```json
{
  "query": [
    "SharePoint API permissions",
    "Graph delegated scopes for files",
    "consent requirements for Files.ReadWrite"
  ]
}
```

## Interpreting the response

1. **Check `stoppedReason` first.** If `error`, the response is a tool error — the `markdown` field may contain a diagnostic message but should not be treated as grounding content.
2. **Select the response form for the downstream consumer.** Forward citation-bearing `markdown` to a model or prompt. Return `structuredContent` / `retrievalHits` to a programmatic client that needs fields, IDs, URLs, scores, or facets.
3. **Only descend into `retrievalHits` for targeted lookups** the markdown doesn't already expose — e.g., a specific `webUrl`, `sensitivityLabel`, `relevanceScore`, or `resourceMetadata` facet for one hit. Cross-reference by `id` (`[^h1]` → `retrievalHits[*].id === "h1"`).
4. **Honor `sensitivityLabel`.** When a hit carries a sensitivity label (especially `isEncrypted: true`), respect the classification and do not include the content verbatim in contexts that would violate the label.
5. **Any response with `stoppedReason: completed` is terminal for that semantic retrieval attempt.** Consume the result even when it is large, empty, weak, or imperfect. Do not add another `retrieve`, `ask`, `fetch`, or `search_paths` call merely to improve or verify it. A focused `fetch` is allowed only when the original request separately requires exact fields from a selected hit.
6. **An empty `retrievalHits` with `stoppedReason: completed` is a valid "no results" response.** Report it as "nothing found"; it is not a failed retrieval.
7. **Only a failed `grounding` call permits one retry with `copilot`.** Keep the same user intent; a clearer query is fine, but do not branch into entity-path discovery or synthesis.
8. **A `copilot` result is always terminal as a retrieval attempt.** If `copilot` was the first strategy, do not retry. If it followed a failed `grounding` call, it is the final retrieval attempt. Report the observed result without fallback calls; use `fetch` afterward only for a distinct exact read independently required by the original request.

## Error states

| Condition | Behaviour |
|-----------|-----------|
| `query` is null, empty, or all-whitespace | Tool error (no Sydney call). Fix: provide at least one non-empty query string. |
| `agentId` is set to anything other than `bizchat-as-gpt-scenario` | Tool error (no Sydney call). Fix: omit `agentId` or pass the supported value. |
| `strategy` is set to anything other than `copilot` or `grounding` | Tool error (no Sydney call). Fix: omit `strategy` or use a supported value. |
| Sydney returns `stoppedReason: "error"` | `isError: true`, but `markdown` is still populated for diagnostics. Do not use `markdown` as grounding content. Retry only when the failed strategy was `grounding`, and then exactly once with `copilot`; a failed `copilot` call is terminal. |
| Network/auth failure | Tool error with classified message. Check connectivity and authentication. |
