# Setup and catalog

## Resolving tool names in your host

The logical names in these documents are not necessarily callable names. This
package configures MCP server `workiq-preview`; use the server identity from its
`.mcp.json`, not an inferred skill-folder prefix.

1. Find the logical tool in the connected host catalog. Load deferred definitions
   with the host's discovery facility before calling.
2. Select the entry belonging to the configured WorkIQ server and use its exact
   advertised name and argument schema. Do not construct aliases.
3. If missing, check availability once and report the limitation. Entity
   `search_paths`/`get_schema` do not discover MCP tools. Installing a preview
   plugin does not enable tenant-dependent `retrieve`.


## Prerequisites and configuration

The bundled `.mcp.json` points to the hosted endpoint
`https://workiq.svc.cloud.microsoft/mcp`; MCP calls need no local runtime install.
The host attaches an authenticated Microsoft 365 user token. Never put tokens in
prompts, tool arguments, or plugin files. Obtain the intended account from the
user/host, not local git or OS identity. Authentication or consent remediation
must happen through the host/admin; do not probe alternate routes after denial.
See [recovery](troubleshooting.md) before resuming an interrupted operation.


## Explicit discovery and schema requests

- A request for available paths/operations uses [search_paths](search-paths-work-iq.md).
  The current catalog takes a required natural-language/path-prefix `query`;
  keep it focused on the requested domain. Use legacy `filter` syntax only if
  the connected tool explicitly advertises it.
- A request for fields, payloads, or a data model uses [get_schema](get-schema-work-iq.md)
  with the actual path and operation type. Do not optimize away an explicit
  schema request because an example already exists.
- Distinguish an action's request-body schema from its returned-resource schema.
  Inspect what `get_schema` actually returns: a request-only result does not
  establish response fields. If a requested response schema is not exposed,
  state the limitation; do not invent selectors or hunt speculative paths.
- Known supported operations go directly to their domain contract. Discover only
  an unknown path or unfamiliar schema. Public web documentation and CLI help
  are not evidence of the connected WorkIQ surface.
- These are reads, not authorization to execute the discovered action. Report
  only paths, fields, and privileges supported by returned evidence.
