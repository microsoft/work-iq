# upload_blob

> ⚠️ **Not released yet.** `upload_blob` is documented here for future reference but is **not part of the current WorkIQ MCP surface**. Calling it today returns `tool does not exist`. When a user asks to upload a local file, tell them WorkIQ can't accept raw byte payloads yet and ask them to upload through the OneDrive / SharePoint web UI — see the [Binary file content](../SKILL.md) section in `SKILL.md`.

Upload a local file to a WorkIQ path via HTTP PUT. Use this to upload files to OneDrive or SharePoint.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `targetUrl` | string | Yes | The target path for the upload (e.g., `/me/drive/root:/{filename}:/content`). Must be a relative path — do not include a base URL. |
| `filePath` | string | Yes | The absolute local file path to upload. |

## When to Use

- Uploading a file to OneDrive
- Uploading a file to a SharePoint document library
- Replacing the content of an existing file

## Path Conventions

| Action | Path pattern |
|--------|-------------|
| Upload to OneDrive root by filename | `/me/drive/root:/{filename}:/content` |
| Upload to a specific folder | `/me/drive/root:/{folder}/{filename}:/content` |
| Replace a file by item ID | `/me/drive/items/{id}/content` |
| Upload to SharePoint | `/drives/{driveId}/root:/{filename}:/content` |

## Gotchas

- **File size limit**: Simple PUT uploads via this tool work for files up to 4MB. For larger files, initiate an upload session via `do_action` with `actionUrl: "/me/drive/root:/{path}:/createUploadSession"` and PUT chunks to the returned `uploadUrl`. See the `createUploadSession` example in `do-action-work-iq.md`.
- The URL uses the Graph path-based format `root:/{path}:/content` — include the leading `/` before the filename.

## Examples

### Upload a file to OneDrive root
```json
{
  "targetUrl": "/me/drive/root:/report.pdf:/content",
  "filePath": "C:\\Users\\user\\Documents\\report.pdf"
}
```

### Upload a file to a subfolder in OneDrive
```json
{
  "targetUrl": "/me/drive/root:/Projects/Alpha/spec.docx:/content",
  "filePath": "C:\\Users\\user\\Documents\\spec.docx"
}
```

### Replace an existing file by ID
```json
{
  "targetUrl": "/me/drive/items/{id}/content",
  "filePath": "C:\\Users\\user\\Documents\\updated-report.pdf"
}
```
