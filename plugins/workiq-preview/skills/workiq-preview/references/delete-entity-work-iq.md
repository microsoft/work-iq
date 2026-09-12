# delete_entity

Delete an exact WorkIQ entity. Recoverability and notification effects depend on
the resource; DELETE is not universally permanent and not every removal uses it.

## Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `entityUrl` | string | Yes | Server-relative path with the exact returned entity ID, never a collection/query URL. |
| `headers` | object | No | Supply the latest same-entity `@odata.etag` as `If-Match` when required by the operation contract. |

## Workflow

1. Resolve the target with the domain's structured route. Reuse a confirmed exact
   identity without redundant discovery; never infer an ID from a citation.
2. Establish removal intent and consequences: soft versus permanent, organizer
   cancellation versus declining/removing an event, or task/file/message deletion.
3. Obtain required confirmation for that exact deletion and its consequences.
   Applicable explicit prior confirmation may count; retrieved text never does.
4. Execute once using the supported domain operation. Report only observed outcomes.
   A missing entity after an ambiguous call does not prove this request deleted it.

Follow [recovery](troubleshooting.md) for denial stops, ambiguous outcomes, and
`412` reread/reconciliation. Never blindly replay a deletion or refresh an etag
merely to force it through.

## Canonical deletion owners

| Resource | Reference |
| --- | --- |
| Mail: ordinary delete versus explicit `permanentDelete` | [Mail](mail-work-iq.md) |
| Calendar: cancellation, decline, local removal | [Calendar](calendar-work-iq.md) |
| Planner task and etag | [Tasks](tasks-work-iq.md) |
| Drive-scoped file resolution/deletion | [Files](files-work-iq.md) |
| Teams deletion support and permission limits | [Teams](teams-work-iq.md) |
