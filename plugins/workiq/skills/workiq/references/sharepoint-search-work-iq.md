# Structured SharePoint document search

Use this route for an explicitly requested structured document listing/search
across sites, with the source, filters and output resolved. Ordinary content
questions remain retrieve-first; do not replace workplace retrieval with broad
Microsoft Search merely because a document is mentioned.

## Search request

The inherited read-only `/search/query` action uses do_action:

```json
{
  "actionUrl": "/search/query",
  "jsonBody": {
    "requests": [{
      "entityTypes": ["driveItem"],
      "query": {"queryString": "{supportedRequestedSearch}"},
      "from": 0,
      "size": 25,
      "fields": ["id","name","webUrl","parentReference","sharepointIds","file","folder","listItem","lastModifiedDateTime"]
    }]
  }
}
```

Derive queryString from the user's scope using supported search syntax.
For a known site's recent documents, the inherited recipe combines its exact
path, IsDocument=true and lastModifiedTime>=YYYY-MM-DD. Request editor/date
fields only when supported. The documented size maximum is 500; do not probe 501.
This inherited shape is not new live validation or permission for broader sites.

## Identity and completeness

Inspect each nested response for errors. Select actual file driveItems, not
folders. Prefer the requested SharePoint site scope; exclude home pages,
SitePages and .aspx files unless the user explicitly requests a page.
Use [the page route](sharepoint-page-work-iq.md) for an exact site-page download.

Deduplicate by returned driveItem identity or actual webUrl. Report raw-hit and
unique-document counts separately. A capped result is not a complete inventory:
follow a known supported continuation contract or disclose partial coverage.
Do not guess search-page offsets, infer missing fields, or claim no matches
from failed or capped output.

If a site display name is required but absent, a slug from a returned SharePoint
webUrl can supply a candidate search term for a bounded
`/sites?search={encodedSiteSlug}&$select=id,displayName,name,webUrl&$top=5` read.
Verify the returned site URL against the source; a slug is not its display name
or authoritative identity. Do not search for extra site metadata if not needed.

## Raw content

Before downloading, read [binary handling](fetch-blob-work-iq.md). Resolve the
returned drive/item identity and call fetch_blob
`/drives/{driveId}/items/{itemId}/content`, not fetch on /content or /me/drive
for a SharePoint file. Report only actual materialized content or the honest
limit; pointer bytes may not contain the requested document body.

Explicit denial stops without another endpoint, agent or strategy. Read
[recovery](troubleshooting.md) before a permitted correction/retry.
