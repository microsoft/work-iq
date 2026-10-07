# Teams typed targets

Use the WorkIQ **entity tools** for Teams requests — sending/reading chat messages, posting in
channels, replying, reacting, and presence. Use `ask` only for synthesis questions
("what's the team's take on the release?"), not for sending or listing messages.

Establish intent first. "Reply messages last week" can mean finding existing
content, not posting; remain read-only and clarify an unclear effect. Confirm
the exact target/content for mutations, including creating a chat, read state,
hide and presence. An absent user is not approval. Call counts are happy-path
goals subordinate to identity, confirmation and supported complete paging.
Follow [recovery](troubleshooting.md): denial stops and ambiguous writes are not
replayed. Missing identity/tenant fields block the action, not invite guesses.

Known Teams mutations — message edits, `hideForUser`, mark read or unread,
and reactions — must use the documented workflows below directly. Do not call
`search_paths` or `get_schema` for them.
## ⚠️ Chats and channels are different surfaces

The most common Teams routing mistake is mixing these up:

| Surface | What it is | Path root |
| --- | --- | --- |
| **Chat** | 1:1, group, or meeting chat — flat message list | `/me/chats`, `/chats/{chatId}/messages` |
| **Channel** | A channel inside a team — messages have threaded **replies** | `/teams/{teamId}/channels/{channelId}/messages` |

- A name like "Project X Daily" can be either a chat **or** a channel. Resolve it before acting
  with **Finding a chat** or **Finding a channel** below.
- **Replies:** channel messages support
  `/teams/{teamId}/channels/{channelId}/messages/{messageId}/replies` (POST a reply there).
  **Chat messages have no replies endpoint** — chats are flat, so "replying" in a chat means
  posting a new message to the same chat.
- IDs are not interchangeable: a chat ID does not work in a `/teams/...` path or vice versa.


## Finding Teams targets

Every Teams task below starts from these lookups. Apply them to all Teams
reads and mutations:

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

Pick the lookup that matches how the user named the chat.

**By person (authorized 1:1 create-or-return).** Microsoft Graph permits only one one-on-one chat for
a pair of users. If it already exists, this call returns that existing chat
instead of creating a duplicate. Require a non-empty returned chat ID and
`chatType == "oneOnOne"`. This is a mutation, not a read-only lookup. Use it only
when creating/reusing that chat is authorized (for example, a confirmed send or
read-state change that also permits chat creation). For finding existing
messages, read-only requests, edits or reactions without chat-creation approval,
resolve an existing chat through `/me/chats?$expand=members` and supported paging,
matching the verified directory counterpart. Do not create a chat merely to
find old content or silently add this effect to another mutation.

1. Resolve the signed-in user and a verified directory-user counterpart:
   - When the user supplied an email address or UPN, fetch `/me?$select=id` and
     `/users/{urlEncodedUserPrincipalName}?$select=id,displayName,mail,userPrincipalName`.
   - Otherwise, fetch `/me?$select=id` and
     `/users?$filter=displayName%20eq%20%27{odataEscapedAndUrlEncodedExactDisplayName}%27&$select=id,displayName,mail,userPrincipalName&$top=10`.
2. Require exactly one returned directory user matching the supplied email/UPN
   or, for a name lookup, the complete `displayName`. If no user or multiple users match, ask for
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
Otherwise, fetch exactly `/chats/{chatId}/members` with no query string. The URL must end at
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
