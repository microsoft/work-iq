# upload_blob

**Not released for Graph binary content.** Do not call `upload_blob`, invent an
upload alias, or treat a future parameter example as an available tool. WorkIQ
cannot accept raw OneDrive/SharePoint byte payloads through this surface.

The canonical [Files](files-work-iq.md) reference owns upload-session creation,
drive/item resolution, and byte-transfer limitations. A created session is not an
uploaded or replaced file. Report the operation actually completed and any remaining
limitation; do not claim content replacement from session metadata.

Treat an upload-session URL as a temporary preauthenticated credential: never
quote, cite, log, or expose it in the answer. For an unavailable byte-upload
request, explain the limitation and offer the known destination's ordinary
OneDrive/SharePoint `webUrl` for user-driven upload when available, not the session
URL. Do not create a session merely to hide that bytes cannot be transferred.

Apply [confirmation and recovery](troubleshooting.md) to session mutations:
required exact confirmation, no ambiguous replay, and no alternate route after
denial. Downloads have a separate [fetch_blob](fetch-blob-work-iq.md) contract.

Public exception: schema-discovered [Business Applications](business-applications.md)
record-file upload/download operations are distinct from Graph blob tools. Their
availability does not enable OneDrive or SharePoint byte uploads.
