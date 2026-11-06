# Teams activity reads

## Required before use

- [teams-query-limits-work-iq](teams-query-limits-work-iq.md)

## Reading and summarizing

| Operation | Tool | Path |
| --- | --- | --- |
| Members of a named group chat | `fetch` | `/me/chats?$filter=topic%20eq%20%27{odataEscapedAndUrlEncodedExactTopic}%27&$expand=members&$top=50` (answer from the expanded `members`) |
| Channel details | `fetch` | `/teams/{teamId}/channels/{channelId}?$select=id,displayName,description,membershipType` |
| Channel-thread replies | `fetch` | `/teams/{teamId}/channels/{channelId}/messages/{messageId}/replies` |
| Pinned chat messages | `fetch` | `/chats/{chatId}/pinnedMessages?$expand=message` (an empty list or a 404 "pinnedItems was not found" means nothing is pinned) |

- **Named chat or channel:** resolve it and fetch its messages directly
  (`/chats/{chatId}/messages`, or channel messages plus `/replies` for threads
  with replies). Filter the requested date window locally. Do not use `retrieve`
  or `ask` for one named container. For open-ended questions across unknown
  sources, use `retrieve` with explicit Grounding; use `ask` only for explicit
  delegation.
- **Which chats are unread:** fetch `/me/chats?$expand=lastMessagePreview` once
  and use each chat's `viewpoint.lastMessageReadDateTime` to find candidates whose
  preview is newer than the read time. The preview alone is not proof of an unread
  message: it may be a system event, the user's own message, or an edited older
  message. For the candidates, batch
  `/chats/{chatId}/messages?$select=id,createdDateTime,messageType,from,body` in
  one `fetch` and count only `messageType` `message` items newer than the read
  time and not sent by the user. Report each unread chat with the sender and
  gist, and say which chats are caught up.
- **Who reacted:** reactions are on the message itself (there is no reactions
  endpoint). Report each `reactions[]` entry's `reactionType` and
  `user.user.id`/`displayName`; map IDs to names from the roster only when the
  display name is missing.
- **Messages that @mention the user:** fetch the messages without `$select` (so
  `mentions` is returned) and match `mentions[].mentioned.user.id` to the user's
  ID from `/me`; do not put `mentions` or `replyToId` in `$select`.

## Reading a channel thread

1. Resolve the team and channel once, then fetch the channel messages once and
   select the root locally by exact body text.
2. Fetch `/teams/{teamId}/channels/{channelId}/messages/{rootId}/replies`.
3. Fetch channel members only when a participant-vs-silent comparison is
   required, then stop.

Do not fall back to `retrieve` or `ask`, use `/chats/{channelId}/...` for channel
reads, or repeat collection or reply reads.

## Bounded reads

- For catch-up across containers, inspect at most the two highest-confidence
  chats or channels and fetch each selected collection once. Never enumerate
  every accessible chat or channel as a fallback; if two candidates are
  insufficient, return a clearly labelled partial result. An explicit
  completeness request overrides this budget.
- Fetch replies only for parent messages already selected as relevant, and stop
  once the requested facts are grounded.
- For activity sampling, start with `createdDateTime,subject,summary`; fetch
  `body` only for one selected item.
- Verify the sender from the collection before relying on semantic attribution.
  Add `from,subject` to `$select` when searching or summarizing so senders are
  visible, and do not use `delta` to find a message. To act on "my message",
  match `from.user.id` to the signed-in user's ID; get it by adding
  `/me?$select=id` to the first `fetch` batch, not a separate call.
- If retrieved or delegated results contain a malformed chat ID, extract the
  canonical `19:...@thread.v2` ID from the cited Teams URL and verify that exact
  chat once with `fetch` before using it.
