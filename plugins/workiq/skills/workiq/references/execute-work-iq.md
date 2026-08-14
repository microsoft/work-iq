# execute

Compile and run a **WIQR** (Work IQ Recipes) script — a small declarative language that
orchestrates the WorkIQ entity verbs (`fetch`, `create`, `update`, `delete`, `do_action`,
`call_function`, `identify`) plus agents (`ask`), and trusted user input (`elicit`/
`respond`) — in **one** deterministic, server-side run.

Use `execute` when a task is a **multi-step or batch** orchestration (fetch-then-act,
loop over a collection, conditional writes) and you want it to run as a single unit rather
than as many individual tool calls. For a single read or write, prefer the direct entity
tool (`fetch`, `create_entity`, …).

> **⚠️ Writes in a recipe are persistent** and run immediately (a recipe can send mail,
> create events, delete items). Summarize what the recipe will do and get explicit user
> confirmation before running it live. Use `dryRun` to parse/validate without executing.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `wiqr` | string | **Yes** | The recipe text. |
| `values` | object | No | Parameter values keyed by the recipe's declared `params` names, as native JSON (`{"day":"2026-07-02"}`). Omit or pass `{}` when the recipe declares no params. |
| `dryRun` | boolean | No | Parse/validate only, executing nothing. Returns `{"status":"valid"}` on success or a `ParseError`. Pass as a native boolean, not a string. |
| `agentId` | string | No | Target a specific agent for the recipe's `ask` verbs. |

> **⚠️ Argument names are `wiqr` / `values` — not `recipe` / `parameters`.** Pass
> `values`/`dryRun` as native JSON (an object and a boolean), not strings. If `execute`
> returns `An error occurred invoking 'execute'`, the arguments failed to bind — check the
> names and types against the tool's `inputSchema`.

## Workflow (author with confidence; validate cheaply)

1. **Author the recipe directly when you are confident** of the paths, verbs, and field
   names — for well-known paths (`me`, `me/messages`, `me/events`, `me/contacts`, `users`,
   `me/mailFolders`) go direct. **Validating a recipe is cheap**, so it is usually faster to
   author, run, and correct on error than to pre-emptively introspect.
2. **Only introspect first when confidence is low** — an unfamiliar path, uncertain verbs,
   or an unknown create/update/action body shape. Then call `search_paths` and/or
   `get_schema` before authoring.
3. Run with `execute` (or `dryRun` for sends/irreversible actions). **Parse/validation
   errors are cheap and specific** — read the `error`, fix only what it names, and re-run.
4. **If** `execute` returns a policy `BackendError` (a blocked path — see
   `references/wiqr-language-work-iq.md`), *then* run `search_paths` to see the allowlist
   and adjust. Discovery pays for itself once a real block occurs.

## Result

`execute` returns a status and, on success, a `result` (the recipe's `output {}` object, or
the last operation's result when there is no `output`):

- `completed` — the recipe finished.
- `failed` — no writes committed; inspect `retryable` and `error`.
- `partial` — some writes committed before failure; inspect `completedWrites`, do not
  blindly retry.
- `input_required` — a non-terminal suspension from `elicit`/`ask`; inspect `inputRequests`
  and resume with the value.

## The WIQR language

For the full language contract — verbs, parameters/CDDL, paths and fetch clauses, binding,
pipes, control flow, `output`, common mistakes, and known backend constraints — read
**`references/wiqr-language-work-iq.md`**.
