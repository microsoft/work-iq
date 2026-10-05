# Business Applications

Use WorkIQ entity tools with paths under `/businessapps/` for structured CRM,
ERP, Power Apps, and Dataverse environments, records, apps, skills, APIs, and
operations. This resource family is distinct from Microsoft Graph application
registrations. Do not substitute another MCP server or invent REST paths.

## Discovery and known inventory

1. For an unknown record, workflow, app, skill, API, operation, or identifier,
   call `search_paths` once with a focused natural-language description. Use the
   fields accepted by the connected WorkIQ schema. Treat discovery as grounded
   only when the response contains a `/businessapps/...` path.
2. For environment inventory, skip discovery and call `fetch` directly on
   `/businessapps/environments/`. Use the exact returned environment IDs; never
   assume a default environment.
3. If discovery errors or returns no `/businessapps/...` path, do not repeat or
   broaden it. Use the environment inventory, select only the exact requested
   environment, and inspect only its relevant returned collection. Abstain when
   the exact environment or capability is absent.
4. Follow exact returned paths with `fetch`, `get_schema`, or the effect-correct
   write/action tool. Do not guess path segments, IDs, names, or casing.
5. Before an unfamiliar write or action, call `get_schema` on the concrete
   path with the matching operation type. Schema availability does not grant
   authorization.

Discovery is read-only: use `search_paths`, not `do_action` on
`/businessapps/me`. `do_action` remains appropriate for a discovered
environment SQL query, Custom API, app operation, in-app MCP tool, or delegated
environment work.

Do not use `do_action` on `/businessapps/me` for discovery even if that route is
exposed; use `search_paths` instead. The old route is POST-shaped and can be
policy-denied before any grounded path is returned, ending the workflow before
`search_paths` or `fetch` can run.

## Exact tool and path selection

| Intent | Tool and path |
| --- | --- |
| List environments or identify the default | `fetch` `/businessapps/environments/` |
| List or inspect tables | `fetch` or `get_schema` on `/businessapps/environments/{environmentId}/tables[/<tableName>]` |
| Read a record | `fetch` `/businessapps/environments/{environmentId}/tables/{tableName}/records/{recordId}` |
| Query environment data | `do_action` `/businessapps/environments/{environmentId}/query` with schema-defined `jsonBody`, including read-only `querytext` when required |
| Create a record | `create_entity` on `/businessapps/environments/{environmentId}/tables/{tableName}/records` |
| Update or delete a record | `update_entity` or `delete_entity` on the exact discovered record path |
| List or inspect apps | `fetch` `/businessapps/environments/{environmentId}/apps[/<appName>]` |
| List or inspect business skills | `fetch` `/businessapps/environments/{environmentId}/skills[/{skillName}]` |
| Run an app operation | `do_action` on the exact discovered `.../operations/{operationName}` path |
| Invoke a Custom API | `do_action` on the exact discovered `/businessapps/environments/{environmentId}/customapis/{apiName}` path |
| Delegate open-ended environment work | `do_action` `/businessapps/environments/{environmentId}/execute-work` with the schema-defined instruction and optional session ID |

Environment SQL and Custom APIs with request bodies are actions, not OData
functions. Use `call_function` only for a function path returned by discovery.
Business Applications file routes are also distinct from Graph `fetch_blob` and
the unreleased Graph `upload_blob`; use only the operation returned by the
Business Applications schema.

## Confirmation, policy, and failure boundaries

Classify effects from the discovered operation contract. Apply the general
confirmation workflow before `create_entity`, `update_entity`, `delete_entity`,
or a mutating `do_action`. A read-only SQL query does not require mutation
confirmation merely because it uses `do_action`.

WorkIQ may deny an action or mutation based on caller trust, tenant policy, or
resource privileges. This does not make read-only `search_paths` discovery or a
permitted structural `fetch` into mutations. On an explicit denial:

- stop the affected workflow and report the observed diagnostic;
- do not retry through another path, tool, agent, endpoint, or plugin;
- do not assert that a particular tenant setting or consent change will fix it
  unless the diagnostic says so; and
- do not claim success or substitute a different record, table, skill, or app.

A named but unavailable environment is a hard stop. An approved create or
update requires a matching write receipt and, when supported, read-back of that
exact target; a pre-existing lookalike is not proof of completion. Never use a
saved view or ordinary record update as a schema-customization fallback.

When the outcome of a mutation is ambiguous, do not replay it. Reconcile with a
supported safe read when available; otherwise report **outcome unknown**.

## Grounding and capability matching

- Preserve exact returned IDs and paths. Structural segments can be
  case-insensitive, but opaque identifiers are not.
- For metadata with an unknown path, use `search_paths`, then fetch the returned
  resource. For known structural inventory, use the direct `fetch` path.
- A top-level semantic retrieval may include Dataverse evidence, but it does not
  replace authoritative path discovery for a requested Business Applications
  record or operation.
- A named skill, app operation, or Custom API requires an exact discovered
  capability match. Do not silently substitute a similar capability or use
  `execute-work` as a fallback.
