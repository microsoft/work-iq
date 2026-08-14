# Files Organize Reference

Use this reference for persistent OneDrive/SharePoint file actions: create folder, copy, move, rename, delete, and create upload session. Every write must be confirmed with the user before calling the mutation tool.


## 🛑 `/me/drive/items/{id}` is denied for entity operations

**Verified live:** `workiq-fetch` on `/me/drive/items/{id}` returns `Access denied for GET path`. Only the drive-scoped form is exposed for `fetch` / `update_entity` / `delete_entity` / `do_action` / `create_entity`:

| Operation | Path |
|---|---|
| Entity read/update/delete/action on an item | ✅ `/drives/{driveId}/items/{itemId}` |
| Same via the `/me` alias | ❌ `/me/drive/items/{itemId}` — proxy-denied |
| Listing the root, root search | ✅ `/me/drive/root/children`, `/me/drive/root/search(q='...')` |
| Binary content via `workiq-fetch_blob` | ✅ `/me/drive/items/{itemId}/content` — **`fetch_blob` uses a different allowlist and does reach Graph** |

**Getting `driveId` costs nothing** — every listing already returns it:

- `parentReference.driveId` on any item from `/me/drive/root/children` or a drive search, or
- `workiq-fetch` `/me/drive?$select=id` for the user's own OneDrive.

Include `parentReference` in `$select` when listing so the id is in hand before any write. If a write fails with `Access denied for path`, check you used the drive-scoped form before reporting the path as denied.


## Universal write procedure

1. Resolve the exact item(s) and drive context from WorkIQ evidence.
2. If multiple matches exist, ask the user to choose. Never act on all matches.
3. Show a confirmation prompt naming:
   - source file/folder exact name and `webUrl`
   - source drive/site/library when returned
   - destination folder exact name and `webUrl` for copy/move
   - new name for rename
   - destructive effect for delete
   - upload-session target for createUploadSession
4. After explicit confirmation, call the write tool once.
5. Report success only when the response confirms creation, update, deletion, or accepted action.

## Create a OneDrive folder

Score-5 MCP route for `create-onedrive-folder`: direct `workiq-create_entity`. Get user confirmation before this mutation. Do not call schema/path discovery for the known root-folder create path.

```text
workiq-create_entity (
  parentUrl: "/me/drive/root/children",
  jsonBody: {
    "name": "<folder name>",
    "folder": {},
    "@microsoft.graph.conflictBehavior": "rename"
  }
)
```

For a known parent folder:

```text
workiq-create_entity (
  parentUrl: "/drives/{driveId}/items/{parentFolderId}/children",
  jsonBody: { "name": "<folder name>", "folder": {}, "@microsoft.graph.conflictBehavior": "rename" }
)
```

The final answer must state the exact folder name and location from the successful response.

## Resolve personal OneDrive source and destination

Use drive search with `workiq-call_function` for exact named files/folders:

```text
workiq-call_function (
  functionUrl: "/me/drive/root/search(q=%27<url-encoded-exact-source-name>%27)?$top=10&$select=id,name,webUrl,file,folder,parentReference"
)
```

For a destination folder:

```text
workiq-call_function (
  functionUrl: "/me/drive/root/search(q=%27<url-encoded-exact-folder-name>%27)?$top=10&$select=id,name,webUrl,file,folder,parentReference"
)
```

Require `file` for source files and `folder` for destination folders. Preserve `parentReference.driveId` and item `id` for grounding.

## Copy a OneDrive file to a folder

Score-5 MCP route: `workiq-call_function` → `workiq-call_function` → `workiq-do_action`. Get confirmation after the two resolution calls and before the action.

```text
workiq-do_action (
  actionUrl: "/drives/{driveId}/items/{sourceFileId}/copy",
  jsonBody: {
    "parentReference": {
      "driveId": "{targetDriveId}",
      "id": "{targetFolderId}"
    }
  }
)
```

Use `/drives/{sourceDriveId}/items/{sourceFileId}/copy` instead of `/me/drive/...` when the source is not the signed-in user's personal drive.

The final answer must state that the copy action was accepted/completed for the requested destination only if the action response confirms it.

## Move a OneDrive file to a folder

Score-5 MCP route: `workiq-call_function` → `workiq-call_function` → `workiq-update_entity`. Get confirmation after the two resolution calls and before the update.

```text
workiq-update_entity (
  entityUrl: "/drives/{driveId}/items/{sourceFileId}",
  jsonBody: {
    "parentReference": {
      "driveId": "{targetDriveId}",
      "id": "{targetFolderId}"
    }
  }
)
```

The successful update response must confirm the same item now has `parentReference` changed to the target folder. If that resulting state is not explicit, say the move outcome is unconfirmed.

## Rename a OneDrive file

Score-5 MCP route: `workiq-call_function` → `workiq-update_entity`. Get confirmation after resolution and before the update.

```text
workiq-update_entity (
  entityUrl: "/drives/{driveId}/items/{fileId}",
  jsonBody: { "name": "<new exact name>" }
)
```

Preserve item identity through `id` or drive context. The final response must state the new name only when the update response confirms it.

## Delete a OneDrive file

Score-5 MCP route: `workiq-call_function` → `workiq-delete_entity` (or `workiq-fetch` → `workiq-delete_entity` when the item is already listed). Get confirmation after resolution and before deletion.

```text
workiq-delete_entity (
  entityUrl: "/drives/{driveId}/items/{fileId}"
)
```

Delete is destructive. Resolve the exact file first, show the exact name and `webUrl`, and never delete based on a partial title or implied intent. If the delete response is null/ambiguous, say deletion is unconfirmed.

## Create an upload session for an existing file

This is the critical distinction:

- Supported: creating an upload session action with `workiq-do_action`.
- Not supported: uploading raw bytes. `upload_blob` is not released, and no `workiq-upload_blob` or PUT-bytes tool exists in the current surface.

Score-5 MCP route for `create-onedrive-upload-session`: `workiq-call_function` → `workiq-do_action`. Get confirmation after resolution and before the action.

1. Resolve the exact existing OneDrive file:
   ```text
   workiq-call_function (
     functionUrl: "/me/drive/root/search(q=%27<url-encoded-existing-file-name>%27)?$top=10&$select=id,name,webUrl,file,folder,parentReference"
   )
   ```
2. Confirm that the user wants an upload session to replace that exact file and that no content will be uploaded by WorkIQ.
3. Create the session:
   ```text
   workiq-do_action (
     actionUrl: "/drives/{driveId}/items/{fileId}/createUploadSession",
     jsonBody: {
       "item": {
         "@microsoft.graph.conflictBehavior": "replace"
       }
     }
   )
   ```
4. Report only fields returned by the action response. If an `uploadUrl` is returned, it is for the user/external uploader to PUT chunks to; the agent must not attempt raw-byte upload or claim upload completion.

## Upload session schema questions

For `schema-upload-session`, use `workiq-get_schema` and do not use web documentation.

```text
workiq-get_schema (
  path: "/drives/{driveId}/items/{id}/createUploadSession",
  operationType: "action"
)
```

Answer only from the schema result. Distinguish request body schema from response resource schema. If WorkIQ exposes only the request schema, say that limitation plainly. Do not invent response properties such as `uploadUrl`, `expirationDateTime`, or `nextExpectedRanges` without MCP schema evidence.

## Write success criteria from evals

- **Copy:** exact source file + exact destination folder + accepted copy action for that destination.
- **Move:** exact source file + exact destination folder + update response showing `parentReference` changed.
- **Rename:** exact original file + update response showing the requested final name for the same item.
- **Delete:** exact file + successful `workiq-delete_entity` on that item path.
- **Create folder:** successful create response with exact folder name/location.
- **Upload session:** exact existing file + successful createUploadSession action; no byte upload claimed.
