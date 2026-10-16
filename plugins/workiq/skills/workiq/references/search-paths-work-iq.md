# search_paths

Discover available WorkIQ API and provider-backed paths. Use as the first step
before entity tools when the path is unknown and before every SharePoint
provider action.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | string | Yes | Regex or path prefix, such as `messages`, `.*calendar.*`, or `/sharepoint`. Empty or missing filters are rejected. |

> **⚠️ One catalog only.** `search_paths` enumerates one WorkIQ catalog that
> contains Graph-backed entity paths and provider-backed paths such as
> `/sharepoint/*` and `/businessapps/*`. There is no `backend`, `source`, or
> `provider` argument. Select the provider route from the returned path and
> description instead of trying to choose a backend in the tool input.

## Workflow

1. `search_paths` with a focused filter or path prefix to find candidate paths
2. `get_schema` on the chosen path
3. `fetch` or the appropriate write tool (`create_entity` / `update_entity` / `delete_entity` / `do_action` / `call_function`)

For a returned `/sharepoint/*` operation, use `get_schema` with
`operationType: "action"` and invoke it with `do_action`. If the schema requires
`siteKey`, resolve it through `/sharepoint/get_site_key` and pass it through
unchanged.

If the user asks to discover paths AND read or mutate, continue to the mutation tool after picking the path — discovery alone is incomplete.

Never answer API/path questions from general Graph knowledge, local SQL, filesystem search, or built-in tools. Summarize paths from `search_paths`; if none matched, say WorkIQ did not confirm one.

## Examples

### Find all message-related paths
```json
{ "filter": "messages" }
```

### Find SharePoint provider actions

```json
{ "filter": "/sharepoint" }
```

For a concrete request, prefer the exact intent over broad enumeration, for
example `SharePoint move files between libraries` or `SharePoint create list
items`. Use only paths returned by that call.

When the user asks what paths are available, enumerate every confirmed path
family and operation returned by that `search_paths` call rather than selecting
only the most common examples. Group related results for readability, such as
chat messages, channel messages, replies, actions, retained or pinned
messages, by-ID routes, and hosted content. Do not invent paths absent from the
result, but do not omit less common confirmed variants.

### Find calendar paths
```json
{ "filter": ".*calendar.*" }
```

### Enumerate every path
```json
{ "filter": ".*" }
```

### Find Planner paths
```json
{ "filter": "planner" }
```

### Find OneDrive/files paths
```json
{ "filter": "drive" }
```
