# Mail read and thread reconstruction

Exact mail/listings/threads use entity tools and local synthesis;
[grounding retrieve](retrieve-work-iq.md) finds semantic evidence.
[ask](ask-work-iq.md) is delegation only, never a failed-lookup fallback or
authoritative mutation identity.
A delegated failure cannot silently switch to fetch/search.

Writes/persisted drafts require [mail actions](mail-actions-work-iq.md).
## Finding a message by subject

Use `$search` for a subject phrase rather than unsupported
`$filter=contains(subject,...)` or `startsWith` variants:

```text
/me/messages?$search=%22{escapedAndUrlEncodedSubjectPhrase}%22&$top=5&$select=id,subject,from,receivedDateTime
```

Search can match bodies as well as subjects. Confirm the actual subject, sender,
time, and conversation before selecting a mutation target. Exact subject equality
can miss prefixes/suffixes; the newest hit alone does not prove the intended or
complete exchange. Escape search literals and URL-encode query values.
Preserve quoted names verbatim, including case, punctuation and internal spaces;
escaping a query is not permission to change the requested title.

Folder names can use exact `displayName` filtering:

```text
/me/mailFolders?$filter=displayName%20eq%20%27{odataEscapedAndUrlEncodedFolderName}%27
```

## Date-bounded and unread acquisition

Resolve mailbox/folder, year, zone and each boundary's offset; clarify a missing
year that changes the target, never assume current/benchmark year. Use
inclusive start and exclusive next-day end in UTC for received-date windows;
sent mail needs supported sentDateTime. Do not silently restrict all mail to Inbox.
For received-only membership, verify supported draft/folder/delivery evidence or
disclose unknown membership. Do not exclude genuinely received self-mail by sender.

When the connected contract supports this combination, `fetch`:

```text
/me/messages?$filter=receivedDateTime%20ge%20{encodedStartUTC}%20and%20receivedDateTime%20lt%20{encodedEndUTC}&$select=id,subject,from,receivedDateTime,isRead&$top=50
```

For unread mail add `and isRead eq false` inside the encoded filter only when
supported. Otherwise use a supported scoped collection read and local filtering,
with all required fields and pages; do not invent combinations with `$search` or
`$orderby`. Match requested sender and date constraints, not response order.
Unread inventory is never an ask/retrieve answer. Follow supported nextLinks for
requested coverage; before handling continuations/caps read
[fetch mechanics](fetch-work-iq.md#batches-paging-and-host-caps). Empty success
means no matches in this scope/window; missing fields/pages mean partial coverage.

## Actual attachments

A body mentioning an attachment is not attachment evidence. Before selecting or
downloading attachments, read [attachments](mail-attachments-work-iq.md).
That leaf covers resolved-message collections and the bounded first-Inbox-file
recipe; preserve the original date/name/type constraints.


## Reconstructing an email exchange

Fetch matching messages with
`id,subject,from,toRecipients,ccRecipients,conversationId,isDraft,sentDateTime,body`
in `$select`. Match the conversation and participants; subject similarity alone
does not establish that messages belong to the same exchange.

Exclude `isDraft:true` from exchanged messages even if a sent timestamp is present
or the body looks like a reply. Order non-draft messages by `sentDateTime` and base
quotations on actual bodies, not `bodyPreview`. Label relevant drafts separately
as **unsent**. If history is partial, timestamps are missing, or draft status is
unavailable, qualify the reconstruction rather than inventing an order or
presenting unconfirmed messages as sent. Follow supported `@odata.nextLink` for a
complete-history request or disclose the gap; a single search page is not complete
history by default.
Before batching, continuing or inspecting caps, read
[fetch mechanics](fetch-work-iq.md#batches-paging-and-host-caps).


## Canonical paths

| Operation | Tool | Path |
| --- | --- | --- |
| List Inbox messages | `fetch` | `/me/mailFolders/inbox/messages` |
| Read a message | `fetch` | `/me/messages/{id}` |
| Update read state, subject, categories, or draft fields | `update_entity` | `/me/messages/{id}` |
| Create a fresh draft | `create_entity` | parent `/me/messages` |
| Persist reply / reply-all / forward draft | `do_action` | `/me/messages/{id}/createReply`, `/createReplyAll`, `/createForward` |
| Send a draft | `do_action` | `/me/messages/{id}/send` |
| Send a new message | `do_action` | `/me/sendMail` |
| Reply / reply-all / forward immediately | `do_action` | `/me/messages/{id}/reply`, `/replyAll`, `/forward` |
| Copy / move to folder | `do_action` | `/me/messages/{id}/copy`, `/move` |
| Ordinary delete | `delete_entity` | `/me/messages/{id}` |
| Explicit permanent deletion | `do_action` | `/me/messages/{id}/permanentDelete` |
| List folders | `fetch` | `/me/mailFolders` |
| Mail delta | `call_function` | `/me/mailFolders/{folderId}/messages/delta` |
