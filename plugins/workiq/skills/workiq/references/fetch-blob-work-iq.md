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

For SharePoint file content, use the drive-scoped path `/drives/{driveId}/items/{itemId}/content`. Do not use `/me/drive` for SharePoint requests. Select a real file document; avoid home pages, SitePages entries, or other `.aspx` site pages unless the user explicitly asks for a SharePoint page.

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

## Known endpoint recipes

Call counts below describe an unambiguous, authorized happy path, not a hard limit.
Identity, required confirmation, supported paging and requested completeness take
precedence. Endpoint query restrictions and payload shapes remain binding.

| Request | Example | Contract |
| --- | --- | --- |
| Downloading the first file attachment from Inbox | "Find the first inbox email with a file attachment and download that attachment" | The normal happy path uses two calls. First, `fetch` `/me/mailFolders/inbox/messages?$filter=hasAttachments%20eq%20true&$top=10&$select=id,subject,receivedDateTime,hasAttachments&$expand=attachments($select=id,name,contentType,size,isInline)`; do not combine this filter with `$orderby` and do not use `$skip`. In returned order, select the first message containing a file attachment and its first file attachment. Then call `fetch_blob` `/me/messages/{messageId}/attachments/{attachmentId}/$value`. Insert the complete `message.id` and selected `fileAttachment.id` directly from the structured response without retyping, shortening, normalizing, or reconstructing either value. Before the single `fetch_blob` call, compare both path segments character-for-character with their source fields and correct any mismatch before calling. The suffix is the literal `/$value` with no space between `/` and `$`; construct the path once and do not retry formatting variants. When the user requests raw content, include the returned `base64Content` in the final answer, or the actual materialized file path when the host wrote the bytes to disk; do not merely state that the content was downloaded. If the bounded page contains no file attachment, report no match in that page; use supported continuation when requested completeness needs it, or label coverage partial. Do not enumerate unrelated mailbox history or probe alternate filters. |
