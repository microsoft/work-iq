# Mail drafts and mutations

## Required before use

- [mail-read-work-iq](mail-read-work-iq.md)
- [mutation-work-iq](mutation-work-iq.md)

## "Draft" vs "send" — pick the right verb

Establish intent first: locating existing replies, suggested wording, persisting
a draft and sending are different effects. A noun phrase such as "reply emails
last week" remains read-only pending clarification. A failed `createReply` does
not authorize a fresh message substitute, `createReplyAll` or sending. An absent
user is not approval. Obtain required exact action/target/content confirmation.

When the user asks for a draft to **exist** (not just suggested wording), persist it
without sending:

- Fresh draft → `create_entity` with parent URL `/me/messages`
- Reply draft → `do_action` → `/me/messages/{id}/createReply`
- Reply-all draft → `do_action` → `/me/messages/{id}/createReplyAll`
- Forward draft → `do_action` → `/me/messages/{id}/createForward`

These create persisted drafts the user can open in Outlook. **Generating draft text inline
does NOT satisfy the request** — the user can't open it in Outlook.

The `createReply`, `createReplyAll`, and `createForward` endpoints are Graph actions,
so their WorkIQ tool is `do_action`; that tool classification does not mean they send.
`/reply`, `/replyAll`, `/forward`, `/send`, and `/sendMail` send **immediately** — never
use those endpoints when the user asked for a draft.


## Resolve-then-act (do not loop)

For an exact-thread summary plus requested persisted reply, begin with
`/me/messages?$search=%22{urlEncodedExactSubject}%22&$select=id,subject,conversationId,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,body,bodyPreview,isDraft&$top=5`.
Select the latest non-draft exact target and read relevant exchanged history
above. After preparation and confirmation, call `do_action`
`/me/messages/{messageId}/createReply` with
`{"Comment":"{requestedMarkerAndGroundedReplyBody}"}`. Do not send.

This known body needs no `get_schema` preflight. Use the returned ID verbatim,
including trailing `=`; no proactive/double encoding or formatting retries.
One resolve and one act is the happy path, not a ban on disambiguation, supported
paging, complete history or necessary draft editing. Permit at most one bounded
structured refinement for an unresolved exact target, not an `ask` resolver;
if still missing, report not found in searched scope. Apply central non-replay
and denial rules rather than substituting a different action.

### Send an email immediately
```json
{
  "actionUrl": "/me/sendMail",
  "jsonBody": "{\"message\":{\"subject\":\"Hello\",\"body\":{\"contentType\":\"Text\",\"content\":\"Just checking in.\"},\"toRecipients\":[{\"emailAddress\":{\"address\":\"colleague@example.com\"}}]},\"saveToSentItems\":true}"
}
```

### Send a previously created draft
```json
{ "actionUrl": "/me/messages/{id}/send" }
```

### Copy a message to another folder
```json
{
  "actionUrl": "/me/messages/{id}/copy",
  "jsonBody": "{\"destinationId\":\"archive\"}"
}
```

### Move a message to a folder
```json
{
  "actionUrl": "/me/messages/{id}/move",
  "jsonBody": "{\"destinationId\":\"inbox\"}"
}
```

### Forward a message
```json
{
  "actionUrl": "/me/messages/{id}/forward",
  "jsonBody": "{\"comment\":\"FYI\",\"toRecipients\":[{\"emailAddress\":{\"address\":\"teammate@example.com\"}}]}"
}
```

### Reply to a message
```json
{
  "actionUrl": "/me/messages/{id}/reply",
  "jsonBody": "{\"comment\":\"Thanks for the update!\"}"
}
```
