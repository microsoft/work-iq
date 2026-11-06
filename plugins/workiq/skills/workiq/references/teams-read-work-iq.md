# Teams reads and discovery

## Required before use

- [teams-targets-work-iq](teams-targets-work-iq.md)

## Listings and discovery

Before adding query options beyond these recipes, read
[Teams query limits](teams-query-limits-work-iq.md). When mentions are needed,
omit `$select` on channel messages; selecting `mentions` there returns HTTP 500.

For the General channel, fetch `/teams/{teamId}/primaryChannel` directly. For
channels shared into a team, fetch `/teams/{teamId}/incomingChannels` once with no
`$select`; an empty list means none.

For "show my chats", the bounded happy path is `/me/chats?$expand=members`.
Answer from returned topic, chatType and members; no enrichment after success.
Do not select `email` or `userId` on conversationMember. A cap or unfollowed
nextLink means partial coverage, not complete enumeration or absence.

Channel-member listing resolves the team/channel then fetches exactly
`/teams/{teamId}/channels/{channelId}/members`. Do not add `$top` or select
`email`/`userId`; answer from returned displayName and identity data. Do not probe
query variants after a 400. Nominal three-call budgets yield to disambiguation,
confirmation and supported completeness, not to unsupported query options.

For channel owners, standard channels inherit the team's owners: fetch
`/teams/{teamId}/members?$filter=roles/any(r:r%20eq%20%27owner%27)` once and apply
it to those channels. Read `/teams/{teamId}/channels/{channelId}/members` only for
private and shared channels, which have their own owners. A 404 `SoftDeleted`
for a listed channel means it was just deleted: exclude it, do not retry it, and
note it.

To list a team's channels, fetch
`/teams/{teamId}/channels?$select=id,displayName,membershipType` and answer from it.
Never add `$top` to channel lists or `/tabs` reads; they return 400.

For chat API inventory use `search_paths` with `{"query":"/chats"}`; for channel
inventory use `{"query":"/teams/{team-id}/channels"}`; for message inventory
(chat and channel) use `{"query":"Teams chat and channel messages"}`. Make exactly
one `search_paths` call per inventory request, even when it lists several
categories. Report every returned operation and list any requested family the
result did not return as unconfirmed. Never list paths the results did not return.

For a resource's data model or fields ("describe the data model for a channel
message"), make one `get_schema` call on its collection path with
`operationType: "fetch"`; do not add item, create or update schema calls unless
the user asks what can be set or changed.

For channel-message create properties, call `get_schema` on
`/teams/{teamId}/channels/{channelId}/messages` with `operationType: "create"`.
Do not substitute chat/update schemas. Lead with confirmed user-supplied fields
(body, attachments, mentions where supported), not system-generated/read-only
resource fields such as IDs, timestamps, sender, reactions, replies or history.
If writability annotations are insufficient, state that limitation. Discovery
does not authorize creating a message.
