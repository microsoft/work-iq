# fetch_blob

> ⚠️ **Not released yet.** `fetch_blob` is documented here for future reference but is **not part of the current WorkIQ MCP surface**. Calling it today returns `tool does not exist`. When a user asks to download a file or fetch attachment bytes, return the entity's `webUrl` (or the parent message URL for an attachment) and tell the user WorkIQ can't stream raw bytes yet — see the [Binary file content](../SKILL.md) section in `SKILL.md` for the canonical workflow.

Download binary content from a WorkIQ path. Use this for file content, email attachments, document downloads, and any other binary resource from Microsoft 365.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `blobUrl` | string | Yes | The path to the binary resource (e.g., `/me/drive/items/{id}/content`, `/me/messages/{id}/attachments/{attachmentId}/$value`). Must be a relative path — do not include a base URL. |

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
2. Use `fetch_blob` with the content path to download the binary data

## Examples

### Download a file from OneDrive by item ID
```json
{ "blobUrl": "/me/drive/items/{id}/content" }
```

### Download an email attachment
```json
{ "blobUrl": "/me/messages/{messageId}/attachments/{attachmentId}/$value" }
```

### Download a file from a shared drive
```json
{ "blobUrl": "/drives/{driveId}/items/{itemId}/content" }
```
