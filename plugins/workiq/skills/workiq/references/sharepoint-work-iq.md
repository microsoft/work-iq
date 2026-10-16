# SharePoint

Use this reference for SharePoint site, group-backed team site, basic
document-library listing, document discovery, and raw file-content tasks.
When the user asks about custom library columns or wants files filtered,
counted, grouped, sorted, or compared by metadata, defer to
`sharepoint-library-metadata.md` and use list-item `fields`. Prefer the bounded
routes below over broad discovery, repeated `search_paths`, or `ask`.

## Provider-backed SharePoint operations

WorkIQ's SharePoint IQ integration publishes provider operations under
`/sharepoint/*` in the normal `search_paths` catalog. Use these actions for
SharePoint mutations and provider-specific workflows instead of constructing
Graph writes or treating SharePoint as a separate MCP server.

Required workflow:

1. Call `search_paths` with the exact SharePoint intent, or `/sharepoint` when
   the user asks what SharePoint operations are available.
2. Select a returned `/sharepoint/*` path by its description.
3. Call `get_schema` with `operationType: "action"`.
4. When the schema requires `siteKey`, call
   `/sharepoint/get_site_key` through `do_action` with the exact site URL and
   pass the returned opaque key through unchanged.
5. Resolve any prerequisite explicitly named by the schema or description,
   then call the selected action with `do_action`.

The live provider catalog includes operations for list and item creation or
updates, folders, move/copy/rename/delete, site search, permissions and
sharing, pages, approvals, formatting, comments, shortcuts, and transfer
preparation. This list can change; `search_paths` and `get_schema` are
authoritative.

Examples of currently exposed paths include:

- `/sharepoint/get_site_key`
- `/sharepoint/discover_sharepoint_lists`
- `/sharepoint/get_list_schema`
- `/sharepoint/create_or_update_list`
- `/sharepoint/create_list_items_v2`
- `/sharepoint/update_list_items_v2`
- `/sharepoint/update_batch_list_items`
- `/sharepoint/delete_list_item`
- `/sharepoint/create_folder`
- `/sharepoint/move_items`
- `/sharepoint/copy_items`
- `/sharepoint/rename_item`
- `/sharepoint/delete_items`
- `/sharepoint/search_site`
- `/sharepoint/share_file`
- `/sharepoint/unshare_file`
- `/sharepoint/getDownloadFileDetails`
- `/sharepoint/getUploadFileDetails`

Do not pass `backend`, `provider`, or `source` to `search_paths`; provider
routing comes from the returned path. If the catalog does not return a matching
operation, report that limitation instead of guessing a path.

## First accessible SharePoint site

Use `search=`, not `$search=`, for SharePoint site discovery. The path catalog may advertise OData `$search`, but SharePoint site enumeration works with the non-OData `search` query parameter.

```json
{ "entityUrls": ["/sites?search=*&$select=id,displayName,name,webUrl&$top=1"] }
```

Treat the first returned site as the first accessible site, then fetch the requested resource:

```json
{ "entityUrls": ["/sites/{siteId}/drive"] }
```

```json
{ "entityUrls": ["/sites/{siteId}/lists"] }
```

Do not use `/sites?$search=*`, guessed single-letter searches, an empty search, or `ask`. Do not treat an unfiltered `/sites` response with an empty `value` array as proof that no sites exist.

## Named group-backed team sites

For a named Microsoft 365 group-backed SharePoint team site, resolve the backing group by exact display name instead of relying only on site search. This is especially useful when the display name contains punctuation or characters that OData `$search` rejects, such as underscores.

Escape single quotes in the site name per OData by doubling them, then URL-encode the value before inserting it into the filter.

```json
{ "entityUrls": ["/groups?$filter=displayName%20eq%20'{odataEscapedAndUrlEncodedSiteName}'&$select=id,displayName&$top=1"] }
```

Then resolve the Documents library and its root in one fetch:

```json
{ "entityUrls": ["/groups/{groupId}/drive?$expand=root"] }
```

Then list root children with the resolved root id:

```json
{ "entityUrls": ["/drives/{driveId}/items/{rootId}/children"] }
```

If a drive root alias such as `/drives/{driveId}/root` or `/drives/{driveId}/root/children` is denied, do not keep retrying root variants. Use `/groups/{groupId}/drive?$expand=root` and `/drives/{driveId}/items/{rootId}/children`.

## Search SharePoint documents

For site-scoped SharePoint search, prefer the provider-backed
`/sharepoint/search_site` action discovered through `search_paths`. Use its live
schema and resolve `siteKey` when required.

For a genuinely cross-site semantic document search that is not covered by a
provider path, use Microsoft Search as the bounded fallback below.

Use Microsoft Search for bounded cross-site document discovery. This is the primary route when the user asks to find, list, or download a SharePoint document without already providing a site or drive item id.

```json
{
  "actionUrl": "/search/query",
  "jsonBody": {
    "requests": [
      {
        "entityTypes": ["driveItem"],
        "query": {"queryString": "IsDocument:True"},
        "from": 0,
        "size": 25,
        "fields": [
          "id",
          "name",
          "webUrl",
          "parentReference",
          "sharepointIds",
          "file",
          "folder",
          "listItem",
          "lastModifiedDateTime"
        ]
      }
    ]
  }
}
```

Filter the returned hits before answering or downloading:

- Prefer team-site URLs under `sharepoint.com/sites/` or `sharepoint.com/teams/` when the user asks for SharePoint team-site content.
- Select driveItems that are files. Prefer typical document extensions such as `.docx`, `.pptx`, `.xlsx`, `.pdf`, and `.txt`.
- Do not select folders.
- Do not select SharePoint site pages such as home pages, SitePages entries, or other `.aspx` pages unless the user explicitly asks for a site page.

When the final answer needs the site display name and search did not return it directly, derive the unique site slug from each SharePoint `webUrl` and make one batched fetch with `/sites?search={siteSlug}&$select=id,displayName,name,webUrl&$top=5` for those slugs.

## Download raw SharePoint file content

Prefer `/sharepoint/getDownloadFileDetails` for SharePoint downloads. Discover
it with `search_paths`, inspect its action schema, invoke it with `do_action`,
and follow the returned transfer instructions exactly.

Only when no provider download operation is returned may an existing,
already-resolved drive item use `fetch_blob` with the drive-scoped content path:

```json
{ "path": "/drives/{driveId}/items/{itemId}/content" }
```

Do not use `/me/drive` for SharePoint requests. Do not call `fetch` for `/content`; `fetch` only returns JSON metadata. If `fetch_blob` reports that the payload exceeds the 4 MB limit, return the item's `webUrl` so the user can download it directly.

## Upload SharePoint file content

Use `/sharepoint/getUploadFileDetails`. Discover the path, inspect its action
schema, invoke it with `do_action`, and follow the returned resumable-transfer
instructions. The absence of a direct WorkIQ `upload_blob` tool does not mean
SharePoint uploads are unsupported through the provider workflow.
