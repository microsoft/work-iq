# Teams send/edit/reply/reactions

## Required before use

- [teams-targets-work-iq](teams-targets-work-iq.md)
- [mutation-work-iq](mutation-work-iq.md)

## Send, reply, edit and react

After exact resolution, preparation and required confirmation:

| Effect | Tool and exact path |
| --- | --- |
| Send chat message | `create_entity` `/chats/{chatId}/messages` |
| Post channel message | `create_entity` `/teams/{teamId}/channels/{channelId}/messages` |
| Reply in a channel thread | `create_entity` `/teams/{teamId}/channels/{channelId}/messages/{messageId}/replies` |
| Edit a chat message | `update_entity` `/chats/{chatId}/messages/{messageId}` |
| Edit a channel message | `update_entity` `/teams/{teamId}/channels/{channelId}/messages/{messageId}` |
| React | `do_action` on the exact chat/channel message path plus `/setReaction` |

Known send/reply/edit body: `{"body":{"contentType":"text","content":"..."}}`.
For edits confirm ownership and supported fields. Known reaction body:
`{"reactionType":"👍"}`; the deployed action expects literal Unicode, not `like`.
Do not run path/schema preflights for these known shapes. A forbidden edit or
reaction is not proof that more consent will fix it; stop on explicit denial.
