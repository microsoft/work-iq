# Teams message and chat management

## Required before use

- [teams-write-contract-work-iq](teams-write-contract-work-iq.md)

## Paths

After exact resolution, preparation and required confirmation:

| Operation | Tool | Path and body |
| --- | --- | --- |
| Reply to a chat message with a quote | `do_action` | `/chats/{chatId}/messages/replyWithQuote` (see below) |
| Pin a chat message | `create_entity` | `/chats/{chatId}/pinnedMessages` with `{"message@odata.bind":"https://graph.microsoft.com/v1.0/chats/{chatId}/messages/{messageId}"}` |
| Unpin a chat message | `delete_entity` | `/chats/{chatId}/pinnedMessages/{pinnedMessageId}` |
| Remove a chat message | `do_action` | `/users/{senderUserId}/chats/{chatId}/messages/{messageId}/softDelete` with `{}` |
| Remove a channel message or reply | `do_action` | `/teams/{teamId}/channels/{channelId}/messages/{messageId}/softDelete` with `{}` (for a reply, insert `/replies/{replyId}` before `/softDelete`) |
| Create a group chat | `create_entity` | `/chats` (see below) |
| Rename a chat | `update_entity` | `/chats/{chatId}` with only `{"topic":"{newTopic}"}`; find the chat by topic first |

Never use `delete_entity` for chat or channel messages; discovery metadata may
advertise DELETE paths that the deployed runtime rejects. To remove "my message",
confirm the sender by matching `from.user.id` to the signed-in user's ID. After a
capability or access denial, do not retry encoded ID variants or alternate
delete paths.

## Replying to a chat message with a quote

Use `replyWithQuote` when the user asks to quote, cite or reply to a specific chat
message so the source appears in the reply. It applies to chats only; channel
threads use `/replies`.

1. Resolve the exact chat.
2. Fetch `/chats/{chatId}/messages?$select=id,createdDateTime,from,body` once and
   select the source locally. When the user identifies it by sender and topic
   ("their last message about X"), filter to that sender's messages whose body
   matches the topic, then take the latest by `createdDateTime`. When the user
   asks only for the sender's latest message, take their latest message by
   `createdDateTime`. If no message matches, report that rather than quoting a
   different message.
3. Call `do_action` once with:

   ```json
   {"messageIds":["{messageId}"],"replyMessage":{"body":{"contentType":"text","content":"{reply}"}}}
   ```

Include only the selected IDs in `messageIds` (at most 10). Do not wrap the body
in `replyWithQuoteMessagePayload` or change property casing; each returns HTTP
400. Do not post a plain message as a fallback.

## Creating a group chat

1. In one `fetch`, request `/me?$select=id` and each named person, resolved as in
   the [exact directory-person contract](people-work-iq.md#exact-directory-person-lookup).
2. Call `create_entity` on `/chats` with
   `{"chatType":"group","topic":"{topic}","members":[...]}`, with a member body
   (`"roles":["owner"]`) for the signed-in user and for each person.
3. Report from the returned chat; do not make a verification fetch.
