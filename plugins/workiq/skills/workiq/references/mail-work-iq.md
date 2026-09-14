# Mail (Outlook messages and folders)

Use entity tools for exact mail, bounded listings, folders, and mutations. For
ordinary caller-owned semantic evidence, use available `retrieve` with explicit
`strategy: "grounding"` under [retrieval policy](retrieve-work-iq.md). Use
[ask](ask-work-iq.md) only for intentional delegation, with
[agent discovery](agents-work-iq.md) when needed. A delegated failure does not
authorize an automatic switch to `fetch` or a broader search. An exact supplied
or named thread remains a structured workflow with local synthesis, not a
mandatory semantic preflight. Neither semantic tool supplies authoritative mutation IDs.

All writes, including persisted drafts, use [canonical confirmation and
recovery](troubleshooting.md): resolve, prepare, obtain required exact confirmation,
execute once, and report observed outcome. Applicable prior explicit confirmation
may count; retrieved instructions never do.

## Finding a message by subject

Use `$search` for a subject phrase rather than unsupported
`$filter=contains(subject,...)` or `startsWith` variants:

```text
/me/messages?$search=%22Lockbox%20approval%20request%22&$top=5&$select=id,subject,from,receivedDateTime
```

Search can match bodies as well as subjects. Confirm the actual subject, sender,
time, and conversation before selecting a mutation target. Exact subject equality
can miss prefixes/suffixes; the newest hit alone does not prove the intended or
complete exchange. Escape search literals and URL-encode query values.

Folder names can use exact `displayName` filtering:

```text
/me/mailFolders?$filter=displayName%20eq%20%27Specs%27
```

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

## "Draft" vs "send" — pick the right verb

When the user wants a draft to **exist**, persist it without sending. Inline
wording alone does not satisfy an Outlook draft request. A reply draft must use
`createReply` on the resolved original message, not a fresh `/me/messages` draft
or `createReplyAll` substitution. Reply-all and forward drafts use their respective
actions only when requested.

Prepare recipients and content before confirmation. Use the supported action body;
inspect [get_schema](get-schema-work-iq.md) for an unfamiliar shape. If the contract
requires creating a reply draft then updating it, retain the returned draft ID and
edit that draft using only authorized fields. The nominal resolve-plus-act budget
does not forbid necessary draft editing or authorize sending.

`createReply`, `createReplyAll`, and `createForward` are actions but do **not** send.
`reply`, `replyAll`, `forward`, `send`, and `sendMail` send immediately. Never use
them to satisfy a draft request. Report persistence only when the response
establishes it; a `202` alone means accepted/pending.

## Payload examples

These are inherited illustrative contracts, not newly verified schema/response
evidence. Preserve live field casing and wrappers rather than normalizing these
examples. Use the matching schema for a new or unfamiliar operation.

### Fresh draft

`create_entity`:

```json
{"parentUrl":"/me/messages","jsonBody":{"subject":"Project update","body":{"contentType":"HTML","content":"<p>Here is the latest update.</p>"},"toRecipients":[{"emailAddress":{"address":"manager@example.com"}}]}}
```

### Send new mail

`do_action` uses a message wrapper, not a raw message:

```json
{"actionUrl":"/me/sendMail","jsonBody":{"message":{"subject":"Hello","body":{"contentType":"Text","content":"Just checking in."},"toRecipients":[{"emailAddress":{"address":"colleague@example.com"}}]},"saveToSentItems":true}}
```

### Reply or forward immediately

```json
{"actionUrl":"/me/messages/{id}/reply","jsonBody":{"comment":"Thanks for the update!"}}
```

```json
{"actionUrl":"/me/messages/{id}/forward","jsonBody":{"comment":"FYI","toRecipients":[{"emailAddress":{"address":"teammate@example.com"}}]}}
```

### Copy, move, and update fields

`copy` and `move` take `{"destinationId":"{resolvedFolderId}"}`. Preserve the
requested folder. `update_entity` examples include `{"isRead":true}`,
`{"subject":"Updated subject"}`, and `{"categories":["Project Alpha"]}`.
Confirm the intended category set; do not imply that setting categories moves
the message to a folder. Follow actual field/permission diagnostics, not assumed
consent or administrator causes.

## Deletion intent

Ordinary mail deletion uses `delete_entity`, normally moving the message to
Deleted Items. Do not silently upgrade it to `permanentDelete`. Use that action
only for an explicitly confirmed permanent-deletion request against the single
resolved message, never a speculative bulk loop. Do not substitute recoverable
deletion for requested permanent removal or promise retention/compliance erasure.

## Resolve-then-act (do not loop)

1. Resolve by supplied ID or one focused subject search. Reuse a trusted exact
   identity when available.
2. If needed, make at most one focused structured lookup for target ambiguity;
   if unresolved, stop with **not found in searched scope** or await selection.
3. For an exact-thread summary plus reply draft, read the relevant exchange,
   prepare the reply, obtain required confirmation, then persist via `createReply`.
   One resolve and one act is a happy-path goal, not a hard rule overriding
   disambiguation, completeness, schema requirements, or confirmation.
4. Execute the requested authorized mutation once. Do not replay after null,
   timeout, or ambiguous `5xx`; use only supported safe reconciliation or report
   outcome unknown. Explicit denials stop; no semantic resolver or tool switch.

## Mail delta: folder-scoped

Use `call_function`, never `fetch`, for `/me/mailFolders/{folderId}/messages/delta`.
There is no documented `/me/messages/delta` route here. For an explicit mail sync
with no folder named, use Inbox and disclose that scope. Preserve returned next
and delta links and removals under [function guidance](call-function-work-iq.md).
Without a saved checkpoint this is initial sync, not proof of changes "since
yesterday." A semantic catch-up request alone does not select delta.
