# Business Applications

Use WorkIQ entity tools with paths under `/applications/` for business-application environments, data, apps,
skills, APIs, and operations. This path space is distinct from Microsoft Graph application registrations. Do not
substitute a separate endpoint, another MCP server, or an invented REST URL.

## Discovery and path grounding

1. Start intent-driven discovery with `do_action` on `/applications/me` and
   `{"query":"<business record, workflow, or app intent>","environmentId":"<optional>","limit":10}`. The `query`
   is required. Results include grounded paths plus environment and application IDs. For example, use
   `{"query":"qualify a lead"}` to discover the relevant sales application and operations.
2. Use `fetch` on `/applications/environments/` when the user explicitly asks to list environments or identify the
   default environment. Do not guess an environment ID.
3. Use `search_paths` to discover Business Applications paths. Set `filter` to a plain leading-slash path such as
   `/applications` for path-prefix matching, or to a regular expression over paths when a narrower pattern is
   needed. The filter is **not a natural-language or semantic search**. Returned paths can be passed directly to
   `fetch`, `get_schema`, or a write tool.
4. Use `get_schema` on the returned concrete path before an unfamiliar mutation or operation. Never fill in
   `{environmentId}`, `{tableName}`, `{recordId}`, `{appName}`, `{apiName}`, or operation names from memory.

## Exact path and tool selection

| Intent | WorkIQ tool and Business Applications path |
|---|---|
| List environments/default | `fetch` `/applications/environments/` |
| List or describe tables | `fetch` or `get_schema` `/applications/environments/{environmentId}/tables[/<tableName>]` |
| Read a record | `fetch` `/applications/environments/{environmentId}/tables/{tableName}/records/{recordId}` |
| Query environment data | `call_function` `/applications/environments/{environmentId}/query` with `jsonBody: {"querytext":"SELECT ..."}` |
| Create a table | `create_entity` on `/applications/environments/{environmentId}/tables` with `{tableName, columns, displayName?, description?}` |
| Create a record | `create_entity` on `/applications/environments/{environmentId}/tables/{tableName}/records` with `{"item":{...}}` |
| Update a record | `update_entity` on `/applications/environments/{environmentId}/tables/{tableName}/records/{recordId}` with changed fields |
| Delete a record/table | `delete_entity` on the exact record or table path returned by discovery |
| Upload a Business Applications record file | `do_action` on `/applications/environments/{environmentId}/tables/{tableName}/records/{recordId}/files/{columnName}/upload` with the schema-defined file arguments |
| Download a Business Applications record file | `call_function` on `/applications/environments/{environmentId}/tables/{tableName}/records/{recordId}/files/{columnName}/download` with optional `destinationPath` |
| List or inspect apps | `fetch` `/applications/environments/{environmentId}/apps[/<appName>]` |
| Run an app-scoped operation | `do_action` on the exact `.../apps/{appName}/.../operations/{operationName}` path returned by `get_schema` |
| Invoke a Custom API | `call_function` `/applications/environments/{environmentId}/apis/{apiName}` with the API inputs in `jsonBody` |
| Delegate an open-ended goal to an environment | `do_action` `/applications/environments/{environmentId}/execute-work` with `{"instruction":"...","sessionId":"<optional>"}` |
| Invoke an in-app MCP tool | `do_action` on the exact `/applications/environments/{environmentId}/mcp/{serverName}/tools/{toolName}` path |

`call_function` supports an optional `jsonBody` for Business Applications paths. Continue encoding Microsoft
Graph/OData function parameters in the URL; use `jsonBody` only when the discovered `/applications` function schema
requires it, especially the environment query and Custom API paths.

Business Applications record file operations are distinct from Microsoft Graph binary content and the
`fetch_blob` / `upload_blob` release status. Do not substitute those Graph blob tools for the
`/applications/.../files/{columnName}/upload` or `/download` routes, and do not generalize these routes to OneDrive,
SharePoint, mail attachments, or other Graph resources.

## When to use `execute-work`

Use `execute-work` when the user wants to **delegate an open-ended goal** to the business agent in a specific
environment and completing that goal requires the environment to plan or coordinate multiple steps, choose among
its skills or operations, or maintain a delegated work session. Discover the environment and confirm that its
returned paths expose `execute-work`, then pass the user's complete goal in `instruction`.

Prefer direct tools when WorkIQ already exposes the precise operation:

- Use `fetch`, `get_schema`, or `search_paths` for discovery, metadata, and exact reads.
- Use `create_entity`, `update_entity`, or `delete_entity` for a known data mutation.
- Use `call_function` for a discovered query or function.
- Use `do_action` on a discovered app-scoped operation or Custom API when that operation directly satisfies the
  request.

Choose `execute-work` when the requested outcome is best expressed as a delegated goal rather than a specific
WorkIQ operation. For a continuation, pass the prior `sessionId`; otherwise omit it. Treat the returned work result
as evidence from the environment, and surface any ambiguity, partial completion, requested confirmation, or failure
rather than claiming success.

## App-scoped operations

App-scoped paths intentionally differ from environment table paths:

- Environment record collection:
  `/applications/environments/{environmentId}/tables/{tableName}/records`
- App table:
  `/applications/environments/{environmentId}/apps/{appName}/tables/{tableName}`
- App operations are directly under the app table or record path and **omit `/records/`**. Use only operation names
  returned by `get_schema`, such as `view`, `read`, `prepare_create`, `submit_create`, `prepare_update`,
  `submit_update`, `prepare_delete`, or `submit_delete`.
- Use `view` for bounded/form-aware app record browsing. Use `prepare_*` then `submit_*` when the schema exposes
  that two-step operation.

## Grounding rules

- WorkIQ's top-level `ask` can also answer questions about Business Applications request, though some applications may not be included in ask() so you may need to explore both ask() and /applications/me paths to get an answer.
- Do not invent `/applications` REST shapes, append OData syntax to an undiscovered Business Applications path, or
  move `/records/` into an app-scoped path.
- Preserve exact casing and IDs returned by tools in subsequent calls, although structural path segments are
  case-insensitive.
- A write is complete only when the tool response confirms it. For a multi-turn delegated workflow, preserve and
  reuse the returned/provided `sessionId`; drafting and sending are separate turns when the workflow requires
  confirmation.
- For metadata-only questions, prefer `search_paths` or `/applications/me`, then fetch the returned resource. For
  exact data reads/writes, use the environment/table/app paths directly after discovery.
