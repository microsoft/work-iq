# Business Applications

Use WorkIQ entity tools with paths under `/businessapps/` for business-application environments, data, apps,
skills, APIs, and operations. This path space is distinct from Microsoft Graph application registrations. Do not
substitute a separate endpoint, another MCP server, or an invented REST URL.

## Discovery and path grounding

1. Start intent-driven discovery with `do_action` on `/businessapps/me` and
   `{"query":"<business record, workflow, or app intent>","environmentId":"<optional>","limit":10}`. The `query`
   is required. Results include grounded paths plus environment and application IDs. For example, use
   `{"query":"qualify a lead"}` to discover the relevant sales application and operations.
2. Use `search_paths` to discover Business Applications paths. Set `filter` to a plain leading-slash path such as
   `/businessapps` for path-prefix matching, or to a regular expression over paths when a narrower pattern is
   needed. The filter is **not a natural-language or semantic search**. Returned paths can be passed directly to
   `fetch`, `get_schema`, or a write tool.
3. Discover **every** Business Applications resource this way — environments, apps, tables, records, skills, APIs,
   and operations. Take each identifier from the returned paths. Do not guess an ID or name, and do not assume a
   default environment.
4. Use `get_schema` on the returned concrete path before an unfamiliar mutation or operation. Never fill in
   `{environmentId}`, `{tableName}`, `{recordId}`, `{appName}`, `{apiName}`, `{skillName}`, or operation names
   from memory.

## Exact path and tool selection

| Intent | WorkIQ tool and Business Applications path |
|---|---|
| List or describe tables | `fetch` or `get_schema` `/businessapps/environments/{environmentId}/tables[/<tableName>]` |
| Read a record | `fetch` `/businessapps/environments/{environmentId}/tables/{tableName}/records/{recordId}` |
| Query environment data | `call_function` `/businessapps/environments/{environmentId}/query` with `jsonBody: {"querytext":"SELECT ..."}` |
| Create a table | `create_entity` on `/businessapps/environments/{environmentId}/tables` with `{tableName, columns, displayName?, description?}` |
| Create a record | `create_entity` on `/businessapps/environments/{environmentId}/tables/{tableName}/records` with `{"item":{...}}` |
| Update a record | `update_entity` on `/businessapps/environments/{environmentId}/tables/{tableName}/records/{recordId}` with changed fields |
| Delete a record/table | `delete_entity` on the exact record or table path returned by discovery |
| Upload a Business Applications record file | `do_action` on `/businessapps/environments/{environmentId}/tables/{tableName}/records/{recordId}/files/{columnName}/upload` with the schema-defined file arguments |
| Download a Business Applications record file | `call_function` on `/businessapps/environments/{environmentId}/tables/{tableName}/records/{recordId}/files/{columnName}/download` with optional `destinationPath` |
| List or inspect apps | `fetch` `/businessapps/environments/{environmentId}/apps[/<appName>]` |
| List or read a business skill | `fetch` `/businessapps/environments/{environmentId}/skills[/{skillName}]` |
| Create a business skill | `create_entity` on `/businessapps/environments/{environmentId}/skills` with the schema-defined skill payload |
| Update a business skill | `update_entity` on `/businessapps/environments/{environmentId}/skills/{skillName}` with changed fields |
| Delete a business skill | `delete_entity` on `/businessapps/environments/{environmentId}/skills/{skillName}` |
| Run an app-scoped operation | `do_action` on the exact `.../apps/{appName}/.../operations/{operationName}` path returned by `get_schema` |
| Invoke a Custom API | `call_function` `/businessapps/environments/{environmentId}/apis/{apiName}` with the API inputs in `jsonBody` |
| Delegate an open-ended goal to an environment | `do_action` `/businessapps/environments/{environmentId}/execute-work` with `{"instruction":"...","sessionId":"<optional>"}` |
| Invoke an in-app MCP tool | `do_action` on the exact `/businessapps/environments/{environmentId}/mcp/{serverName}/tools/{toolName}` path |

`call_function` supports an optional `jsonBody` for Business Applications paths. Continue encoding Microsoft
Graph/OData function parameters in the URL; use `jsonBody` only when the discovered `/businessapps` function schema
requires it, especially the environment query and Custom API paths.

Business Applications record file operations are distinct from Microsoft Graph binary content and the
`fetch_blob` / `upload_blob` release status. Do not substitute those Graph blob tools for the
`/businessapps/.../files/{columnName}/upload` or `/download` routes, and do not generalize these routes to OneDrive,
SharePoint, mail attachments, or other Graph resources.

## Business skills

Business skills are reusable, environment-scoped capabilities that a business application exposes, and they are
addressed like any other Business Applications resource. They are **not** the same thing as this WorkIQ skill or
its `references/*.md` files.

- Read one skill with `fetch` on `/businessapps/environments/{environmentId}/skills/{skillName}`, or list the
  collection with `fetch` on `/businessapps/environments/{environmentId}/skills`.
- Skills are writable with the same entity tools used for records: `create_entity` on the `skills` collection,
  and `update_entity` or `delete_entity` on the concrete `skills/{skillName}` path.
- Call `get_schema` on the skill or collection path before a create or update, and send only schema-confirmed
  fields. Do not infer a skill's payload shape from a record or table payload.
- Resolve `{skillName}` from discovery (`do_action` on `/businessapps/me` or `search_paths`) and preserve the
  exact returned casing. Do not invent skill names.

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
  `/businessapps/environments/{environmentId}/tables/{tableName}/records`
- App table:
  `/businessapps/environments/{environmentId}/apps/{appName}/tables/{tableName}`
- App operations are directly under the app table or record path and **omit `/records/`**. Use only operation names
  returned by `get_schema`, such as `view`, `read`, `prepare_create`, `submit_create`, `prepare_update`,
  `submit_update`, `prepare_delete`, or `submit_delete`.
- Use `view` for bounded/form-aware app record browsing. Use `prepare_*` then `submit_*` when the schema exposes
  that two-step operation.

## Grounding rules

- WorkIQ's top-level `ask` can also answer questions about Business Applications request, though some applications may not be included in ask() so you may need to explore both ask() and /businessapps/me paths to get an answer.
- Do not invent `/businessapps` REST shapes, append OData syntax to an undiscovered Business Applications path, or
  move `/records/` into an app-scoped path.
- Preserve exact casing and IDs returned by tools in subsequent calls, although structural path segments are
  case-insensitive.
- A write is complete only when the tool response confirms it. For a multi-turn delegated workflow, preserve and
  reuse the returned/provided `sessionId`; drafting and sending are separate turns when the workflow requires
  confirmation.
- For metadata-only questions, prefer `search_paths` or `/businessapps/me`, then fetch the returned resource. For
  exact data reads/writes, use the environment/table/app paths directly after discovery.
