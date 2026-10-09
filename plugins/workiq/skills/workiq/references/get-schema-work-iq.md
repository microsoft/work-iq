# get_schema

Retrieve the OpenAPI schema for a WorkIQ path or operation — fields available on an entity, query parameters, body shape for create/update/action.

> **Routing rule:** call `get_schema` once with `path` set to the path of interest AND the right `operationType`:
>
> - **Collection reads** (`/me/messages`, `/me/events`) → `operationType: "fetch"`
> - **Creates** (POST to a collection, e.g. `/me/events`, `/me/messages`) → `operationType: "create"`
> - **Updates** (PATCH on a specific item, e.g. `/me/messages/{id}`) → `operationType: "update"`
> - **Action verbs** (camelCase/PascalCase verb at end of path: `/me/sendMail`, `/me/messages/{id}/forward`, `/me/events/{id}/{accept|decline|tentativelyAccept}`, `/copy`, `/move`, `/reply`, `/getSchedule`, `/findMeetingTimes`) → `operationType: "action"`
>
> Each path supports only the values matching its real operations — wrong values return precise errors like `No 'create' operation for path: me/sendMail`. When that happens, **do not** retry blindly; the mapping above is correct. Do not fall back to a related entity path (e.g. `/me/messages`) for an action-verb schema — the wrapper shape differs.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | **Yes** | Entity path (`/me/messages`). Server-relative, starts with `/`. |
| `operationType` | string | **Yes** | One of `fetch` (GET), `create` (POST to collection), `update` (PATCH), `action` (action verb body). Each path supports only the matching subset; wrong values error like `No 'create' operation for path: me/sendMail`. |
| `format` | string | No | `jsonschema`, `typescript`, or `cddl`. Defaults to `cddl`. |

> **⚠️ Parameter shape gotchas.**
> - `operationType` is the **only** way to pick the operation flavor — no `httpMethod`, `method`, `verb`, `apiVersion`, `operationIds`, or `backend` param exists on `get_schema`. `fetch`→GET, `create`→POST to a collection, `update`→PATCH, `action`→action verb body.

## Request schema vs response schema

`get_schema` is request-oriented for writes:

- `fetch` describes the entity/response shape available to a GET operation.
- `create`, `update`, and `action` describe the request body used to invoke that operation.
- In particular, `operationType: "action"` returns the action request-body schema. It does
  **not** expose the action's response resource schema.

There is no request/response selector, response mode, or second action schema to request. Do
not present action request fields as response properties. If the user asks what an action
returns, state which request shape MCP confirmed and that the response shape is not exposed;
do not fill the gap from web documentation or general Graph knowledge. For a known action
path, call `get_schema` exactly once and stop — do not call `search_paths`, retry another
format, or search for a separate response-resource path.

For example, `get_schema` on
`/drives/{drive-id}/items/{driveItem-id}/createUploadSession` with
`operationType: "action"` returns `drives.items.createUploadSession_request`. It describes
the request `item` / `driveItemUploadableProperties` shape and does **not** expose the
returned `uploadSession` resource or fields such as `uploadUrl`, `expirationDateTime`, and
`nextExpectedRanges`. Answer with that limitation after the single schema call.

When answering "what can I set when creating X", a `create` schema can expose
the whole resource model. Lead with fields the caller supplies, do not present
system-generated or read-only fields (identifiers, timestamps, sender metadata)
as settable, and say so when the schema lacks reliable writability annotations.

## When to Use

- Before `create_entity` / `update_entity` to confirm body shape
- When `fetch` returns unfamiliar fields
- To check supported OData query params (`$filter`, `$select`, `$orderby`)
- To check `beta` fields not in `v1.0`

## Examples

### Read schema for messages
```json
{ "path": "/me/messages", "operationType": "fetch" }
```

### Create schema for a calendar event
```json
{ "path": "/me/events", "operationType": "create" }
```

### Update schema for a message
```json
{ "path": "/me/messages/{id}", "operationType": "update" }
```

### TypeScript format
```json
{ "path": "/me/messages", "operationType": "fetch", "format": "typescript" }
```

### Action verb schema (sendMail)
```json
{ "path": "/me/sendMail", "operationType": "action" }
```

## Asking for the "schema" of an action

For "schema for sending an email" / "what parameters does sendMail take?" / "body for accepting a meeting?", call `get_schema` **once** with `{ "path": "<action-path>", "operationType": "action" }`. This returns the request-body JSON Schema — for `/me/sendMail`, `Message` (a `microsoft.graph.message`) plus `SaveToSentItems` (boolean). Surface those properties as request fields, not as the action's response fields.

Do **not**:

- Pass `create`/`fetch`/`update` on an action verb — errors with `No '<op>' operation for path: ...`.
- Call `search_paths` first — action verbs are well-known.
- Substitute a related entity's schema — `{Message, SaveToSentItems}` differs from a raw message.
- Fall back to `web_fetch` against `learn.microsoft.com` — MCP or the action ref has the authoritative shape.

## Schema availability ≠ operation allowed

`get_schema` describes the OpenAPI shape the server **could** accept; it does NOT guarantee the operation is allowed at runtime. A successful schema response only means "if you POST/PATCH/GET this path with this body shape, the server will parse it" — the actual call may still 403 (missing scope, tenant policy) or 404 (path is action-only, or entity ID is stale).

**Common trap — action-only entities returning an update schema:**
- `get_schema({ "path": "/me/presence", "operationType": "update" })` returns a `microsoft.graph.presence` JSON Schema with writable-looking fields (`availability`, `activity`).
- Calling `update_entity` on `/me/presence` returns **404 NotFound** — presence state is mutated via the `setPresence` / `setUserPreferredPresence` **action verbs**, not via PATCH on the entity.
- The same pattern applies to other state-driven entities surfaced primarily through action verbs.

**Rule:** when `search_paths` reports an action verb (`/me/presence/setPresence`, `/me/messages/{id}/send`, `/me/events/{id}/accept`) for a state change, route to `do_action` against that verb. Do NOT use the schema for the parent entity as license to `update_entity` — schema availability for `update` is a Graph metadata artifact, not a permission grant.

