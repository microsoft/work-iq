# Teams hide and read state

## Required before use

- [teams-targets-work-iq](teams-targets-work-iq.md)
- [mutation-work-iq](mutation-work-iq.md)

## Removing/Deleting/Hiding a chat from the current user's chat list

"Delete this chat from my list", "remove this chat", and "hide this chat" map
to the per-user `hideForUser` action, never `delete_entity`.

1. Find the exact chat with **Finding a chat**. For a named topic, use the
   single batched topic lookup documented there.
2. Resolve your member identity. For a topic lookup, reuse the expanded member
   whose `userId` matches the signed-in user.
3. Call `do_action` on `/chats/{chatId}/hideForUser` with the `hideForUser`
   payload in **Remove a Teams chat from the current user's list** below.
4. Stop after the successful `204` response.

For a topic lookup, do not issue a separate `/me` or
`/chats/{chatId}/members` fetch. Do not make a verification fetch.


## Marking a named 1:1 chat read or unread

This is a known deployed contract. Do not call `search_paths` or `get_schema`.

After confirmation of all effects, the mark-read happy path is:

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

Use the action bodies below. Do not call
`search_paths` or `get_schema`, omit `tenantId`, or probe unsupported member
fields. If the action returns HTTP 500 or another ambiguous result, do not
replay it. Re-fetch the chat state when it is observable; otherwise report the
outcome as indeterminate.

If chat creation is not authorized, resolve the existing chat read-only instead;
if none is found in scope, stop. The Teams action payloads below are known
deployed contracts; call them directly. Use `get_schema` only for an
undocumented action shape.

### Remove a Teams chat from the current user's list

Use `hideForUser` for requests to delete, remove, or hide a chat from the
current user's chat list. For a named group-chat topic, use the exact-topic
lookup in `references/teams-work-iq.md`:
`/me/chats?$filter=topic%20eq%20%27{odataEscapedAndUrlEncodedExactTopic}%27&$expand=members&$top=50`.
Require an exact topic match, follow the global pagination guidance if a
continuation is returned, and use the expanded signed-in member for the action
identity. Do not fetch
`/chats/{chatId}/members` again. For a named person, use the 1:1 resolver in
`references/teams-work-iq.md`; do not use `delete_entity`.

```json
{
  "actionUrl": "/chats/{chatId}/hideForUser",
  "jsonBody": {
    "user": {
      "@odata.type": "#microsoft.graph.teamworkUserIdentity",
      "id": "{signedInUserId}",
      "tenantId": "{signedInMemberTenantId}",
      "userIdentityType": "aadUser"
    }
  }
}
```

### Mark a Teams chat read or unread

Resolve the exact chat and current-user identity as described in
`references/teams-work-iq.md`. Both actions use the same `user` object as
`hideForUser`:

When the chat response does not already include members, fetch exactly
`/chats/{chatId}/members` with no query string. Do not request `userId` or
`tenantId` through `$select`; read those properties from the unfiltered member
response.

| Intent | Action URL | Additional body field |
|--------|------------|-----------------------|
| Mark read | `/chats/{chatId}/markChatReadForUser` | None |
| Mark unread | `/chats/{chatId}/markChatUnreadForUser` | `"lastMessageReadDateTime":"{returnedCreatedDateTime}"` |

For mark-unread, add `lastMessageReadDateTime` beside `user` in `jsonBody`.
Do not omit `tenantId` or substitute the chat resource's
`lastUpdatedDateTime`. These are known deployed contracts; call them directly.
