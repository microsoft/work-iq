# Mail (Outlook messages and folders)

Use the WorkIQ **entity tools** for mail requests — listing/searching messages, reading folders,
drafting/sending/replying/forwarding, marking read, copying/moving, and deleting. Use `ask` only
for synthesis questions ("summarize the deadline thread with John"), not for finding,
listing, or mutating individual messages.

## Bounded fallback when mail synthesis `ask` fails

For a mail synthesis question scoped to a specific person and topic, call `ask` exactly once.
If that call explicitly fails or reports that it cannot complete, make exactly one focused
`fetch` to `/me/messages?$search=%22{mostSpecificTopicPhrase}%22&$select=id,subject,from,receivedDateTime,body,bodyPreview&$top=10`.
Filter the returned messages locally to the requested person and summarize only that evidence.
Do not retry `ask`, search Teams or chats, call `search_paths`, broaden the topic phrase, follow
conversations, or make additional mail fetches. If the bounded fallback does not contain enough
evidence, report the limitation.

For a synthesis question about themes in unread Inbox mail, call `ask` exactly once. If it
explicitly fails or reports that it cannot complete, make exactly one bounded `fetch` to
`/me/mailFolders/inbox/messages?$filter=isRead%20eq%20false&$select=subject,from,receivedDateTime,bodyPreview&$top=50`
and derive themes locally from that page. Do not use `$skip`, follow `@odata.nextLink`, fetch a
second page, or make another tool call. State that the summary covers the bounded page.

## Mail delta: use `/me/mailFolders/{id}/messages/delta` (folder-scoped)

Message delta is **always folder-scoped** — there is **no** tenant-wide `/me/messages/delta`
endpoint. For "sync my mail", "fetch the mail delta", or "give me mail changes" with **no folder
named**, default to the inbox cursor `/me/mailFolders/inbox/messages/delta`. When the user names a
folder, target that folder's messages delta, e.g. `/me/mailFolders/{folderId}/messages/delta`.

Paginate `@odata.nextLink` until you reach `@odata.deltaLink` (resume token for the next sync) —
stopping at the first page is wrong.

> **Always `call_function`, never `fetch`.** `delta` is an OData function. Calling
> `/me/mailFolders/inbox/messages/delta` through `fetch` returns an `InvalidRequest` or wrong
> shape; route through `call_function` with the function URL.

## Finding a message by subject — use `$search`, not `$filter=contains`

Graph rejects `$filter=contains(subject,'X')` and `$filter=startsWith(subject,'X')` on
`/me/messages` with `InefficientFilter` **unless** the request carries the
`ConsistencyLevel: eventual` header **plus** `$count=true` — and `fetch` does not expose
request headers. `$filter=subject eq 'X'` requires an exact match (subjects with
prefixes/suffixes silently return 0 results).

**Use `$search` instead** — substring/word matching on subject and body, no extra headers,
and it works with `update_entity` / `delete_entity` / `do_action` chains:

- ✅ `fetch` `/me/messages?$search=%22Lockbox approval request%22&$top=5&$select=id,subject,from,receivedDateTime`
- ❌ `fetch` `/me/messages?$filter=contains(subject,%27Lockbox%27)` → `InefficientFilter`
- ❌ `fetch` `/me/messages?$filter=subject%20eq%20%27Lockbox%20approval%20request%27` → 0 results if subject has any suffix

Quote the search phrase with `%22…%22` (URL-encoded double quotes) for phrase match; bare tokens
do OR matching. Pair with `$top` to bound the result set when you need a single message id.

For **mail folder name lookups** (`/me/mailFolders`), `$filter=displayName eq 'X'` is fine —
folder names are exact-match by design. Use it for `rename` / `move` / `delete` folder chains.

## Canonical paths

| Operation | Tool | Path |
|-----------|------|------|
| List messages in Inbox | `fetch` | `/me/mailFolders/inbox/messages` |
| Find a message by subject (substring) | `fetch` | `/me/messages?$search=%22subject phrase%22` |
| Get a message by id | `fetch` | `/me/messages/{id}` |
| Mark as read / change subject | `update_entity` | `/me/messages/{id}` with `{"isRead": true}` |
| Send a draft you created | `do_action` | `/me/messages/{id}/send` |
| Send a brand-new message in one shot | `do_action` | `/me/sendMail` |
| Create a draft | `create_entity` | parentUrl `/me/messages` |
| Create a reply / reply-all / forward draft | `do_action` | `/me/messages/{id}/createReply`, `/createReplyAll`, `/createForward` |
| Reply / forward immediately (no editable draft) | `do_action` | `/me/messages/{id}/reply`, `/replyAll`, `/forward` |
| Copy / move to folder | `do_action` | `/me/messages/{id}/copy`, `/move` |
| Delete (move to Deleted Items) | `delete_entity` | `/me/messages/{id}` |
| Permanently delete (bypasses Deleted Items) | `do_action` | `/me/messages/{id}/permanentDelete` |
| List folders | `fetch` | `/me/mailFolders` |
| Find a folder by name | `fetch` | `/me/mailFolders?$filter=displayName eq 'Specs'` |
| Mail delta (default / no folder named) | `call_function` | `/me/mailFolders/inbox/messages/delta` |
| Mail delta (specific folder) | `call_function` | `/me/mailFolders/{folderId}/messages/delta` |

## "Draft" vs "send" — pick the right verb

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

An exact-thread request that combines a summary with creation of a reply draft is a strict
exception to the fallback below: use one exact-subject `fetch`, then
`/me/messages/{id}/createReply`. This direct route takes precedence over the general rule to use
`ask` for synthesis. If the exact fetch fails or finds no match, stop and report that failure;
do not call `ask`, inspect schemas, run discovery, or switch to `createReplyAll`.

1. Resolve the message with **one** `fetch` (filter by `$search` for subject, or by `id`).
2. If the first fetch misses, try **one** `ask` to locate it semantically.
3. If still not found, **stop and report "not found"** — do not fire 10+ more
   `fetch`/`search_paths`/`ask` calls.
4. Once you have the id, call the mutation directly. Finding the message is not the goal;
   performing the requested action is.

## Validated task recipes

| User Question Pattern | Example | Action |
|-----------------------|---------|--------|
| Listing emails with concrete filters | "Show my unread emails from Rob this week" | `fetch` (`/me/messages`) |
| Downloading the first file attachment from Inbox | "Find the first inbox email with a file attachment and download that attachment" | Use exactly two calls. First, `fetch` `/me/mailFolders/inbox/messages?$filter=hasAttachments%20eq%20true&$top=10&$select=id,subject,receivedDateTime,hasAttachments&$expand=attachments($select=id,name,contentType,size,isInline)`; do not combine this filter with `$orderby` and do not use `$skip`. In returned order, select the first message containing a file attachment and its first file attachment. Then call `fetch_blob` `/me/messages/{messageId}/attachments/{attachmentId}/$value`. Insert the complete `message.id` and selected `fileAttachment.id` directly from the structured response without retyping, shortening, normalizing, or reconstructing either value. Before the single `fetch_blob` call, compare both path segments character-for-character with their source fields and correct any mismatch before calling. The suffix is the literal `/$value` with no space between `/` and `$`; construct the path once and do not retry formatting variants. When the user requests raw content, include the returned `base64Content` in the final answer, or the actual materialized file path when the host wrote the bytes to disk; do not merely state that the content was downloaded. If the bounded page contains no file attachment, report not found instead of enumerating the mailbox, following `@odata.nextLink`, or retrying alternate filters. |
| Summarizing an exact mail thread and creating a reply draft | "Summarize the named thread, then create a reply draft starting with the requested marker" | Use exactly two calls. First, `fetch` `/me/messages?$search=%22{urlEncodedExactSubject}%22&$select=id,subject,conversationId,from,toRecipients,ccRecipients,receivedDateTime,body,bodyPreview,isDraft&$top=5`; select the latest non-draft exact-subject match and summarize only facts supported by its evidence. Then call `do_action` `/me/messages/{messageId}/createReply` with `{"Comment":"{requestedMarkerAndGroundedReplyBody}"}`. Use `createReply`, never `createReplyAll`, and never send. Skip `ask`, `get_schema`, and a second fetch. Use the returned message id verbatim without proactive encoding or double-encoding; if an opaque id containing reserved characters is rejected by path transport, report that failure instead of exploring alternate encodings. Do not invent decisions, owners, dates, or completed actions that the thread leaves unspecified. |
| List or manage Outlook categories | "What Outlook categories do I have?" | `fetch` (`/me/outlook/masterCategories`); writes subject to server policy |


## Resolve then act

After required confirmation and target resolution, complete the requested action; a preparatory lookup alone is not completion.

| User request | Step 1: resolve | Step 2: act (required) |
|---|---|---|
| "Mark email as read" | `fetch` to find the message | `update_entity` `/me/messages/{id}` with `{"isRead": true}` |
| "Forward email to X" | `fetch` to find the message | `do_action` `/me/messages/{id}/forward` |
| "Send email to X" | — | `do_action` `/me/sendMail` |
| "Create draft and send" | `create_entity` to draft | `do_action` `/me/messages/{id}/send` |
