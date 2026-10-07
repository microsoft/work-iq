# Teams reads and discovery

## Required before use

- [teams-targets-work-iq](teams-targets-work-iq.md)

## Listings and discovery

For "show my chats", the bounded happy path is `/me/chats?$expand=members`.
Answer from returned topic, chatType and members; no enrichment after success.
Do not select `email` or `userId` on conversationMember. A cap or unfollowed
nextLink means partial coverage, not complete enumeration or absence.

Channel-member listing resolves the team/channel then fetches exactly
`/teams/{teamId}/channels/{channelId}/members`. Do not add `$top` or select
`email`/`userId`; answer from returned displayName and identity data. Do not probe
query variants after a 400. Nominal three-call budgets yield to disambiguation,
confirmation and supported completeness, not to unsupported query options.

For chat API inventory use `search_paths` with `{"query":"/chats"}`; for channel
inventory use `{"query":"/teams/{team-id}/channels"}`. Report every returned
operation and disclose unconfirmed categories. Inspect saved capped output if
available; do not make another discovery/schema call just to fill missing categories.

For channel-message create properties, call `get_schema` on
`/teams/{teamId}/channels/{channelId}/messages` with `operationType: "create"`.
Do not substitute chat/update schemas. Lead with confirmed user-supplied fields
(body, attachments, mentions where supported), not system-generated/read-only
resource fields such as IDs, timestamps, sender, reactions, replies or history.
If writability annotations are insufficient, state that limitation. Discovery
does not authorize creating a message.
