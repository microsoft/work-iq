# Teams typed targets

Use entity tools for exact messages, listings and mutations. Team context uses
`retrieve` with source-based strategy selection via
[retrieval policy](retrieve-work-iq.md). Use [ask](ask-work-iq.md) only for
intentional delegation, never synthesis or failed-lookup recovery.

Establish the requested effect first; an action word in a lookup does not authorize
posting or chat creation. Ambiguous effects remain read-only pending clarification.
Confirm exact targets,
recipients/content and effects before mutations. An absent user is not approval.
Paths and bodies documented in the Teams routes are known contracts: call them
directly, without `search_paths` or `get_schema` first. Use discovery only when no
Teams route documents the operation, then at most one call of each.
## Chats, channels and typed identities

| Surface | Meaning | Path root |
| --- | --- | --- |
| Chat | 1:1, group or meeting chat; flat messages, no replies endpoint | `/me/chats`, `/chats/{chatId}/messages` |
| Channel | A channel inside a team; threaded replies | `/teams/{teamId}/channels/{channelId}/messages` |

Resolve ambiguous names by actual topic, participants and IDs, not by guessing
which surface a name implies. Channel replies use
`/teams/{teamId}/channels/{channelId}/messages/{messageId}/replies`; do not invent
a chat replies endpoint. A chat reply posts a new message to the same flat chat;
to quote or reply to a specific chat message, use `replyWithQuote` in
[message actions](teams-message-actions-work-iq.md), never a new message.

Directory user IDs, conversation-member IDs, chat/team/channel IDs and tenant IDs
are distinct. Never use a semantic citation as mutation identity, infer a tenant
from an email domain, or decode an opaque member ID to guess a directory ID.
Missing required identity data blocks the action.

## Finding exact targets

### Channel

1. Fetch exactly `/me/joinedTeams?$select=id,displayName`, never with `$top`,
   even in a batched `fetch`; match the exact team.
2. Fetch `/teams/{teamId}/channels?$select=id,displayName` and match the exact channel.

Do not select a similar name. Never add `$top` to channel or message lists;
they return 400. Exact lookups do not use semantic retrieval or `ask`.

### Person: authorized 1:1 create-or-return

For an authorized send or create workflow whose approval also covers possible
chat creation, the oneOnOne create-or-return contract returns the existing chat
for the pair or creates it if needed. It is a mutation, not a read-only lookup.
Never use it to read/find messages, change read state or hide a chat, or add chat
creation silently to an edit/reaction. For those, batch steps 1-2 in one `fetch`
with `/me/chats?$filter=chatType%20eq%20%27oneOnOne%27&$expand=members&$top=50`,
and select locally the chat whose expanded members include the counterpart's
directory ID; those members also supply your member identity. Follow returned
`@odata.nextLink` verbatim, up to 5 pages. If all pages are read without a match,
report that no existing 1:1 chat was found; if a page fails or the limit is hit
first, report the error or limit and the pages searched as partial. Never create
a chat.

`members/any` filters work only on `displayName`; never filter members on
`userId` or `email`. Member reads never `$select` `userId`, `email` or `tenantId`
(returned but not selectable) and never add `$top`.

1. Resolve `/me?$select=id` plus the directory counterpart in a batch when
   independent. Before a directory lookup, read the
   [exact directory-person contract](people-work-iq.md#exact-directory-person-lookup).
2. Require exactly one user matching the supplied email/UPN or full display name.
   Disambiguate duplicate names; a page bound is not proof of uniqueness. Do not
   use `/me/people`: fuzzy contacts are not directory-user identities.
3. For send/create only, after required confirmation call `create_entity` on
   `/chats` with exactly the two returned directory IDs. Require a nonempty
   returned chat ID and `chatType == "oneOnOne"`; do not create a group chat for
   a single recipient.

```json
{"chatType":"oneOnOne","members":[{"@odata.type":"#microsoft.graph.aadUserConversationMember","roles":["owner"],"user@odata.bind":"https://graph.microsoft.com/v1.0/users('{signedInUserId}')"},{"@odata.type":"#microsoft.graph.aadUserConversationMember","roles":["owner"],"user@odata.bind":"https://graph.microsoft.com/v1.0/users('{counterpartUserId}')"}]}
```

These body binding URLs are not WorkIQ entity URL parameters.

### Group chat topic and signed-in member

Batch `/me?$select=id` with
`/me/chats?$filter=topic%20eq%20%27{odataEscapedAndUrlEncodedExactTopic}%27&$expand=members&$top=50`.
Require the complete topic/participant match and disambiguate duplicates. Use the
topic exactly as written (the filter is case-sensitive); do not retry other
capitalizations. Follow
supported `@odata.nextLink` for required coverage; never invent `$skip` or a cursor.

For hide/read/unread, use the expanded member whose `userId` equals the signed-in
user ID. Reuse returned members; otherwise fetch exactly `/chats/{chatId}/members`
with no query string, including no `$select`, `$expand` or `$top`.
`userId` and `tenantId` are returned by that bare read but are not selectable
`conversationMember` fields. Set `teamworkUserIdentity.id` to that member's
`userId`, not its opaque `id` (often `MCMj...`), and retain the same member's
returned `tenantId`. Missing mapping/tenant means stop, not schema guessing.

### Message, marker and supplied URLs

After exact chat/channel resolution, fetch:

```text
/chats/{chatId}/messages?$select=id,createdDateTime,from,body
/teams/{teamId}/channels/{channelId}/messages?$select=id,createdDateTime,from,body
```

Match the complete message text before editing/reacting; use the returned ID.
For an exact marker request, filter locally to that exact marker; do not add
`$top` or `$orderby` or use semantic indexing as a substitute. Do not fetch
replies unless requested. Continue supported paging for requested complete
coverage or disclose partial results.

For supplied exact message URLs, use supported batches of exact paths,
then synthesize locally:
`/teams/{teamId}/channels/{channelId}/messages/{messageId}` or
`/chats/{chatId}/messages/{messageId}`. Do not swap surfaces, guess opaque IDs from
an ambiguous browser link, or search broader history. Preserve each successful
batch result and report unresolved targets under [recovery](troubleshooting.md).
