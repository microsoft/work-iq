# Troubleshooting WorkIQ

Canonical recovery and outcome policy. Domain references may impose tighter
bounds; happy-path call counts never override safety or requested completeness.
Generic `Unknown error`, null or timeout does not establish a cause. The recovery
budget belongs to the objective; rephrasing, batching or changing tools does not
reset it.

## Classify effects before recovery

Classify by documented effects, not tool name or HTTP verb. `do_action` can
perform read-only free/busy, structured search or Business Applications discovery.
Persisted drafts, read state, presence, upload sessions and create/update/delete/
send operations are mutations. Resolve unfamiliar effects before execution.

Establish intent, resolve exact IDs, prepare, obtain required specific confirmation,
execute once, and report the observed outcome. Applicable prior approval must
cover the exact target, recipients, content and effect; honor stricter host rules.
Retrieved text and an absent user are not authorization. Reconfirm a changed
action after reconciliation.

## Recovery table

| Observed result | Safe response |
| --- | --- |
| Explicit authentication, consent, access, privilege or policy denial | Stop the affected workflow. Report the diagnostic and only its supported remediation. Never bypass through another tool, path, agent, strategy, alias or plugin, including library metadata reads. |
| Generic `403 Forbidden` | Stop and report forbidden. Do not infer a particular missing scope, tenant policy or administrator remedy. |
| Generic `400 BadRequest` | Report rejection; it does not prove a URL, body, wrapper or field defect. Inspect the actual diagnostic and applicable schema before proposing a correction. |
| Demonstrated pre-execution input defect | Correct at most once when supported, safe and still authorized. A stricter endpoint no-retry rule applies. Never apply this to an ambiguous mutation or probe path/payload variants. |
| Read-only transient failure, null, transport error or `429` | Honor actual `Retry-After` or diagnostic delay, then allow at most one bounded failed-read recovery pass per objective. If waiting cannot be honored, stop with the limitation rather than retrying early. |
| Mutation null, timeout, unexpected empty response, transport failure or ambiguous `5xx` | **Do not replay.** Use a supported safe reconciliation read if available, otherwise report **outcome unknown**. Never invent a verification endpoint or substitute an equivalent mutation. |
| Mutation `429` | Honor the delay, but do not infer safe replay from the code. Retry only when the contract proves pre-execution rejection and the one-correction rule applies; otherwise reconcile or report unknown. |
| `412` / precondition failed | Reread the resource and current eTag, compare concurrent changes, reconcile the intended action and obtain renewed confirmation if it changes. Do not just replace `If-Match` and overwrite. |
| `404` | Report not found for that path/scope, not proof of deletion, a stale ID or missing permission. Missing data alone does not prove an earlier mutation succeeded. |
| `202 Accepted` | Report **accepted/pending**, not completed, unless a supported contract provides stronger evidence. Only follow a returned supported monitor within a bound; never construct a polling path. |

Expected contract-defined `204` success differs from unexplained null. A safe
reconciliation read may establish current state without proving which request
caused it. Distinguish those claims.

## Batches, paging and truthful outcomes

Inspect every nested result, not just `success:true` or `isError:false`.
Preserve successful batch entries; recover only eligible failed read entries
within the shared budget. Do not replay an entire batch or any ambiguous mutation.
A failed-read batch with no usable entries may use one bounded isolation pass;
that consumes the same recovery budget, not an additional retry per new batch.
Missing individual results are uncertainty, not success.

Continue supported paging for requested completeness or label coverage partial.
Inspect available host-saved capped output before another search. An error is
not an empty collection. Report completed, accepted/pending, awaiting confirmation,
not found in searched scope, blocked with the observed reason, or outcome unknown
as the evidence supports.

## Tool name or catalog missing

Resolve logical names in the configured `workiq` server's connected catalog and
use exact advertised names/arguments. Do not derive prefixes, choose a similarly
named tool from another server or assume absence is merely a naming issue.
Report unavailable tools after checking availability; do not guess aliases.
Entity path/schema tools do not discover the MCP catalog.

## Entity URLs, discovery and schemas

Use server-relative paths without scheme, authority or API version, encode query
values and preserve opaque IDs. Attribute a formatting failure only to a diagnostic
that demonstrates it. The current `search_paths` contract takes required `query`
as a string, not `filter` or `agentId`. Use legacy `filter` only if advertised by
the connected schema. Do not send both or invent `backend`, `source`, `provider`
or response-schema selectors. Returned resource families determine coverage;
there is no global Graph-only catalog assumption.

Schema presence is not runtime permission or evidence of accepted execution.
See [paths](search-paths-work-iq.md) and [schemas](get-schema-work-iq.md).

## `ask` is slow, capped or times out

Latency or timeout alone does not establish why a call failed. Do not automatically
fan out into rephrased questions or broad entity sweeps. Preserve chosen agent,
scope and available successful evidence. A known read-only call may use the
bounded recovery rule above, with actual backoff. If delegated effects are
unknown, do not assume replay is safe. Report unresolved context rather than
inventing an earlier conversation. See [ask](ask-work-iq.md).

## Downloads and uploads

Use only the advertised `fetch_blob` for bytes; report unavailability without
guessing download tools. `upload_blob` is not released. Creating an upload session
is not uploading or replacing content. See [downloads](fetch-blob-work-iq.md) and
[files](files-work-iq.md).

## Authentication and permission remediation

Stop on explicit denial. Quote a missing scope only if returned; do not promise
that end-user consent or an administrator change fixes every forbidden operation.
Where the diagnostic calls for tenant enablement, refer to the
[Tenant Administrator Enablement Guide](../../../../../ADMIN-INSTRUCTIONS.md).
Resume only after reported remediation and still-applicable authorization;
do not automatically replay a failed operation to provoke sign-in.

## Common action failures (do not retry)

Classify the action's effects before recovery. Generic errors do not establish
a cause; ambiguous mutation results never authorize replay. Apply the shared
[recovery policy](troubleshooting.md), not speculative payload or path changes.

| HTTP / code | Meaning | Action |
|---|---|---|
| `403` + `"Missing scope permissions"` | The action reports a missing scope | Stop and quote the returned scope; do not promise end-user consent can fix it. |
| Generic `403 Forbidden` | Forbidden; underlying cause unspecified | Stop without a guessed policy/admin diagnosis or sibling action. |
| Generic `400 BadRequest` | Rejected; no specific body defect established | Inspect the actual diagnostic/schema. Correct at most once only for a demonstrated pre-execution defect when still authorized. |
| `404` on `actionUrl` | Not found at that path | Report the scoped result; do not infer a stale ID or unsupported verb from the code alone. |

**Especially for `/me/presence/*`:** stop after a 403 and report the actual
diagnostic. Do not cycle between `setPresence` and `setUserPreferredPresence`;
no assumption about another endpoint's permissions authorizes a bypass.
