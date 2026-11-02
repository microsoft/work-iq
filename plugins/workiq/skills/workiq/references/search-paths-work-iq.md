# search_paths

Discover available WorkIQ API and provider-backed paths. Use as the first step
before entity tools when the path or its supported operation is unknown.

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

For a returned `/sharepoint/*` path, inspect its advertised `operations` and use
that operation type for `get_schema`. An `action` uses `do_action`; a `function`
uses `call_function`. If the schema requires `siteKey`, discover and inspect
`/sharepoint/get_site_key`, then pass its returned opaque key through unchanged.
Reuse a path, advertised operation, and request schema already validated in
this conversation for the same connection, tenant, and user; do not repeat
`search_paths` or `get_schema` for that contract. Reuse a returned siteKey for
the exact same site in that context, not across identities or environments.
Revalidate after a reconnect, identity/routing change, or announced catalog
change. Contract reuse does not authorize an operation or cache business data.
If the path and advertised operation are already confirmed but the request
schema is missing, call `get_schema` directly instead of searching again.
If only the target site changes, retain the validated operation contract and
resolve that site's key; if only the operation changes, retain the same site's
key. See the [provider reuse workflow](sharepoint-work-iq.md#provider-backed-sharepoint-operations).

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

### Find SharePoint provider operations

When the schema requires `query`, use a complete candidate path by itself
when the intended operation name is known:

```json
{ "query": "/sharepoint/get_list_schema" }
```

This example is a discovery candidate, not proof that the connected catalog
exposes it. Alternatively, use a short natural-language intent:

```json
{ "query": "SharePoint move files between document libraries" }
```

Never append prose to a path or path prefix. Reserve
`{"query":"/sharepoint"}` for browsing unknown operations rather than a known
operation lookup.

When it requires legacy `filter`, use a path-keyword or regex rather than
assuming that natural-language SharePoint intent is supported. Prefer an
exact candidate pattern for a known operation:

```json
{ "filter": "^/sharepoint/get_list_schema$" }
```

Reserve broad prefix patterns for browsing unknown operations:

```json
{ "filter": "^/sharepoint/" }
```

Use only returned `/sharepoint/*` paths whose descriptions and operations match
the requested scope. Search results can be bounded; do not treat a broad prefix
result as an exhaustive inventory or include unrelated connector paths.
When a matching entry's complete path, operations, and description are already
visible in a result preview, do not read unrelated spilled entries. If needed
details are incomplete, read only the bounded portion containing that entry.
