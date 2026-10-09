# Teams core rules

Every Teams task uses this file plus one topic file: `references/teams-reading.md`
for reading or summarizing, or the matching write or feature file. It holds target
lookup, shared IDs and payloads, query limits, write outcomes, and shared
discipline. Documented Teams paths and payloads are known contracts: call them
directly without `search_paths` or `get_schema`.

Query options for every Teams path follow **Query limits** below.

## Finding Teams targets

- Match names and message text exactly. Never act on a partial, similar, or
  semantic match.
- Do not use `ask` to find a chat, channel, or message that will be changed.
  If the exact target is not found, report it as not found.

### Finding a channel

1. Fetch `/me/joinedTeams?$select=id,displayName` and select the exact team
   name. `/me/joinedTeams` takes `$select` only; never add `$top`.
2. Fetch `/teams/{teamId}/channels?$select=id,displayName` and select the exact
   channel name. Do not choose the first similar channel name.

- **General (primary) channel:** fetch `/teams/{teamId}/primaryChannel`
  directly.
- **Shared channels shared into a team:** fetch
  `/teams/{teamId}/incomingChannels` once (an empty list means none).

### Finding a chat

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
3. Call `create_entity` with `parentUrl="/chats"`, `"chatType":"oneOnOne"`,
   and a `members` array of two **member bodies** (below), both with
   `"roles":["owner"]`: one for `{signedInUserId}` and one for the returned
   directory-user `id`.

**By topic (group chat).** In one `fetch`, request `/me?$select=id` and
`/me/chats?$filter=topic%20eq%20%27{odataEscapedAndUrlEncodedExactTopic}%27&$expand=members&$top=50`,
and require an exact `topic` match. Use the topic exactly as the user wrote it,
with the same capitalization and spacing (the filter is case-sensitive); don't
retry with other capitalizations. If the response includes
`@odata.nextLink`, follow the global pagination guidance in
`references/fetch-work-iq.md`. If no chat matches, do not fall back to `ask`;
report the chat as not found.

**Your member identity in the chat** (for `hideForUser` and mark read/unread):
reuse the expanded member whose `userId` equals `{signedInUserId}`. Otherwise
fetch `/chats/{chatId}/members` once. Use that member's `userId` and
`tenantId` (see **Which ID goes where**).

### Finding a message

Fetch the chat or channel messages and match the complete text exactly:

- Channel: `/teams/{teamId}/channels/{channelId}/messages?$select=id,createdDateTime,body&$top=50`,
  then match locally. Do not add `$filter`, `$search`, or `$orderby`, and do
  not use `delta` to find a message.
- Chat: `/chats/{chatId}/messages?$select=id,createdDateTime,body`

Add `from,subject` to `$select` when searching or summarizing so senders are
visible. To act on the user's own message ("my message"), confirm the sender
by matching `from.user.id` to the signed-in user's id. Get that id by adding
`/me?$select=id` to your first `fetch` batch; don't make a separate `/me` call. When attachments or reactions matter, drop `$select` (see **Query
limits**). For file attachments, follow `references/teams-apps-files-content.md`.

## Resolve then act

1. Resolve the container with **Finding Teams targets**.
2. For an item inside it — a message, member, tag, tag member, tab, or pinned
   message — fetch that collection once, match the exact name, text, or
   `userId` locally, and use that entry's `id` in `{collection}/{id}` for
   `update_entity`, `delete_entity`, or `do_action`.
3. Before adding to a collection, check whether the person or item is already
   there. If it is, report that instead of creating a duplicate.
4. Perform the requested write directly once you have the IDs. Change a
   property with one update; never remove and re-add, or delete and recreate,
   to change it.
5. Report the result once (see **Write outcomes**).

Writes that affect other people (archiving, removing members, deleting tags,
tabs, or files) act only on the exact resolved ID; never on a similar name.

## Which ID goes where

| Where the ID goes | Use | From |
| --- | --- | --- |
| `.../members/{id}` on a team, channel, or chat | Membership `id` | That members collection |
| `user@odata.bind`, tag `userId`, `mentioned.user.id`, `teamworkUserIdentity.id` | Directory user ID | `/me`, `/users/{UPN}`, or a member entry's `userId` |
| `/users/{userId}/chats/.../softDelete` | The message sender's user ID | The message's `from.user.id` |
| `/teams/{teamId}/channels/{channelId}/messages/{messageId}/softDelete` | No user ID; never add a `/users/{id}` prefix to channel routes (access denied) | The resolved team, channel, and message |
| `.../tags/{tagId}/members/{id}` | Tag-member `id` | The tag's `/members` collection |
| `.../pinnedMessages/{id}`, `.../tabs/{id}` | That entry's `id` | Its collection |
| `teamworkUserIdentity.tenantId` | The same member's `tenantId` | The member entry |

Never use a membership `id` as a user ID; Graph
can treat it as another user and return HTTP 403. `userId` and `tenantId` are
returned on member entries but cannot be selected.

## Member body

Every team, channel, and chat membership write uses this object:

```json
{"@odata.type":"#microsoft.graph.aadUserConversationMember","roles":["owner"],"user@odata.bind":"https://graph.microsoft.com/v1.0/users('{directoryUserId}')"}
```

- **Roles:** `["owner"]` for an owner. Team and channel members use `[]`;
  chat members never use `[]` (use `["owner"]`).
- **Role change:** `update_entity` on `.../members/{membershipId}` with only
  `@odata.type` and `roles`. Always include `@odata.type`.
- **`/teams/{teamId}/members/add`:** wrap the bodies as
  `{"values":[...]}`, with `"@odata.type":"microsoft.graph.aadUserConversationMember"`
  (no `#`). The response has one result per user; report each outcome and any
  `error`.

## Query limits

The generic `fetch` advice to add `$select`, `$top`, `$filter`, and `$orderby`
does not apply uniformly to Teams. These are deployed WorkIQ constraints; when
this table conflicts with generic query guidance, this table wins.

| Path | Supported approach | Do not send |
| --- | --- | --- |
| `/me/joinedTeams` | `$select` only (`$select=id,displayName`) | `$top` |
| `/teams/{teamId}/channels` | `$select=id,displayName` | `$top` |
| `/teams/{teamId}/incomingChannels` | Fetch the base collection | `$select` |
| `/teams/{teamId}/members`, `/teams/{teamId}/channels/{channelId}/members` | Read base `conversationMember` fields; when only owners are needed, filter with `roles/any(r:r eq 'owner')` | `$top`; `email`, `userId`, or `tenantId` in `$select` |
| `/chats/{chatId}/members` | Fetch the unfiltered collection | any query string |
| `/teams/{teamId}/tags`, `/teams/{teamId}/tags/{tagId}/members` | Read the base collection | any query string |
| `/me/chats` | `$expand=members` without nested projection; exact-topic `$filter` as in **Finding a chat** | `$orderby=lastUpdatedDateTime`; `$skip`; nested `$select` inside `$expand=members(...)` |
| `/chats/{chatId}/messages` | Fetch the collection and filter or sort locally | `$top`; created-date filters; `$search` |
| `/teams/{teamId}/channels/{channelId}/messages` | `$top=50`, then filter locally | `$filter` (including `createdDateTime` ranges); `$orderby`; `$search`; `$skiptoken`; `replyToId` in `$select`; nested `$select` inside `$expand=replies(...)` |
| Any message collection or message when `attachments`, `reactions`, `mentions`, or `importance` are needed | Omit `$select` entirely | `attachments`, `reactions`, `mentions`, or `importance` in `$select` |
| `/chats/{chatId}/pinnedMessages` | `$expand=message` | `$select`, including nested `$select` in the expansion |
| `/chats/{chatId}/tabs`, `/teams/{teamId}/channels/{channelId}/tabs` | `$expand=teamsApp` | `$top` |
| `.../installedApps`, `/me/teamwork/installedApps`, `/users/{id}/teamwork/installedApps` | `$expand=teamsAppDefinition` | `$top` |
| `/me/presence`, `/users/{id-or-UPN}/presence` | Fetch the presence resource directly | `$select` |
| `/me/settings/workHoursAndLocations/recurrences` | Fetch the collection (`daysOfWeek` is inside `recurrence.pattern`) | `$select` |
| `getAllTranscripts(...)` | Call without projection and select the transcript locally | `$select` |

Do not retry rejected query variants after a 400; use the supported approach
and filter locally.

## Write outcomes and errors

| Response | Do | Do not |
| --- | --- | --- |
| 200/201 with a body | Report from the returned entity and its `id`; use that `id` directly in the next call | Rediscover the new entity or make a verification fetch (unless the topic file requires a read-back, such as private-channel members) |
| 202 Accepted (archive, unarchive, shared-channel create) | Say the request was accepted and finishes asynchronously | Claim it is done unless a later read shows it |
| 204 No Content | Treat as success and stop | Make a verification fetch |
| 500 or another ambiguous result | Re-read the state once if it is observable; otherwise report the outcome as indeterminate | Replay the write |
| 403, policy, or access denied | Stop and report it (for `GraphAccessToTranscriptsDisabled`, name the transcript policy; for activity notifications, name app authorization) | Try alternate IDs, encodings, endpoints, or sibling verbs |
| 400 on a write body | Use the documented body exactly | Guess fields or call `get_schema` |
| 400 on a query option | Use the base collection from **Query limits** and filter locally | Probe query variants |
| 404 after selecting an item from a collection | Re-check the container and ID from the collection already read | Retry the item route repeatedly |

## Shared discipline

- **Target lock:** once an exact team, channel, chat, message, thread, or
  meeting is confirmed, keep its ID for the rest of the task. Do not inspect
  another same-named container unless the selected one is disproven.
- **Evidence sufficiency:** when a collection response already has every
  requested field, use it. Do not fetch the item again for enrichment.
- **Batch independent lookups** in one `fetch` with multiple `entityUrls`. One
  failing URL marks the batch as failed, but the error payload still carries
  every other URL's result: use those instead of re-fetching them.
- Start with minimal fields; request message bodies, meeting details, or app
  definitions only for selected items.
- When paging, fetch a page or two. Do not follow `@odata.nextLink` for dozens
  of pages, and do not replay or rewrite a rejected `$skiptoken`. Answer from
  the retrieved pages and say the result is partial.