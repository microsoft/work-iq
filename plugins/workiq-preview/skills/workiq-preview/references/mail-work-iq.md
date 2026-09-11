# Mail (Outlook messages and folders)

Use the WorkIQ **entity tools** for mail requests — listing/searching messages, reading folders,
drafting/sending/replying/forwarding, marking read, copying/moving, and deleting.
Use `retrieve` when gathering semantic evidence for your own synthesis, or `ask`
when delegating the answer to M365 Copilot. Exact messages and bounded workflows
stay on entity tools; neither semantic tool supplies authoritative mutation IDs.

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

## Reconstructing an email exchange

Fetch matching messages with
`id,subject,from,toRecipients,ccRecipients,conversationId,isDraft,sentDateTime,body`
in `$select`. Match the conversation and participants; subject similarity alone
does not establish that messages belong to the same exchange.

Exclude `isDraft:true` from exchanged messages even if a sent timestamp is present
or the body looks like a reply. Order non-draft messages by `sentDateTime` and base
quotations on their actual bodies, not `bodyPreview`. Label relevant drafts
separately as **unsent**. If history is partial, timestamps are missing, or draft
status is unavailable, qualify the reconstruction rather than inventing an order
or presenting unconfirmed messages as sent.

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

1. Resolve the message with **one** `fetch` (filter by `$search` for subject, or by `id`).
2. If the first fetch misses, make at most one focused structured lookup when it
   can resolve the ambiguity. Do not use semantic hits as authoritative mutation IDs.
3. If still not found, **stop and report "not found within the searched scope"** — do not fire 10+ more
   `fetch`/`search_paths`/`ask` calls.
4. Once you have the id, call the mutation directly. Finding the message is not the goal;
   performing the requested action is.
