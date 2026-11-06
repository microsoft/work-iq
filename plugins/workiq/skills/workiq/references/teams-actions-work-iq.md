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
| Quote or reply to a specific chat message | `do_action` `/chats/{chatId}/messages/replyWithQuote`; follow [message actions](teams-message-actions-work-iq.md), never `create_entity` |
| Edit a chat message | `update_entity` `/chats/{chatId}/messages/{messageId}` |
| Edit a channel message | `update_entity` `/teams/{teamId}/channels/{channelId}/messages/{messageId}` |
| React | `do_action` on the exact chat/channel message path plus `/setReaction` |
| Remove my reaction | `do_action` exact message path plus `/unsetReaction`, `{"reactionType":"{reactionToRemove}"}` |
| Send a message to yourself | `create_entity` `/chats/48:notes/messages` (no lookup or chat creation) |

Known send/reply/edit body: `{"body":{"contentType":"text","content":"..."}}`.
Never add `@odata.type` to the message or its `body` (HTTP 400); edits send only
`body`. For a mention, use `"contentType":"html"`, put `<at id=\"0\">{mentionText}</at>`
in `content` and add `"mentions":[{"id":0,"mentionText":"{mentionText}","mentioned":{"user":{"id":"{directoryUserId}","displayName":"{mentionText}","userIdentityType":"aadUser"}}}]`;
all four must identify the same person. For an important channel announcement,
add `"subject":"{subject}"` and `"importance":"high"`.
For edits, confirm ownership (`from` in the message read) and supported fields.
Known reaction body:
`{"reactionType":"{confirmedEmojiUnicode}"}`; substitute the requested literal
Unicode reaction (for example, `👍`), not a label such as `like`.
A forbidden edit, reaction or removal is not proof that more consent will fix it; stop on
explicit denial.

## Deletion scope and support

Message deletion, whole-chat deletion and hiding a chat from one user's list
are different effects. Resolve the requested scope; list-only removal uses
[hideForUser](teams-state-work-iq.md), not deletion for other participants.
Message removal uses the known `softDelete` paths in
[message actions](teams-message-actions-work-iq.md), never `delete_entity`.
For other deletions, do not infer support or a path from a read/edit route.
Establish an unfamiliar deletion's exact operation in the live catalog and
applicable schema, verify ownership and permissions, and obtain required
confirmation before acting.
Never substitute one removal effect for another, or retry a forbidden one.
