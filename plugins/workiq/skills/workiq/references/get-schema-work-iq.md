# get_schema

Inspect the live schema for an exact WorkIQ path/operation. Use it when the user
explicitly asks for schema, or before an unfamiliar operation. Do not add discovery
to a known documented route merely because the operation has a body.

## Parameters

| Parameter | Type | Usage |
| --- | --- | --- |
| `path` | string | Supply the exact path of interest, server-relative. |
| `operationType` | string | Supply `fetch`, `create`, `update`, or `action`, matching the operation. |
| `format` | string | Optional `jsonschema`, `typescript`, or `cddl`; catalog default is `cddl`. |
| `agentId` | string | Only when advertised and an applicable exact agent ID is known; not an access-denial workaround. |

The connected catalog describes `path` and `operationType` as required even where
its input schema marks them nullable/optional; supply both. There is no advertised
`method`, `httpMethod`, `verb`, `apiVersion`, `backend`, or request/response selector.

## Choose the operation, not a related resource

| Operation | `operationType` | Example |
| --- | --- | --- |
| Entity/collection read | `fetch` | `/me/messages` |
| Collection creation | `create` | `/me/messages` |
| Existing entity update | `update` | `/me/messages/{id}` |
| Named action | `action` | `/me/sendMail`, `/me/messages/{id}/createReply`, `/me/calendar/getSchedule` |

An action may be read-only or mutating. Its effects, not `action` or POST alone,
determine confirmation and recovery requirements. Do not substitute a parent
entity schema for an action body; their wrappers differ.

## Request schema vs response schema

Inspect what the returned schema actually describes. The inherited action-schema
contract is request-oriented: `create`, `update`, and `action` describe input fields,
not proof of the operation's resulting resource. The current catalog's general
description mentions inlined request/response schemas; that prose alone does not
establish that a particular action exposes its response shape.

For an action request, call once with the exact path and `operationType: "action"`.
If only a request shape is returned, identify it as such and state that response
fields were not exposed. Do not invent another selector, format retry, response
endpoint, or related resource lookup to manufacture a response schema.

For example, an upload-session action may return a request schema describing
`item`/`driveItemUploadableProperties`. That does not confirm `uploadUrl`,
`expirationDateTime`, or `nextExpectedRanges` as response properties. Actual
returned response evidence must establish those fields. See
[Files](files-work-iq.md) for the operation's outcome boundaries.

## Examples

```json
{"path":"/me/messages","operationType":"fetch"}
```

```json
{"path":"/me/events","operationType":"create"}
```

```json
{"path":"/me/messages/{id}","operationType":"update"}
```

```json
{"path":"/me/sendMail","operationType":"action","format":"typescript"}
```

For sendMail, preserve the exact wrapper and field casing returned by the schema;
inherited examples can differ (`Message`/`SaveToSentItems` versus lower camel case).
Do not change the live schema or normalize action bodies to fit an example.

## Schema availability ≠ operation allowed

A schema is not a permission grant or proof that a payload will pass runtime
policy/validation. Do not derive an executable update route from writable-looking
parent metadata: for example, presence has its own documented actions in
[Teams](teams-work-iq.md). Domain references own payloads:
[Mail](mail-work-iq.md), [Calendar](calendar-work-iq.md), [Tasks](tasks-work-iq.md),
and [Files](files-work-iq.md).

For a demonstrated pre-execution validation defect, follow the single safe
correction limit in [recovery](troubleshooting.md). Generic `400` does not establish
a cause. Explicit denial stops even when the schema looks permissive; no other
tool, path, agent, or schema variant to bypass it.

Public additional domain: [Business Applications](business-applications.md).
