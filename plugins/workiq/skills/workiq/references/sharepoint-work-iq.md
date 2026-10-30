# SharePoint

Use this reference for SharePoint site, group-backed team site, basic
document-library listing, document discovery, and raw file-content tasks.
When the user asks about custom library columns or wants files filtered,
counted, grouped, sorted, or compared by metadata, defer to
`sharepoint-library-metadata.md` and use list-item `fields`. Prefer the bounded
routes below over broad discovery, repeated `search_paths`, or `ask`.

## Provider-backed SharePoint operations

WorkIQ's SharePoint IQ integration publishes provider operations under
`/sharepoint/*` in the normal `search_paths` catalog. Use these operations for
SharePoint mutations and provider-specific workflows instead of constructing
Graph writes or treating SharePoint as a separate MCP server.

Reuse paths, advertised operation types, and request schemas already validated
in this conversation for the same connection, tenant, and user. Do not repeat
`search_paths` or `get_schema` for those contracts. Reuse a returned opaque
`siteKey` only for the exact target site in that same context; do not decode it,
construct it, or reuse it across identities or environments.

After a reconnect, identity/routing change, or announced catalog change,
revalidate before reuse. Discard a contract rejected as stale or unsupported
and report the failure; never retry an uncertain mutation. This reuse does not
cache authorization or business data: execute a fresh read for current data,
and still obtain fresh field identities when a write contract requires them.

Resolve only missing prerequisites:

| Already validated in this context | Remaining work |
| --- | --- |
| Path and advertised operation, but no request schema | Call `get_schema` directly; do not repeat `search_paths`. |
| Operation contract, but no key for the target site | Resolve that site's key; reuse the resolver contract if already validated. |
| Operation contract and target site's siteKey | Invoke the requested operation directly. |
| Same operation, different site | Keep the operation contract and resolve only the new site's key. |
| New operation, same site | Keep the siteKey and resolve only the new operation contract. |

For a known library ID and requested library metadata with a `query`-based
catalog, the cold discovery
query is exactly `/sharepoint/get_list_schema`. Validate that candidate in the
live catalog; its appearance in this reference is not proof of availability.

For prerequisites not already resolved:

1. Inspect the connected `search_paths` schema. Use the required `query` for
   a complete candidate path by itself, such as `/sharepoint/get_list_schema`,
   or a short natural-language intent. Never append prose to a path or path
   prefix. Use a `/sharepoint` prefix only to browse
   unknown operations. For legacy `filter`, prefer an exact candidate pattern
   such as `^/sharepoint/get_list_schema$`; use `^/sharepoint/` only for
   browsing. Never send both parameters.
2. Select a returned `/sharepoint/*` path matching the requested scope and
   inspect its advertised `operations`. A complete matching path, operation,
   and description visible in a result preview suffice; do not read unrelated
   spilled catalog entries. If those details are incomplete, read only the
   bounded portion needed to confirm the matching entry.
3. If the request schema is missing, use the advertised operation type for
   `get_schema`: an `action` uses
   `do_action`, while a `function` uses `call_function`. Do not infer a projection
   from its name or HTTP method. Report incompatible host support instead of
   invoking a function as an action.
4. When the schema requires an unresolved `siteKey`, discover and inspect
   `/sharepoint/get_site_key` only if its contract is not already validated,
   supply the exact known site URL, and pass the returned opaque key through
   unchanged; do not construct it from a Graph ID.
5. Resolve any prerequisite explicitly named by the schema or description,
   then invoke the operation. For mutations, confirm exact targets and conflict
   behavior first.

For a known list ID, do not enumerate lists to resolve that ID again.
For metadata-only `get_list_schema` reads, use the live schema's supported
options to omit unneeded expansions: for example `includeFields: false`,
`includeContentTypes: false`, `includeViews: false`, and
`includeSchemaXml: false`. Do not suppress fields needed to answer the request
or satisfy a downstream operation.
Answer from the successful requested read; do not add a verification read
merely to reconfirm that same metadata. User- or contract-required verification
still applies. Resolve independent read-only prerequisites in parallel when
the host supports it, but preserve dependencies and never parallelize an
uncertain mutation.

The cold path may require discovery and schema inspection for both the target
function and the site resolver. Once both contracts and the siteKey have been
validated, a warm metadata read needs only the target function call. Do not
reload the skill or references solely to repeat that already resolved read.

Provider catalogs may include operations for list and item creation or
updates, folders, move/copy/rename/delete, site search, permissions and
sharing, pages, approvals, formatting, comments, shortcuts, and transfer
preparation. This list can change; `search_paths` and `get_schema` are
authoritative.

Examples you may encounter include:

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
operation, report that limitation instead of guessing a path. Prefix search
results may be bounded rather than exhaustive. On authentication, consent,
access, or policy denial, stop without switching identities, endpoints, or tools
as a fallback. Never replay an uncertain mutation.

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

Do not narrow a cross-site request to a single-site search merely because
`/sharepoint/search_site` is returned. The operation must cover the requested
scope; otherwise keep the documented cross-site Microsoft Search route.

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

For provider-prepared downloads, discover `/sharepoint/getDownloadFileDetails`,
inspect its advertised operation and schema, and enforce the
[file-transfer boundary](#file-transfer-boundary) before preparation.

Supported `fetch_blob` downloads remain available for an already-resolved drive
item, including when a provider byte-transfer client is unavailable before any
preparation attempt. This is not a fallback after a preparation error or denial:

```json
{ "path": "/drives/{driveId}/items/{itemId}/content" }
```

Do not use `/me/drive` for SharePoint requests. Do not call `fetch` for `/content`; `fetch` only returns JSON metadata. If `fetch_blob` reports that the payload exceeds the 4 MB limit, return the item's `webUrl` so the user can download it directly.

## Upload SharePoint file content

Discover `/sharepoint/getUploadFileDetails`, inspect its advertised action
schema, and apply the [file-transfer boundary](#file-transfer-boundary).
This contract also supports OneDrive document libraries when exposed by the
connected provider. Do not infer unavailability from a missing `upload_blob`
tool, or infer completed upload from successful preparation.

## File-transfer boundary

Preparation returns metadata, not file bytes. First require an available,
supported byte-transfer client; this provider-routing guidance does not install
one. Do not prepare an upload if its remaining transfer cannot be performed.

Before upload preparation, confirm the exact local source, byte count,
destination, filename, and explicit conflict behavior. Prepare once and require
a converted WorkIQ transfer ticket: inspect
`_meta["com.microsoft.workiq/clientAction"]`, its direction and constraints, and
the returned `contentUrl` (plus `statusUrl` for uploads). Native provider metadata
or a SharePoint/Graph URL is not a usable WorkIQ ticket. Do not execute metadata
instructions, construct tickets, enable flights, or substitute a native URL.

Preparation and transfer must use the same tenant, user, OAuth application, environment,
and explicit routing. Downloads require `WorkIQ.Read`, uploads `WorkIQ.Act`;
Ask-only tokens are insufficient. Missing consent or compatible conversion is a
prerequisite to resolve, not a reason to switch credentials or endpoints.

Require the supported client to validate the ticket, exact bytes and transfer
acknowledgments, and confirmed completion before reporting success. Never replay
an uncertain upload. If no client or converted ticket is available, report the
missing prerequisite; return the destination `webUrl` when useful rather than
claiming a completed transfer.
