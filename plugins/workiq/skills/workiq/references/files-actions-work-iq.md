# File mutations

## Required before use

- [files-identity-work-iq](files-identity-work-iq.md)
- [mutation-work-iq](mutation-work-iq.md)

## Known endpoint recipes

Call counts below describe an unambiguous, authorized happy path, not a hard limit.
Identity, required confirmation, supported paging and requested completeness take
precedence. Endpoint query restrictions and payload shapes remain binding.

| Request | Example | Contract |
| --- | --- | --- |
| Creating an upload session for an existing OneDrive file | "Create an upload session to replace my file; do not upload content" | `call_function` once with `/me/drive/root/search(q='{urlEncodedExactName}')?$select=id,name,parentReference,file&$top=10` to resolve the exact driveItem and retain `parentReference.driveId` plus item `id`, then `do_action` `/drives/{driveId}/items/{itemId}/createUploadSession` with `{}`. This is a validated deployed contract: skip `search_paths` and `get_schema`, do not add an `item` wrapper, and do not upload file content. |
| Creating a folder in personal OneDrive | "Create a OneDrive folder named Project files" | Call `create_entity` exactly once with parent URL `/me/drive/root/children` and `{"name":"{requestedName}","folder":{},"@microsoft.graph.conflictBehavior":"fail"}`. This is a known deployed contract. Do not call `get_schema`, `search_paths`, fetch the root, or resolve a drive-scoped parent first. |
| Copying a named OneDrive file to a named folder | "Copy Q3 plan.txt to Shared" | Use two `call_function` calls to `/me/drive/root/search(q='{urlEncodedExactName}')?$select=id,name,parentReference,file,folder&$top=10`, retain the source `parentReference.driveId`, then `do_action` `/drives/{driveId}/items/{sourceId}/copy` with `{"parentReference":{"driveId":"{driveId}","id":"{folderId}"}}`. Skip `search_paths`, `get_schema`, and verification fetches. |
| Renaming a OneDrive file | "Rename Draft.txt to Final.txt" | `call_function` once with `/me/drive/root/search(q='{urlEncodedExactName}')?$select=id,name,parentReference,file&$top=10` to resolve the exact driveItem and retain `parentReference.driveId` plus item `id`, then `update_entity` `/drives/{driveId}/items/{itemId}` with `{"name":"Final.txt"}`. Skip `search_paths` and `get_schema`; do not PATCH `/me/drive/items/{id}`. |
| Deleting a named OneDrive file | "Remove Q3 plan.txt from my drive" | `call_function` once with `/me/drive/root/search(q='{urlEncodedExactName}')?$select=id,name,parentReference,file&$top=10`, select the exact file-name match, and copy its `parentReference.driveId` and `id` verbatim without truncating, reconstructing, or normalizing either value. Then call `delete_entity` exactly once on `/drives/{driveId}/items/{itemId}`. Do not add `eTag` or `@odata.etag` to `$select`; only when the normal lookup response includes an eTag, pass that returned value as `If-Match`. If a newly created file is not indexed yet, use at most one bounded `/me/drive/root/children` fallback before the same drive-scoped delete. Do not use `/me/drive/items/{id}`, `search_paths`, or malformed-id retries. |

### Copy a named OneDrive file to a named folder

Resolve the exact source file and target folder with two `call_function`
searches. Retain the source item's `parentReference.driveId`, source `id`, and
target folder `id`. The deployed copy contract is drive-scoped; do not use the
policy-denied `/me/drive/items/{id}/copy` alias. This known contract does not
need `search_paths`, `get_schema`, or a verification fetch. A `202` response
confirms that the asynchronous copy was accepted.

```json
{
  "actionUrl": "/drives/{driveId}/items/{sourceId}/copy",
  "jsonBody": {
    "parentReference": {
      "driveId": "{driveId}",
      "id": "{folderId}"
    }
  }
}
```

### Replace an existing file with an upload session
Resolve the existing driveItem with one `call_function` exact-name search and
retain both its `parentReference.driveId` and item `id`. Do not use `fetch` for
this named OneDrive search and do not follow the successful search with another
metadata read. The deployed action accepts an empty body for this operation. Do
not add an `item` wrapper: the current runtime can reject that otherwise
schema-valid optional field with `400 invalidRequest`. This contract is already
known, so skip `search_paths` and `get_schema`.

```json
{
  "functionUrl": "/me/drive/root/search(q='{urlEncodedExactName}')?$select=id,name,parentReference,file&$top=10"
}
```

```json
{
  "actionUrl": "/drives/{driveId}/items/{itemId}/createUploadSession",
  "jsonBody": {}
}
```

The response returns an `uploadUrl` for a later chunk upload. Treat that URL as
a temporary preauthenticated credential: never include, quote, cite, log, or
return `uploadUrl` in model output. **This skill does not expose a binary-upload
tool** — see the deny rule in `SKILL.md`. When the user only asks to create the
session, report only non-secret metadata such as `expirationDateTime` and
`nextExpectedRanges`, then stop; do not upload file content.
