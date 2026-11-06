# Teams membership and tag changes

## Required before use

- [teams-write-contract-work-iq](teams-write-contract-work-iq.md)

## Paths

Resolve the team/channel and the person's directory ID first. Read members with no
`$top` and no `email`/`userId` in `$select`; read tags with no query string. After
required confirmation:

| Operation | Tool | Path and body |
| --- | --- | --- |
| Add people to a team | `do_action` | `/teams/{teamId}/members/add`, `{"values":[member bodies]}` |
| Add a channel member or owner | `create_entity` | `/teams/{teamId}/channels/{channelId}/members`, member body |
| Add a person to a group chat | `create_entity` | `/chats/{chatId}/members`, member body with `"roles":["owner"]`; find the chat by topic first |
| Change a team or channel member's role | `update_entity` | `/teams/{teamId}/members/{membershipId}` or `/teams/{teamId}/channels/{channelId}/members/{membershipId}` with `{"@odata.type":"#microsoft.graph.aadUserConversationMember","roles":["owner"]}` (`[]` for a regular member) |
| Remove a team member | `delete_entity` | `/teams/{teamId}/members/{membershipId}` |
| Create a tag | `create_entity` | `/teams/{teamId}/tags`, `{"displayName":"{tagName}","members":[{"userId":"{directoryUserId}"}]}` |
| Add a person to a tag | `create_entity` | `/teams/{teamId}/tags/{tagId}/members`, `{"userId":"{directoryUserId}"}` |
| Remove a person from a tag | `delete_entity` | `/teams/{teamId}/tags/{tagId}/members/{tagMemberId}` |
| Delete a tag | `delete_entity` | `/teams/{teamId}/tags/{tagId}` |

Tag payloads use directory user IDs only; omit `displayName`, `roles` and
`user@odata.bind` from them.
