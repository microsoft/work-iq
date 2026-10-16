# File metadata

## Required before use

- [files-identity-work-iq](files-identity-work-iq.md)

## Reaching a SharePoint or OneDrive file — the working sequence

Resolve the drive, then address items **by id**. This structured route supplies
exact metadata when supported and permitted; it does not guarantee success.

**Hop 1 — get a `driveId`** (one `fetch`, pick the row that matches your source):

| You have | Call | Keep |
|---|---|---|
| A SharePoint site id | `/sites/{siteId}/drive` | its `id` = `driveId` |
| The user's own OneDrive | `/me/drive` | its `id` = `driveId` |
| A browser URL | the hostname + site name from it → `/sites/{host}:/sites/{siteName}` → then `/sites/{siteId}/drive` | `siteId`, then `driveId` |

**Hop 2 — address items by id, never by name:**

| Goal | Call |
|---|---|
| Find a file by name | `call_function` with `/drives/{driveId}/root/search(q='{urlEncodedExactName}')` — URL-encode the name; this is a function call, not a `fetch` path |
| List the drive's top level | `/drives/{driveId}/root` → take its `id` → `/drives/{driveId}/items/{id}/children` |
| List a folder | `/drives/{driveId}/items/{folderId}/children` |
| Item metadata | `/drives/{driveId}/items/{itemId}` |
| File bytes | `fetch_blob` `/drives/{driveId}/items/{itemId}/content` |

Two invariants: **a name goes in `q=` of a search, never in a URL segment**, and **every id
comes from a tool result in this conversation** — never assembled, guessed, or all-zeros.

Within SharePoint drive/item addressing, these variants are **not allowlisted** and fail, so
skip them and use the sequence above: a pasted browser URL; a folder or library name as a path
segment (`/sites/{siteId}/Shared%20Documents/...`); a colon path (`/root:/Folder/File`);
`/root/children` (children hang off `/items/{id}`); and `/sites/{siteId}/drive/items/...`,
which is a lookup rather than a prefix — switch to `/drives/{driveId}/...`.

Prefer the drive-scoped `/drives/{driveId}/items/...` form for SharePoint content. The
`/me/drive/...` forms remain the documented OneDrive convention (see
`references/fetch-blob-work-iq.md` and `references/call-function-work-iq.md`); they are
unreliable for SharePoint-hosted items, not invalid everywhere.

**Anything else — discover, never guess.** For an unknown route, use `search_paths`
with required `query` string, e.g. `"SharePoint sites and drive items"`, and use
only returned paths. Explicit access/policy denial stops; it never authorizes
discovery of another route. Cache supported templates rather than probing variants.
