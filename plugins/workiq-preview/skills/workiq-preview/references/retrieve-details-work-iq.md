# Extended retrieval parameter and strategy details

Optional detail, not an additional first-call preflight. The first-call contract and source restrictions remain binding.

## Availability and fallback

`retrieve` is in preview and **may or may not be available for a tenant**. Neither
installing a skill nor choosing the `workiq-preview` plugin enables the tool
server-side.

1. Discover the tool in the connected WorkIQ server's catalog and load its live
   definition before calling. Use the host's exact advertised name, not a guessed
   alias. Live argument shapes, accepted values, and availability take precedence
   over examples. This skill's explicit Grounding policy is distinct from older
   tool-description recommendations about which accepted strategy to choose.
2. If the tool is absent, do not invoke it, guess `/retrieve` entity paths, or use
   `search_paths`/`get_schema` to discover its MCP contract. Those tools describe
   entity APIs, not the MCP tool catalog.
3. State the availability limitation. Do not automatically substitute `ask`.
   Offer a delegated answer only as an alternative the user must explicitly
   select before invocation. An `ask` answer is not raw retrieval evidence.
   Independently requested exact reads can still use entity tools; do not fan
   out over broad collections to recreate an unavailable semantic search tool.
4. On explicit authentication, consent, access, or policy errors, follow the
   reported remediation. Do not switch strategies, agents, tools, endpoints, or
   plugins to bypass a denial.
5. A generic error does not establish that the tenant lacks preview access. Report
   the observed failure without inventing a cause. Do not retry in a loop or fan
   out into broad entity searches.
6. If the advertised tool cannot select Grounding when this policy requires it,
   disclose that limitation. Never omit `strategy` to silently use the API's
   Copilot default. Any alternative must preserve the user's requirements and
   be identified as an alternative; changing source restrictions needs permission.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | One focused natural-language query. A nonempty, non-whitespace string is required; do not send an array or batch queries in this field. |
| `strategy` | string | API: no; skill: always explicit | `grounding` is the skill default. The API's omitted-parameter default remains `copilot`. Send one accepted value explicitly; other values are rejected. |
| `capabilities` | object[] | No | Source allow-list: objects such as `{"name":"Email"}`, not bare strings; use only advertised capability-specific scope fields. Cannot be combined with a non-default agent ID. Omit when source families are unspecified; omission or `[]` retains the selected agent/strategy's available sources. Restrict only for an explicit source requirement or concrete justified source need. |
| `agentId` | string | No | Target a specific agent. Defaults to `bizchat-as-gpt-scenario`; omit unless a specific agent is needed and its ID is known. |
| `includeDeveloperCard` | boolean | No | Defaults to `false`. Requests orchestration diagnostics (agent metadata, tool invocation details, retrieval summary); enable only for troubleshooting. |

Do not copy `ask` parameters (`question`, `conversationId`, `fileUrls`) or entity
parameters (`entityUrls`, `path`, `jsonBody`) into `retrieve`. It has no advertised
conversation continuation parameter; include the necessary context in `query`.

## Strategy selection

| Where the needed evidence lives | Strategy |
|--------------------------------|----------|
| Ordinary workplace evidence; source unspecified or location unknown | Explicit `grounding`; do not ask a location clarification merely to choose a strategy |
| Indexed M365 content: SharePoint, OneDrive, Teams, Outlook | Explicit `grounding` |
| Required federated connectors, external sources, or MCP tools, including mixed indexed/external scope | Explicit `copilot` directly; no redundant Grounding probe |
| Dataverse or GraphConnectors capability required | `copilot`; incompatible with `grounding` |
| User explicitly requests Copilot retrieval or search beyond the M365 index | Explicit `copilot`, subject to other source restrictions |
| Grounding-only or indexed-M365-only | `grounding`; no broader fallback without permission to change scope |
| Grounding-only plus a required unsupported capability/source | Explain the conflict and ask which requirement to change; never silently prune capabilities |
| Exact entity URL/ID, complete structured listing, or raw file bytes | Use the appropriate entity tool instead of semantic retrieval |

Both strategies gather context for the caller. **`strategy: "copilot"` is not
`ask`**, and **`grounding` does not mean "any request needing a grounded answer."**
Do not choose `copilot` merely because the host is GitHub Copilot, the location
is unknown, the question is complex, or the answer requires reasoning. Broader
retrieval requires a concrete source need, not uncertainty alone.

`copilot` can search beyond the M365 index only through sources configured and
available to the selected agent and user. It does not promise access to every
external system. Do not use `grounding` as a silent fallback when it would exclude
requested sources, and do not broaden an explicitly M365-only request to external
sources. No fixed latency or exhaustive coverage is guaranteed.

Allowed capability names (case-sensitive): `People`, `Meetings`,
`OneDriveAndSharePoint`, `Email`, `TeamsMessages`, `Dataverse`, `GraphConnectors`.
**If source families are unspecified, omit `capabilities`.** A project topic or
an unknown document location is not a source-family restriction. Do not construct
a guessed files/mail/Teams subset that silently excludes other indexed sources,
such as `People`. Keep the selected strategy's broad supported coverage.

Use an allow-list only to express the user's source requirements or a concrete
source need established during a permitted targeted repair/escalation. That
exception is scoped to the missing evidence, not permission to narrow the whole
objective. Preserve all required families; a source clue is not authorization
to change the user's restrictions.
**`Dataverse` and `GraphConnectors` cannot be combined with `grounding`.** Keep
`copilot` when those sources are needed; do not silently remove them to make a
request valid.

## Examples

### Gather implementation context when source locations are unknown

```json
{
  "query": "Requirements, design decisions, and open questions for Project X implementation",
  "strategy": "grounding"
}
```

### Gather context fully covered by indexed M365 files and conversations

```json
{
  "query": "Project X rollout requirements discussed in SharePoint, email, and Teams this week",
  "strategy": "grounding",
  "capabilities": [
    {"name": "OneDriveAndSharePoint"},
    {"name": "Email"},
    {"name": "TeamsMessages"}
  ]
}
```

### Gather evidence from a connected enterprise source

```json
{
  "query": "Project X customer escalations in connected enterprise sources",
  "strategy": "copilot",
  "capabilities": [{"name": "GraphConnectors"}]
}
```

These are logical tool arguments; invoke the actual host-resolved tool name.
Do not narrow to a capability unless it matches the user's requested scope.

