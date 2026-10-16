# Teams send/edit/reply/reactions

## Required before use

- [teams-targets-work-iq](teams-targets-work-iq.md)
- [mutation-work-iq](mutation-work-iq.md)

## Sending a message to a person — reuse the existing chat

To "send a chat to Alex" or message yourself:

1. Find the chat **by person**. Graph returns the existing chat when one
   already exists and creates it only when needed.
2. POST the message to that chat with `create_entity` on `/chats/{chatId}/messages`.
3. Never create a group chat to deliver a single 1:1 message.

Message body shape (chat and channel):
`{"body": {"contentType": "text", "content": "..."}}`.


## Reacting to a message

1. Find the target: **Finding a channel** for a channel message, or
   **Finding a chat** for a chat message.
2. Follow **Finding a message** to get the exact message `id`.
3. Call `do_action` on the matching path, using the reaction body in
   **React to a Teams chat message** below:
   - Channel: `/teams/{teamId}/channels/{channelId}/messages/{messageId}/setReaction`
   - Chat: `/chats/{chatId}/messages/{messageId}/setReaction`

The known deployed body uses a literal reaction, e.g. `{"reactionType":"👍"}`,
not `like`. Confirm the reaction and exact message before executing once.


## Edit a message

### Edit a chat message

Use **Finding a chat**, then **Finding a message**, and call `update_entity`
on `/chats/{chatId}/messages/{messageId}`.

### Edit a channel message

Use **Finding a channel**, then **Finding a message**, and call `update_entity`
on `/teams/{teamId}/channels/{channelId}/messages/{messageId}`.

For both surfaces, use
`{"body":{"contentType":"text","content":"..."}}` as the update body. Do not
call `search_paths` or `get_schema` for these known edit paths.

### React to a Teams chat message

Resolve the exact chat or channel message as described in
`references/teams-work-iq.md`, then call:

```json
{
  "actionUrl": "/chats/{chatId}/messages/{messageId}/setReaction",
  "jsonBody": "{\"reactionType\":\"👍\"}"
}
```

For channel messages use the `/teams/{teamId}/channels/{channelId}/messages/{messageId}/setReaction` path. See `references/teams-work-iq.md` for chat-vs-channel resolution.
The deployed WorkIQ action expects the literal Unicode reaction value. For a
thumbs-up reaction, use `👍`; not `like`.
