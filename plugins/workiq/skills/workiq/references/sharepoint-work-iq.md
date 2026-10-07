# SharePoint

Use this reference for SharePoint site, group-backed team site, basic
document-library listing, document discovery, and raw file-content tasks.
When the user asks about custom library columns or wants files filtered,
counted, grouped, sorted, or compared by metadata, defer to
`sharepoint-library-metadata.md` and use list-item `fields`. Prefer the bounded
routes below over broad discovery, repeated `search_paths`, or `ask`.

For read-only finding and each comparison source, verify requested name/identity,
type, location/time and relevant content. A near-match is not the requested
artifact. Resolve missing evidence with a bounded supported in-scope refinement
or exact read only when needed, not unconditional download or recursive search.
Report unresolved targets and searched scope without silent substitution.
All explicit access/policy denials stop under [recovery](troubleshooting.md).

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

Use the group-drive/root-item route directly for this known workflow, not as a
fallback after access denial. If an alias or any read is explicitly denied,
stop rather than trying alternate shapes.

## Search SharePoint documents across sites

Use Microsoft Search for bounded structured cross-site document listing or
download resolution. Semantic topic discovery remains public `ask`-first;
these structured contracts are not a blanket override for all document questions.

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

After selecting a SharePoint file driveItem, download raw bytes with `fetch_blob` using the drive-scoped content path:

```json
{ "path": "/drives/{driveId}/items/{itemId}/content" }
```

Do not use `/me/drive` for SharePoint requests. Do not call `fetch` for `/content`; `fetch` only returns JSON metadata. If `fetch_blob` reports that the payload exceeds the 4 MB limit, return the item's `webUrl` so the user can download it directly.

## Known endpoint recipes

Call counts below describe an unambiguous, authorized happy path, not a hard limit.
Identity, required confirmation, supported paging and requested completeness take
precedence. Endpoint query restrictions and payload shapes remain binding.

| Request | Example | Contract |
| --- | --- | --- |
| Reading the first accessible SharePoint site's default drive or lists | "Show the first site's drive metadata", "List the first site's lists" | `fetch` `/sites?search=*&$select=id,displayName,name,webUrl&$top=1`, treat the first returned item as "first accessible", then `fetch` `/sites/{siteId}/drive` or `/sites/{siteId}/lists`. The parameter is `search=*`, **not** `$search=*`; do not use `ask`, guessed search terms, or an empty search. See `references/sharepoint-work-iq.md`. |
| Finding a named group-backed SharePoint site's metadata | "Find the Contoso Research SharePoint site and return its exact display name and URL" | The normal happy path uses two `fetch` calls: first resolve the backing group with `/groups?$filter=displayName%20eq%20'{odataEscapedAndUrlEncodedSiteName}'&$select=id,displayName&$top=1`, then fetch `/groups/{groupId}/drive?$select=id,webUrl,sharePointIds`. Return the group's exact `displayName` and `sharePointIds.siteUrl`. Do not call `/groups/{groupId}/sites/root`, `search_paths`, broaden into `/sites?search` retries, infer the site URL, or fetch the site again merely to repeat confirmed metadata. A page limit is not uniqueness evidence; disambiguate when necessary. If `sharePointIds.siteUrl` is absent, report that limitation. |
| Listing documents from a named group-backed SharePoint team site | "List documents from the Contoso Research SharePoint team site" | Resolve the backing group by the user's complete, exact site display name: `fetch` `/groups?$filter=displayName%20eq%20'{odataEscapedAndUrlEncodedSiteName}'&$select=id,displayName&$top=1` (do not remove prefix words from the supplied name). Then use exactly `fetch` `/groups/{groupId}/drive?$expand=root` without adding `$select` or nested-expand variants. Copy the returned drive `id` and `root.id` verbatim, then call exactly `fetch` `/drives/{driveId}/items/{rootId}/children?$select=id,name,webUrl,file,folder,parentReference&$top=5`. For this basic drive-item listing workflow, do not use `/root/children`, Microsoft Search, `search_paths`, list/listItem fallbacks, or malformed-id retries. The no-list-fallback rule does not apply when the user requests SharePoint library columns or metadata filtering/aggregation; use the metadata route above for those requests. Use this workflow for named Microsoft 365 group-backed team sites, especially when site search fails or the name contains characters that OData `$search` rejects. See `references/sharepoint-work-iq.md`. |
| Downloading an explicitly requested SharePoint site-page file | "Download the named .aspx page from a named site-page library" | Use exactly six calls. Resolve the backing group by the complete exact site name; fetch `/groups/{groupId}/drive?$select=id,webUrl,sharePointIds`; fetch `/sites/{sharePointIds.siteId}/lists?$filter=displayName%20eq%20'{odataEscapedAndUrlEncodedLibraryName}'&$select=id,displayName,webUrl,list&$top=10`; fetch `/sites/{siteId}/lists/{listId}/items?$select=id,webUrl&$expand=fields($select=FileLeafRef,Title)&$top=50` and select the exact requested filename; fetch `/sites/{siteId}/lists/{listId}/items/{itemId}/driveItem?$select=id,name,webUrl,parentReference,file,size`; then `fetch_blob` `/drives/{parentReference.driveId}/items/{driveItemId}/content`. For the download item segment, use `driveItem.id`, not the list item id, and insert the complete structured-response value without retyping, shortening, normalizing, or reconstructing it. Before the single `fetch_blob` call, compare that item segment character-for-character with `driveItem.id` and correct any mismatch before calling rather than retrying after failure. Copy every other returned id verbatim. Do not use site search, `/sites/{id}/drives`, root-children guesses, Microsoft Search, `search_paths`, or download-path retries. |
| Listing all recent documents in one SharePoint site | "List every document modified in one site since a date; include editor and date" | Use `do_action` `/search/query` with a `driveItem` query combining the exact team-site `path`, `IsDocument=true`, and `lastModifiedTime>=YYYY-MM-DD`; `size` is at most `500` (the deployed maximum; `501` is rejected). Request `name`, `webUrl`, `lastModifiedDateTime`, `lastModifiedBy`, `createdBy`, and `parentReference`. Do not probe a larger size. Follow supported search pagination while more results remain; if unavailable, capped or budget-limited, report partial coverage. Size 500 or one page is not proof of all documents. De-duplicate by driveItem identity or `webUrl`, state raw-hit and unique-document counts separately, and list each unique document once. |

### Search documents across SharePoint team sites

Use Microsoft Search for a bounded cross-site document query. This response can
contain results from multiple SharePoint-backed locations and does not provide
team-site display names, so derive each site slug from its SharePoint `webUrl`,
then make one batched `fetch` to
`/sites?search={siteSlug}&$select=id,displayName,name,webUrl&$top=5` for the
unique slugs. Return at most five exact file names, resolved site display names,
and `webUrl` values.

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

For raw content download, continue from the selected search hit to `fetch_blob`
with `/drives/{driveId}/items/{itemId}/content`. Choose a file document, not a
folder, home page, SitePages entry, or another `.aspx` site page unless the
user explicitly asks for a page. Prefer typical document extensions such as
`.docx`, `.pptx`, `.xlsx`, `.pdf`, and `.txt`.

This is a known action contract. Do not call `ask`, `search_paths`, or
`get_schema` first. See `references/sharepoint-work-iq.md` for the full
SharePoint route.
