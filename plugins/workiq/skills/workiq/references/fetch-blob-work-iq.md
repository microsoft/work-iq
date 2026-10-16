# fetch_blob

Download binary content from a WorkIQ path. The tool returns up to 4 MB of file bytes as base64 plus content type, file name, and size metadata. Use this for file content, email attachments, document downloads, profile photos, and other binary Microsoft 365 resources.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | The relative WorkIQ path to the binary resource (e.g., `/me/drive/items/{id}/content`, `/me/messages/{id}/attachments/{attachmentId}/$value`). Do not include a base URL. |
| `format` | string | No | A `$format` conversion value such as `pdf`; honored only on compatible drive-content endpoints. |
| `agentId` | string | No | Target a specific M365 Copilot agent. |

## When to Use

- Downloading a file from OneDrive or SharePoint
- Retrieving an email attachment
- Downloading exported content

Distinguish from `fetch`: use `fetch_blob` when the path returns binary content (files, raw attachment bytes). Use `fetch` when the path returns JSON.

## Path Conventions

| Resource | Path pattern |
|----------|-------------|
| OneDrive file content | `/me/drive/items/{id}/content` |
| SharePoint file content | `/drives/{driveId}/items/{id}/content` |
| Email attachment (raw) | `/me/messages/{id}/attachments/{attachmentId}/$value` |

## Workflow

1. Use `fetch` to list items and retrieve their IDs (e.g., `/me/drive/root/children`)
2. Use `fetch_blob` with the content path to download the binary data.
3. Decode `base64Content` only when the host needs to materialize the returned bytes locally.

For SharePoint file content, prefer the provider-backed
`/sharepoint/getDownloadFileDetails` action discovered through `search_paths`.
Follow the returned transfer instructions. Use the drive-scoped
`/drives/{driveId}/items/{itemId}/content` fallback only when no matching
provider path is returned and the drive item is already resolved. Do not use
`/me/drive` for SharePoint requests.

If the response reports that the payload is too large, do not retry path variants. The tool limits downloads to 4 MB; return the item's `webUrl` so the user can download it directly.

## Examples

### Download a file from OneDrive by item ID
```json
{ "path": "/me/drive/items/{id}/content" }
```

### Download an email attachment
```json
{ "path": "/me/messages/{messageId}/attachments/{attachmentId}/$value" }
```

### Download a file from a shared drive
```json
{ "path": "/drives/{driveId}/items/{itemId}/content" }
```

### Download a drive item converted to PDF
```json
{
	"path": "/me/drive/items/{id}/content",
	"format": "pdf"
}
```
