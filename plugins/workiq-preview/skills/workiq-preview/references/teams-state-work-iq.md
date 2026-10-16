# Teams hide and read state

## Required before use

- [teams-targets-work-iq](teams-targets-work-iq.md)
- [mutation-work-iq](mutation-work-iq.md)

## Hide, mark read or unread

"Remove/delete/hide this chat from my list" is a per-user `hideForUser` action,
not `delete_entity` or deletion for other participants. Use exact topic/person
resolution above and the authoritative signed-in member. For a topic lookup,
reuse the expanded members and `/me` result; no redundant member/profile read.

Known body for `/chats/{chatId}/hideForUser` and `/markChatReadForUser`:

```json
{"user":{"@odata.type":"#microsoft.graph.teamworkUserIdentity","id":"{signedInUserId}","tenantId":"{signedInMemberTenantId}","userIdentityType":"aadUser"}}
```

For mark-unread, fetch `/chats/{chatId}/messages?$select=createdDateTime` (no
`$top`) and use the first returned message's `createdDateTime` in
`lastMessageReadDateTime` beside `user`. Do not use chat `lastUpdatedDateTime`;
it is not a message timestamp. If no usable timestamp is returned, stop.

```json
{"user":{"@odata.type":"#microsoft.graph.teamworkUserIdentity","id":"{signedInUserId}","tenantId":"{signedInMemberTenantId}","userIdentityType":"aadUser"},"lastMessageReadDateTime":"{returnedCreatedDateTime}"}
```

No empty body, missing tenantId, member-ID substitution or unknown identity.
These known action shapes go direct after prerequisites/confirmation. A
contract-defined `204` supports success without an unnecessary verification read.
After null, timeout or ambiguous 500, do not replay. Use a supported state read
only if the state is exposed; otherwise report outcome unknown. Do not invent
a verification endpoint.
