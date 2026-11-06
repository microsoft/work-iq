# Teams hide and read state

## Required before use

- [teams-targets-work-iq](teams-targets-work-iq.md)
- [mutation-work-iq](mutation-work-iq.md)

## Hide, mark read or unread

"Remove/delete/hide this chat from my list" is a per-user `hideForUser` action,
not `delete_entity` or deletion for other participants. Use the
[typed target contract](teams-targets-work-iq.md) and authoritative signed-in member.
For a named person, use its read-only 1:1 lookup; never create a chat to change
its state. For a topic lookup,
reuse the expanded members and `/me` result; no redundant member/profile read.

Known body for `/chats/{chatId}/hideForUser` and `/markChatReadForUser`:

```json
{"user":{"@odata.type":"#microsoft.graph.teamworkUserIdentity","id":"{signedInUserId}","tenantId":"{signedInMemberTenantId}","userIdentityType":"aadUser"}}
```

## Mark unread boundaries

For `/chats/{chatId}/markChatUnreadForUser`, distinguish the default unread
effect from a requested cutoff. The [Graph action contract](https://learn.microsoft.com/en-us/graph/api/chat-markchatunreadforuser?view=graph-rest-1.0#request-body)
defines messages after the supplied timestamp as unread; the timestamp is optional
and omission marks the last message unread. This is not new live WorkIQ validation.

For a plain mark-unread request, omit `lastMessageReadDateTime` only when the
connected WorkIQ contract supports that default. Reuse the user-only body above;
no message-list lookup is required for this supported default. If omission support
is unknown, establish the action contract before using that variant.

For an explicit cutoff, or a contract that requires one, resolve the intended
cutoff and its unread range before confirmation. Reuse an authoritative selected
last-read message's `createdDateTime`, or read its exact
`/chats/{chatId}/messages/{messageId}`. The [Graph single-message contract](https://learn.microsoft.com/en-us/graph/api/chatmessage-get?view=graph-rest-1.0#optional-query-parameters)
does not support OData query parameters; its bare response includes the timestamp.
Use a projection variant only with established support in the connected WorkIQ
contract, not by copying the message-list recipe.
A supported, user-specified DateTimeOffset boundary can also be used when resolved
and confirmed. The example below uses the selected message's returned timestamp.

Do not choose the first/latest list result as the boundary merely from response
order; even known ordering does not establish the user's intended cutoff.
Do not add unsupported `$top` or `$orderby`, use chat `lastUpdatedDateTime`,
or invent timestamp arithmetic. If a required boundary or its meaning remains
unresolved, clarify or report the limitation before mutation.

```json
{"user":{"@odata.type":"#microsoft.graph.teamworkUserIdentity","id":"{signedInUserId}","tenantId":"{signedInMemberTenantId}","userIdentityType":"aadUser"},"lastMessageReadDateTime":"{returnedCreatedDateTime}"}
```

## Completion and recovery

No empty body, missing tenantId, member-ID substitution or unknown identity.
These known action shapes go direct after prerequisites/confirmation. A
contract-defined `204` supports success without an unnecessary verification read.
After null, timeout or ambiguous 500, do not replay. Use a supported state read
only if the state is exposed; otherwise report outcome unknown. Do not invent
a verification endpoint.
