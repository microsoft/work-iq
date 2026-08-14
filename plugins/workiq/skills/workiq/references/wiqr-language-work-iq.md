# WIQR — Work IQ Recipes (language reference)

WIQR is a declarative language for orchestrating operations against WorkIQ entity graphs,
agents, workspace files, and trusted user input. You run a recipe with the WorkIQ `execute`
tool (see `references/execute-work-iq.md`). Given a recipe-authoring request, output only the
WIQR script unless the user asks for explanation or execution.

The latest specification is v1.1. A deployed WorkIQ server may run an older WIQR engine. If a
valid v1.1 feature is rejected, report that the runtime is behind the specification; do not
rewrite the recipe into incorrect legacy syntax.

## Authoring workflow (author with confidence; validate cheaply)

Validating a recipe is cheap: a parse/validation error comes back fast and names exactly what
is wrong, and `dryRun` checks a recipe without executing it. So **prefer authoring directly
and correcting on error over pre-emptive introspection** — only introspect when your
confidence in generating a correct recipe is genuinely low.

1. **Author the recipe directly when confident** of the paths, verbs, and field names. For
   well-known paths (`me`, `me/messages`, `me/events`, `me/contacts`, `users`,
   `me/mailFolders`, Teams `me/chats` / `teams/{id}/channels`) go direct — do **not**
   reflexively run `search_paths`/`get_schema` first.
2. **Only introspect when confidence is low** — an unfamiliar path, uncertain verbs, or an
   unknown `create`/`update`/`do_action` body shape. Then call `search_paths` (paths + allowed
   verbs) and/or `get_schema` (fields, enums, required flags) before authoring.
3. Write one declarative recipe with typed parameters and a minimal final `output`.
4. Run it with `execute` (or `dryRun` for send/irreversible actions to validate first).
5. **Distinguish parse/validation errors from backend errors.** Parse/validation errors are
   cheap — read the error, fix only what it names, and re-run. If a run fails with a policy
   `BackendError` (a blocked path), *then* run `search_paths` to confirm the allowlist and
   adjust — discovery pays for itself once a real block occurs.

`ask`, `elicit`, and `respond` do not use entity paths, so path discovery is unnecessary for
them.

## Document shape

Blocks must appear in this order:

```wiqr
params { ... }       # optional
agents { ... }       # optional
workspaces { ... }   # optional

# optional named CDDL helper rules
# statements

output { ... }       # optional; single and last
```

Newlines terminate statements and block members. `#` starts a line comment.

## The 10 verbs

| Verb | Purpose |
|---|---|
| `fetch` | Read an entity/collection or workspace metadata; optionally copy content with `into` |
| `create` | Create an entity |
| `update` | Modify an entity |
| `delete` | Delete an entity |
| `call_function` | Invoke a GET-shaped function; parameters are inline in the path |
| `do_action` | Invoke a side-effecting POST action |
| `identify` | Resolve exactly one entity by complete alternate keys |
| `ask` | Delegate a bounded, non-deterministic decision to an agent |
| `elicit` | Request a trusted value from the user, suspending if unanswered |
| `respond` | Deliver a trusted value to an outstanding input request |

## Parameters and CDDL

Parameters use CDDL types:

```wiqr
params {
  subject: string
  count: integer
  confirmed: boolean?
  attendees: [+ email]
  duration: duration = "PT1H"
  importance: ("low" / "normal" / "high") = "normal"
}
```

Friendly aliases are `string`, `integer`, `boolean`, `datetime`, `date`, `duration`, and `email`.
Collections use `[* T]` or `[+ T]`; full CDDL maps and choices are allowed. A leading `?`, a
trailing type `?`, or a default makes a parameter optional. Entries may be newline- or
comma-separated.

Typed `date` and `datetime` parameters used in filters compile as validated, unquoted temporal
literals. Do not quote them manually in filter expressions.

## Agents

An `agents` block binds aliases to literal or parameter-supplied agent URLs:

```wiqr
params {
  rankAgentUrl: string
}
agents {
  rank = @rankAgentUrl
  mail = "https://contoso.example/agents/mail"
}

$top = @rank::ask "Which three messages most need a reply?" {
  schema: [* { id: string, subject: string }]
  strict: true
}
```

Prefix any operation with `@alias::`; an unqualified operation targets the default agent.
Parameter, agent, and workspace aliases share one namespace and must be unique.

## Workspaces and files

Workspaces bind aliases to file-bearing locations with a required access mode:

```wiqr
workspaces {
  shared = "me/drive/root:/Shared" read-only
  output = "me/drive/root:/Generated" read-write
}
```

A file handle is `@alias/"relative/path"` and may use path interpolation.

```wiqr
$metadata = fetch @shared/"report.pdf"

$copy = fetch @shared/"report.pdf" into @output/"report.pdf" {
  conflict: rename
}
```

Plain workspace `fetch` returns metadata only. `fetch ... into` copies content server-side and
binds resulting metadata; `conflict` is `fail` (default), `overwrite`, or `rename`. It cannot be
combined with fetch metadata clauses. Writes to a `read-only` workspace are validation errors.
File bytes never enter WIQR variables.

## Entity paths and fetch clauses

Paths are quoted RFC 6570 templates:

```wiqr
"me/messages"
"me/messages/{@id}"
"me/events/{$event.id}"
"me/messages?$count=true"
```

Path interpolation always uses `{@param}` or `{$var.field}`. `${...}` is only for string
interpolation and JMESPath text.

Fetch clauses are newline- or comma-separated:

```wiqr
$messages = fetch "me/messages" {
  filter: isRead == false and from.emailAddress.address == @sender
  search: @keywords
  select: id, subject, from
  orderBy: receivedDateTime desc
  top: 25
  skip: 0
  expand: attachments
}
```

- Filters support `== != > >= < <=`, `and`, `or`, `not`, parentheses, and
  `.contains()`, `.startsWith()`, `.endsWith()`.
- Use `search` for partial, keyword, sender, or semantic lookup; use `filter` for structured fields.
- Nested clause fields use dots, never slashes.
- A fetch issues one backend page and does not automatically follow `nextLink`.

## Entity mutations and resolution

```wiqr
create "me/events" { subject: @subject, start: @start, end: @end }
update "me/messages/{@id}" { isRead: true }
delete "me/events/{@id}"
do_action "me/messages/{@id}/reply" { comment: @body }
call_function "me/drive/root/search(q='report')"
$folderId = identify "me/mailFolders" { displayName: "Archive" }
```

`create` requires a body. `update` and `do_action` may omit a body. `call_function` never has a
body. `identify` requires complete exact keys and binds the entity's primary-key scalar; zero
matches is `NotFound`, multiple matches is `Ambiguous`. Use `fetch`/`search` for approximate input.

## `ask`

`ask` poses a natural-language question, not an entity path:

```wiqr
$manager = ask "Who is my manager?" {
  schema: {
    name: string
    ? email: email
    ? jobTitle: string
  }
  strict: true
}

output { manager: $manager }
```

Supported clauses:

```wiqr
$answer = @analyst::ask "Question ${@topic}" {
  conversationId: "conv-42"
  taskId: "task-7"
  filter: receivedDateTime > @since
  select: id, subject
  orderBy: receivedDateTime desc
  schema: [* { id: string, reason: string }]
  strict: true
  context: [ @shared/"a.pdf", @shared/"b.docx" ]
  into: @output/"answer.docx"
}
```

`conversationId`, `taskId`, `filter`, `select`, and `orderBy` are agent hints, not deterministic
queries. `schema` is a CDDL result contract and also guides the agent's response. `strict: true`
requires `schema` and validates the returned value; mismatch produces `SchemaValidationError`.
Never auto-retry `ask`. Its answer is non-deterministic and untrusted. `context` and `into` use
workspace handles; an `ask into:` does not count as a completed write.

Use `ask` for ranking, fuzzy matching, synthesis, extraction, or judgment. Use `fetch` for a
deterministic query and `identify` for one exact entity.

## `elicit` and `respond`

Use `elicit` when the person must confirm, disambiguate, or supply a trusted value:

```wiqr
$confirmed = elicit "Delete ${$count} drafts?" {
  id: "confirm-delete"
  schema: boolean
  strict: true
}

if $confirmed == true {
  for $draft in $drafts.value {
    delete "me/messages/{$draft.id}"
  }
}
```

If unanswered, execution suspends with `status: "input_required"` and an `inputRequests` entry
containing `inputRequestId`, `prompt`, and optional `expectedType`. Without `id`, the engine assigns
stable `ir-<n>` IDs. `strict: true` requires `schema`. Elicited values are trusted user input.

Answer an outstanding request with:

```wiqr
respond "confirm-delete" {
  value: true
}
```

`respond` is a write routed by `inputRequestId`. The host/backend owns durable resume and duplicate
response handling. An `ask` may also suspend as `input_required` when its target agent needs user
input.

## Binding, values, pipes, and control flow

```wiqr
$messages = fetch "me/messages"
$ids = $messages |> "value[*].id"
$first = $messages |> "value[0]"

for $message in $messages.value {
  update "me/messages/{$message.id}" { isRead: true }
}

if count($messages.value) > 0 and not contains($ids, @ignoredId) {
  do_action "me/messages/{$messages.value[0].id}/flag" { flagStatus: "flagged" }
}
```

- `$name` may bind an operation result or a pipe result only; no imperative literals/accumulators.
- Bare property assignment is invalid: use `$id = $result |> "value[0].id"`.
- Values are double-quoted strings, numbers, booleans, null, objects, arrays, variables, or params.
- Single quotes are allowed only inside a JMESPath expression or inside an API function URL.
- String templates use `${$var.field}` and `${@param}`.
- `count()` is valid only in an `if` condition; use JMESPath `length()` elsewhere.
- Loops have an implementation safety limit and iterate only the fetched page.

## Output and execution results

At most one `output` block is allowed, and it must be last:

```wiqr
output {
  unreadCount: $messages |> "length(value)"
  ids: $messages |> "value[*].id"
}
```

When present, `result` is exactly the output object. When absent, `result` is only the last
executed operation's result after its pipes. Intermediate variables are not returned by default.
No `result` is returned for `failed`, `partial`, or `input_required`.

Statuses:

- `completed`: recipe finished.
- `failed`: no committed writes; inspect `retryable` and `error`.
- `partial`: writes committed before failure; inspect `completedWrites` and do not blindly retry.
- `input_required`: non-terminal suspension; inspect `inputRequests`.

Common validation/runtime codes include `ParseError`, `MissingParameter`, `UndeclaredParameter`,
`ParameterTypeError`, `DuplicateAgentAlias`, `UndeclaredAgentAlias`, `DuplicateWorkspaceAlias`,
`UndeclaredWorkspaceAlias`, `ReadOnlyWorkspaceWrite`, `NotFound`, `Ambiguous`,
`SchemaValidationError`, and `LoopLimitExceeded`.

## Common mistakes (wrong → right)

These are the quickest ways to produce a `ParseError`. Prefer the right column.

| Wrong | Right | Why |
|---|---|---|
| `start/dateTime > @since` | `start.dateTime > @since` | Nested fields use **dots**, never slashes; the engine compiles them to OData `/`. |
| `isRead == false && x == 1` | `isRead == false and x == 1` | Logical operators are the keywords `and` / `or` / `not` (with `( )`), never `&&` / `\|\|`. |
| `startsWith(subject, "PR")` | `subject.startsWith("PR")` | String matching is method-style. Only `.contains()`, `.startsWith()`, `.endsWith()` exist. |
| `$s = $x.value` | reference `$x.value` directly, or `$s = $x \|> "value"` | Bare property assignment is invalid; a variable RHS needs a pipe. |
| `filter: receivedDateTime > "2026-08-01"` (with a `datetime` param manually quoted) | declare `since: datetime`, then `filter: receivedDateTime > @since` | Typed `date`/`datetime` params compile as validated, **unquoted** temporal literals. |
| execute args `recipe` / `parameters` | `wiqr` / `values` | Those are the `execute` tool's argument names. |
| `ask "…" { schema: integer, strict: true }` expecting a bare number to validate | ensure the agent returns a JSON number, or use `schema: string` | An agent's free-text answer arrives as a JSON string; strict numeric schemas reject a string. |

## Known backend and gateway constraints

A recipe can parse and compile perfectly yet still fail at the backend. These are **not** WIQR
defects — they surface as `failed`/`BackendError` (or `partial`), distinct from `ParseError` /
`MissingParameter`. When a run fails with a policy `BackendError` (a blocked path), run
`search_paths` to confirm what the tenant actually exposes and adjust — don't pre-emptively
discover for well-known paths, but do trust `search_paths` once a real block occurs.

- **Policy allowlist.** Some paths are blocked by the WorkIQ gateway even though they compile.
  Examples observed: `todo/*` (intentionally blocked — those endpoints are planned for
  deprecation) and `me/settings` (`EndpointHostnameBlocked`). `search_paths` only lists
  policy-allowed paths, so trust it over raw Graph knowledge.
- **Inefficient filters.** Filtering `from.emailAddress.address` combined with `orderBy` returns
  Graph `InefficientFilter` (400). Drop the `orderBy`, or narrow differently. The same filter
  *without* `orderBy` succeeds.
- **Paging.** `skip:` is rejected on `me/messages` (`$skip is not permitted`). A fetch returns one
  page; follow `@odata.nextLink` yourself rather than using `skip`.
- **Delta.** `delta()` change tracking is unsupported on some collections (e.g. `me/messages`
  in this context) and returns 400.
- **Required query inputs.** Some collections cannot be listed unfiltered, e.g. `me/onlineMeetings`
  needs a lookup filter; `me/settings/storage/quota` is unsupported for AAD accounts.
- **Lenient creates.** `create` may succeed with "missing" fields because Graph applies defaults
  (e.g. an event with only a `subject`). WIQR will not reject it — validate inputs yourself if you
  need strictness.
- **Read-only actions use `do_action`.** Side-effect-free POST actions such as
  `me/calendar/getSchedule`, `me/findMeetingTimes`, `me/getMailTips`, and `me/getMemberGroups`
  are invoked with `do_action` and return data. `createReply`/`createForward` produce **drafts**
  (safe); `reply`/`replyAll`/`forward`/`sendMail` actually **send** — validate those with
  `dryRun` before running live.

## Hard rules

- Use double quotes for WIQR string literals.
- Keep the language declarative; no assignment of literal local state, arithmetic, push, or append.
- Author known paths directly; when a path or its allowed verbs are genuinely uncertain,
  discover them with `search_paths` rather than guessing Graph variants.
- Author known bodies directly; when create/update/action field names or enum values are
  uncertain, confirm them with `get_schema` rather than guessing.
- Treat `ask` as untrusted and non-idempotent; use `elicit` for trusted human decisions.
- Put `output` last and expose only the minimum necessary data.
