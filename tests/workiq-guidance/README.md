# WorkIQ guidance contract checks

The observed-trace adapter covers **`workiq-preview` only**. Cross-package static
checks cover the intentionally different policies below; they do not apply
preview routing to public `workiq` or require equal package versions.

## Skill alignment requirements

Baseline: `7fde3f8e6477fc75c79a7d8386e8501105b2d9bd`. Scope: the two WorkIQ skills,
their references, metadata and existing offline checks. No endpoint, permission,
host activation gate, model execution, deployment or release change is implied.

| ID | Normative contract and positive / negative acceptance |
| --- | --- |
| A1 | Resolve exact tool names in the selected configured server. Current `search_paths.query` and `retrieve.query` must be nonblank strings, not arrays; unsupported selectors must not be guessed. Legacy `filter` is permitted only when advertised. Missing catalog/tool must be disclosed without alias guessing. |
| A2 | When both plugins are installed, `workiq-preview` must take precedence over `workiq` for overlapping requests: load preview's skill and use its configured tools and routing. Standalone public semantic synthesis/discovery must prefer `ask`; preview caller-owned evidence must prefer `retrieve` with explicit Grounding by default. Missing preview retrieval must not trigger public ask-first fallback. Exact entities, known-date calendar, complete collections, library columns and downloads must use entity tools. Preview broader sources and delegation retain G01-G25. This is skill-selection guidance, not a claim of host-enforced activation. |
| A3 | Both descriptions must require loading before use; prose must not claim a host-enforced gate. Public entry must dispatch to canonical recipes without losing endpoint query restrictions, payloads or opaque-ID handling. |
| A4 | Read-only finding and each comparison source must verify requested identity/name, type, location/time and relevant content. A near-match must not silently substitute. A concrete missing fact permits bounded supported in-scope refinement/exact read, not unconditional download, recursive enumeration or denial bypass. |
| A5 | Call counts must be happy-path goals subordinate to identity, confirmation, supported paging and complete exchanged history. A first page or search size 500 must not prove completeness. Exhausted runtime/user budgets must produce explicit partial coverage. |
| A6 | Generic 400/null/timeout/Unknown error must not establish a cause. Preserve batch successes and bound failed-read recovery with actual backoff shared across the objective. No timeout fan-out, budget reset, explicit-denial bypass, ambiguous mutation replay/substitute, or completed claim from 202 alone. |
| A7 | Establish read/write intent before resolving then acting. Search-like reply/message/draft/date-range phrases must remain read-only pending clarification. Suggested wording, persisted reply draft and send are distinct effects. Failed createReply must not become a fresh message; absent user is not approval. |
| A8 | Before synthesis check actual targets/referents, required facts, suitable comparator and source coverage. Missing context must not be invented. Distinguish absent/not retrieved/outside scope/deliberately excluded; preserve citations and uncertainty without requiring longer answers or more calls when evidence suffices. |
| T1 | Chats are flat, channels threaded; exact topic/directory identity and required member userId/tenantId must be preserved. Authorized oneOnOne create/reuse must not be used as a read-only lookup. No fuzzy People IDs, opaque member-ID substitution or guessed tenant. |
| T2 | Teams joinedTeams and message reads must omit unsupported `$top`; members use documented bare endpoints. Marker reads must filter locally; supplied message URLs must batch exact reads without broader history. Paging must be supported or coverage partial. |
| T3 | Hide-from-my-list must use hideForUser, not chat deletion. Read/unread use signed-in member identity and unread uses returned message createdDateTime, not chat lastUpdatedDateTime. Sends/replies/edits/reactions/presence require exact intent/confirmation and non-replay recovery. Reaction uses literal Unicode, not `like`. |
| T4 | Explicit chat/channel inventory uses the requested exact path prefix and reports all confirmed operations, not invented categories. Channel-message create schema must not imply every resource property is writable. |

`alignment.test.mjs` binds A1-A8/T1-T4 to source guards and current-schema unit
checks; `fixtures.mjs` adds synthetic positive/invalid operation sequences to the
existing oracle. Existing cases cover missing tools, caps, paging, budgets,
denials, draft/send, referents and recovery. Static presence/contradiction checks
are not executions of instructions; synthetic traces are not model compliance.
Natural-language identity, comparator suitability and evidence sufficiency still
need separately authorized host/model or human evaluation. No quality uplift is
claimed. Rollback is a package-specific guidance revert, not a server rollback.

The preview contract is **agent-host-neutral**. Logical tool behavior is shared across
compatible agents; host adapters normalize actual tool names and event formats
without changing policy. The CLI below is a Node-based trace validator, not a
requirement to use GitHub Copilot CLI as the agent.

Run from the repository root with Node 22+:

```sh
npm ci --prefix tests/workiq-guidance --ignore-scripts --no-audit --no-fund
npm --prefix tests/workiq-guidance run test:oracle
npm --prefix tests/workiq-guidance run test:static
npm --prefix tests/workiq-guidance test
```

Dependencies and the lockfile are test-only; the preview plugin gains no runtime dependencies.
CI runs the two layers separately and performs no model calls, plugin installation,
Microsoft 365 operations, or live evaluations.

[`baseline.json`](baseline.json) records the unchanged-guidance red run: 244 oracle
self-tests pass; 24 of 132 documentation checks fail for enumerated old-policy/link
causes. That historical run covered both packages before this PR was narrowed to
preview only. Its counts are not the current suite's scope or results.

## Canonical contract and evidence layers

- [`contract.mjs`](contract.mjs) defines stable **G01–G25** ownership/retrieval
  requirements and **R.C1–R.C7**, schema-discovery, and host-neutral
  requirements. G governs semantic routing; exact entity workflows remain separate.
- [`fixtures.mjs`](fixtures.mjs) maps every requirement to synthetic positive and
  deliberately invalid negative traces. These are **oracle unit inputs**, not observed
  agent behavior. There is no toy router whose output is counted as agent compliance.
- **Static checks** parse YAML descriptions, Markdown links/anchors (including
  unambiguous code references), domain dispatch, retrieval JSON, preview policy concepts
  and contradictions. They also preserve the description's requirement to load the
  skill before tool use. `alignment.test.mjs` additionally checks both packages'
  source/intent/recovery and Teams contracts, plus public links and schema examples.
  Prose paraphrases need not match a paragraph snapshot. Each plugin's name,
  version and description must agree across its marketplaces and host manifests;
  the packages need not share a version or semantic routing policy.
  Metadata also retains explicit workloads and actions ahead of routing policy,
  guarding discovery coverage without claiming a measured agent-quality effect.
- **Oracle tests** prove that the assertion runner accepts/rejects specified trace
  structures, including wrong actual calls, missing approval, replay and false outcomes.
- **Observed host/mock tests** require a separately instrumented host to load the
  candidate package and produce calls against the scripted tool catalog/responses.
  None have been run by this suite. Static or oracle passes do not establish LLM compliance.

## Host coverage and evidence

Use the same logical cases for each host, recording that host's version, tool
catalog, adapter version, loaded package hash, and observable activation events.
The synthetic adapter tests accept different host provenance labels; they do not
run those products or establish cross-host behavioral equivalence.

| Surface | What the suite establishes | Separate runtime evidence needed |
| --- | --- | --- |
| GitHub Copilot, Claude, Codex manifests | Per-package metadata consistency | Installation, skill activation, tool-name normalization, and behavior in each actual host/version |
| Other compatible agents | Host-neutral logical contracts and adapter envelope | A supported loader/MCP integration and instrumented host adapter |
| Copilot CLI-only installation checks performed outside this suite | Evidence limited to the recorded CLI version and package hashes | No inference about Claude, Codex, or another host |

Classify untested host adapters as coverage gaps, not failures of the shared
skill and not proof of support. An MCP connection alone is not evidence that
the host loaded or followed the skill instructions.

## Scenario input and output

A trusted scenario contains the prompt, bounded objective, advertised tools/strategies,
source restrictions, scripted operations/results, exact target/body confirmations,
prerequisite reads, mandatory requested effects, and call/retry budgets. Source IDs,
people, dates and addresses are synthetic. No production upload URLs or transcripts
belong in this directory.

Each operation declares `tool`, `match`, `effect`, `output`, and optional prerequisites.
An optional trusted `recoveryOf` links a changed read to the failed objective;
interleaving or rephrasing does not reset its retry budget or returned delay.
Synthetic `sourceTargets` compare returned identity/type/location/time/content
against independently authored target constraints. They do not classify natural
language or infer sufficiency. `messageMarker` checks exact local filtering.
An explicit trusted `resolves` list names partial-result operations that a successful
repair completes; an unrelated successful read never clears another source's gap.
`match` constrains supported arguments, not a pre-authored answer. Equivalent object
and JSON-encoded-string `jsonBody` transports compare by decoded payload; malformed
JSON and changed fields do not inherit approval. Paths and opaque IDs are never
normalized to make them match. Effect classification
makes `getSchedule` and application discovery reads even though they use `do_action`;
sends, persisted drafts and read-state changes remain mutations. Tool outputs, not
agent `approved`, `safe`, or `broadeningJustified` fields, establish facts. Confirmation
must be a preceding scenario-authored user event for that exact operation and payload.
Calendar ordering and exchanged-mail membership are computed from returned records.
Records from `ok`, `partial`, and `capped` reads remain usable evidence for
calendar, mail-thread, marker, and exact-source claims; failed reads contribute
no records. Capped evidence still requires `partial-data` disclosure and cannot
establish complete coverage. Regression checks accept faithful capped claims
and reject discarded or substituted records.
Retry delays start after the corresponding observed response; waiting while a call
is pending does not satisfy a subsequently returned backoff.

Focused source-filter cases reject guessed allow-lists for unspecified sources
while retaining explicit source constraints and evidence-justified targeted
escalation. Calendar-window cases use trusted local boundaries and a named IANA
zone: `time-window.mjs` checks the actual query instants by timezone round-trip,
including spring/fall transitions and equivalent UTC encodings. These are
second-precision fixture assertions, not a production date-conversion tool or
proof that an agent follows the guidance. Repeated/ambiguous local times still
need an explicit intended instant; this helper is not a general ambiguity resolver.

The assertion runner returns `{ok, violations: [{code, message}]}`. Final output carries
a terminal status, answer text, citations, disclosed limitations and observable claims.
Claims are checked against tool evidence; they are not authorization. Unsupported
schemas, absent results and missing final evidence fail closed.
An authoritative `currentState` is compared whenever the returned property exists,
including `false`, `0`, `null`, and `""`; an absent property requires no state claim.

## Progressive loading contract

Both packages now keep universal routing, intent, source, denial, completion and
URL/opaque-ID rules in `SKILL.md`, then select package-local operation leaves.
`## Routes` tables select a contract; `## Required before use` linked bullet
lists declare mandatory dependencies. Other links are conditional help, not
instructions to load the entire library. Mutation prerequisites apply before
writes even in mixed read/write recipes; recovery applies before retry or
reconciliation. Missing guidance stops the affected action. Reuse requires
available exact text; summaries or uncertain freshness require rereading.

`loading-contract.mjs` parses those Markdown declarations, rather than trusting
a second test-only dependency graph. Its independent scenario catalog asserts
expected rule-owning leaves and prerequisites for both packages. Checks reject
missing files, required edges, cycles, escapes and budget overruns. Operative-rule
negatives preserve topic labels or put the rule in an unrelated loaded file;
neither can satisfy the required owner. Existing observed traces remain
preview-only and do not establish actual reference-read ordering.

Preview's first-call retrieval contract retains sufficiency-stop, source
restrictions, cap/empty/error non-broadening and objective-budget rules.
Before any same-objective retrieval follow-up, including after successful but
insufficient evidence, load the repair route. Saved capped output and concrete
authorized external-source gaps are not the same as generic failure recovery.
The public package retains its separate ask-first semantic policy.

Reproduce static load-plan costs with:

```sh
npm --prefix tests/workiq-guidance run context
```

The report includes exact file sets, unique UTF-8 byte totals, and approximate
bytes/4 tokens. It excludes tool schemas, tool output, host framing and history.
`loading-baseline.json` fixes equivalent full-file comparators at
`eff05fb49c0d40043e3f5d596b00bef8bfd6a4ca`: the entrypoint plus the named canonical
semantic/calendar/mail/Teams reference, not a claim that every host actually
read those files. The after sets include all parsed selected-index and mandatory
prerequisite files. Loaded guidance is not unloaded; cross-domain tasks accumulate
the unique union.

| Static plan | Public bytes before → after | Preview bytes before → after |
| --- | --- | --- |
| Entrypoint, including metadata | 11,688 → 5,296 | 15,629 → 5,330 |
| Semantic first call | 17,659 → 9,698 | 28,498 → 10,400 |
| Ordinary calendar read | 15,872 → 8,377 | 32,337 → 11,623 |
| Mail thread read | 19,096 → 10,130 | 24,021 → 9,556 |
| Teams read/list plan with identity prerequisites | 27,448 → 17,595 | 26,373 → 13,547 |

The entry target was 4,400 bytes; the reviewed implementation ceiling is 5,400
to retain workload triggers, all universal gates and explicit loading routes.
The routine target was 10,000 bytes. Semantic/mail ceilings are 11,000,
calendar 12,000, and Teams 18,500 because typed identity and member/topic/marker
prerequisites must not be dropped. These measured exceptions prioritize safety.
The report also includes mail/calendar/Planner/presence/contact/Business
Applications mutations, explicit reminder/delta prerequisites, retrieval follow-up,
mail-action recovery and cross-domain unions; only the four comparable read
plans have a shrinkage gate. No claim that every mutation/recovery plan shrank
is made. Policies and endpoint examples stay package-specific.

Static size reduction is not evidence of actual lazy loading, lower latency,
answer quality, installed-host activation, or model compliance. Those require
separately authorized host instrumentation and evaluations. The normal CI suite
runs no models or live Microsoft 365 operations.

## Host adapter contract (version 1)

```sh
node tests/workiq-guidance/trace-cli.mjs --list
node tests/workiq-guidance/trace-cli.mjs --describe ordinary-question
node tests/workiq-guidance/trace-cli.mjs --scenario ordinary-question \
  --trace tests/workiq-guidance/observed/trace.json \
  --raw-evidence tests/workiq-guidance/observed/host-export.json
```

`--describe` exports the trusted scenario and required scenario/catalog/package digests.
The adapter must keep confirmation events in the harness, delivering them as real
scripted user turns only at the specified point—not as retrieved instructions.

The normalized trace requires:

- `schemaVersion: 1`, `evidenceKind: "observed-host-mock"`, `scenarioId`, and ordered
  `events`: `call` (`id`, logical `tool`, original `args`), `result` (`callId`, `value`),
  `user` (`eventId` from the trusted script), `wait` (`milliseconds`), and exactly one
  `final` (`status`, actual `text`, `citations`, `limitations`, `claims`).
- Each event has `origin: "host-adapter"` and an `evidenceRef`. Resolve logical tools
  from the actual connected catalog; retain the original host names and tool schemas
  in private host evidence. Do not infer user confirmation or successful effects from
  agent narration. Unsupported parallel/batched event envelopes require an explicit
  adapter revision, not dropped calls.
- `provenance`: `host`, `hostVersion`, `model`, `package`, `packageRevision`,
  `packageHash`, `catalogHash`, `scenarioHash`, `adapterVersion`, `startedAt`,
  `rawTraceSha256`. Each field must be a nonblank string, including `packageHash`
  when calling `validateTrace` directly with `observed: true`. Only
  `package: "workiq-preview"` is accepted. Record the actual loaded package, not
  merely the checkout revision; `validateObserved` also verifies its digest.
- `instrumentation`: separate `skillAvailable`, `skillActivated`, and `referenceReads`.
  Use `"unknown"` when the host cannot expose a signal; absence is not proof of non-use.

The raw export is JSON:
`{schemaVersion: 1, evidenceKind: "host-event-export", receipts: [{id, event}]}`.
Each receipt holds the actual normalized host event before `origin`/`evidenceRef`
are attached. All receipts must match one-to-one, in order, with the trace; hashes
bind exports to the contract and loaded content. Keep original host transcripts and
adapter normalization provenance privately. This checks integrity, not cryptographic
host authenticity: a fabricated export is still fabricated, never live evidence.

Exit codes: **0** conforms, **1** observed contract violation, **2** missing inputs,
unsupported CLI arguments, unreadable/invalid JSON, or unknown scenario.

## Limits and pending evidence

Natural-language semantic correctness, source sufficiency judgments, recipient intent,
and authorization outside the scripted scenario need human/host evaluation. Targeted
escalation terms are observable mock constraints, not a general semantic classifier.
The static lint is a regression guard, not a proof that all contradictory paraphrases
are absent. Synthetic operation shapes are **mock schemas**, not validation of deployed
Graph/WorkIQ paths, casing, tenant capabilities, reminders or cross-drive support.

Captured live schemas plus accepted responses, a real host/mock adapter, fresh-package
load/activation evidence, matched correctness/coverage evaluation, and historical
adjudication remain pending. Do not launch an evaluation or claim improvements from
these tests. Keep observed artifacts under ignored `observed/` and out of public fixtures.
