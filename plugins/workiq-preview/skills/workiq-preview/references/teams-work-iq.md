# Teams (chats, channel messages, reactions, presence)

Use entity tools for exact messages, listings, and mutations. Ordinary caller-owned
team context uses available `retrieve` with explicit `strategy: "grounding"` under
[retrieval policy](retrieve-work-iq.md); [ask](ask-work-iq.md) is intentional
delegation only, not a synthesis default or a failed-lookup resolver.

## Chats, channels, and typed identities

| Surface | Meaning | Path root |
| --- | --- | --- |
| Chat | 1:1, group, or meeting chat; flat message list | `/me/chats`, `/chats/{chatId}/messages` |
| Channel | Channel inside a team; threaded replies | `/teams/{teamId}/channels/{channelId}/messages` |

A name may refer to either surface. Resolve a chat from `/me/chats?$expand=members`
and a channel from `/me/joinedTeams` then `/teams/{teamId}/channels`.
Match actual topic, participants, and IDs; do not infer the surface from its name.
Channel replies use `/teams/{teamId}/channels/{channelId}/messages/{messageId}/replies`.
The documented chat surface here is flat; do not invent a chat replies endpoint.

Directory user IDs, conversation-member IDs, chat IDs, team IDs, channel IDs, and
tenant IDs are distinct. Retain their types and provenance from structured
responses. A `conversationMember.id` is **not automatically** the directory user
ID required by an action's `teamworkUserIdentity.id`. Correlate the signed-in user
with authoritative identity data and the live action-body contract. Never infer a
tenant from an email domain, decode an opaque member ID to guess a user ID, or use
a semantic citation as mutation identity. If the required user/member mapping or
`tenantId` is missing, pause instead of constructing a body.

## Canonical paths

| Operation | Tool | Path |
| --- | --- | --- |
| List chats | `fetch` | `/me/chats?$expand=members` |
| List chat messages | `fetch` | `/chats/{chatId}/messages` |
| Send chat message | `create_entity` | `/chats/{chatId}/messages` |
| List teams / channels | `fetch` | `/me/joinedTeams`, `/teams/{teamId}/channels` |
| List / post channel messages | `fetch` / `create_entity` | `/teams/{teamId}/channels/{channelId}/messages` |
| List channel members | `fetch` | `/teams/{teamId}/channels/{channelId}/members` |
| Edit a message where supported | `update_entity` | Exact returned chat/channel message path |
| React | `do_action` | `/chats/{chatId}/messages/{messageId}/setReaction` or documented channel-message counterpart |
| Explicit channel-message sync | `call_function` | `/teams/{teamId}/channels/{channelId}/messages/delta` |
| Read presence | `fetch` | `/me/presence`, `/users/{id}/presence` |
| Set preferred presence | `do_action` | `/me/presence/setUserPreferredPresence` |

## Bounded listings and endpoint-specific options

For "show my chats", one `/me/chats?$expand=members` read is the normal bounded
route. Answer from returned `topic`, `chatType`, and `members`; no enrichment
is needed after success. Qualify it as partial if the result is capped or has
unfollowed `@odata.nextLink`. For an all/every request, use supported returned
continuation links or disclose that complete enumeration is unavailable.
Never invent `$skip` or reconstruct a cursor.

For a named channel-member listing, the happy path is three reads: team, channel,
then exactly `/teams/{teamId}/channels/{channelId}/members`. The documented members
endpoint does **not** allow `$top`. Do not request `email` or `userId` via
`conversationMember` `$select`; use actual returned type-specific identity data.
Do not probe field/query variants after a `400`. These restrictions are endpoint
specific, not a ban on supported options for chat or message lists.

## Mark a chat read or unread

These are mutations requiring confirmation and [non-replay recovery](troubleshooting.md).
Resolve a named 1:1 chat with `/me/chats?$expand=members&$top=50`, then establish
the signed-in user's required identity and tenant as above. Do not select an
ambiguous counterpart or claim absence from a partial listing.

The following bodies are inherited illustrative contracts, **unverified here**;
use the live schema for an unfamiliar action or unresolved field meaning.
Placeholder `schemaConfirmedUserIdentityId` means the ID required by the action,
not a blind substitution of `conversationMember.id`.

For `/chats/{chatId}/markChatReadForUser`:

```json
{"user":{"@odata.type":"#microsoft.graph.teamworkUserIdentity","id":"{schemaConfirmedUserIdentityId}","tenantId":"{authoritativeTenantId}","userIdentityType":"aadUser"}}
```

For `/chats/{chatId}/markChatUnreadForUser`, also establish the intended read cutoff.
The inherited bounded read `/chats/{chatId}/messages?$select=createdDateTime&$top=1`
returns a timestamp, but one row alone does not prove ordering or that it is the
correct cutoff. Use it only when the endpoint contract and requested scope support
that interpretation; otherwise resolve the cutoff before execution.

```json
{"user":{"@odata.type":"#microsoft.graph.teamworkUserIdentity","id":"{schemaConfirmedUserIdentityId}","tenantId":"{authoritativeTenantId}","userIdentityType":"aadUser"},"lastMessageReadDateTime":"{confirmedReturnedCutoff}"}
```

Do not send an empty body, omit required `tenantId`, or infer missing identity.
After null, timeout, or ambiguous `5xx`, do not replay either action. Use a safe
state read only if the relevant state is actually exposed; otherwise report
**outcome unknown**. Do not invent a read-state verification endpoint.

## Sending, replying, editing, and deletion

1. Resolve the existing 1:1 chat for a named recipient. A partial page without a
   match does not justify creating another chat.
2. Prepare text and obtain required confirmation for the exact recipient/channel.
3. Use `create_entity` on the correct message collection once. The inherited body
   is `{"body":{"contentType":"text","content":"..."}}`; for reactions the inherited
   action body is `{"reactionType":"like"}`. Confirm unfamiliar payloads with
   [get_schema](get-schema-work-iq.md), not guessed variants.
4. Only create `/chats` with schema-defined `chatType` and members when absence of
   the intended chat is established and that creation is authorized. Do not create
   a new group chat to deliver a single 1:1 message.

For edits, confirm exact message ownership and supported fields. Chat deletion,
message deletion, and removal for one user are not interchangeable; do not infer
support or a delete route from a message-read route. Establish the requested
operation in the live catalog/schema before attempting an unfamiliar deletion.
On a forbidden edit or deletion, report the actual diagnostic; do not promise
that extra consent or an administrator change will enable it.

## Presence

User-preferred presence uses `/me/presence/setUserPreferredPresence`. An inherited
illustrative body is `{"availability":"Busy","activity":"Busy","expirationDuration":"PT1H"}`.
Resolve requested status/duration and confirm before execution.
`/me/presence/setPresence` is the application-session variant requiring a
`sessionId`; it is not an alternative after a failed preferred-presence write.
No replay after ambiguous `5xx`, null, or timeout. A supported current-presence
read can establish current state, not necessarily which request caused it.
Explicit denial stops; do not cycle through presence endpoints.

## Resolve-then-act and sync boundaries

Use one or two focused lookups where sufficient; if identity remains unresolved,
report the searched scope or request selection. Never use `ask` as a mutation
resolver. Confirmation, disambiguation, and supported completeness reads override
nominal call budgets. Follow [recovery](troubleshooting.md) for failures.

For explicit delta, follow [function guidance](call-function-work-iq.md), preserving
next/delta links and removals. Without a checkpoint, this is initial sync, not
evidence of changes since an arbitrary date. A team catch-up does not automatically
mean channel delta.
