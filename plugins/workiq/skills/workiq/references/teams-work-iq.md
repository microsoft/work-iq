# Teams (chats, channel messages, reactions, presence)

Use the WorkIQ **entity tools** for Teams requests — sending/reading chat messages, posting in
channels, replying, reacting, and presence. Use `ask` only for synthesis questions
("what's the team's take on the release?"), not for sending or listing messages.

## ⚠️ Chats and channels are different surfaces

The most common Teams routing mistake is mixing these up:

| Surface | What it is | Path root |
|---------|------------|-----------|
| **Chat** | 1:1, group, or meeting chat — flat message list | `/me/chats`, `/chats/{chatId}/messages` |
| **Channel** | A channel inside a team — messages have threaded **replies** | `/teams/{teamId}/channels/{channelId}/messages` |

- A name like "Project X Daily" can be either a chat **or** a channel. Resolve it before acting:
  look in `/me/chats?$expand=members` (match `topic` or member names) for chats, and
  `/me/joinedTeams` → `/teams/{teamId}/channels` for channels.
- **Replies:** channel messages support
  `/teams/{teamId}/channels/{channelId}/messages/{messageId}/replies` (POST a reply there).
  **Chat messages have no replies endpoint** — chats are flat, so "replying" in a chat means
  posting a new message to the same chat.
- IDs are not interchangeable: a chat ID does not work in a `/teams/...` path or vice versa.

## Canonical paths

| Operation | Tool | Path |
|-----------|------|------|
| List my chats | `fetch` | `/me/chats?$expand=members` |
| List messages in a chat | `fetch` | `/chats/{chatId}/messages` |
| Send a chat message | `create_entity` | parentUrl `/chats/{chatId}/messages` |
| List my teams / a team's channels | `fetch` | `/me/joinedTeams`, `/teams/{teamId}/channels` |
| List channel messages | `fetch` | `/teams/{teamId}/channels/{channelId}/messages` |
| Post a channel message | `create_entity` | parentUrl `/teams/{teamId}/channels/{channelId}/messages` |
| Reply to a channel message | `create_entity` | parentUrl `/teams/{teamId}/channels/{channelId}/messages/{messageId}/replies` |
| Edit my message | `update_entity` | the message path with `{messageId}` |
| React to a message | `do_action` | `/chats/{chatId}/messages/{messageId}/setReaction` (or the channel-message equivalent) |
| List channel members | `fetch` | `/teams/{teamId}/channels/{channelId}/members` |
| Channel-message delta ("what's new since…") | `call_function` | `/teams/{teamId}/channels/{channelId}/messages/delta` |
| Read presence | `fetch` | `/me/presence`, `/users/{id}/presence` |
| Set my presence | `do_action` | `/me/presence/setUserPreferredPresence` |

For "show my Teams chats", call `fetch` exactly once on
`/me/chats?$expand=members` and answer from the returned `topic`, `chatType`,
and `members`. Do not follow or construct `$skip`, and do not add member
`$select` fields such as `email` or `userId`; those fields are not exposed on
`conversationMember`. A successful chat list is sufficient; do not make
enrichment or pagination retries.

For a named channel-member listing, use at most three `fetch` calls: resolve the
exact team, resolve the exact channel, then call exactly
`/teams/{teamId}/channels/{channelId}/members`. The deployed members endpoint
does not allow `$top`; do not add it. Do not request `email` or `userId` with
`$select` because those are not properties of `conversationMember`. Use the
returned `displayName` and identity data directly. Do not retry field or query
variants after a 400.

To mark a named 1:1 chat read, fetch `/me/chats?$expand=members&$top=50` once.
Select the chat containing the named counterpart and use the signed-in user's
member identity from that chat. Call
`/chats/{chatId}/markChatReadForUser` with:

```json
{"user":{"@odata.type":"#microsoft.graph.teamworkUserIdentity","id":"{signedInMemberId}","tenantId":"{signedInMemberTenantId}","userIdentityType":"aadUser"}}
```

This is a known deployed contract. Do not call `search_paths` or `get_schema`,
do not send an empty body, and do not omit `tenantId`. If the action returns
HTTP 500 or another ambiguous result, do not replay it. Re-fetch the chat state
when it is observable; otherwise report the outcome as indeterminate.

To mark a named 1:1 chat unread, use the same bounded chat fetch and signed-in
member identity, then fetch
`/chats/{chatId}/messages?$select=createdDateTime&$top=1` for the read cutoff.
Call `/chats/{chatId}/markChatUnreadForUser` with:

```json
{"user":{"@odata.type":"#microsoft.graph.teamworkUserIdentity","id":"{signedInMemberId}","tenantId":"{signedInMemberTenantId}","userIdentityType":"aadUser"},"lastMessageReadDateTime":"{returnedCreatedDateTime}"}
```

Do not call `search_paths` or `get_schema`, send an empty body, omit
`tenantId`, or probe unsupported member fields. If the action returns HTTP 500
or another ambiguous result, do not replay it. Re-fetch the chat state when it
is observable; otherwise report the outcome as indeterminate.

Message body shape (chat and channel): `{"body": {"contentType": "text", "content": "..."}}`.
Confirm non-obvious payloads (reactions, presence) with `get_schema` before POSTing.

## Sending a message to a person — reuse the existing chat

To "send a chat to Alex" or message yourself:

1. `fetch` on `/me/chats?$expand=members` and find the existing 1:1 chat whose members
   match the target person.
2. POST the message to that chat with `create_entity` on `/chats/{chatId}/messages`.
3. **Only create a new chat** (POST `/chats` with `chatType` and `members`) if no existing chat
   with that person is found. Never create a new group chat to deliver a single 1:1 message.

## Presence

- "Set my presence to Busy/Away/DoNotDisturb" → `do_action` on
  `/me/presence/setUserPreferredPresence` with
  `{"availability": "Busy", "activity": "Busy", "expirationDuration": "PT1H"}`.
  This is the user-preferred presence and the right route for user requests.
- `/me/presence/setPresence` is the **application session** variant and requires a `sessionId` —
  only use it if you have one. If a presence write has an ambiguous result, do
  not replay it; fetch the current presence when possible and otherwise report
  the outcome as indeterminate. Do not cycle through alternate presence
  endpoints.

## Resolve-then-act (do not loop)

1. Resolve the chat or team/channel with **one or two** `fetch` calls
   (`/me/chats?$expand=members`, `/me/joinedTeams` → channels).
2. If you can't find it, try **one** `ask`, then **stop and report "not found"**.
3. When paging a message list, fetch a page or two — do **not** follow `@odata.nextLink` for
   dozens of pages. Answer from the latest page(s) and say the list is partial if it is.
4. Perform the requested mutation directly once you have the IDs — posting, replying, reacting,
   or editing is the goal, not enumerating the whole message history first.
