# OneDrive files and folders

Read this reference for named-file lookup, folder creation, copy, move, rename,
delete, and upload-session preparation in OneDrive.
For SharePoint sites, libraries, and document search, use
[SharePoint](sharepoint-work-iq.md). Explicit library-column requests use
[library metadata](sharepoint-library-metadata.md), not content search.

The recipes below provide known contracts. For other file-addressing or
byte-transfer questions, read only the relevant section of the
[entity-tool guide](entity-tools-work-iq.md). Preparation is not completed byte
transfer; `upload_blob` remains unreleased.

## Validated task recipes

| User Question Pattern | Example | Action |
|-----------------------|---------|--------|
| Listing files in a OneDrive/SharePoint folder | "List files in my OneDrive 'Specs' folder" | `fetch` |
| Creating an upload session for an existing OneDrive file | "Create an upload session to replace my file; do not upload content" | `call_function` once with `/me/drive/root/search(q='{urlEncodedExactName}')?$select=id,name,parentReference,file&$top=10` to resolve the exact driveItem and retain `parentReference.driveId` plus item `id`, then `do_action` `/drives/{driveId}/items/{itemId}/createUploadSession` with `{}`. This is a validated deployed contract: skip `search_paths` and `get_schema`, do not add an `item` wrapper, and do not upload file content. |
| Creating a folder in personal OneDrive | "Create a OneDrive folder named Project files" | Call `create_entity` exactly once with parent URL `/me/drive/root/children` and `{"name":"{requestedName}","folder":{},"@microsoft.graph.conflictBehavior":"fail"}`. This is a known deployed contract. Do not call `get_schema`, `search_paths`, fetch the root, or resolve a drive-scoped parent first. |
| Copying a named OneDrive file to a named folder | "Copy Q3 plan.txt to Shared" | Use two `call_function` calls to `/me/drive/root/search(q='{urlEncodedExactName}')?$select=id,name,parentReference,file,folder&$top=10`, retain the source `parentReference.driveId`, then `do_action` `/drives/{driveId}/items/{sourceId}/copy` with `{"parentReference":{"driveId":"{driveId}","id":"{folderId}"}}`. Skip `search_paths`, `get_schema`, and verification fetches. |
| Renaming a OneDrive file | "Rename Draft.txt to Final.txt" | `call_function` once with `/me/drive/root/search(q='{urlEncodedExactName}')?$select=id,name,parentReference,file&$top=10` to resolve the exact driveItem and retain `parentReference.driveId` plus item `id`, then `update_entity` `/drives/{driveId}/items/{itemId}` with `{"name":"Final.txt"}`. Skip `search_paths` and `get_schema`; do not PATCH `/me/drive/items/{id}`. |
| Deleting a named OneDrive file | "Remove Q3 plan.txt from my drive" | `call_function` once with `/me/drive/root/search(q='{urlEncodedExactName}')?$select=id,name,parentReference,file&$top=10`, select the exact file-name match, and copy its `parentReference.driveId` and `id` verbatim without truncating, reconstructing, or normalizing either value. Then call `delete_entity` exactly once on `/drives/{driveId}/items/{itemId}`. Do not add `eTag` or `@odata.etag` to `$select`; only when the normal lookup response includes an eTag, pass that returned value as `If-Match`. If a newly created file is not indexed yet, use at most one bounded `/me/drive/root/children` fallback before the same drive-scoped delete. Do not use `/me/drive/items/{id}`, `search_paths`, or malformed-id retries. |


## Resolve then act

After required confirmation and target resolution, complete the requested action; a preparatory lookup alone is not completion.

| User request | Step 1: resolve | Step 2: act (required) |
|---|---|---|
| "Create an upload session to replace existing file X" | `call_function` once with `/me/drive/root/search(q='{urlEncodedExactName}')?$select=id,name,parentReference,file&$top=10` to resolve the exact driveItem and retain `parentReference.driveId` plus item `id` | `do_action` `/drives/{driveId}/items/{itemId}/createUploadSession` with `{}`; do not add `item`, inspect schema, or upload bytes |
| "Copy file to folder" | Two `call_function` calls to `/me/drive/root/search(q='{urlEncodedExactName}')?$select=id,name,parentReference,file,folder&$top=10`, one for the exact source and one for the exact folder | `do_action` `/drives/{driveId}/items/{sourceId}/copy` with `{"parentReference":{"driveId":"{driveId}","id":"{folderId}"}}`; skip `search_paths`, `get_schema`, and verification fetches |
| "Move file to folder" | Two `call_function` calls to `/me/drive/root/search(q='{urlEncodedExactName}')?$select=id,name,parentReference,file,folder&$top=10`, one for the exact source and one for the exact folder | `update_entity` `/drives/{driveId}/items/{sourceId}` with `{"parentReference":{"id":"{folderId}"}}`. This is an update, not a `/move` action; skip `search_paths`, `get_schema`, verification fetches, and `/move`. |
| "Rename file X to Y" | `call_function` once with `/me/drive/root/search(q='{urlEncodedExactName}')?$select=id,name,parentReference,file&$top=10` to resolve the exact driveItem and retain `parentReference.driveId` plus item `id` | `update_entity` `/drives/{driveId}/items/{itemId}` with `{"name":"Y"}`; skip `search_paths` and `get_schema`, and do not use `/me/drive/items/{id}` |
