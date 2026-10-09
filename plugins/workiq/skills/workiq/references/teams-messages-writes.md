# Teams messages and writes

Use with `references/teams-routing.md` (lookups, IDs, write outcomes). This
file covers creating and renaming chats, sending, replies, mentions, reactions,
reply-with-quote, edits, pins, removal, hiding chats, and read state.

## Write paths

| Operation | Tool | Path and body |
| --- | --- | --- |
| Create a group chat | `create_entity` | parentUrl `/chats` (see **Creating a group chat**) |
| Rename a chat | `update_entity` | `/chats/{chatId}` with only `{"topic":"{newTopic}"}`; find the chat **by topic** first |
| Send a chat message | `create_entity` | parentUrl `/chats/{chatId}/messages`, **message body** |
| Send a message to yourself | `create_entity` | parentUrl `/chats/48:notes/messages`, **message body** (do not list chats, look up users, or create a chat first) |
| Post a channel message | `create_entity` | parentUrl `/teams/{teamId}/channels/{channelId}/messages`, **message body** |
| Reply to a channel message | `create_entity` | parentUrl `/teams/{teamId}/channels/{channelId}/messages/{messageId}/replies`, **message body** |
| Reply to a chat message with a quote | `do_action` | `/chats/{chatId}/messages/replyWithQuote` (see below) |
| Edit a chat or channel message | `update_entity` | `/chats/{chatId}/messages/{messageId}` or `/teams/{teamId}/channels/{channelId}/messages/{messageId}`, **message body** with only `body` |
| React to a message | `do_action` | `.../messages/{messageId}/setReaction` with `{"reactionType":"👍"}` |
| Remove my reaction | `do_action` | `.../messages/{messageId}/unsetReaction` with `{"reactionType":"{reactionToRemove}"}` |
| Pin a chat message | `create_entity` | parentUrl `/chats/{chatId}/pinnedMessages` with `{"message@odata.bind":"https://graph.microsoft.com/v1.0/chats/{chatId}/messages/{messageId}"}` |
| Unpin a chat message | `delete_entity` | `/chats/{chatId}/pinnedMessages/{pinnedMessageId}` |
| Remove a chat message | `do_action` | `/users/{senderUserId}/chats/{chatId}/messages/{messageId}/softDelete` with `{}` |
| Remove a channel message or reply | `do_action` | `/teams/{teamId}/channels/{channelId}/messages/{messageId}/softDelete` with `{}` (for a reply, insert `/replies/{replyId}` before `/softDelete`) |
| Hide a chat from my list | `do_action` | `/chats/{chatId}/hideForUser`, **user identity body** |
| Mark a chat read or unread | `do_action` | `/chats/{chatId}/markChatReadForUser`, `/chats/{chatId}/markChatUnreadForUser`, **user identity body** (see below) |

`...` is `/chats/{chatId}` for a chat message or
`/teams/{teamId}/channels/{channelId}` for a channel message. Reactions use the
literal Unicode emoji, never a name like `"like"`.

Never use `delete_entity` for chat or channel messages; discovery metadata may
advertise DELETE paths that the deployed runtime rejects. "Delete", "remove",
or "hide" a chat from my list means `hideForUser`, which does not delete the
chat for others.

## Message body

```json
{"body":{"contentType":"text","content":"{message}"}}
```

- **Mentions:** use `"contentType":"html"`, put `<at id=\"0\">{mentionText}</at>`
  in `content`, and add
  `"mentions":[{"id":0,"mentionText":"{mentionText}","mentioned":{"user":{"id":"{directoryUserId}","displayName":"{mentionText}","userIdentityType":"aadUser"}}}]`.
  The `<at id>`, `mentions[].id`, `mentionText`, and `mentioned.user.id` must
  all identify the same person.
- **Important channel announcement** ("urgent", "important", "broadcast with
  importance"): add `"subject":"{subject}"` and `"importance":"high"`.
- Never add `@odata.type` to the message or its `body`; Graph rejects
  `#microsoft.graph.itemBody` with HTTP 400. Edits send only `body`, even if a
  generated schema marks other fields required.

## User identity body

`hideForUser`, `markChatReadForUser`, and `markChatUnreadForUser` take your
member identity from **Finding a chat**:

```json
{"user":{"@odata.type":"#microsoft.graph.teamworkUserIdentity","id":"{signedInUserId}","tenantId":"{signedInMemberTenantId}","userIdentityType":"aadUser"}}
```

Never omit `tenantId`. For a topic lookup, reuse the expanded members; do not
issue a separate `/me` or `/chats/{chatId}/members` fetch.

## Sending to a person

Find the chat **by person** (it returns the existing 1:1 chat or creates it),
then post to `/chats/{chatId}/messages`. Never create a group chat to deliver a
single 1:1 message.

## Creating a group chat

1. In one `fetch`, request `/me?$select=id` and each named person, resolved as
   in **Finding a chat — by person** step 1 in `references/teams-routing.md`.
2. Call `create_entity` with `parentUrl="/chats"` and
   `{"chatType":"group","topic":"{topic}","members":[...]}`, with a **member
   body** (`"roles":["owner"]`) for the signed-in user and for each person.
3. Report from the returned chat; do not make a verification fetch.

## Reading a channel thread

1. Resolve the team and channel once, then fetch the channel messages once and
   select the root locally by exact body text.
2. Fetch `/teams/{teamId}/channels/{channelId}/messages/{rootId}/replies`.
3. Fetch channel members only when a participant-vs-silent comparison is
   required, then stop.

Do not fall back to `ask`, use `/chats/{channelId}/...` for channel reads, or
repeat collection or reply reads.

## Replying to a chat message with a quote

Use `replyWithQuote` when the user asks to quote, cite, or reply to a specific
chat message so the source appears in the reply. It applies to chats only;
channel threads use `/replies`.

1. Resolve the exact chat.
2. Fetch `/chats/{chatId}/messages?$select=id,createdDateTime,from,body` once
   and select the source locally. When the user identifies it by sender and
   recency ("their last message about X"), take that sender's latest message by
   `createdDateTime` and confirm its body matches the topic. If it does not,
   report that rather than quoting an older or different message.
3. Call `do_action` once with:

   ```json
   {"messageIds":["{messageId}"],"replyMessage":{"body":{"contentType":"text","content":"{reply}"}}}
   ```

Include only the selected IDs in `messageIds` (at most 10). Do not wrap the
body in `replyWithQuoteMessagePayload` or change property casing; each returns
HTTP 400. Do not post a plain message as a fallback.

## Marking a named 1:1 chat read or unread

1. Resolve the signed-in user and exact counterpart as in **Finding a chat — by
   person**.
2. `create_entity` on `/chats` to create or return the one-on-one chat.
3. Fetch `/chats/{chatId}/members` and resolve your member identity.
4. Mark read: `do_action` `/chats/{chatId}/markChatReadForUser` with the user
   identity body.

For mark-unread, after step 3 fetch
`/chats/{chatId}/messages?$select=createdDateTime` and call
`/chats/{chatId}/markChatUnreadForUser` with the user identity body plus
`"lastMessageReadDateTime":"{returnedCreatedDateTime}"` beside `user`, using
the first returned message's timestamp. The chat's `lastUpdatedDateTime` is
not a message timestamp and is not a valid substitute.
