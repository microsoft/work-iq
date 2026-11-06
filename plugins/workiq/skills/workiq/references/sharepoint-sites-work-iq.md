# SharePoint sites and libraries

Use these entity routes when the user requests a site, library, drive metadata
or a bounded file listing. For an unlocated content question, use the workplace
retrieval route instead. Custom columns, filters and counts belong to
[library metadata](sharepoint-library-metadata.md).

## First accessible site

For an explicit "first accessible site" request, use:

```json
{"entityUrls":["/sites?search=*&$select=id,displayName,name,webUrl&$top=1"]}
```

The parameter is search=, not $search=. The first result is first accessible,
not first in the tenant. Retain its exact returned ID, then fetch
`/sites/{siteId}/drive` or `/sites/{siteId}/lists` as requested.
An empty unfiltered site response does not establish that no sites exist.

## Supplied site URL

Resolve a supplied site URL using the supported
`/sites/{host}:/sites/{siteName}` shape. Retain the returned composite site ID;
do not manufacture it from the site name. Resolve the requested list or drive,
then use returned list/drive/item IDs. A library name is not an item ID.

## Named group-backed team site

Use this route when the requested site is known to be backed by a Microsoft 365
group; do not assume every SharePoint site has a group. Escape apostrophes by
doubling them, then URL-encode the exact supplied display name once.

```json
{"entityUrls":["/groups?$filter=displayName%20eq%20'{odataEscapedAndUrlEncodedSiteName}'&$select=id,displayName&$top=1"]}
```

A bounded page is not proof of a unique name. Reuse an authoritative group ID,
follow supported paging or ask for a distinguishing identifier if ambiguous.
Do not strip words from the supplied name or choose a similar result.

For site metadata, fetch:

```json
{"entityUrls":["/groups/{groupId}/drive?$select=id,webUrl,sharePointIds"]}
```

Return the group's actual displayName and returned sharePointIds.siteUrl.
If siteUrl is missing, state the limitation; do not reconstruct it.

For the Documents library root, use the inherited deployed shape:

```json
{"entityUrls":["/groups/{groupId}/drive?$expand=root"]}
```

Do not append $select or nested-expand variants to this recipe. Copy the returned
drive id and root.id, then list:

```json
{"entityUrls":["/drives/{driveId}/items/{rootId}/children?$select=id,name,webUrl,file,folder,parentReference&$top=5"]}
```

Use actual returned names and webUrl values. Follow supported continuation for
all/every requests or label the listing partial. Do not substitute list fields
for a basic file listing; use the metadata route only when columns are requested.

## Addressing and failure

For known folders use `/drives/{driveId}/items/{folderId}/children`; for file
metadata use `/drives/{driveId}/items/{itemId}`. Names never replace these IDs.
Choose the supported shape before calling, not as a workaround after denial.
Explicit denial stops; do not switch addressing, tools or search strategies.
A clear validation rejection may permit one supported correction under
[recovery](troubleshooting.md), never guessed path variants.
