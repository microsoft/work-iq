# Teams apps, tabs, files and hosted content

## Required before use

- [teams-query-limits-work-iq](teams-query-limits-work-iq.md)

## Paths

Before any `fetch_blob` call below, read [binary download](fetch-blob-work-iq.md).

| Operation | Tool | Path |
| --- | --- | --- |
| List chat or channel tabs | `fetch` | `/chats/{chatId}/tabs?$expand=teamsApp`, `/teams/{teamId}/channels/{channelId}/tabs?$expand=teamsApp` |
| List installed apps | `fetch` | `/chats/{chatId}/installedApps`, `/teams/{teamId}/installedApps`, `/me/teamwork/installedApps` or `/users/{id}/teamwork/installedApps`, each with `?$expand=teamsAppDefinition` |
| Channel files folder | `fetch` | `/teams/{teamId}/channels/{channelId}/filesFolder` |
| List a folder's files | `fetch` | `/drives/{driveId}/items/{folderId}/children?$select=id,name,file,webUrl` |
| Download a file | `fetch_blob` | `/drives/{driveId}/items/{itemId}/content` |
| Read a shared attachment | `fetch_blob` | `/shares/{sharingId}/driveItem/content` (or `fetch` `/shares/{sharingId}/driveItem` for its `webUrl` or IDs) |
| List message hosted content | `fetch` | `/chats/{chatId}/messages/{messageId}/hostedContents` |
| Download inline hosted content | `fetch_blob` | `/chats/{chatId}/messages/{messageId}/hostedContents/{hostedContentId}/$value` |

Installed-app results cannot distinguish a personally installed app from one
assigned by policy; do not claim which applies. Report app display names first,
and include IDs, versions or definitions only for specifically requested apps.

## Channel files and attachments

To show a channel's files folder, fetch its `filesFolder`, then list that folder's
children; report the items, or say it is empty, along with the folder link.

A file shared in a post appears in the message's `attachments` array with
`contentType` `reference`, its `name` and a SharePoint `contentUrl`. Look in the
channel's `filesFolder` first: keep `parentReference.driveId` and the folder `id`,
list its children and match names exactly. If the file is not there, check the
channel messages' attachments. Do not use `/me/drive/root/search`,
other drive-root searches, or `/search/query` for channel files. Report each
file's name and its own `webUrl`, not only the folder link.

When the user asks what a file contains, read it rather than describing it only as
"an attachment":

1. Encode the attachment `contentUrl` as a sharing ID: `u!` +
   base64url(contentUrl) with `=` padding removed, `/` to `_`, `+` to `-`.
2. Call `fetch_blob` once on `/shares/{sharingId}/driveItem/content`. If the
   message has no `contentUrl`, download the file from the channel files folder.
3. Summarize the relevant facts.

If the file cannot be found or the download fails, say so and still give the file
name and link; do not guess its contents.

## Latest inline image from a named chat and sender

1. Resolve the exact chat.
2. Fetch `/chats/{chatId}/messages` once and read sender, timestamp, body,
   attachments and hosted-content metadata.
3. Filter locally to the requested sender's messages that have hosted content,
   then select the latest of those and its hosted-content ID. A newer text-only
   message from that sender does not replace an older message with an image.
4. Call `fetch_blob` once on its `hostedContents/{hostedContentId}/$value`.

Never fetch the hostedContents collection for every message, search unrelated
teams or chats, or call `retrieve` or `ask` after the chat is resolved. Treat the
blob response's MIME metadata as authoritative when the hosted-content metadata is
null. Give the sender, timestamp and message text, and briefly describe the image
when its content is visible to you.
