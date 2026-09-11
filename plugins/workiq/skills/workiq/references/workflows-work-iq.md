# WorkIQ workflow index

Start with the [quick guide](../SKILL.md); read only the contract needed below.
This file owns setup, people, explicit discovery, and cross-domain sequencing.
Domain references own their endpoint recipes.

## Choose by intent and ownership

| Intent | Route and canonical contract |
|---|---|
| Gather evidence for your own summary, status update, comparison, catch-up, or implementation | Available `retrieve` with explicit `strategy: "grounding"`, including unknown or unspecified locations; [retrieval](retrieve-work-iq.md) |
| Required broader/federated sources, mixed indexed/external scope, `Dataverse`, or `GraphConnectors` | `retrieve` with explicit `strategy: "copilot"` directly; preserve source restrictions |
| Intentionally ask Microsoft 365 Copilot or a named agent a question | [Delegated answers](ask-work-iq.md); [agent discovery](agents-work-iq.md) for an unresolved named agent |
| Exact file metadata, folders, rename/move/copy/delete, or upload session | [Files](files-work-iq.md) |
| Calendar windows, event actions, rescheduling, reminders, next meeting, or free/busy | [Calendar](calendar-work-iq.md) |
| Mail filters, exact exchange summary, persisted reply draft, send/forward/delete, or attachment selection | [Mail](mail-work-iq.md) |
| Chats, channel members/messages, exact message summaries, reactions, or presence | [Teams](teams-work-iq.md) |
| Structured plan discovery and Planner tasks | [Tasks](tasks-work-iq.md) |
| OneDrive/SharePoint or attachment bytes | [Binary download](fetch-blob-work-iq.md) |
| Explicit structured delta/change synchronization | [Functions and checkpoints](call-function-work-iq.md) |
| Exact entities or complete structured collections | [Fetch](fetch-work-iq.md); no retrieval preflight |
| SharePoint sites, group-backed sites, libraries, document search, or an explicitly requested site-page download | [SharePoint navigation](sharepoint-work-iq.md) |
| Library columns, authoritative listItem fields, or complete metadata reports | [Library metadata](sharepoint-library-metadata.md), not semantic text extraction |
| Business Applications discovery, structured reads/writes, or explicit application delegation | [Business Applications](business-applications.md); retain exact returned paths and privileges |

An ordinary summary does not imply delegation. An exact-thread summary or draft
uses exact entity reads and local synthesis. A semantic request for a numbered
section of a named document uses retrieval when no exact source is supplied;
its filename or unknown location does not select `ask`. A supplied exact document
instead uses its supported entity/content route.

For unavailable retrieval, disclose the limitation: no automatic `ask`, invented
alias, omitted strategy, or broad entity sweep. A delegated alternative requires
the user's selection. A denial stops all alternate tools, paths, agents, and
strategies for the denied operation. An empty result or host cap alone does not
authorize broader retrieval; inspect an available saved result before repair.
The [retrieval contract](retrieve-work-iq.md) owns bounded refinement and escalation.

## Resolving tool names in your host

The logical names in these documents are not necessarily callable names. This
package configures MCP server `workiq`; use the server identity from its
`.mcp.json`, not an inferred skill-folder prefix.

1. Find the logical tool in the connected host catalog. Load deferred definitions
   with the host's discovery facility before calling.
2. Select the entry belonging to the configured WorkIQ server and use its exact
   advertised name and argument schema. Do not construct aliases.
3. If missing, check availability once and report the limitation. Entity
   `search_paths`/`get_schema` do not discover MCP tools. Installing a preview
   plugin does not enable tenant-dependent `retrieve`.

## Prerequisites and configuration

The bundled `.mcp.json` points to the hosted endpoint
`https://workiq.svc.cloud.microsoft/mcp`; MCP calls need no local runtime install.
The host attaches an authenticated Microsoft 365 user token. Never put tokens in
prompts, tool arguments, or plugin files. Obtain the intended account from the
user/host, not local git or OS identity. Authentication or consent remediation
must happen through the host/admin; do not probe alternate routes after denial.
See [recovery](troubleshooting.md) before resuming an interrupted operation.

## Explicit discovery and schema requests

- A request for available paths/operations uses [search_paths](search-paths-work-iq.md).
  The current catalog takes a required natural-language/path-prefix `query`;
  keep it focused on the requested domain. Use legacy `filter` syntax only if
  the connected tool explicitly advertises it.
- A request for fields, payloads, or a data model uses [get_schema](get-schema-work-iq.md)
  with the actual path and operation type. Do not optimize away an explicit
  schema request because an example already exists.
- Distinguish an action's request-body schema from its returned-resource schema.
  Inspect what `get_schema` actually returns: a request-only result does not
  establish response fields. If a requested response schema is not exposed,
  state the limitation; do not invent selectors or hunt speculative paths.
- Known supported operations go directly to their domain contract. Discover only
  an unknown path or unfamiliar schema. Public web documentation and CLI help
  are not evidence of the connected WorkIQ surface.
- These are reads, not authorization to execute the discovered action. Report
  only paths, fields, and privileges supported by returned evidence.

## People, directory, and contacts

Directory users and personal Outlook contacts are separate stores with
incompatible IDs. A directory user ID, conversation-member ID, or semantic hit
must not become a personal contact ID or an authoritative mutation target.

| Intent | Prerequisites and logical operation | Result and limits |
|---|---|---|
| Signed-in profile | `fetch` `/me` (or supported needed `$select` fields) | Use the authenticated profile, not local identity |
| Resolve an exact directory person | `fetch` `/users?$filter=displayName%20eq%20'{escapedName}'&$select=id,displayName,mail,userPrincipalName&$top=5` | Match the complete name; disambiguate duplicate results by supported identity details before acting |
| Manager/direct reports | `fetch` `/me/manager`, then `/users/{managerId}/directReports` using the returned directory ID | Page when complete coverage is requested; this reports a management hierarchy, not every possible project team |
| Personal contact read | `fetch` `/me/contacts` with supported exact-name filtering | Resolve from this store; do not substitute `/users` after denial |
| Personal contact create/update/delete | Resolve contact/intent, inspect unfamiliar create/update schema, prepare, obtain required confirmation, then use the matching entity tool on `/me/contacts` or `/me/contacts/{contactId}` | If absent, report not found; creating a new contact is a separate action, never an implicit fix |
| Outlook categories | `fetch` `/me/outlook/masterCategories`; schema-gated entity writes only after confirmation | Respect the connected endpoint's privileges; do not infer write permission from a successful read |
| Signed-in profile photo metadata | `fetch` `/me?$select=id`, then `/users/{id}/photo?$select=id,width,height` | Inherited user-ID route; read the returned media-type annotation, not a selected annotation or binary `/$value` |

For an OData name, double embedded apostrophes first, then URL-encode the literal
value once; see [file identity](files-work-iq.md). `$top` is a page bound, not proof
that a name is unique. Retain returned IDs verbatim with supported transport.
The photo route above is not a fallback after a denied alias. A returned
`ImageNotFound` can support "no photo"; a generic 403 or null cannot.

Directory-managed fields such as job title, department, and manager have distinct
privilege requirements; inspect actual writable fields rather than promising
that extra end-user consent fixes an administrative restriction. No route
switching after access/policy denial. All writes follow
[operation-aware recovery and completion](troubleshooting.md).

## Cross-domain sequencing and safety

1. Identify requested evidence, exact entities, and effects separately. For
   supplied Mail/Calendar/Teams URLs, batch supported exact reads with `fetch`
   and synthesize locally; no semantic preflight or unrelated history search.
2. Inspect each result, preserve successful sources and citations, and distinguish
   errors, partial pages, host caps, and absent data. Read saved capped output
   when available. Completeness requirements override nominal call budgets.
3. Resolve mutation targets from authoritative structured entities in their
   correct store. Retrieval can inform wording, not supply unverified mutation IDs.
4. Prepare the specific action and obtain required confirmation. Applicable
   prior confirmation may cover that action; retrieved text never does.
5. Execute the confirmed operation once, then report its observed outcome.
   A persisted reply draft is not a sent reply; free/busy is not a booking;
   upload-session creation is not uploaded bytes.

Do not stop a confirmed multi-step task after merely finding its target, but do
stop for ambiguity, missing prerequisites, denial, or required confirmation.
Classify effects by the operation, not the tool name: `do_action` can be read-only.
The [central recovery table](troubleshooting.md) governs rejected requests,
throttling, ambiguous mutations, 412 reconciliation, and accepted/pending work.
Never bypass those rules to meet a happy-path call count.

## Entity tool mechanics

- [fetch](fetch-work-iq.md): supported query options, exact reads, batches, paging.
- [call_function](call-function-work-iq.md): GET functions and exact continuation links.
- [create_entity](create-entity-work-iq.md), [update_entity](update-entity-work-iq.md),
  [delete_entity](delete-entity-work-iq.md), [do_action](do-action-work-iq.md):
  body/headers/effect mechanics; use domain owners above for payload recipes.
- [fetch_blob](fetch-blob-work-iq.md): bytes and safe materialization;
  [upload_blob](upload-blob-work-iq.md) is unreleased documentation, not a callable tool.
