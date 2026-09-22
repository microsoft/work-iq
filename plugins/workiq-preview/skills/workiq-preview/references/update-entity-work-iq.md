# update_entity

Update an existing WorkIQ entity. For a PATCH, send only changed fields; if the
live operation replaces the resource, supply its required fields. Read-state,
presence, categories, and metadata changes are mutations, even if not sent to others.

## Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `entityUrl` | string | Yes | Server-relative path identifying exactly one entity, not a collection/filter URL. |
| `jsonBody` | object \| string | Yes | JSON object or JSON-encoded string: changed fields for PATCH; all required fields for a schema-defined replacement. |
| `headers` | object | No | Use `If-Match` with the latest same-entity `@odata.etag` when required by the operation contract. |

## Workflow and constraints

1. Resolve the same entity type and exact ID from an authoritative structured
   response. A directory ID is not a personal-contact ID; a citation is not an ID.
2. Prepare changes from the domain contract; inspect
   [get_schema](get-schema-work-iq.md) with `operationType: "update"` when unfamiliar.
   A writable-looking schema does not establish permission or supported runtime behavior.
3. Obtain required confirmation for the exact change, reusing only applicable
   explicit prior confirmation. Execute once and report observed state.
4. Apply [canonical recovery](troubleshooting.md): no ambiguous PATCH replay,
   no denial bypass, and at most one safe correction of a demonstrated
   pre-execution validation defect. A generic `400` is not proof of a field defect.

For `412`, reread and reconcile concurrent state rather than merely replacing the
etag and overwriting; reconfirm if the intended action changes. Planner-specific
preconditions belong in [Tasks](tasks-work-iq.md).

Do not attribute generic forbidden profile, category, or message edits to consent
or promise administrator remediation without the actual diagnostic. Presence uses
the documented action, not a speculative PATCH based on parent-entity metadata.

## Canonical payload owners

| Change | Reference |
| --- | --- |
| Mail read state, categories, draft edits | [Mail](mail-work-iq.md) |
| Event updates, reschedule and recurrence | [Calendar](calendar-work-iq.md) |
| Rename/move files and drive identity | [Files](files-work-iq.md) |
| Task completion and due dates | [Tasks](tasks-work-iq.md) |
| Message edits and presence | [Teams](teams-work-iq.md) |
| Directory versus personal contacts | [Workflows](workflows-work-iq.md) |
