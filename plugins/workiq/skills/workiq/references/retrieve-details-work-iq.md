# Retrieval parameters and examples

## Required before use

- [First-call retrieval contract](retrieve-work-iq.md)

Optional detail, not an additional first-call preflight. Strategy selection,
availability, source restrictions and safe stopping are owned by the required
first-call contract; examples do not change those rules.
The [published retrieve contract](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/work-iq/mcp/retrieve)
describes current source support; the connected tool schema governs arguments.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | One focused natural-language query. A nonempty, non-whitespace string is required; do not send an array or batch queries in this field. |
| `strategy` | string | API: no; skill: always explicit | API default: `grounding`. Use it for known indexed M365 content; use `copilot` for unknown sources or possible connected enterprise sources. Both return evidence, not a final answer. |
| `capabilities` | object[] | No | Source allow-list: objects such as `{"name":"Email"}`, not bare strings; use only advertised capability-specific scope fields. Cannot be combined with a non-default agent ID. Omit when source families are unspecified; omission or `[]` retains the selected agent/strategy's available sources. Restrict only for an explicit source requirement or concrete justified source need. |
| `agentId` | string | No | Target a specific agent. Defaults to `bizchat-as-gpt-scenario`; omit unless a specific agent is needed and its ID is known. |
| `includeDeveloperCard` | boolean | No | Defaults to `false`. Requests orchestration diagnostics; enable only for troubleshooting. |

Supported case-sensitive capability names: `People`, `Meetings`,
`OneDriveAndSharePoint`, `Email`, `TeamsMessages`, `GraphConnectors`.
`GraphConnectors` requires `copilot`. Dataverse and Power BI are roadmap sources,
not currently supported retrieval sources; a `Dataverse` schema name does not
establish support. Disclose that limitation rather than sending an unsupported
source request or silently dropping it.

Do not copy `ask` parameters (`question`, `conversationId`, `fileUrls`) or entity
parameters (`entityUrls`, `path`, `jsonBody`) into `retrieve`. It has no advertised
conversation continuation parameter; include necessary context in `query`.

## Parameterized examples

Replace query placeholders with the user's actual evidence goal. Each example
demonstrates a distinct source requirement; it is not a default topic or permission
to alter scope. Invoke the actual host-resolved tool name and live argument shape.

### Source location unknown

Use `copilot` directly, within the user's authorized scope. Omit `capabilities`;
do not infer a narrower allow-list from a project topic or probe Grounding first.

```json
{
  "query": "{requested evidence goal}",
  "strategy": "copilot"
}
```

Known indexed M365 content can use `grounding` without an allow-list; omission
of `capabilities` does not itself mean the source location is unknown.

### Explicit indexed-M365 source families

This allow-list is appropriate only when those families match the requested scope.

```json
{
  "query": "{requested evidence goal within the explicit SharePoint, email and Teams scope}",
  "strategy": "grounding",
  "capabilities": [
    {"name": "OneDriveAndSharePoint"},
    {"name": "Email"},
    {"name": "TeamsMessages"}
  ]
}
```

### Required connected enterprise source

Use `copilot` directly for a required allowed connector; an empty Grounding result
alone does not establish that requirement or authorize this expansion.

```json
{
  "query": "{requested evidence goal in the authorized connected source}",
  "strategy": "copilot",
  "capabilities": [{"name": "GraphConnectors"}]
}
```
