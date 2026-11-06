# Mail attachments

## Required before use

- [Fetch mechanics](fetch-work-iq.md)
- [Binary handling](fetch-blob-work-iq.md)

## Attachments on a resolved message

A body mentioning an attachment is not attachment evidence. For the resolved
message, establish support for `fetch` `/me/messages/{id}/attachments`; inspect
actual returned ID, name, contentType and attachment kind, with supported paging.
Revalidate the original date/name/type constraints. Metadata/body contradiction
or missing collection coverage remains a limitation. Download only supported
file attachments when content is needed; do not apply their byte route to
reference/item attachments by analogy.

## First file attachment in Inbox

Use this inherited bounded recipe only when the user requests the first Inbox
file attachment in returned order, not the newest attachment or a complete
inventory. It is not new live validation. If additional filters, chronology or
another folder are requested, use a supported scoped acquisition contract
instead; do not silently discard those constraints.
Use only when the connected contract supports this exact query combination and
attachment byte route; otherwise disclose the limitation without probing variants.

1. Call `fetch` once with:

   ```json
   {
     "entityUrls": ["/me/mailFolders/inbox/messages?$filter=hasAttachments%20eq%20true&$top=10&$select=id,subject,receivedDateTime,hasAttachments&$expand=attachments($select=id,name,contentType,size,isInline)"]
   }
   ```

   Do not add `$orderby`, `$skip` or extra filters to this combination.
2. In returned order, choose the first message containing an actual
   `fileAttachment` and its first file attachment. Skip reference/item
   attachments; `hasAttachments:true` alone does not establish a file attachment.
   Missing kind or incomplete attachment data is unresolved, not proof of no
   file attachments. If the bounded page has no file attachment and the returned
   attachment data is sufficient to establish that, report not found in this
   bounded Inbox page; do not follow `@odata.nextLink`, enumerate the mailbox or
   retry alternate queries for this bounded request.
3. Copy the complete returned message and attachment IDs into
   `/me/messages/{messageId}/attachments/{attachmentId}/$value`.
   Compare both path segments character-for-character with their source fields
   before the single `fetch_blob` call. Keep trailing `=` and the literal
   `/$value` suffix; do not retype, shorten, reconstruct or retry encoding variants.
4. Deliver the complete returned `base64Content` when explicitly requested and
   permitted, or the actual verified materialized file path. Saying only
   "downloaded" does not deliver the requested content.

With sufficient successful responses, this is one `fetch` plus one `fetch_blob`,
not an `ask` or `retrieve` workflow. An error is not an empty page; apply central
read recovery and denial stops, without replaying successful download work.
