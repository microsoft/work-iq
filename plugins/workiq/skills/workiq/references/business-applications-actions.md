# Business Applications actions

## Required before use

- [Business discovery](business-applications.md)
- [Mutation prerequisites](mutation-work-iq.md)

## Prepare and confirm

Discover the exact environment, target and operation before acting. A successful
record read does not establish customization or write privilege. Inspect the
matching create/update/action schema for an unfamiliar body; it describes that
operation's inputs, not another resource's fields.

If the user has not approved the effect, remain on discovery and reads. Do not
send a write just to let the server reject it. Prepare the exact target, changes
and consequences, then obtain required confirmation.

## Choose the operation

Use only paths and payload fields confirmed by discovery and the live schema:

| Effect | Tool and inherited shape |
| --- | --- |
| Create a table | create_entity on the returned tables collection; schema-defined tableName, columns and optional displayName/description |
| Create a record | create_entity on `.../tables/{tableName}/records`, with `{"item":{...}}` when the schema confirms that wrapper |
| Update/delete a record | update_entity/delete_entity on the exact returned record path |
| Delete a table | delete_entity on the exact discovered table path, only when supported and the user confirmed deletion of the whole table, not a record |
| Create/update/delete a business skill | Matching entity tool on the discovered skills collection or concrete skill path |
| App operation | do_action on the exact returned app-scoped operation; use prepare_* then submit_* only when exposed |
| Custom API or in-app MCP operation | do_action on the discovered concrete API/tool path with schema-defined inputs |
| Upload a record file | do_action on the discovered `.../records/{recordId}/files/{columnName}/upload` path |

Business record-file upload is separate from unreleased Graph upload_blob.
Do not generalize it to OneDrive, SharePoint or mail. If its arguments or effect
are unknown, establish the contract before calling; do not guess byte wrappers.

## Named capabilities and delegated goals

For a requested named skill, operation or Custom API, require an exact capability
match. Fetch its returned definition when needed. If absent, say so and stop;
do not substitute a similar capability or execute-work.

Use `/businessapps/environments/{environmentId}/execute-work` only for an
explicitly delegated open-ended goal whose environment exposes that path.
Send the user's authorized goal in instruction and reuse the returned sessionId
for continuation. Delegating a goal does not authorize unapproved writes.
Prefer the direct discovered operation when it already satisfies the request.

## Completion and failure

Execute the approved operation once. Report the actual final, pending, partial
or unknown result; draft creation is not sending. Preserve session IDs for an
ongoing delegated workflow and respect any further confirmation request.

Missing privilege, access or policy denial is terminal. Do not write a different
record, table, view, skill or app artifact as a workaround. Never replay an
ambiguous write or claim completion from discovery or preparation.
