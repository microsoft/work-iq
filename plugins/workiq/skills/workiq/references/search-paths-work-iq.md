# search_paths

Discover entity paths and operations when unknown or explicitly requested.
Known supported workflows need no discovery preflight. This tool does not
discover MCP names; use the selected server's connected catalog.

## Live argument contract

The current catalog exposes required `query` (string): a natural-language
resource/action description or a path prefix. Older catalogs may expose legacy
regex `filter` instead; use it only when the connected schema advertises it.
Do not send both interfaces, guess `agentId`, or try variants after rejection.

Do not invent `backend`, `source` or `provider` selectors. Do not assume that
every returned resource family is Graph-only; retain the exact returned paths
and applicable domain contracts.

## Workflow

1. Make one focused query for the requested resource/operation.
2. Inspect `get_schema` only for an unfamiliar selected operation shape or an
   explicit schema request.
3. If execution was also requested, establish intent, resolve identities,
   prepare and obtain required mutation confirmation before execution.
   Discovery is neither execution nor authorization.

Report every returned relevant family and operation, not just common examples.
An empty result means no path was confirmed in that search, not global absence.
Inspect available saved capped output; otherwise qualify completeness. Do not
invent categories/paths absent from the result. Explicit denial stops under
[recovery](troubleshooting.md), never an alternate tool or path.

## Current-catalog examples

```json
{"query":"email reply draft actions"}
```

```json
{"query":"/chats"}
```

```json
{"query":"/teams/{team-id}/channels"}
```

```json
{"query":"Planner plans and tasks"}
```
