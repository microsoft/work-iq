# search_paths

Discover available WorkIQ entity paths and supported operations. Use as the first step before entity tools when the
path is unknown.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | string | When named in `inputSchema.required` | Legacy regex/path-keyword search. Business Applications also accepts natural-language discovery through this parameter. |
| `query` | string | When named in `inputSchema.required` | Natural-language description of the resource or action to discover. |

Inspect the connected WorkIQ tool schema and send only accepted fields. Never
send both `filter` and `query`, and never retry with a different argument after
rejection.

There is no `backend`, `source`, or `provider` argument. WorkIQ may fan out to
enabled providers, but only returned paths prove that a provider participated.
For Business Applications, require a returned `/businessapps/...` path before
following it.

## Workflow

1. Make one focused `search_paths` call with an accepted `filter` or `query`
   input to find candidate paths.
2. `get_schema` on the chosen path
3. `fetch` or the appropriate write tool (`create_entity` / `update_entity` / `delete_entity` / `do_action` / `call_function`)

If the user asks to discover paths AND read or mutate, continue to the mutation tool after picking the path — discovery alone is incomplete.

If Business Applications discovery errors or returns no `/businessapps/...`
path, do not repeat or broaden it. Fetch `/businessapps/environments/`, resolve
only the exact requested environment, and inspect only its relevant returned
`apps`, `skills`, or `tables` collection. Abstain when the exact environment or
capability is absent.

Never answer API/path questions from general Graph knowledge, local SQL, filesystem search, or built-in tools. Summarize paths from `search_paths`; if none matched, say WorkIQ did not confirm one.

## Examples

### Find all message-related paths

When the schema requires `filter`:

```json
{ "filter": "messages" }
```

When the schema requires `query`:

```json
{ "query": "message resources and actions" }
```

When the user asks what paths are available, enumerate every confirmed path
family and operation returned by that `search_paths` call rather than selecting
only the most common examples. Group related results for readability, such as
chat messages, channel messages, replies, actions, retained or pinned
messages, by-ID routes, and hosted content. Do not invent paths absent from the
result, but do not omit less common confirmed variants.

### Find calendar paths

Legacy `filter` form:

```json
{ "filter": ".*calendar.*" }
```

Natural-language `query` form:

```json
{ "query": "calendar resources and actions" }
```

### Discover Business Applications paths

Use natural language in whichever parameter is required:

```json
{ "filter": "qualify a lead" }
```

or:

```json
{ "query": "qualify a lead" }
```

For known structural inventory, skip discovery and use the exact read path. For example, list Business Applications
environments with `fetch` on `/businessapps/environments/`.
