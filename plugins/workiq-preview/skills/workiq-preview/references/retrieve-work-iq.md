# retrieve

Search across the user's M365 data (emails, files, meetings, Teams messages, people) and return structured results with a model-friendly grounding summary. Unlike `ask`, which synthesizes a conversational answer, `retrieve` returns **raw retrieval hits** — per-source references with rich metadata (resource type, URL, author, timestamps, sensitivity label) plus a grounding markdown — optimized for programmatic consumption, RAG pipelines, and agent orchestratedSearch.

> **⏱️ Latency:** Typically 15–60 seconds depending on strategy. Lower than `ask` because it skips conversational synthesis. Prefer `retrieve` over `ask` when you need structured hits rather than a synthesized answer, and prefer entity tools when you already know the exact resource path.
>
> **Grounding:** Base your answer only on what the response actually contains. If `retrieve` reports no accessible results or weak evidence, say so— do not pad the answer with information the response does not support.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string[] | Yes | One or more natural-language search queries. Each string becomes a separate retrieval query. At least one non-empty, non-whitespace entry is required after stripping. |
| `strategy` | string | No | Retrieval strategy. `copilot` (default) or `orchestratedSearch`. Any other value is rejected. Case-insensitive. |
| `includeDeveloperCard` | boolean | No | When `true`, requests orchestration diagnostics (agent metadata, tool invocations, retrieval summary) from Sydney. Defaults to `false`. |
| `agentId` | string | No | Only `bizchat-as-gpt-scenario` is accepted; any other value is rejected without reaching Sydney. Omit to use the default. |

## Strategies

The strategy controls **where data comes from**, not how results are ranked or how the response is shaped. Both strategies return the same `RetrievalResponse` envelope — the response parser does not need to change when switching.

### `copilot` (default)

M365 indexed content **plus** federated connectors, external connected data sources, plugins, MCP tools, and other supported enterprise systems. Omitting `strategy` selects `copilot`.

Use `copilot` when:
- The request may need data beyond the M365 index (e.g., a Salesforce connector, ServiceNow, a connected enterprise system, or an MCP tool)
- Data location is unknown or requirements may expand beyond M365 indexed content
- You want the broadest possible coverage as a safe default

### `orchestratedSearch`

M365 indexed content **only** — SharePoint, OneDrive, Teams chats and messages, Outlook mail, and other content in the Microsoft 365 semantic index. No connected connectors, external sources, plugins, or tools are invoked.

Use `orchestratedSearch` when:
- The request can be satisfied entirely from M365 indexed data
- No federated connector, external data source, plugin, or MCP tool is required

> **Decision rule: choose based on data location, not latency or complexity.** If all the required information is in the M365 index, use `orchestratedSearch`. If the request needs anything beyond the M365 index — or you are unsure — use `copilot`.

## Response structure

The tool returns two content forms:

1. **Text block** (`content[0].text`) — the `markdown` field verbatim. Contains the orchestratedSearch summary with inline citation markers like `[^h1]`. This is suitable for direct inclusion in a response without further processing.
2. **Structured content** (`structuredContent["application/vnd.ms-workiq.retrieval"]`) — the full typed payload for programmatic consumers.

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
| `markdown` | string | Model-friendly orchestratedSearch summary with inline citation markers (`[^id]`) that reference hits by their `id`. |
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

- **Do not** reparse the structured JSON to rebuild a summary — the `snippet` / discussion fields are long and noisy, and doing so drops the built-in `[^h1]` citations.
- **Do** slice the spilled file to isolate the leading `markdown` segment and use it verbatim. The markdown ends immediately before the JSON tail, which starts with a line like:

  ```
  {"application/vnd.ms-workiq.retrieval":{"markdown":"…
  ```

  Everything above that line is the model-friendly summary already formatted with inline `[^id]` citations that map to `retrievalHits[*].id`.
- If you need one or two specific fields (e.g., `webUrl`, `sensitivityLabel`) from a particular hit, fetch just that hit's block from the JSON tail — do not dump the whole structured payload back into the response.

The markdown-first path is the intended contract; the structured payload is a supplementary machine-readable view, not a replacement for the markdown summary.

## When to use `retrieve` vs `ask`

> **Any question that can go to `ask` can also go to `retrieve`.** The difference is output shape: `ask` synthesizes a prose answer; `retrieve` returns structured hits for you (or a downstream agent) to process directly.

| Scenario | Tool |
|----------|------|
| Need a synthesized, conversational answer | `ask` |
| Need structured per-source hits for programmatic use | `retrieve` |
| Building a RAG pipeline, orchestratedSearch step, or agent context | `retrieve` |
| Want inline metadata per result (subject, author, dates, URL) | `retrieve` |
| Feeding results into another agent or downstream tool | `retrieve` |
| Need access to connected data sources beyond M365 | `retrieve` (`strategy: copilot`) |
| Request satisfied entirely from M365 indexed content | `retrieve` (`strategy: orchestratedSearch`) |
| User wants a readable answer, not a structured list | `ask` |

`ask` and `retrieve` are complementary, not substitutes — `retrieve` surfaces the raw hits that `ask` would turn into prose. Use `ask` when Sydney should compose the final answer. Use `retrieve` when you or another agent will process the hits directly.

## Examples

### Documents and files (M365 only → `orchestratedSearch`)

```json
{
  "query": ["authentication design spec", "auth architecture for Project X"],
  "strategy": "orchestratedSearch"
}
```

### Emails about a topic

```json
{
  "query": ["emails about the Q3 release deadline"],
  "strategy": "orchestratedSearch"
}
```

### Meeting notes and decisions

```json
{
  "query": ["decisions from the architecture review meeting last week"],
  "strategy": "orchestratedSearch"
}
```

### Teams messages and chats

```json
{
  "query": ["Teams discussion about the deployment rollback"],
  "strategy": "orchestratedSearch"
}
```

### People and expertise

```json
{
  "query": ["who owns the billing service", "authentication expert on the team"],
  "strategy": "orchestratedSearch"
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

1. **Check `stoppedReason` first.** If `error`, the response is a tool error — the `markdown` field may contain a diagnostic message but should not be treated as orchestratedSearch content.
2. **Use the `markdown` block for grounding.** The inline citations (`[^h1]`) map to `retrievalHits[*].id` — use them to cross-reference structured metadata.
3. **Access faceted metadata from `resourceMetadata`.** Check which facet is populated to determine the resource type, then read the typed fields (subject, title, sentTime, etc.).
4. **Honor `sensitivityLabel`.** When a hit carries a sensitivity label (especially `isEncrypted: true`), respect the classification and do not include the content verbatim in contexts that would violate the label.
5. **An empty `retrievalHits` with `stoppedReason: completed` is a valid "no results" response.** Report it as "nothing found" — do not retry in a loop or fall back to `ask`.

## Error states

| Condition | Behaviour |
|-----------|-----------|
| `query` is null, empty, or all-whitespace | Tool error (no Sydney call). Fix: provide at least one non-empty query string. |
| `agentId` is set to anything other than `bizchat-as-gpt-scenario` | Tool error (no Sydney call). Fix: omit `agentId` or pass the supported value. |
| `strategy` is set to anything other than `copilot` or `orchestratedSearch` | Tool error (no Sydney call). Fix: omit `strategy` or use a supported value. |
| Sydney returns `stoppedReason: "error"` | `isError: true`, but `markdown` is still populated for diagnostics. Do not use `markdown` as orchestratedSearch content. |
| Network/auth failure | Tool error with classified message. Check connectivity and authentication. |
