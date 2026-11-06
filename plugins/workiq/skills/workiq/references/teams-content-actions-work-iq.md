# Teams tab and channel file changes

## Required before use

- [teams-write-contract-work-iq](teams-write-contract-work-iq.md)

## Paths

`...` is `/chats/{chatId}` or `/teams/{teamId}/channels/{channelId}`. Resolve the
tab or file from its collection first (tabs with `?$expand=teamsApp`, files from
the channel's `filesFolder`), then after required confirmation:

| Operation | Tool | Path and body |
| --- | --- | --- |
| Add a website tab | `create_entity` | `.../tabs` with `{"displayName":"{name}","teamsApp@odata.bind":"https://graph.microsoft.com/v1.0/appCatalogs/teamsApps/com.microsoft.teamspace.tab.web","configuration":{"contentUrl":"{url}","websiteUrl":"{url}"}}` (the Website app ID is fixed; do not look it up) |
| Rename a tab | `update_entity` | `.../tabs/{tabId}` with only `{"displayName":"{newName}"}` |
| Remove a tab | `delete_entity` | `.../tabs/{tabId}` |
| Delete a channel file | `delete_entity` | `/drives/{driveId}/items/{itemId}` from the channel's `filesFolder` drive |

To share an attached file in another channel, post its `contentUrl` (or the
driveItem `webUrl`) as a link in the new message body through the
[Teams actions route](teams-actions-work-iq.md).
