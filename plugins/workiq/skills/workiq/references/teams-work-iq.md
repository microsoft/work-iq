# Teams (chats, channel messages, reactions, presence)

Use the WorkIQ **entity tools** for Teams requests — sending/reading chat messages, posting in
channels, replying, reacting, and presence. For reading or summarizing a
specific chat, first read [Teams chat BotDoc grounding](teams-grounding-work-iq.md);
it overrides Graph chat-message listing and generic `ask` synthesis.
Use `ask` for broader synthesis ("what's the team's take on the release?"),
not for sending or listing messages.

Known Teams mutations — message edits, `hideForUser`, mark read or unread,
and reactions — must use the documented workflows below directly. Do not call
`search_paths` or `get_schema` for them.

## ⚠️ Chats and channels are different surfaces

The most common Teams routing mistake is mixing these up:

| Surface | What it is | Path root |
| --- | --- | --- |
| **Chat** | 1:1, group, or meeting chat — flat message list | `/me/chats`; content via `/m365-grounding/fetch`; exact message entities via `/chats/{chatId}/messages` |
| **Channel** | A channel inside a team — messages have threaded **replies** | `/teams/{teamId}/channels/{channelId}/messages` |

- A name like "Project X Daily" can be either a chat **or** a channel. Resolve it before acting
  with **Finding a chat** or **Finding a channel** below.
- **Replies:** channel messages support
  `/teams/{teamId}/channels/{channelId}/messages/{messageId}/replies` (POST a reply there).
  **Chat messages have no replies endpoint** — chats are flat, so "replying" in a chat means
  posting a new message to the same chat.
- IDs are not interchangeable: a chat ID does not work in a `/teams/...` path or vice versa.

## Canonical paths

| Operation | Tool | Path |
| --- | --- | --- |
| List my chats | `fetch` | `/me/chats?$expand=members` |
| Resolve an existing chat for a content read | `fetch` | Read-only lookup in [Teams chat BotDoc grounding](teams-grounding-work-iq.md) |
| Read or summarize chat conversation content | `fetch` | `/m365-grounding/fetch?threadId={encodedChatId}` with query-derived dates |
| Find, create, or reuse a 1:1 chat for a mutation | `create_entity` | parentUrl `/chats` |
| Read exact chat message entities for IDs/properties or mutations | `fetch` | `/chats/{chatId}/messages` (don't use $top parameter) |
| Send a chat message | `create_entity` | parentUrl `/chats/{chatId}/messages` |
| List my teams / a team's channels | `fetch` | `/me/joinedTeams`, `/teams/{teamId}/channels` |
| List channel messages | `fetch` | `/teams/{teamId}/channels/{channelId}/messages` |
| Post a channel message | `create_entity` | parentUrl `/teams/{teamId}/channels/{channelId}/messages` |
| Reply to a channel message | `create_entity` | parentUrl `/teams/{teamId}/channels/{channelId}/messages/{messageId}/replies` |
| Edit a chat message | `update_entity` | `/chats/{chatId}/messages/{messageId}` |
| Edit a channel message | `update_entity` | `/teams/{teamId}/channels/{channelId}/messages/{messageId}` |
| React to a message | `do_action` | `/chats/{chatId}/messages/{messageId}/setReaction` (or the channel-message equivalent) |
| Remove a chat from my list | `do_action` | `/chats/{chatId}/hideForUser` |
| Mark a chat read or unread | `do_action` | `/chats/{chatId}/markChatReadForUser`, `/chats/{chatId}/markChatUnreadForUser` |
| List channel members | `fetch` | `/teams/{teamId}/channels/{channelId}/members` |
| Channel-message delta ("what's new since…") | `call_function` | `/teams/{teamId}/channels/{channelId}/messages/delta` |
| Read presence | `fetch` | `/me/presence`, `/users/{id}/presence` |
| Set my presence | `do_action` | `/me/presence/setUserPreferredPresence` |

## Finding Teams targets

The exact entity reads and mutations below use these lookups. For chat content
reads/summaries, use the read-only resolution in
[Teams chat BotDoc grounding](teams-grounding-work-iq.md) instead; never create
a chat to retrieve its history.

- Match names and message text exactly. Never act on a partial, similar, or
  semantic match.
- Do not use `ask` to find a chat, channel, or message that will be changed.
  If the exact target is not found, report it as not found.
- Omit `$top` on `/me/joinedTeams`, `/chats/{chatId}/messages`, and
  `/teams/{teamId}/channels/{channelId}/messages`.

### Finding a channel

1. Fetch exactly `/me/joinedTeams?$select=id,displayName` and select the exact
   team name. Do not add `$top`; the deployed endpoint rejects it.
2. Fetch `/teams/{teamId}/channels?$select=id,displayName` and select the exact
   channel name. Do not choose the first similar channel name.

### Finding a chat

For a mutation, pick the lookup that matches how the user named the chat.
These create/reuse workflows do not apply to BotDoc content reads.

**By person (1:1 chat).** Microsoft Graph permits only one one-on-one chat for
a pair of users. If it already exists, this call returns that existing chat
instead of creating a duplicate. Require a non-empty returned chat ID and
`chatType == "oneOnOne"`. Do not enumerate `/me/chats` for a named person.

1. Resolve the signed-in user and a verified directory-user counterpart:
   - When the user supplied an email address or UPN, fetch `/me?$select=id` and
     `/users/{urlEncodedUserPrincipalName}?$select=id,displayName,mail,userPrincipalName`.
   - Otherwise, fetch `/me?$select=id` and
     `/users?$filter=displayName%20eq%20%27{odataEscapedAndUrlEncodedExactDisplayName}%27&$select=id,displayName,mail,userPrincipalName&$top=10`.
2. Require exactly one returned directory user whose `displayName` exactly
   matches the requested person. If no user or multiple users match, ask for
   an email address or UPN instead of guessing. Do not use `/me/people`;
   People results can be fuzzy or represent contacts rather than directory
   users.
3. Call `create_entity` with `parentUrl="/chats"` and exactly these two members,
   using only the returned directory-user `id` for `{counterpartUserId}`:

```json
{
  "chatType": "oneOnOne",
  "members": [
    {
      "@odata.type": "#microsoft.graph.aadUserConversationMember",
      "roles": ["owner"],
      "user@odata.bind": "https://graph.microsoft.com/v1.0/users('{signedInUserId}')"
    },
    {
      "@odata.type": "#microsoft.graph.aadUserConversationMember",
      "roles": ["owner"],
      "user@odata.bind": "https://graph.microsoft.com/v1.0/users('{counterpartUserId}')"
    }
  ]
}
```

**By topic (group chat).** In the initial `fetch` call, request
`/me?$select=id` and
`/me/chats?$filter=topic%20eq%20%27{odataEscapedAndUrlEncodedExactTopic}%27&$expand=members&$top=50`,
and require an exact `topic` match. If the response includes
`@odata.nextLink`, follow the global pagination and partial-result guidance in
`references/fetch-work-iq.md`.

**Your member identity in the chat.** `hideForUser`, `markChatReadForUser`,
and `markChatUnreadForUser` need the signed-in member whose `userId` equals
`{signedInUserId}`. If the chat lookup already returned members (as the topic
lookup does), use them. Do not fetch `/chats/{chatId}/members` again.
Otherwise, fetch exactly `/chats/{chatId}/members`. The URL must end at
`/members`; do not append any query string, including `$select`, `$expand`, or
`$top`. `userId` and
`tenantId` are returned by the unfiltered response but are not selectable
`conversationMember` properties. Put that member's `userId` in
`teamworkUserIdentity.id` and use the same member's returned `tenantId`. Never
use the conversation member's opaque `id` value (often beginning with `MCMj`);
Graph can interpret it as another user and return HTTP 403.

### Finding a message

First find the channel or chat, then fetch its messages and match the complete
message text exactly:

- Channel: `/teams/{teamId}/channels/{channelId}/messages?$select=id,createdDateTime,body`
- Chat: `/chats/{chatId}/messages?$select=id,createdDateTime,body`

Use the matching message's `id` in the follow-up call.

## Listing chats and channel members

For "show my Teams chats", call `fetch` exactly once on
`/me/chats?$expand=members` and answer from the returned `topic`, `chatType`,
and `members`. Do not follow or construct `$skip`, and do not add member
`$select` fields such as `email` or `userId`; those fields are not exposed on
`conversationMember`. A successful chat list is sufficient; do not make
enrichment or pagination retries.

For a named channel-member listing, use at most three `fetch` calls:
**Finding a channel**, then exactly
`/teams/{teamId}/channels/{channelId}/members`. The deployed members endpoint
does not allow `$top`; do not add it. Do not request `email` or `userId` with
`$select` because those are not properties of `conversationMember`. Use the
returned `displayName` and identity data directly. Do not retry field or query
variants after a 400.

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
   `references/do-action-work-iq.md`:
   - Channel: `/teams/{teamId}/channels/{channelId}/messages/{messageId}/setReaction`
   - Chat: `/chats/{chatId}/messages/{messageId}/setReaction`

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

## Removing/Deleting/Hiding a chat from the current user's chat list

"Delete this chat from my list", "remove this chat", and "hide this chat" map
to the per-user `hideForUser` action, never `delete_entity`.

1. Find the exact chat with **Finding a chat**. For a named topic, use the
   single batched topic lookup documented there.
2. Resolve your member identity. For a topic lookup, reuse the expanded member
   whose `userId` matches the signed-in user.
3. Call `do_action` on `/chats/{chatId}/hideForUser` with the `hideForUser`
   payload in `references/do-action-work-iq.md`.
4. Stop after the successful `204` response.

For a topic lookup, do not issue a separate `/me` or
`/chats/{chatId}/members` fetch. Do not make a verification fetch.

## Marking a named 1:1 chat read or unread

This is a known deployed contract. Do not call `search_paths` or `get_schema`.

For mark-read, the sequence is exactly:

1. `fetch` the signed-in user and exact counterpart with **Finding a chat —
   By person**.
2. `create_entity` on `/chats` to create or return the one-on-one chat.
3. `fetch` exactly `/chats/{chatId}/members` and resolve your member identity.
4. `do_action` on `/chats/{chatId}/markChatReadForUser`.

For mark-unread, use the same first three steps, then fetch
`/chats/{chatId}/messages?$select=createdDateTime` and call
`/chats/{chatId}/markChatUnreadForUser` with the first returned message
timestamp. The chat resource's `lastUpdatedDateTime` is not a message timestamp
and is not a valid substitute.

Use the action bodies in `references/do-action-work-iq.md`. Do not call
`search_paths` or `get_schema`, omit `tenantId`, or probe unsupported member
fields. If the action returns HTTP 500 or another ambiguous result, do not
replay it. Re-fetch the chat state when it is observable; otherwise report the
outcome as indeterminate.

The Teams action payloads in `references/do-action-work-iq.md` are known
deployed contracts; call them directly. Use `get_schema` only for an
undocumented action shape.

## Inspecting channel-message create properties

For "What properties can I set when creating a Teams channel message?", make
exactly one `get_schema` call for
`/teams/{teamId}/channels/{channelId}/messages` with
`operationType="create"`. Do not probe chat or update schemas.

Use that create schema as the source of truth for the answer. Lead with
user-supplied content fields such as `body`, `attachments`, `mentions`, and
other fields explicitly supported by the create payload. Do not present
system-generated or read-only resource fields as settable; this includes
identifiers, timestamps, sender and location metadata, reactions, replies,
hosted contents, and message history. If the returned schema exposes a broad
resource model without reliable writability annotations, state that limitation
instead of claiming every exposed property can be supplied on create.

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
