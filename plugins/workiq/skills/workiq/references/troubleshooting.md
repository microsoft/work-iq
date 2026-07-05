# Troubleshooting WorkIQ

Use this reference when a WorkIQ tool call fails or behaves unexpectedly.

## Tool name not found

**Symptom:** A call to `ask`, `fetch`, etc. fails with "tool does not exist" or similar.

**Cause:** Your MCP host exposes the tool under a prefixed name derived from the **MCP server name** (`workiq`), not the logical name documented in the skill.

**Fix:** Scan your available-tools list for an entry whose name **ends with** the logical name (e.g., `ask`). In Copilot CLI the prefixed form is `workiq-ask`; in Claude Desktop it's `mcp__workiq__ask`. Call the exact prefixed name your host requires.

## Entity tool returns a 400 / "bad request" on a Graph URL

**Symptom:** `fetch` or another entity tool returns HTTP 400 with a parser or validation error.

**Cause:** URL formatting violates the entity tool URL rules.

**Fix:** Verify the URL:

1. Starts with `/me/...` or `/users/...` — no scheme, authority, or `/v1.0`.
2. All query parameter values are URL-encoded (spaces → `%20`, quotes → `%27`, etc.).

See the **URL Format Rules** section of `SKILL.md` for full examples.

## Tool call fails with a `null` / empty response and no error details

**Symptom:** A WorkIQ tool call fails but the response is literally `null` — no status code, no error body, no diagnostic of any kind.

**Cause:** Some backend failures (permission denials, unsupported paths, policy blocks, timeouts) are currently surfaced as a bare `null` response instead of an error message.

**Fix / how to proceed:**

1. Check the request itself first — URL format rules (server-relative path, URL-encoded query values), `jsonBody` string encoding, and that the path/ID is real (no `{id}` literals, no guessed IDs). Fix and retry **once**.
2. If a multi-URL `fetch` failed, retry the URLs individually — one bad URL can fail the batch.
3. If it still fails, **stop retrying**. Do not probe many path variants, other backends, or alternative APIs hunting for a way around it.
4. **Report it honestly:** tell the user which call failed and that the server returned no diagnostic detail. You may suggest possible causes (missing Graph scopes, unsupported path) only as explicitly unconfirmed hypotheses. **Never state a specific status code or error ("403", "AccessDenied", "Insufficient privileges") that you did not actually observe in a tool response.**

## `search_paths` rejects a `backend` / `source` / `provider` argument

**Symptom:** `search_paths` returns a tool input validation error, or silently ignores extra arguments like `backend: "sharepoint-rest"` / `provider: "dataverse"`.

**Cause:** `search_paths` only accepts `filter` (regex, required) and `agentId` (optional). There is no `backend` parameter and no equivalent — WorkIQ exposes a single catalog of Microsoft Graph paths.

**Fix:** Drop the extra argument and retry with `filter` only. If the user explicitly asked for SharePoint REST, Dataverse, or any other API surface, report honestly that WorkIQ surfaces Graph paths through `search_paths` and the other surface is not available here. Do not invent a tool variant or alternate backend.

## `fetch_blob` or `upload_blob` returns "tool does not exist"

**Symptom:** A call to `fetch_blob`, `upload_blob`, or any variant (e.g. `download_file`, `get_blob`, `put_file`) returns "tool does not exist" — or you cannot find such a tool in your available-tools list.

**Cause:** Binary-content tools are documented for future reference but are **not released in the current WorkIQ MCP surface**. The available tools are `ask`, `list_agents`, `search_paths`, `get_schema`, `fetch`, `call_function`, `create_entity`, `update_entity`, `delete_entity`, and `do_action`. See the deny rule in `SKILL.md`.

**Fix:** Do not retry, do not search for an alternate binary tool, do not invent one.

- For downloads: `fetch` the item's metadata (`/me/drive/items/{id}`) and return the `webUrl` so the user can open and download in OneDrive / SharePoint / Outlook directly.
- For uploads: tell the user WorkIQ cannot send file bytes yet; offer them the destination URL so they can upload via the OneDrive / SharePoint UI.
- For attachments: return the parent message URL so the user can open and download in Outlook.

Never fabricate base64 content or `@microsoft.graph.downloadUrl` values to satisfy the request.

## `ask` is slow or appears to hang

**Symptom:** A single call to `ask` takes 10–30 seconds.

**Cause:** Expected behavior. `ask` is agentic — it performs multiple backend searches internally.

**Fix:** If you only need a literal list, filter, or known entity, use `fetch` (or another entity tool) instead. Entity tools typically return in under a second.

## `ask` times out around 300 seconds

**Symptom:** `ask` fails with a timeout after ~300 seconds, or repeatedly hits the request time limit on complex questions.

**Cause:** The question is too broad and forces the WorkIQ agent to perform too many internal operations within a single call (e.g., "summarize everything everyone said about every project this month").

**Fix:** Break the question into smaller, more focused sub-questions and let the local model chain the results together. For example, instead of one mega-question, issue several scoped calls (one per person, project, or time window) and synthesize the answers locally. Each sub-question should be answerable in well under the 300s limit.

## Authentication or consent errors

**Symptom:** Tool calls fail with auth, consent, or permission errors.

**Cause:** The WorkIQ MCP server requires tenant admin consent on first use, and the current user must be signed in.

**Fix:** Direct the user to the [Tenant Administrator Enablement Guide](../../../../ADMIN-INSTRUCTIONS.md). For interactive sign-in issues, retry the tool call — the hosted MCP server will prompt for sign-in if needed.

## HTTP 403 Forbidden on an entity tool call

**Symptom:** `fetch`, `do_action`, `update_entity`, or another entity tool returns `HTTP 403` for a Graph path. Two common flavors:

1. **Missing delegated scope** — error body contains `"Missing scope permissions on the request. API requires one of '<Scope.Name>, ...'"`. Typical examples: editing a channel message requires `ChannelMessage.ReadWrite`; reading another user's calendar requires `Calendars.Read.Shared`.
2. **Insufficient directory privileges** — error body contains `"code":"Authorization_RequestDenied","message":"Insufficient privileges to complete the operation."`. Typical examples: `PATCH /me` to change `jobTitle`, `department`, `officeLocation`, `manager`, or any other directory-managed property -- these are read-only via delegated `/me` scopes and only an admin can write them through the directory.

**Cause:** The current user (or app) does not have the Microsoft Graph permission needed for that operation. By default, WorkIQ only requests a minimal set of scopes; additional scopes must be granted explicitly, and some properties cannot be written by end users at all.

**Do not retry.** A 403 from Graph is **permanent** until consent is granted (or the operation is performed by an admin). Repeating the exact same call returns the exact same 403. The model must stop after the first 403, surface the failure to the user, and either:

- Tell the user the operation isn't permitted with the current consent and identify the missing scope from the error body (flavor 1), or
- Tell the user the property is directory-managed and an administrator change is required (flavor 2).

**Fix (flavor 1 only):** Consent must be granted for the missing scope before retrying. This skill uses the hosted WorkIQ MCP endpoint, so keep the guidance focused on the remote MCP authentication and consent flow.

Flavor 2 (`Authorization_RequestDenied` on `/me` directory writes) is **not** fixable by end-user consent -- a tenant admin must update the property via the directory.
