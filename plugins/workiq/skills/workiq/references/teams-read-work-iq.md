# Teams reads and discovery

## Required before use

- [teams-targets-work-iq](teams-targets-work-iq.md)

## Canonical paths

| Operation | Tool | Path |
| --- | --- | --- |
| List my chats | `fetch` | `/me/chats?$expand=members` |
| Find, create, or reuse a 1:1 chat | `create_entity` | parentUrl `/chats` |
| List messages in a chat | `fetch` | `/chats/{chatId}/messages` (don't use $top parameter) |
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


## Listing chats and channel members

For "show my Teams chats", the bounded happy path is one `fetch` on
`/me/chats?$expand=members` and answer from the returned `topic`, `chatType`,
and `members`. Do not follow or construct `$skip`, and do not add member
`$select` fields such as `email` or `userId`; those fields are not exposed on
`conversationMember`. No enrichment is needed after success. Follow supported
returned `@odata.nextLink` for all/every/complete requests or disclose partial
coverage if continuation is unsupported or a budget prevents it. A bounded
listing is not proof of absence or a complete history.

For a named channel-member listing, the happy path is three `fetch` calls:
**Finding a channel**, then exactly
`/teams/{teamId}/channels/{channelId}/members`. The deployed members endpoint
does not allow `$top`; do not add it. Do not request `email` or `userId` with
`$select` because those are not properties of `conversationMember`. Use the
returned `displayName` and identity data directly. Do not retry field or query
variants after a 400.


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


## Exact marker messages and supplied URLs

For exact marker messages, resolve the exact team/channel, then fetch
`/teams/{teamId}/channels/{channelId}/messages?$select=id,createdDateTime,body`.
Omit `$top` and `$orderby`; filter locally to the complete exact marker. Do not
use semantic search, which can miss recent posts or mix unrelated history.
Do not fetch replies unless requested. Follow supported paging for requested
coverage, otherwise label the evidence partial.

For supplied exact message URLs, batch every supported exact entity path in
one `fetch`, then synthesize locally. Use `/teams/{teamId}/channels/{channelId}/messages/{messageId}`
for channel messages and `/chats/{chatId}/messages/{messageId}` for chat messages;
do not swap surfaces, guess IDs from ambiguous links or search broader history.
Inspect every result and preserve successes; unresolved targets remain explicit.

For API inventories, use `search_paths` with `{"query":"/chats"}` or
`{"query":"/teams/{team-id}/channels"}` as requested. Report every confirmed
operation/category, state unconfirmed categories and inspect saved capped output
when available. No extra path/schema call merely to fill an unsupported category.
