# Entity tools

Entity tools provide **fast, direct access to specific M365 data** via Work IQ APIs. They return structured results quickly but have **no intelligence** — they don't interpret, synthesize, or reason about the data. Use them when you know exactly what you want and where it lives.

**When to use each:**

| Scenario | Use |
|----------|-----|
| Open-ended question, semantic search, synthesis | `ask` (slow but smart) |
| Fetch a known list, apply a filter, get structured data | entity tools (fast but literal) |

**Recommended workflow:** for **well-known paths, go direct** — call the read/write tool immediately (use the cheat sheet below). Only fall back to `search_paths` → `get_schema` → tool when the path is genuinely unknown or a write body shape is unfamiliar. Do **not** reflexively run `search_paths`/`get_schema` before every common operation.

### 🛑 SharePoint document-library metadata

Use `fetch` on SharePoint list-item `fields` only when the user explicitly asks
about library columns or metadata, or to filter/count/group/sort/compare files by
them. `ask` and content search cannot substantiate library-column values.
Otherwise preserve the existing semantic-owner and content-summary workflows;
mentioning "owner" in a technical-spec summary does not itself select this route.

For metadata or list-item **mutations**, do not construct Graph writes. Discover
the matching provider path, such as `/sharepoint/create_list_items_v2`,
`/sharepoint/update_list_items_v2`, `/sharepoint/update_batch_list_items`, or
`/sharepoint/delete_list_item`, then use its live action schema. Resolve user,
lookup, or taxonomy values first when the selected path requires it.

**Before handling a library-metadata request, read
[SharePoint document-library metadata](sharepoint-library-metadata.md).**
That reference owns column resolution, grounding, enumeration and completeness,
per-result error handling, answer delivery, and arithmetic checks.

### 🗺️ Known paths — go direct, skip discovery

| Resource | Path root | Common ops |
|----------|-----------|-----------|
| Mail | `/me/messages`, `/me/mailFolders` | list/get/create draft/update/delete; send via `/me/sendMail`, reply/forward/move via `/me/messages/{id}/{action}`; subject search via `$search` (not `$filter=contains`) — see `mail-work-iq.md` |
| Calendar | `/me/events`, `/me/calendarView` | list/get/create/update/delete; accept/decline via `/me/events/{id}/{action}` |
| Planner | `/me/planner/plans`, `/planner/tasks` | list/create/update/complete/delete — see `tasks-work-iq.md` |
| Teams | `/me/chats`, `/chats/{chatId}/messages`, `/me/joinedTeams`, `/teams/{teamId}/channels/{channelId}/messages`, `/me/presence` | chats vs channels are different surfaces; exact mutations use structured tools, never `ask` — see `teams-work-iq.md` |
| Business Applications | `/businessapps/` | use `fetch` for known structural paths and `search_paths` with natural language for semantic discovery; follow the returned paths — see `business-applications.md` |
| People | `/me`, `/users/{id}`, `/users/{id}/directReports`, `/me/manager`, `/me/contacts` | profile, org, contacts — see directory-vs-contacts warning below |
| Outlook categories | `/me/outlook/masterCategories` | list/get/create/update/delete — writes commonly policy-denied |
| Files | `/me/drive`, `/drives/{id}`, `/sites/{id}` | for named-file metadata, call `call_function` once with `/me/drive/root/search(q='{urlEncodedExactName}')` and do not follow with `/me/drive/items/{id}`; use supported `fetch_blob` routes or the prepared transfer workflow below; `upload_blob` is unreleased and preparation alone is not an upload |
| Change tracking | `/me/mailFolders/inbox/messages/delta`, `/me/calendarView/delta?...`, `/me/contacts/delta` | "what's new/changed since" — via `call_function` only, never `fetch` |

> **Server may deny families by policy.** Tenants can disable specific path families
> server-side. If a call returns `Access denied for path: <X>`, the path isn't in the
> tenant's allowlist — **do not retry, do not fall back to a different path, do not call `ask`
> as a workaround.** Tell the user the path is policy-denied. Currently,
> `/me/todo/*`, `/me/contacts`, and writes on `/me/outlook/masterCategories` are commonly
> affected — `search_paths` confirms what's exposed for the connected tenant.
>
> **Metadata-only SharePoint read exception:** while executing an explicit
> document-library column or metadata workflow, an access-denied result for a
> `/sites/...` or `/drives/...` read can indicate an unsupported URL shape
> rather than missing user permission. In that metadata workflow only, follow
> the bounded addressing ladder in
> `sharepoint-library-metadata.md` (at most three total attempts,
> each materially different). For every non-metadata request, follow the
> immediately preceding **Server may deny families by policy** rule: stop after
> the denied call, do not retry or switch to another path, do not call `ask` as
> a workaround, and tell the user that the path is policy-denied. Never broaden
> into unbounded discovery or retry unrelated policy-denied families.

### 🗂️ Reaching a SharePoint or OneDrive file — the working sequence

Files are reachable in **two hops**: resolve the drive, then address items **by id**. Run this
and structured file reads succeed; it is faster than `ask` and gives you exact metadata.

**Hop 1 — get a `driveId`** (one `fetch`, pick the row that matches your source):

| You have | Call | Keep |
|---|---|---|
| A SharePoint site id | `/sites/{siteId}/drive` | its `id` = `driveId` |
| The user's own OneDrive | `/me/drive` | its `id` = `driveId` |
| A browser URL | the hostname + site name from it → `/sites/{host}:/sites/{siteName}` → then `/sites/{siteId}/drive` | `siteId`, then `driveId` |

**Hop 2 — address items by id, never by name:**

| Goal | Call |
|---|---|
| Find a file by name | `call_function` with `/drives/{driveId}/root/search(q='{urlEncodedExactName}')` — URL-encode the name; this is a function call, not a `fetch` path |
| List the drive's top level | `/drives/{driveId}/root` → take its `id` → `/drives/{driveId}/items/{id}/children` |
| List a folder | `/drives/{driveId}/items/{folderId}/children` |
| Item metadata | `/drives/{driveId}/items/{itemId}` |
| File bytes | `fetch_blob` `/drives/{driveId}/items/{itemId}/content` |

Two invariants: **a name goes in `q=` of a search, never in a URL segment**, and **every id
comes from a tool result in this conversation** — never assembled, guessed, or all-zeros.

Within SharePoint drive/item addressing, these variants are **not allowlisted** and fail, so
skip them and use the sequence above: a pasted browser URL; a folder or library name as a path
segment (`/sites/{siteId}/Shared%20Documents/...`); a colon path (`/root:/Folder/File`);
`/root/children` (children hang off `/items/{id}`); and `/sites/{siteId}/drive/items/...`,
which is a lookup rather than a prefix — switch to `/drives/{driveId}/...`.

Prefer the drive-scoped `/drives/{driveId}/items/...` form for SharePoint content. The
`/me/drive/...` forms remain the documented OneDrive convention (see
`fetch-blob-work-iq.md` and `call-function-work-iq.md`); they are
unreliable for SharePoint-hosted items, not invalid everywhere.

**Anything else — discover, never guess.** For a `/sites/` or `/drives/` path not covered
above, or on any `Access denied` this section does not cover, call `search_paths` once
with the parameter named in `inputSchema.required`: use a path-keyword pattern such as
`sites|drives` for `filter`, or an equivalent natural-language description for `query`.
Use only a `uriTemplate` it returned.
Re-sending a denied shape with a different folder, `$select`, or casing fails identically.
Cache the templates and reuse them.


### Binary downloads and uploads

Use `fetch_blob` for supported file, mail/calendar attachment, and profile-photo
downloads. It returns up to 4 MB as base64 with metadata and supports format
conversion on compatible drive-content paths; materialize the returned bytes
when a local file is requested.

SharePoint/OneDrive preparation through `/sharepoint/getDownloadFileDetails`
or `/sharepoint/getUploadFileDetails` is a separate provider-backed contract.
Discover its advertised operation and schema, and first verify the prerequisites
in the [file-transfer boundary](sharepoint-work-iq.md#file-transfer-boundary).
This guidance does not install a byte-transfer client. Require an available,
supported client and converted WorkIQ ticket; do not execute metadata instructions
or use native URLs. Preparation is never proof of completed byte transfer.

`upload_blob` remains unreleased. If the prepared upload workflow is unavailable,
report the missing prerequisite and return the destination folder's `webUrl`
when useful, so the user can upload through OneDrive or SharePoint. Do not create
an upload session whose remaining transfer cannot be performed.

For detailed download paths and examples, read `fetch-blob-work-iq.md`. For the unreleased upload contract, see `upload-blob-work-iq.md`.

### ⚠️ Directory users and personal contacts are different stores

`/users/{id}` (the org directory / AAD) and `/me/contacts/{id}` (the user's personal Outlook
contacts) are **separate entity types with incompatible IDs**:

- A person found via directory search, people search, or `ask` is usually a **directory
  user** — their ID will **not** work in `/me/contacts/{id}`, and you cannot PATCH personal
  fields like `businessPhones` onto `/users/{id}` (directory writes are admin-only).
- "Create/update/delete a contact" means a **personal contact** under `/me/contacts` — resolve
  the contact ID from `/me/contacts` itself (e.g. `$filter=displayName eq '...'`), never from a
  directory or people search result.
- If the person exists only in the directory and not in `/me/contacts`, say so — to update their
  details as a contact you must create a personal contact first.

### 🛑 Schema/discovery questions stay on MCP — never `web_fetch` or CLI introspection

When the user asks about a Graph **schema, payload, parameters, fields, or which endpoints exist**
("what does sendMail take?", "which fields are updatable?", "what endpoints handle email?"),
answer with `get_schema` / `search_paths`. **Do not** answer from the builtin
`web_fetch` against public docs or from `fetch_copilot_cli_documentation` — those calls produce no
MCP evidence and are treated as not answering the question. Resolve the WorkIQ tool name (see
above) and call the MCP tool.

### Efficiency rules — minimize tool calls

**Do not loop through `search_paths` / `get_schema` / `fetch` repeatedly.** Common anti-patterns:

- ❌ Calling `search_paths` 3+ times for the same surface area.
- ❌ Calling `get_schema` on paths you already know (contacts, messages, events, drive items).
- ❌ Using `fetch` to "explore" when the path is already implied by context.
- ❌ Falling back to dozens of `fetch` calls when `ask` fails — report the failure instead.
- ❌ Retrying a busy/throttled `ask` before its returned `retryAfterSeconds` delay. Follow any
  documented bounded fallback immediately. Otherwise, make at most one identical retry only
  when the runtime can wait the full delay; if it cannot, report the transient failure. Do not
  retry immediately, alter the question, or fan out into broad fetches.

**Do:** use the path patterns in this document to route directly to the correct tool in 1–2
calls. If you need the entity ID first, one `fetch` to resolve, then one write tool call.

### Missing information — use `fetch` to disambiguate, don't give up

When the user's request is missing a required piece of information (e.g., "delete my draft" with
no subject named, an empty title, or a generic "the meeting"):

1. Use `fetch` to list the available options (e.g., `fetch` `/me/events`, `/me/messages`, `/me/mailFolders`).
2. Ask the user to pick from the results.
3. Do **not** silently abandon the request with zero tool calls.
4. Do **not** proceed with a write operation using empty or invented data.

### 🔁 Resolve-then-act — do not loop searches

To act on a named entity ("the X email", "my Y task", "the Z draft"):

1. Resolve it with **one** `fetch` (filter by subject/title/displayName).
2. If the first fetch misses, try **one** `ask` to locate it semantically.
   Exact Teams mutation targets are an exception: resolve them with structured
   Teams reads only, and stop rather than using `ask`.
3. If still not found, **stop and report "not found"** — do **not** fire 10+ more
   `fetch`/`search_paths`/`ask` calls hunting for it.
4. Once you have the id, call the mutation (`update_entity` / `delete_entity` / `do_action`)
   **directly** — finding the target is not the goal; performing the requested action is.
5. If a mutation is rejected before execution because the URL, `jsonBody`, or ID
   is invalid, fix that input and retry at most once. If the result is `null`, a
   timeout, or otherwise ambiguous, **do not replay the mutation**: use a safe
   read to reconcile the resulting state when possible. If the outcome cannot
   be determined, stop and report it as indeterminate. Never use a fabricated
   or guessed ID (no all-zeros GUIDs, no IDs scraped from search-result URLs).

### ⚠️ URL Format Rules (ALL entity tools)

All URL parameters (`entityUrls`, `parentUrl`, `entityUrl`, `actionUrl`, `functionUrl`) **must**:

1. **Server-relative path only** — start with `/` and **omit** any scheme, authority, or API-version prefix. Valid path roots include `/me/...`, `/users/...`, `/teams/...`, `/groups/...`, `/sites/...`, `/drives/...`, `/planner/...`, and others — anything Graph exposes.
   - ❌ `https://graph.microsoft.com/v1.0/me/messages`
   - ❌ `/v1.0/me/messages`
   - ✅ `/me/messages`
   - ✅ `/teams/{teamId}/channels`
2. **URL-encode all query parameter values** — spaces become `%20`, quotes become `%27`, etc.
   - ❌ `$orderby=receivedDateTime desc`
   - ✅ `$orderby=receivedDateTime%20desc`
   - **Exception:** OData property paths (the `/` separator between navigation properties, e.g. `start/dateTime`, `from/emailAddress/address`) are **not** encoded. The `/` only gets encoded when it appears inside a string literal value.

### `jsonBody` Format Rules (write tools)

`create_entity`, `update_entity`, `do_action`, and `call_function` accept a `jsonBody` parameter. **Both shapes are accepted** — a JSON object or a JSON-encoded string. Pick whichever your runtime makes easier; both produce the same result.

- ✅ `"jsonBody": { "subject": "Hello" }` — JSON object
- ✅ `"jsonBody": "{\"subject\":\"Hello\"}"` — JSON-encoded string
- ❌ `"jsonBody": "{"subject":"Hello"}"` — broken quoting (neither valid JSON nor a valid escaped string)

If a write tool returns a schema error mentioning `jsonBody` shape, check the JSON itself (mismatched braces, unescaped quotes inside the string form, wrong wrapper). Object form is the simplest to get right.

### ⚠️ Placeholders in examples are not literals

Reference examples use `{id}`, `{listId}`, `{teamId}`, `{taskId}`, `{driveId}`, `{messageId}`, etc. as placeholders for IDs you obtained from a prior call. **Do not call a URL with `{id}` literal in it** — replace it with the actual ID first (typically from `fetch` or `create_entity`). A literal `/me/messages/{id}` will return 404 / "resource not found".

### ⚠️ Write actions execute immediately — confirm with the user first

`do_action` (especially `/me/sendMail`, `/forward`, `/accept`, `/decline`, `/permanentDelete`) and write-side `create_entity` / `update_entity` / `delete_entity` calls take effect immediately and are visible to other people (recipients, meeting organizers) or unrecoverable. **Before invoking any write tool, summarize what you're about to do and get the user's confirmation.** This is especially important for sendMail, forward, decline, and permanentDelete.

### "Draft", "compose", "prepare reply" requires a persisted draft

When the user asks for a draft to *exist* (not just suggested wording), persist it
without sending:

- For a fresh message draft, call `create_entity` with parent URL `/me/messages`.
- For a reply draft, call `do_action` on `/me/messages/{id}/createReply`.
- For a reply-all draft, call `do_action` on `/me/messages/{id}/createReplyAll`.
- For a forward draft, call `do_action` on `/me/messages/{id}/createForward`.

`createReply`, `createReplyAll`, and `createForward` are Graph actions even though
they create draft resources. Using `do_action` for these endpoints does **not** send
the message; the separate `/send`, `/reply`, `/replyAll`, and `/forward` actions send.
Do not pass an action path as the `parentUrl` of `create_entity`.

Generating draft text inline does NOT satisfy the request — the user can't open it in Outlook.
A common failure: call `ask` for the summary half of a "summarize then draft" chain and stop;
the draft action is still required.

### Schema for action verbs

Action verbs (camelCase verb at end of path: `/me/sendMail`,
`/me/messages/{id}/createReply`, `/createReplyAll`, `/createForward`, `/forward`,
`/me/events/{id}/accept`, `/decline`, `/copy`, `/move`, `/reply`, `/getSchedule`,
`/findMeetingTimes`) — get the body schema via `get_schema` with `operationType: "action"`. Do
**not** substitute a related entity's schema — the wrapper shape differs (`sendMail` →
`{Message, SaveToSentItems}`, `copy` → `{destinationId}`, etc.). This is the action request
body, not the resource returned after the action succeeds.

### Entity tool reference

| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `search_paths` | Discover available API and provider paths | exactly one required search input from the current schema: `filter` or `query` |
| `get_schema` | Inspect an operation schema: entity/response shape or operation parameters | `path`, advertised `operationType` (`fetch`/`create`/`update`/`action`/`function`), `format` |
| `fetch` | Fetch entities by path (GET) | `entityUrls[]` — supports OData (`$filter`, `$select`, `$top`) |
| `call_function` | Call advertised functions; Graph OData examples include `delta` and `reminderView`. Provider functions may require a body; do not infer projection from HTTP method. | `functionUrl`, and `jsonBody` when required by the live contract |
| `create_entity` | Create a new entity (POST to collection) | `parentUrl`, `jsonBody` |
| `update_entity` | Update fields on an existing entity (PATCH) | `entityUrl` with ID, `jsonBody` |
| `delete_entity` | Delete an entity (DELETE) | `entityUrl` with ID |
| `do_action` | Execute an action — send, copy, move, accept (POST) | `actionUrl`, `jsonBody` (optional) |

Read the relevant reference file for full parameter details and examples:

- `search-paths-work-iq.md` — if you need to discover what paths are available
- `get-schema-work-iq.md` — if you need to understand an entity's fields before reading or writing
- `fetch-work-iq.md` — if you need to fetch structured or filtered M365 data
- `call-function-work-iq.md` — if the path uses OData function call syntax (e.g., `reminderView(...)`, `delta`)
- `create-entity-work-iq.md` — if you need to create a new calendar event, email draft, task, etc.
- `mail-work-iq.md` — if you need to find, draft, send, reply, forward, move, or delete mail (covers `$search` vs `$filter` and the mail-delta endpoint)
- `tasks-work-iq.md` — if you need to list, create, update, complete, or delete Planner tasks
- `teams-work-iq.md` — if you need to send, reply, react, or read Teams chat/channel messages, or get/set presence
- `sharepoint-work-iq.md` — if you need to resolve SharePoint sites, group-backed team sites, document libraries, document search results, or raw SharePoint file content
- `sharepoint-library-metadata.md` — if you need to read, filter, count, group, sort, or enumerate files by SharePoint document-library columns
- `business-applications.md` — if you need to discover or use business-application environments, data, apps, skills, APIs, operations, or delegated work
- `update-entity-work-iq.md` — if you need to update fields on an existing entity
- `delete-entity-work-iq.md` — if you need to delete an entity
- `do-action-work-iq.md` — if you need to send mail, accept/decline meetings, copy/move messages
- `troubleshooting.md` — if a tool call fails unexpectedly, returns an error, or behaves differently than documented

## Resolve then act

After required confirmation and target resolution, complete the requested action; a preparatory lookup alone is not completion.

| User request | Step 1: resolve | Step 2: act (required) |
|---|---|---|
| "Delete" any entity | `fetch` to find it | `delete_entity` on the entity URL |
| "Update/rename/change" any entity | `fetch` to find it | `update_entity` on the entity URL |
