# Public WorkIQ SharePoint routing evaluation

This suite separates **offline infrastructure tests** from **observed model
routing**. It evaluates the public `workiq` package, not the preview routing
policy. See [RESULTS.md](RESULTS.md) for measured outcomes and limitations.

## Offline checks

Use Node 22+. The runner uses Node standard libraries; package registration
reuses the existing guidance suite's Markdown/YAML parser.

```powershell
npm ci --prefix tests\workiq-guidance --ignore-scripts --no-audit --no-fund
npm --prefix tests\workiq-guidance test
npm --prefix tests\workiq-sharepoint test
node tests\workiq-sharepoint\eval.mjs list
```

Default tests never launch a model, contact Microsoft 365, install plugins, or
perform live writes. They check request schemas, opaque identities, batching,
metadata, embedded errors, mutation boundaries, real stdio MCP transport,
scorer rejection cases, provenance, immutable matrices, and durable accounting.
Passing these tests does not establish a model trigger rate.

## Matrices

`matrix.mjs` defines 168 natural-language scenarios: 112 development and 56
holdout, including content, discovery, metadata, browsing, disposable CRUD,
failures, explicit-download exceptions, and other-workload controls.
`screeningCases()` selects 32 development cases; `expanded` selects the other 80.
Eligibility, expected facts/effects, permitted routes and downloads are frozen.

`breadth.mjs` inventories all 80 captured `/sharepoint/` paths with intents,
operation/effect classifications, prerequisites, and required fields. Four
helpers are excluded from substantive native-task denominators. Breadth
responses are explicitly simulated; their scores do not claim answer
correctness, verified effects, or live service completion.

`tool-contract.json`, `native-catalog.json`, and `native-schemas.json` are
sanitized snapshots of the observed hosted contract. They are not a promise of
tenant availability. The mock retains all 12 captured WorkIQ tools, including
semantic delegation, Graph-style reads, and original-file download competitors.
Core workflows have stateful fixtures and schema/identity checks; non-core
breadth probes have deliberately narrower schema/scope validation.
Executable native CRUD requires read-back of the affected resource and stored
value; deletion requires complete, unfiltered enumeration. Legacy CRUD receipts
are accepted-only simulations, not executable mutations, and cannot establish
verified effects. Thus baseline CRUD correctness is not a fair comparison of
the hosted legacy service's capabilities.

## Opt-in observed runs

These commands spend model sessions. Use a private evidence directory **outside
the checkout**, an authenticated Copilot CLI, and immutable candidate snapshots.
Do not commit evidence, raw OTel events, session homes, or real tenant data.

```powershell
$root = 'C:\private\workiq-routing-experiment'
node tests\workiq-sharepoint\eval.mjs freeze --root $root
node tests\workiq-sharepoint\eval.mjs register --root $root --variant V0 --package C:\private\baseline-workiq
node tests\workiq-sharepoint\eval.mjs run --root $root --variant V0 --case reading-01 --stage calibration
node tests\workiq-sharepoint\eval.mjs batch --root $root --variants V0,V1 --set screen --stage screening
node tests\workiq-sharepoint\eval.mjs report --root $root --output C:\private\routing-summary.json
```

Use `--executable` for a non-default CLI executable. Sets include `screen`,
`expanded`, `development`, `holdout`, `breadth`, and `cases:ID,ID`. Repetitions
default to one and concurrency to one; only independently isolated concurrency
of one or two is supported. Stage allocations and the 1,000-session global
ceiling are enforced by the existing root's locked, fsync'd `budget.jsonl`.
Interrupted reservations still spend budget. Resuming the same batch skips
already-reserved jobs, rather than replaying writes or silently replacing failures.

Directory loading is the default. For genuine installed-package smoke tests,
add `--load-mode installed`: each fresh home installs the registered snapshot,
captures installation/listing output, verifies the copied package hash and
single enabled installed WorkIQ package, and omits `--plugin-dir` from the
measured invocation. Installation failures remain accounted for and stop the
batch. The current CLI's direct-install layout is checked explicitly; a changed
layout fails closed rather than silently testing a different package.

Each scenario gets a neutral workspace and fresh `COPILOT_HOME`, normal
automatic skill selection, the specified immutable package, `gpt-6.1-sol`, and
one mock WorkIQ server overriding the hosted connection. Shell/network builtins
are unavailable; `skill`, `view`, `glob`, `rg`, and all captured WorkIQ tools
remain. Thus this experiment measures MCP download competition, **not**
unrestricted direct-HTTP behavior. No live-forwarding adapter is implemented:
the fixture server rejects any layer other than `model-mock`.

The deadline is five minutes, with at most 70 tool calls and 24 model calls per
session. Package, catalog, matrix, adapter, raw-event and reference-file hashes
identify evidence. Ambient MCP servers, wrong models, unmatched execution
records, private-oracle inspection, and source mutation invalidate instrumentation.
Completed no-tool answers are routing failures, not instrumentation exclusions.
Calendar and Planner fixtures use a captured per-session host clock/time zone
instead of stale hardcoded dates. The clock is retained with the scenario for
deterministic replay; it does not add routing hints to the prompt.

## Scoring and interpretation

Task-relevant routing needs a schema-valid native operation on the correct
fixture target, not a helper-only hit or a path string. Native success also
requires expected facts, citations where applicable, required effect/read-back,
no later legacy answer delegation, and no forbidden download. Suitable passage
search and structured text both count for focused document questions; semantic
preference and each operation's use are reported separately.

Correctness is a deterministic fixture-fact/effect check, not an unrestricted
semantic judge. It accepts equivalent number/date/time presentation and
hyphenated durations without changing quantities, units or approval codes.
Metadata must use authoritative fields and complete enumeration. Download
completion requires successful host completion and a matching successful
binary result; transfer preparation alone is insufficient. Blocked original-file
attempts still count, and explicit original requests remain permitted.

Reports retain incompatible adapter/matrix blocks separately, list unscored
reservations and failures, and distinguish runs from unique prompts. Confidence
intervals are Wilson intervals for the fraction of unique scenarios passing
**every** repetition; repeated sessions are not treated as independent prompts.
Live endpoint results must be reported separately from model/mock observations.
