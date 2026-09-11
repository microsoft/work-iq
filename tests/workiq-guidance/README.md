# WorkIQ guidance contract checks

Run from the repository root with Node 22+:

```sh
npm ci --prefix tests/workiq-guidance --ignore-scripts --no-audit --no-fund
npm --prefix tests/workiq-guidance run test:oracle
npm --prefix tests/workiq-guidance run test:static
npm --prefix tests/workiq-guidance test
```

Dependencies and the lockfile are test-only; neither plugin gains runtime dependencies.
CI runs the two layers separately and performs no model calls, plugin installation,
Microsoft 365 operations, or live evaluations.

[`baseline.json`](baseline.json) records the unchanged-guidance red run: 244 oracle
self-tests pass; 24 of 132 documentation checks fail for enumerated old-policy/link
causes. It is historical offline evidence, not an assertion about the current checkout.

## Canonical contract and evidence layers

- [`contract.mjs`](contract.mjs) defines stable **G01–G25** ownership/retrieval
  requirements and **R.C1–R.C7**, schema-discovery, SharePoint and Business Applications
  requirements. G governs semantic routing; exact entity workflows remain separate.
- [`fixtures.mjs`](fixtures.mjs) maps every requirement to synthetic positive and
  deliberately invalid negative traces. These are **oracle unit inputs**, not observed
  agent behavior. There is no toy router whose output is counted as agent compliance.
- **Static checks** parse YAML descriptions, Markdown links/anchors (including
  unambiguous code references), domain dispatch, retrieval JSON, shared policy concepts
  and contradictions. Parity compares shared policy coverage, reference graphs and
  retrieval argument shapes. Public-only SharePoint/Business Applications files and
  links have explicit reasons in the contract; their safety policy is still linted.
  Prose paraphrases need not match a paragraph snapshot. Affected plugin names,
  versions, and descriptions must agree across both marketplaces and all host
  plugin manifests.
- **Oracle tests** prove that the assertion runner accepts/rejects specified trace
  structures, including wrong actual calls, missing approval, replay and false outcomes.
- **Observed host/mock tests** require a separately instrumented host to load the
  candidate package and produce calls against the scripted tool catalog/responses.
  None have been run by this suite. Static or oracle passes do not establish LLM compliance.

## Scenario input and output

A trusted scenario contains the prompt, bounded objective, advertised tools/strategies,
source restrictions, scripted operations/results, exact target/body confirmations,
prerequisite reads, mandatory requested effects, and call/retry budgets. Source IDs,
people, dates and addresses are synthetic. No production upload URLs or transcripts
belong in this directory.

Each operation declares `tool`, `match`, `effect`, `output`, and optional prerequisites.
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
Retry delays start after the corresponding observed response; waiting while a call
is pending does not satisfy a subsequently returned backoff.

The assertion runner returns `{ok, violations: [{code, message}]}`. Final output carries
a terminal status, answer text, citations, disclosed limitations and observable claims.
Claims are checked against tool evidence; they are not authorization. Unsupported
schemas, absent results and missing final evidence fail closed.

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
  `rawTraceSha256`. Record the actual loaded package, not merely the checkout revision.
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
