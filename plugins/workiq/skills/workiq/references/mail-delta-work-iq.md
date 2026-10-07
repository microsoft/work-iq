# Folder-scoped mail delta

## Required before use

- [call-function-work-iq](call-function-work-iq.md)

## Mail delta: use `/me/mailFolders/{id}/messages/delta` (folder-scoped)

Message delta is **always folder-scoped** — there is **no** tenant-wide `/me/messages/delta`
endpoint. For "sync my mail", "fetch the mail delta", or "give me mail changes" with **no folder
named**, default to the inbox cursor `/me/mailFolders/inbox/messages/delta`. When the user names a
folder, target that folder's messages delta, e.g. `/me/mailFolders/{folderId}/messages/delta`.

Paginate `@odata.nextLink` until you reach `@odata.deltaLink` (resume token for the next sync) —
stopping at the first page is wrong.

> **Always `call_function`, never `fetch`.** `delta` is an OData function. Calling
> `/me/mailFolders/inbox/messages/delta` through `fetch` returns an `InvalidRequest` or wrong
> shape; route through `call_function` with the function URL.
