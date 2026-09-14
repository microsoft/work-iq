# search_paths

Discover entity paths and supported operations when the route is unknown or the
user explicitly requests path discovery. Known exact workflows need no discovery
preflight. This tool does not discover MCP tool names; use the connected catalog.

## Live argument contract

The connected catalog inspected for this guidance exposes required `query`
(string): a natural-language resource/action description or a path prefix.
Older catalogs may expose a regex `filter` instead. Inspect the actual advertised
schema and send only its accepted fields; do not translate examples into guessed
arguments or try both interfaces after rejection.

There is no basis for inventing `backend`, `source`, or `provider` selectors.
Nor does path discovery imply that the entire catalog is Graph-only: retain
exact returned resource families and their domain contracts.

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

When asked for all available matching paths, summarize every returned family and
operation, not just common examples. Inspect an available saved capped result
before claiming coverage; if the response is truncated, qualify completeness.
Do not invent paths absent from the result.

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

Public additional discovery: [Business Applications](business-applications.md).
