# search_paths

Discover candidate WorkIQ paths and supported operations on the selected
connection. Use before entity tools when the path is unknown. Discover the
live tool schema first: hosts/server versions expose different search contracts.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | When exposed | Natural-language request or path prefix, such as `recent emails` or `/me/chats`. Search results need not be exhaustive. |
| `filter` | string | Legacy contract only | Regex pattern such as `messages` or `.*calendar.*`. Use only when the connected tool exposes this parameter. |

Do not pass both parameters or invent a `backend`, `source`, or `provider`
selector. Report only the surfaces and operations the actual response confirms;
do not assume the catalog is Graph-only or that it exposes every provider.

## Workflow

1. `search_paths` using the live contract to find candidate paths
2. `get_schema` on the chosen path
3. `fetch` or the appropriate write tool (`create_entity` / `update_entity` / `delete_entity` / `do_action` / `call_function`)

If the user asks to discover paths AND read or mutate, continue to the mutation tool after picking the path — discovery alone is incomplete.

Never answer API/path questions from general Graph knowledge, local SQL,
filesystem search, or built-in tools. Summarize every returned path and operation,
not just common examples. A nonmatch, unrelated results, or a partial catalog
means **not confirmed**, not unavailable. For a known provider operation such as
chat grounding, use one exact same-connection `get_schema` check as described in
[Teams chat BotDoc grounding](teams-grounding-work-iq.md#scope-and-availability).
Only explicit unsupported-operation diagnostics establish unavailability.

## Examples

### Find message-related paths (`query` contract)
```json
{ "query": "email and Teams message paths" }
```

When the user asks what paths are available, enumerate every confirmed path
family and operation returned by that `search_paths` call rather than selecting
only the most common examples. Group related results for readability, such as
chat messages, channel messages, replies, actions, retained or pinned
messages, by-ID routes, and hosted content. Do not invent paths absent from the
result, but do not omit less common confirmed variants.

### Find calendar paths (`query` contract)
```json
{ "query": "/me/calendar" }
```

### Broad catalog search (`query` contract)
```json
{ "query": "/" }
```

The `query` contract has no documented list-all or pagination control. Do not
claim this broad search enumerates every available path. Exhaustive enumeration
requires a server-provided complete catalog/export or an explicit completeness
guarantee from the connected tool.

### Find Planner paths (`query` contract)
```json
{ "query": "/planner" }
```

### Find OneDrive/files paths (`query` contract)
```json
{ "query": "/me/drive" }
```

### Legacy regex catalog

Only if the live tool exposes `filter`, use `{"filter":"messages"}` or
`{"filter":".*"}`. Report completeness only if that server's contract guarantees
it; do not treat this legacy example as a parameter accepted by every host.
