# Mail drafts and mutations

## Required before use

- [mail-read-work-iq](mail-read-work-iq.md)
- [mutation-work-iq](mutation-work-iq.md)

## "Draft" vs "send" — pick the right verb

Establish intent first: finding existing replies, suggested wording, persisting
a draft and sending are separate effects. A lookup authorizes no draft or send;
ambiguous effects remain read-only pending clarification.
A failed `createReply` does not authorize a fresh message substitute,
`createReplyAll`, or sending. An absent user is not confirmation.

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

## Replying to a self-sent original

Read the original's actual from/toRecipients/ccRecipients and establish whether
it was sent or received. The user may want the original recipients, not a reply
to themself. Verify the supported action's effective recipients; never default
to replyAll to reach them or include CC distractors.
If recipient control requires a reply draft, obtain confirmation to persist it,
retain its returned ID, inspect/update only supported authorized recipient fields,
then confirm the actual final content/recipients before sending. If the reply
contract cannot express the intended audience, explain and prepare a separately
confirmed new-message alternative; do not silently substitute it.


## Payload examples

These are request templates, not default recipients or content. Substitute
request-derived values under the required mutation contract, preserving each
operation's casing and wrappers. The body format must match its content:
use supported `Text` or `HTML` as appropriate. Inspect unfamiliar options in the
matching live schema.

### Fresh draft

`create_entity`:

```json
{"parentUrl":"/me/messages","jsonBody":{"subject":"{confirmedSubject}","body":{"contentType":"HTML","content":"{confirmedHTMLBody}"},"toRecipients":[{"emailAddress":{"address":"{resolvedRecipientAddress}"}}]}}
```

### Send new mail

`do_action` uses a message wrapper, not a raw message:

```json
{"actionUrl":"/me/sendMail","jsonBody":{"message":{"subject":"{confirmedSubject}","body":{"contentType":"Text","content":"{confirmedTextBody}"},"toRecipients":[{"emailAddress":{"address":"{resolvedRecipientAddress}"}}]},"saveToSentItems":true}}
```

### Reply or forward immediately

```json
{"actionUrl":"/me/messages/{id}/reply","jsonBody":{"comment":"{confirmedReplyText}"}}
```

```json
{"actionUrl":"/me/messages/{id}/forward","jsonBody":{"comment":"{confirmedComment}","toRecipients":[{"emailAddress":{"address":"{resolvedRecipientAddress}"}}]}}
```

### Copy, move, and update fields

`copy` and `move` take `{"destinationId":"{resolvedFolderId}"}`. Preserve the
requested folder. `update_entity` examples include `{"isRead":true}`,
`{"subject":"{confirmedSubject}"}`, and `{"categories":["{confirmedCategory}"]}`.
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
