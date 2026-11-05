# SharePoint-native routing experiment

## Status and scope

V2's unchanged guidance has been promoted, reinstalled and verified after the
disclosed scorer audits below. The frozen holdout, catalog breadth and all 32
fresh installed-package checks are complete.

The primary held-out routing result is **17/138 (12.3%) to 138/138 (100%)**,
an **87.7 percentage-point** improvement. Appropriate native document processing
rose from **11/72 (15.3%) to 72/72 (100%)**, with **zero** candidate unrequested
downloads. These routing/use results are identical under original and amended
scoring. Corrected native success is 136/138; two original folder-verification
failures remain failures. This is not a claim of 100% catalog coverage.

The objective is **task-relevant `/sharepoint/` selection**, especially native
semantic passages and structured document text instead of original-file access.
These are real `gpt-6.1-sol` choices against a controlled mock WorkIQ server, not
synthetic expected traces and not live service-completion measurements.

The official plugin is a client-side instruction package, not the hosted
SharePoint service implementation. Experimental variants retained the same
endpoint and all 12 captured WorkIQ tools, including competing `ask`, Graph
reads, and `fetch_blob`. Native capabilities are provider paths invoked through
`call_function` or `do_action`, not 80 new MCP tools.

## Design and acceptance

The frozen core matrix has 168 scenario IDs: 112 development and 56 holdout.
It covers discovery, semantic questions, whole-document reading, portions and
images, multi-file comparisons, library metadata, browsing, disposable CRUD,
failures, explicit downloads, and eight other-workload controls. SharePoint
holdout cases reserve paraphrases and document/task combinations; some
non-SharePoint control prompts intentionally repeat across splits.

| Family | Development cases | Held-out cases | Expected evidence |
| --- | ---: | ---: | --- |
| File discovery | 12 | 6 | Resolved scope and returned file identities |
| Semantic questions | 16 | 8 | Passages or suitable structured text; semantic preference reported separately |
| Whole-document reading | 16 | 8 | Structured document text |
| Portions and images | 8 | 4 | Requested outline, pages or exact image references |
| Multiple documents | 8 | 4 | Batched text and per-file citations |
| Library metadata | 8 | 4 | Authoritative schema, fields and complete aggregation |
| Site/library/folder browsing | 8 | 4 | Native discovery and hierarchy |
| Disposable CRUD | 8 | 4 | Applied effect and affected-resource read-back |
| Failure handling | 8 | 4 | Grounded error/ambiguity handling without bypass |
| Explicit original downloads | 4 | 2 | Completed binary receipt, not preparation alone |
| Other-workload controls | 16 | 8 | Mail, calendar, Teams, people, Planner, OneDrive and attachments |
| **Total** | **112** | **56** | |

The first 32 development cases screen five variants. Baseline and V2 then run
the other 80 development cases. The final comparison uses 56 held-out cases
three times per package: 168 sessions each. Its denominators are 138
native-eligible runs (46 scenarios) and 72 Botdoc-eligible runs (24 scenarios).
Explicit downloads and non-SharePoint controls are excluded from native-rate
denominators, not discarded from correctness or regression checks.

A separate 80-path inventory tests one intent per advertised native path in
each package. Four helpers are separated from the 76 substantive operations.
Breadth measures route/schema/scope selection, **not** answer correctness or
executed service effects.

Promotion requires at least 95% native routing, native task success, appropriate
Botdoc use, and Botdoc success; zero unrequested holdout download attempts; and
all held-out regression/download controls correct. Both observed run rates and
the fraction of unique scenarios passing every repetition must meet 95%.
The final package must also pass fresh installed-package checks.

Confidence intervals are Wilson intervals for unique scenarios passing every
repetition. Repetitions are not independent new prompts. These finite-suite
intervals are not a population-wide guarantee or a confidence-bound acceptance
test.

## Variants and initial screen

| Variant | Instruction change | Native routing | Native success | Botdoc use | Original correctness | Unrequested-download runs |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| V0 | Unchanged official package | 2/28 | 0/28 | 1/16 | 31/32 | 3 |
| V1 | Description and inline dispatch | 28/28 | 28/28 | 16/16 | 32/32 | 0 |
| V2 | Coherent native-first policy and focused references | 28/28 | 28/28 | 16/16 | 32/32 | 0 |
| V3 | Compact progressive-disclosure guidance | 28/28 | 28/28 | 16/16 | 32/32 | 0 |
| V4 | Dedicated SharePoint skill | 28/28 | 28/28 | 16/16 | 32/32 | 0 |

All five packages activated a WorkIQ skill in 32/32 screening sessions. The
observed gain is therefore **routing after activation**, not improved skill
activation. The screen does not isolate a causal effect of any single sentence
or reference.

V2 was selected before final validation: its guidance is coherent, preserves
one general skill and unrelated workflows, and used fewer tools than the other
revised variants in the tied screen. It was **not** the lowest-billing variant;
V3 had lower reported usage. The candidate itself was not changed after screen
selection.

V2 changes the skill and five references: native SharePoint dispatch,
document-text/passages recipes, authoritative native library metadata,
provider-function invocation, and provider-function schema discovery. It
removes contradictory SharePoint Graph/download recipes while retaining
personal OneDrive and attachment workflows.

## Expanded development and clock controls

| Package | Native routing | Native success | Botdoc use | Original correctness | Unrequested-download runs |
| --- | ---: | ---: | ---: | ---: | ---: |
| V0 | 9/64 | 7/64 | 6/32 | 74/80 | 3 |
| V2 | 64/64 | 64/64 | 32/32 | 78/80 | 0 |

Across all 112 development cases, V2 used appropriate native routes in 92/92
eligible cases and native content processing in 48/48 content cases. Its two
original correctness failures were calendar controls, not SharePoint tasks.

The calendar fixture returned a hardcoded event outside the requested
"tomorrow" window; both packages correctly refused to call it tomorrow.
A hardcoded Planner due date was also outside the requested current week.
The fixture now uses a captured per-session host clock/time zone: calendar
results honor the requested day and Planner deadlines lie within the current
week. Equivalent time formats are accepted without accepting wrong times.

Four development controls were rerun in both packages twice: **16/16 passed**.
These new sessions supplement, rather than replace, the retained original
failures. Prompts, eligibility, expected facts, matrix hashes, and candidate
instructions were not changed.

## Fixture and evidence amendments

Before final validation, all 320 screening/development originals were
replay-audited with their stdout, MCP-call, and local OTel digests verified.
Original model events and scores remain unchanged.

The final fixture only marks identities actually present in returned results
as discovered. Write verification requires a read of the affected resource and
stored name/value; deletion requires complete, unfiltered enumeration, not a
count or unrelated subset. Earlier target, citation, image-label, captured-JSON
fingerprint, and stop-on-batch-failure checks were also tightened.

The stricter replay changes no candidate non-clock response or acceptance
metric. It removes five unsupported baseline CRUD correctness passes: one
screening case and four expanded cases. Thus audited baseline correctness is
30/32 and 70/80 respectively, versus the original 31/32 and 74/80 above.
One already-invalid baseline image request receives a stricter error response
without changing a metric.

**Baseline CRUD correctness is not a fair comparison of live capabilities.**
Legacy write fixtures return accepted-only receipts and do not execute the
mutation; native core fixtures execute and verify their simulated changes.
The corrected scorer no longer credits those legacy receipts as effects.
Do not attribute that fixture asymmetry to a model or hosted-service improvement.
Replay is not a counterfactual new model answer.

The corrected adapter, unchanged candidate, acceptance criteria, host/model,
and package hashes were frozen before the first holdout reservation. Candidate
instructions were not tuned against the final holdout.

## Final holdout and post-holdout amendments

All 336 holdout and 160 breadth sessions completed with the candidate and
runtime frozen, with **no instrumentation failures**. The original acceptance
record is **false**: Botdoc success and the all-repetition native-success
criterion failed. The amended acceptance is **true**. It is not described as an
untouched preregistered acceptance.

### Duration presentation and binary receipts

Correct answers such as "35-minute rollback window" failed a fact pattern
accepting "35 minutes". Only after the entire frozen batch finished, a narrow
normalization accepted ASCII `-`, U+2010 and U+2011 between a number and a
duration unit. Quantities, units, approval codes, prompts,
eligibility, expected facts and candidate instructions were not changed.
Focused negative tests still reject wrong numbers, units and approval codes.

Both arms were replayed against all **845 original normalized traces**, with
stdout, MCP-call and local OTel digests verified. Every frozen score reproduced
before the amendment; older calibration protocol differences were retained
separately. Four candidate reading runs and four baseline reading runs changed
only because of duration typography. Candidate correctness rose from 162/168
to 166/168; baseline correctness rose from 151/168 to 155/168. This is replayed
scoring of the same answers, not eight new model observations.

A separate synthetic rejection test reproduced unsupported passes for failed
or unfinished binary calls. A second, negative-only amendment requires positive
host completion and a matching successful binary result. Replaying all 845
originals again verified their digests and changed **zero** observed scores.
No measured download failure was invented, and no new pass could be created
by this hardening. Original scores and both preceding acceptance records remain
preserved privately.

| Metric | V0 amended | V2 original | V2 amended |
| --- | ---: | ---: | ---: |
| Task-relevant native routing | 17/138 (12.3%) | 138/138 (100%) | 138/138 (100%) |
| Native task success | 10/138 (7.2%) | 132/138 (95.7%) | 136/138 (98.6%) |
| Appropriate Botdoc use | 11/72 (15.3%) | 72/72 (100%) | 72/72 (100%) |
| Botdoc success | 9/72 (12.5%) | 68/72 (94.4%) | 72/72 (100%) |
| Overall fixture correctness | 155/168 (92.3%) | 162/168 (96.4%) | 166/168 (98.8%) |
| Other-workload controls correct | 24/24 | 24/24 | 24/24 |
| Explicit originals completed | 6/6 | 6/6 | 6/6 |
| Runs with unrequested downloads | 2 | 0 | 0 |

These are controlled fixture results. In particular, baseline CRUD correctness
has the accepted-only legacy-fixture limitation described above.

| Measure | V0 scenarios passing every repetition | Scenario Wilson 95% interval | V2 scenarios passing every repetition | Scenario Wilson 95% interval |
| --- | ---: | ---: | ---: | ---: |
| Native routing | 4/46 | 3.4%-20.3% | 46/46 | 92.3%-100% |
| Native success | 2/46 | 1.2%-14.5% | 45/46 | 88.7%-99.6% |
| Botdoc use | 3/24 | 4.3%-31.0% | 24/24 | 86.2%-100% |
| Botdoc success | 2/24 | 2.3%-25.8% | 24/24 | 86.2%-100% |
| Overall correctness | 51/56 | 80.7%-96.1% | 55/56 | 90.6%-99.7% |

| Held-out family | Unique cases | V0 relevant routing | V2 relevant routing | V2 native success |
| --- | ---: | ---: | ---: | ---: |
| Discovery | 6 | 0/18 | 18/18 | 18/18 |
| Semantic questions | 8 | 0/24 | 24/24 | 24/24 |
| Whole-document reading | 8 | 0/24 | 24/24 | 24/24 |
| Portions/images | 4 | 11/12 | 12/12 | 12/12 |
| Multiple documents | 4 | 0/12 | 12/12 | 12/12 |
| Metadata | 4 | 0/12 | 12/12 | 12/12 |
| Browsing | 4 | 0/12 | 12/12 | 12/12 |
| Disposable CRUD | 4 | 6/12 | 12/12 | 10/12 |
| Failure handling | 4 | 0/12 | 12/12 | 12/12 |

On the 24 focused semantic-question runs, V2 selected `semantic_search` in
**13/24 (54.2%)**, versus 0/24 for V0. The other 11 used suitable native structured
text, which was explicitly permitted before testing. Only 4/8 semantic scenarios
used the preferred semantic route in every repetition: **semantic preference is
not 100%**. V2 used structured text in 24/24 whole-document and 12/12 multi-file
runs, plus those 11 focused questions, for 47/72 content runs overall. V0 used
neither semantic search nor structured text in these held-out cases; its 11
native content hits were other document-processing operations.

### Folder fixture and fresh follow-up

In two of three repetitions of one held-out folder-create case, creation was
accepted but folder-only enumeration discarded the newly stored folder.
The model accurately reported verification as inconclusive. Both original
failures remain failures; the third repetition's unfiltered read verified it.

After frozen validation, the fixture was minimally repaired to include stored
folders in folder-only results. A regression test verifies the new folder's
identity/name and excludes file rows; deletion still requires complete,
unfiltered enumeration. Eight fresh, matched **development-only** sessions
(two CRUD cases, two packages, two repetitions) were all valid and correct.
V2 completed all four with verified effects and no later legacy delegation.
No successful responses or repaired-fixture scores were substituted into the
old holdout. These follow-ups validate the fixture correction, not a retuned
candidate.

## Catalog breadth

| Frozen breadth measure | V0 | V2 |
| --- | ---: | ---: |
| Expected substantive path/schema/scope selection | 52/76 (68.4%) | 69/76 (90.8%) |
| Substantive scenario Wilson 95% interval | 57.3%-77.8% | 82.2%-95.5% |
| Exact helper selection | 3/4 | 3/4 |
| All expected paths, including helpers | 55/80 | 72/80 |
| Runs with unrequested downloads | 1 | 0 |
| Instrumentation failures | 0 | 0 |

The substantive improvement is **22.4 percentage points**. Breadth intents are
operation-focused and are not the same distribution as the natural-language
core matrix. These probes test expected-path selection, not service execution
or correctness. Their seven substantive candidate misses remain in the
denominator, even when clarification/refusal was sensible:

| Expected path suffix | Observed outcome |
| --- | --- |
| `add_comment` | Refused a `.docx` target because the advertised operation supports plain text. |
| `create_form` | Refused the fixture's document library where the operation requires a list. |
| `set_sensitivity_label_on_file` | Found the file, but the fixture did not expose the required label ID. |
| `configure_quick_step_columns` | Did not fabricate missing configuration/rule-template IDs. |
| `knowledge_base_operations` | Did not invent a knowledge-base listing from a library-only response. |
| `apply_knowledge_base_instructions` | Read the supplied appendix, which contained facts rather than actionable instructions. |
| `semantic_search` | Answered correctly through native structured text instead of the exact expected path. |

The fourth helper miss was `load_skill`: both packages used native `learn`
instead. These are retained expected-path misses, not proof that an unsafe or
unsupported call should have been made. Missing fixture prerequisites and
format/list-type mismatches limit this breadth result. No guidance was retuned
on these final probes, and helper hits are not counted as substantive success.

## Installed-package verification

The official plugin was reinstalled and its actual copied package verified.
P1 contains exactly V2's accepted skill/reference bytes; only its package README
differs. Its parsed skill description is 742 characters, within the 1,024 limit,
and all seven native JSON recipes validate against captured wrapper/body schemas.
Endpoint, plugin version 2.0.2, host manifests, registries and the preview package
are unchanged.

Each fresh installed-mode session performs a real CLI plugin installation into
its isolated home, checks exactly one enabled installed WorkIQ package and every
copied byte, and omits `--plugin-dir`.
Disabled built-in plugins are not mistaken for competing WorkIQ packages.
External links, ambiguous inventory, stale versions, and modified bytes fail
closed. Setup failures retain their reservation and evidence. The first
installed preflight proved successful automatic skill loading and reads from
the installed references before scaling.

| Installed check | Observed result |
| --- | ---: |
| Distinct sessions valid and correct | 32/32 |
| Successful automatic skill loading | 32/32 |
| Eligible native routing and success | 28/28 |
| Appropriate Botdoc use and success | 16/16 |
| Other-workload controls correct | 3/3 |
| Explicit original download completed | 1/1 |
| Runs with unrequested downloads | 0 |
| Before/after copied bytes and inventory verified | 32/32 |

Every successful reference read resolved inside the actual installed copy and
matched the registered file hash, not a source variant directory. Raw evidence
digests were also reverified. The unique-case Wilson 95% intervals are
87.9%-100% for native success, 80.6%-100% for Botdoc success and 89.3%-100% for
overall correctness. These smoke prompts are development cases, not an
additional untouched holdout; their purpose is installed-loading verification.

## Efficiency and references

| Screening package | Mean tools | Mean model calls | Mean seconds |
| --- | ---: | ---: | ---: |
| V0 | 4.25 | 5.03 | 15.33 |
| V2 | 9.13 | 7.31 | 19.70 |

| Screening package (32 runs each) | Reported total nano-AIU | Mean input tokens, including cache | Mean output tokens |
| --- | ---: | ---: | ---: |
| V0 | 201,839,660,000 | 118,405 | 341 |
| V1 | 277,084,070,000 | 255,635 | 607 |
| V2 | 236,673,410,000 | 175,774 | 562 |
| V3 | 130,209,620,000 | 108,849 | 589 |
| V4 | 251,145,890,000 | 200,283 | 581 |

All screening usage files report complete billing status. Nano-AIU is the
CLI-reported unit, not dollars; no currency conversion is inferred. Input
totals include cached tokens and must not be added to cache-read totals again.

Revised screening mean tools were V1 10.16, V2 9.13, V3 9.56, and V4 10.00.
Expanded means were V0 5.16 tools / 20.85 seconds and V2 8.53 / 22.87.
Native discovery, schema inspection, and reference loading add work compared
with a mock `ask` answer. These timings include host/model/fixture overhead;
they do not predict live WorkIQ latency or demonstrate lower cost.

In the screen, V2 opened the native reference before 28/28 native workflows
and the content reference before 16/16 content calls. This is observational
reference-use evidence, not proof that the references alone caused the gain.
Focused questions permit either suitable semantic passages or structured text;
their individual use rates must not be conflated.

| Frozen holdout package (168 runs each) | Mean tools | Mean model calls | Mean seconds | Reported total nano-AIU |
| --- | ---: | ---: | ---: | ---: |
| V0 | 4.49 | 5.24 | 19.05 | 1,092,936,960,000 |
| V2 | 8.50 | 6.94 | 22.95 | 1,208,574,210,000 |

All 336 holdout usage files report complete billing status. Better core routing
was **not cheaper or faster** in this mock comparison. Native guidance did use
less work on breadth: 10.31 versus 11.70 mean tools, 27.82 versus 35.37 seconds,
and 636,911,620,000 versus 788,017,750,000 reported nano-AIU over 80 runs per arm.
The mock `ask` endpoint does not execute or bill a real delegated agent, so these
comparisons cannot establish live end-to-end costs.

Both packages successfully activated the skill in 168/168 holdout sessions.
V2 successfully read the primary reference before 138/138 native workflows,
the document-text reference before 72/72 content calls, and the metadata
reference before 12/12 metadata calls. Timing means successful read completion
before the native request, not merely an earlier attempted read.

## Live checks and limits

Read-only live retry on the authorized demo site succeeded for `get_site_key`,
`discover_sharepoint_lists`, and complete `list_items` enumeration. Earlier
reads had returned embedded 401 errors despite an outer 200.
The only visible document library was empty.

Consequently, there is **no live Botdoc extraction, semantic-search, image,
upload, or mutation completion evidence**. No live resources were created or
modified, and no cleanup is outstanding. No live-forwarding mutation adapter
was implemented; the mock refuses a live layer.

The measured host is Copilot CLI 1.0.105 on Windows with Node 26.13.0 and
`gpt-6.1-sol`, using fresh neutral workspaces, isolated homes, normal automatic
skill selection, no repository/custom instructions, and one mock WorkIQ server.
Each scenario is bounded to five minutes, 70 tool calls and 24 model calls;
concurrency is two. No temperature, seed, or reasoning override is supplied.

Shell/network builtins are unavailable. MCP raw-download competitors remain
visible, so unrequested MCP downloads are measured; unrestricted direct HTTP
competition is **not**. Blocked attempts count as attempts.

Correctness is deterministic fixture fact/citation/effect checking, not an
unrestricted semantic judge. Fixtures are small; they do not prove real-scale
paging, arbitrary CAML execution, parser fidelity, scanned-document OCR,
cross-tenant permissions, or arbitrary format support. Office/PDF/Markdown
filenames carry canned text; the diagram is a one-pixel image, not a vision
test. Schema advertisement does not establish tenant availability. Native
success on a failure case can mean correct error handling, not extraction.

## Reproducibility and budget

The matrices, sanitized catalog/schemas, runner, fixture and scorer are in this
directory; [README.md](README.md) documents offline and opt-in commands.
Raw events, isolated homes, tenant responses and protocol records stay private.
Do not commit credentials, opaque live identities, signed URLs or transcripts.

| Frozen artifact | SHA-256 |
| --- | --- |
| Core matrix | `7a4490a1d54749027bed4b4a63abfa030965500bc5252a73ff64d96eeb8fe709` |
| Breadth matrix | `b79ac1e3806f88a77d30d11dc5bee74a779580bf41aae9730dc3288c4c3dcf9a` |
| Catalog, schemas and tool contract | `06cbbd5ecef1f90d60ce14692a3f3951cf71c0c729507e3b2cba313cc88687fe` |
| Original screen adapter | `c729393fe78d0b2905869818249a439fe51a4578ecc09c97fe71c8246a82b489` |
| Expanded adapter | `f12a928fecc4702288364509911ab4cd4fb1c5148d2638ac70ed59f7968b7b46` |
| Frozen final adapter | `9d3220948857c1ddb96e87af7416fdfc0b7eb49354bffd4e9e1273d2bb827419` |
| Original final scorer source | `e39d8cbff783388a9e8e61ed2322b8e8a5544f0d88901f3289fececabbf0a0bd` |
| Duration-only corrected scorer | `0af36a6c538d1b77c5c61e1580e20577a7db3bea172837e7b830a0ac893ce0c5` |
| Receipt-hardened scorer | `e0d6656300d4854bf9aaa0371a6026311f7a833f4b366657952f4542d8507158` |
| Corrected folder fixture source | `7a3f552f45f86c9ba5a349c21e7e741943e8664c9d41485f2855503fd0fec273` |
| Follow-up/installed adapter | `5971abed0f000d585f0e69d340a3c5247f6879816baa068cf22245944e352cb0` |
| Final comparison protocol | `34984ca7b10defbf25d6ab2d7fb0d12ffed3461a7f1b530c2ba0f5310964d3ef` |
| V0 package | `c0693e80f2418f7a33b7924fb6715e54c4ad0756c064fd37a1a41c471de15f6e` |
| V2 package | `6754d2c234672b7771c43c9c88f03a05fb54a588e37a6f4c60818c3ae93c3a64` |
| V2 complete skill/reference tree | `16864bd767fe2f9acd42acb039b72fa3674264afe7e673c3602317e2f734fb5c` |
| Promoted P1 package | `ef66c003f800993a3d1cda8b5fa2426ae11a99ddbc48b7d18bdb7a90325e03c8` |

Hashes describe the recorded Windows snapshot bytes, including line endings.
Original revisions and protocol amendments remain associated with each run;
incompatible adapter blocks are not silently pooled as one experiment.

The durable ledger reconciles to **888/1,000 reservations**, all finished:
**885 normalized scores** plus three raw-only host diagnostics. There are no
unfinished reservations; 112 sessions remain unused.

| Stage | Finished reservations | Normalized scores |
| --- | ---: | ---: |
| Calibration and diagnostics | 16 | 13 |
| V0-V4 screening | 160 | 160 |
| Expanded development | 160 | 160 |
| Clock controls and folder follow-up | 24 | 24 |
| Frozen core holdout | 336 | 336 |
| Frozen catalog breadth | 160 | 160 |
| Installed winner | 32 | 32 |
| **Total** | **888** | **885** |

The three raw-only diagnostics are CLI authentication/model visibility,
isolated-home authentication and native-request-schema capture. They consume
budget but are not scored model scenarios. Calibration failures/false negatives
remain retained and are not selection metrics. Replay audits do not consume new
model sessions and are not counted as new observations.

Offline checks pass **50/50** public infrastructure/documentation tests and
**348/348** existing guidance tests. CI runs only offline checks: no model,
plugin install, credentials or live Microsoft 365 operations.
