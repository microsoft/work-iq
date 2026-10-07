# Setup and catalog

## Setup and selected catalog

The bundled `.mcp.json` configures server `workiq` and its hosted endpoint; no
local package/runtime is needed for MCP calls. The host supplies authentication.
Never put tokens in prompts, plugin files or tool arguments. Obtain account
identity from the user/host, not local git/OS data. Resume after a denial only
once reported remediation is complete and authorization still applies.

Resolve exact tool names and schemas from that configured server, not a guessed
prefix or another server's suffix match. Missing catalog/tools must be disclosed.
Use `search_paths` for explicit operation discovery and `get_schema` for explicit
fields/body questions; action request schemas do not establish response fields.
Report what was confirmed, not inferred Graph capabilities.
