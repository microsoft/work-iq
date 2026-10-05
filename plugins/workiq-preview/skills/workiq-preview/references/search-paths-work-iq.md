# search_paths

Discover entity paths and supported operations when the route is unknown or the
user explicitly requests path discovery. Known exact workflows need no discovery
preflight. This tool does not discover MCP tool names; use the connected catalog.

## Live argument contract

The connected WorkIQ catalog exposes natural-language and structural discovery.
Inspect its advertised schema and send only accepted fields; do not translate
examples into guessed arguments or try another interface after rejection.

There is no `backend`, `source`, or `provider` argument. WorkIQ may fan out to
enabled providers, but only returned paths prove participation. Require a
returned `/businessapps/...` path before following a Business Applications
result.

## Workflow

1. Make one focused discovery call for the requested resource and operation.
2. Inspect [get_schema](get-schema-work-iq.md) on the selected returned path when
   the operation's body or query shape is unfamiliar.
3. If the user also requested execution, resolve identities, prepare the action,
   obtain required confirmation for mutations, and execute once. Discovery alone
   is not execution, but discovering a path never grants authorization.

Use [recovery](troubleshooting.md) for failures. Explicit denial stops; no route,
agent, or tool substitution. An empty result means no matching path was confirmed
in that search, not that the entire service lacks the capability.

If Business Applications discovery errors or returns no `/businessapps/...`
path, do not repeat or broaden it. Fetch `/businessapps/environments/`, resolve
only the exact requested environment, and inspect only its relevant returned
collection. Abstain when the exact environment or capability is absent.

When asked for all available matching paths, summarize every returned family and
operation, not just common examples. Inspect an available saved capped result
before claiming coverage; if the response is truncated, qualify completeness.
Do not invent paths absent from the result.

For structured CRM, ERP, Power Apps, or Dataverse resources and workflows, read
[Business Applications](business-applications.md). Use natural-language
`search_paths` for unknown paths, but use direct
`fetch("/businessapps/environments/")` for environment inventory.

## Examples for the `query` catalog

```json
{"query":"recent email messages and supported reply actions"}
```

```json
{"query":"/me/people"}
```

```json
{"query":"Planner plans and tasks"}
```
