# search_paths

> **⚠️ The catalog is not the tenant allowlist.** A path can appear in
> `search_paths` output and still return `Access denied for GET path`, and **the allowlist changes over
> time** — paths observed denied one hour have been observed working the next. Treat any denial list as
> a dated observation, never a permanent fact.
>
> Observed denied at time of writing: `/me/mailboxSettings`, `/me/settings`, `/me/memberOf`,
> `/me/inferenceClassification`, `/places`, `/me/todo/*`, `/me/presence`.
> Observed **working** despite earlier denials: `/me/outlook/masterCategories`, `/me/contacts`,
> `/me/transitiveMemberOf`.
>
> **The only proof a path works is a successful call.** Never tell the user a capability is unavailable
> because it appears on a list — attempt it once, then report exactly what happened. On denial, stop:
> do not retry, do not substitute a sibling path, do not fall back to `ask`/`retrieve`.


Discover available WorkIQ API paths by regex. Use as the first step before entity tools when the path is unknown.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | string | Yes | Regex pattern (e.g., `messages`, `.*calendar.*`). Empty or missing filter is rejected by the current server — pass `.*` to enumerate everything. |

> **⚠️ One catalog only.** `search_paths` enumerates the single WorkIQ path catalog (Microsoft Graph paths). There is no `backend` / `source` / `provider` parameter — do not pass one, do not fabricate one from general knowledge. If the user asks about SharePoint REST, Dataverse, or any other API surface, say WorkIQ surfaces Graph paths through `search_paths` and report that the other surface is not available here.

## Workflow

1. `search_paths` with a broad filter to find candidate paths
2. `get_schema` on the chosen path
3. `fetch` / `call_function` for reads, or for writes preview the exact effect, wait for explicit user confirmation, then call the appropriate write tool (`create_entity` / `update_entity` / `delete_entity` / `do_action`) and verify the response

If the user asks to discover paths AND read or mutate, continue to the read or confirmed mutation tool after picking the path — discovery alone is incomplete.

Never answer API/path questions from general Graph knowledge, local SQL, filesystem search, or built-in tools. Summarize paths from `search_paths`; if none matched, say WorkIQ did not confirm one.

## Examples

### Find all message-related paths
```json
{ "filter": "messages" }
```

### Find calendar paths
```json
{ "filter": ".*calendar.*" }
```

### Enumerate every path
```json
{ "filter": ".*" }
```

### Find Planner paths
```json
{ "filter": "planner" }
```

### Find OneDrive/files paths
```json
{ "filter": "drive" }
```
