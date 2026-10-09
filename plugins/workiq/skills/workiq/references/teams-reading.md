# Teams reading and summarizing

Use with `references/teams-routing.md` (lookups, query limits, shared
discipline). This file covers listing and summarizing chats, channels,
messages, threads, unread state, pins, and reactions.

## Read paths

| Operation | Tool | Path |
| --- | --- | --- |
| List my chats | `fetch` | `/me/chats?$expand=members` (one call; answer from `topic`, `chatType`, and `members`) |
| List members of a named group chat | `fetch` | `/me/chats?$filter=topic%20eq%20%27{odataEscapedAndUrlEncodedExactTopic}%27&$expand=members&$top=50` (answer from the expanded `members`; never `ask`) |
| List messages in a chat | `fetch` | `/chats/{chatId}/messages` |
| List my teams | `fetch` | `/me/joinedTeams?$select=id,displayName` (`$select` only; never `$top`) |
| List a team's channels | `fetch` | `/teams/{teamId}/channels?$select=id,displayName` |
| Read channel details | `fetch` | `/teams/{teamId}/channels/{channelId}?$select=id,displayName,description,membershipType` |
| List channel messages | `fetch` | `/teams/{teamId}/channels/{channelId}/messages` |
| Read channel-thread replies | `fetch` | `/teams/{teamId}/channels/{channelId}/messages/{messageId}/replies` |
| Read pinned chat messages | `fetch` | `/chats/{chatId}/pinnedMessages?$expand=message` (an empty list or a 404 "pinnedItems was not found" means nothing is pinned) |
| Channel-message delta ("what's new since…") | `call_function` | `/teams/{teamId}/channels/{channelId}/messages/delta` |

## Reading and summarizing

- **Named chat or channel:** resolve it and fetch its messages directly
  (`/chats/{chatId}/messages`, or channel `messages` plus `/replies` for
  threads with replies). Filter the requested date window locally. Do not use
  `ask` for one named container; reserve it for open-ended questions across
  unknown sources.
- **Which chats are unread:** fetch `/me/chats?$expand=lastMessagePreview` once
  and compare each chat's `viewpoint.lastMessageReadDateTime` with the
  preview's `createdDateTime`. A preview whose `messageType` is
  `systemEventMessage` (members added, chat renamed) is not unread
  conversation: for those candidates, batch
  `/chats/{chatId}/messages?$select=id,createdDateTime,messageType,from,body`
  in one `fetch` and count only `messageType` `message` items newer than the
  read time and not sent by the user. Report each unread chat with the sender
  and gist, and say which chats are caught up.
- **Who reacted:** reactions are on the message itself (there is no reactions
  endpoint). Report each `reactions[]` entry's `reactionType` and
  `user.user.id`/`displayName`; map IDs to names from the roster only when the
  display name is missing.

## Bounded reads

- For catch-up or cross-container reads, inspect at most the two
  highest-confidence chats or channels and fetch each selected collection once.
  Never enumerate every accessible chat or channel as a fallback; if two
  candidates are insufficient, return a clearly labelled partial result.
- Fetch replies only for parent messages already selected as relevant, and stop
  once the requested facts are grounded.
- For activity sampling, start with `createdDateTime,subject,summary`; fetch
  `body` only for one selected item.
- Verify the sender from the collection before relying on semantic
  attribution.
- If `ask` results contain a malformed chat ID, extract the canonical
  `19:...@thread.v2` ID from the cited Teams URL and verify that exact chat once.
