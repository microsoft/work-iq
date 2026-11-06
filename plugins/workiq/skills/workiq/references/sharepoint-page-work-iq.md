# Exact SharePoint site-page download

## Required before use

- [Site identity](sharepoint-sites-work-iq.md)
- [Binary handling](fetch-blob-work-iq.md)

## Resolve and download

Use only when the user explicitly asks to download a named site-page file.
Do not select .aspx pages for ordinary document search or summaries.

For a known group-backed site, resolve the exact group as described in the
site guide, then fetch its drive with id, webUrl and sharePointIds. Retain the
returned sharePointIds.siteId; do not reconstruct it.

1. Resolve the exact page library:
   `/sites/{siteId}/lists?$filter=displayName%20eq%20'{odataEscapedAndUrlEncodedLibraryName}'&$select=id,displayName,webUrl,list&$top=10`.
2. Read `/sites/{siteId}/lists/{listId}/items?$select=id,webUrl&$expand=fields($select=FileLeafRef,Title)&$top=50`.
   Match the exact requested filename. Resolve ambiguity or incomplete coverage
   before claiming a match or absence; use supported paging when required.
3. Fetch `/sites/{siteId}/lists/{listId}/items/{itemId}/driveItem?$select=id,name,webUrl,parentReference,file,size`.
4. Copy parentReference.driveId and driveItem.id verbatim into fetch_blob
   `/drives/{driveId}/items/{driveItemId}/content`.

The download item ID is driveItem.id, not the list-item ID. Compare the path
segments with their source fields before calling; do not normalize opaque IDs
or retry formatting variants. Site search, guessed root children and broad
Microsoft Search are not alternate routes for this exact page request.

Report verified bytes/local path, not proof that a pointer-backed page body was
read. Explicit denial stops; use recovery only for supported corrections.
