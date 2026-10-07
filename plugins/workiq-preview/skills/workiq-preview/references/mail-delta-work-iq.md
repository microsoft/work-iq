# Folder-scoped mail delta

## Required before use

- [call-function-work-iq](call-function-work-iq.md)

## Mail delta: folder-scoped

Use `call_function`, never `fetch`, for `/me/mailFolders/{folderId}/messages/delta`.
There is no documented `/me/messages/delta` route here. For an explicit mail sync
with no folder named, use Inbox and disclose that scope. Preserve returned next
and delta links and removals under [function guidance](call-function-work-iq.md).
Without a saved checkpoint this is initial sync, not proof of changes "since
yesterday." A semantic catch-up request alone does not select delta.
