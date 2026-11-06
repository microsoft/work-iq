# Teams write IDs and outcomes

## Required before use

- [teams-targets-work-iq](teams-targets-work-iq.md)
- [mutation-work-iq](mutation-work-iq.md)

## Which ID goes where

| Where the ID goes | Use | From |
| --- | --- | --- |
| `.../members/{id}` on a team, channel or chat | Membership `id` | That members collection |
| `user@odata.bind`, tag `userId`, `mentioned.user.id`, `teamworkUserIdentity.id` | Directory user ID | `/me`, `/users/{UPN}`, or a member entry's `userId` |
| `/users/{senderUserId}/chats/.../softDelete` | The message sender's user ID | The message's `from.user.id` |
| `/teams/{teamId}/channels/{channelId}/messages/{messageId}/softDelete` | No user ID; never add a `/users/{id}` prefix to channel routes | The resolved team, channel and message |
| `.../tags/{tagId}/members/{id}` | Tag-member `id` | The tag's `/members` collection |
| `.../pinnedMessages/{id}`, `.../tabs/{id}` | That entry's `id` | Its collection |
| `teamworkUserIdentity.tenantId` | The same member's `tenantId` | The member entry |

Never use a membership `id` as a directory user ID; Graph can treat it as another
user and return HTTP 403.

## Member body

Team, channel and chat membership writes use this object:

```json
{"@odata.type":"#microsoft.graph.aadUserConversationMember","roles":["owner"],"user@odata.bind":"https://graph.microsoft.com/v1.0/users('{directoryUserId}')"}
```

- Roles: `["owner"]` for an owner. Team and channel members use `[]`; chat
  members never use `[]` (use `["owner"]`).
- Role change: `update_entity` on `.../members/{membershipId}` with only
  `@odata.type` and `roles`. Always include `@odata.type`.
- `/teams/{teamId}/members/add`: wrap the bodies as `{"values":[...]}`, with
  `"@odata.type":"microsoft.graph.aadUserConversationMember"` (no `#`). The
  response has one result per user; report each outcome and any `error`.

## Resolve then act

For an item inside a resolved container (message, member, tag, tag member, tab or
pinned message), fetch that collection once, match the exact name, text or
`userId` locally, and use that entry's `id`. Before adding to a collection,
check whether the person or item is already there and report that instead of
creating a duplicate. Change a property with one update; never remove and re-add,
or delete and recreate, to change it. Writes that affect other people (archiving,
removing members, deleting tags, tabs or files) act only on the exact resolved ID.

## Write outcomes

| Response | Do | Do not |
| --- | --- | --- |
| 200/201 with a body | Report from the returned entity; use its `id` directly in the next call | Rediscover it or make a verification fetch, unless the route requires a read-back |
| 202 Accepted (archive, unarchive, shared-channel create) | Say the request was accepted and finishes asynchronously | Claim completion unless a later read shows it |
| 204 No Content | Treat as success and stop | Make a verification fetch |
| 400 on a write body | Compare with the documented body; correct only a demonstrated defect, once | Guess fields or probe schema variants |
| 404 after selecting an item from a collection | Re-check the container and ID from the collection already read | Retry the item route repeatedly |
| 403 on activity notifications | Stop and name app authorization as the requirement | Other endpoints or sibling verbs |

Ambiguous outcomes, denials and retries follow [mutation](mutation-work-iq.md)
and [recovery](troubleshooting.md).
