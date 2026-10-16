# Teams apps, tabs, files, and hosted content

Use with `references/teams-routing.md` (lookups, **Resolve then act**, write
outcomes). This file covers installed apps, tabs, channel files, message
attachments, and inline images.

## Paths

| Operation | Tool | Path and body |
| --- | --- | --- |
| List chat or channel tabs | `fetch` | `/chats/{chatId}/tabs?$expand=teamsApp`, `/teams/{teamId}/channels/{channelId}/tabs?$expand=teamsApp` |
| Add a website tab | `create_entity` | parentUrl `.../tabs` with `{"displayName":"{name}","teamsApp@odata.bind":"https://graph.microsoft.com/v1.0/appCatalogs/teamsApps/com.microsoft.teamspace.tab.web","configuration":{"contentUrl":"{url}","websiteUrl":"{url}"}}` (the Website app ID is fixed; do not look it up) |
| Rename a tab | `update_entity` | `.../tabs/{tabId}` with only `{"displayName":"{newName}"}` |
| Remove a tab | `delete_entity` | `.../tabs/{tabId}` |
| List installed apps | `fetch` | `/chats/{chatId}/installedApps`, `/teams/{teamId}/installedApps`, `/me/teamwork/installedApps`, or `/users/{id}/teamwork/installedApps`, each with `?$expand=teamsAppDefinition` |
| Channel files folder | `fetch` | `/teams/{teamId}/channels/{channelId}/filesFolder` |
| List a folder's files | `fetch` | `/drives/{driveId}/items/{folderId}/children?$select=id,name,file,webUrl` |
| Download a file | `fetch_blob` | `/drives/{driveId}/items/{itemId}/content` |
| Delete a channel file | `delete_entity` | `/drives/{driveId}/items/{itemId}` from the channel's `filesFolder` drive |
| Read a shared attachment | `fetch_blob` | `/shares/{sharingId}/driveItem/content` (or `fetch` `/shares/{sharingId}/driveItem` for its `webUrl` or IDs) |
| List message hosted content | `fetch` | `/chats/{chatId}/messages/{messageId}/hostedContents` |
| Download inline hosted content | `fetch_blob` | `/chats/{chatId}/messages/{messageId}/hostedContents/{hostedContentId}/$value` |

`...` is `/chats/{chatId}` or `/teams/{teamId}/channels/{channelId}`.

Installed-app results cannot distinguish a personally installed app from one
assigned by policy; do not claim which applies. Report app display names first,
and include IDs, versions, or definitions only for specifically requested apps.

## Channel files and attachments

A file shared in a post appears in the message's `attachments` array with
`contentType` `reference`, its `name`, and a SharePoint `contentUrl`. Channel
files live in the channel's `filesFolder` and are linked from message
attachments. Look in the folder first (fetch `filesFolder`, keep
`parentReference.driveId` and the folder `id`, list its children, and match
names exactly); if the file isn't there, check the channel messages'
attachments.

Do not use `/me/drive/root/search`, `/drives/{driveId}/root/search`, or
`/search/query` for channel files. Report each file's name and its own
`webUrl`, not only the folder link.

When the user asks what a file contains, read it rather than describing it only
as "an attachment":

1. Encode the attachment `contentUrl` as a sharing ID: `u!` +
   base64url(contentUrl) with `=` padding removed, `/` → `_`, `+` → `-`.
2. Call `fetch_blob` once on `/shares/{sharingId}/driveItem/content`. If the
   message has no `contentUrl`, find the file in the channel files folder and
   download it from there instead.
3. Summarize the relevant facts.

If the file cannot be found or the download fails, say so and still give the
file name and link; do not guess its contents. To share an attached file in
another channel, post its `contentUrl` (or the driveItem `webUrl`) as a link in
the new message body.

## Latest inline image from a named chat and sender

1. Resolve the exact chat.
2. Fetch `/chats/{chatId}/messages` once and read sender, timestamp, body,
   attachments, and hosted-content metadata.
3. Filter locally to the requested sender, select the latest matching message,
   and select its hosted-content ID.
4. Call `fetch_blob` once on its `hostedContents/{hostedContentId}/$value`.

Never fetch the hostedContents collection for every message, search unrelated
teams or chats, or call `ask` after the chat is resolved. Treat the blob
response's MIME metadata as authoritative when the hosted-content metadata is
null. In the answer, give the sender, timestamp, and message text, and briefly
describe what the image shows when its content is visible to you.
