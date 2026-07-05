# Mail (Outlook messages and folders)

Use the WorkIQ **entity tools** for mail requests — listing/searching messages, reading folders,
drafting/sending/replying/forwarding, marking read, copying/moving, and deleting. Use `ask` only
for synthesis questions ("summarize the deadline thread with John"), not for finding,
listing, or mutating individual messages.

## Mail delta: prefer `/me/messages/delta` for full-mailbox sync

For "sync my mail", "fetch the mail delta", or "give me mail changes" with **no folder named**,
route `call_function` to `/me/messages/delta` — full mailbox in one cursor.
`/me/mailFolders/{folderId}/delta` (e.g. `/me/mailFolders/inbox/delta`) is folder-scoped; use it
only when the user names a folder.

Paginate `@odata.nextLink` until you reach `@odata.deltaLink` (resume token for the next sync) —
stopping at the first page is wrong.

> **Always `call_function`, never `fetch`.** `delta` is an OData function. Calling
> `/me/messages/delta` through `fetch` returns an `InvalidRequest` or wrong shape; route through
> `call_function` with the function URL.

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
| Create a reply / reply-all / forward draft | `create_entity` | `/me/messages/{id}/createReply`, `/createReplyAll`, `/createForward` |
| Reply / forward immediately (no editable draft) | `do_action` | `/me/messages/{id}/reply`, `/replyAll`, `/forward` |
| Copy / move to folder | `do_action` | `/me/messages/{id}/copy`, `/move` |
| Delete (move to Deleted Items) | `delete_entity` | `/me/messages/{id}` |
| Permanently delete (bypasses Deleted Items) | `do_action` | `/me/messages/{id}/permanentDelete` |
| List folders | `fetch` | `/me/mailFolders` |
| Find a folder by name | `fetch` | `/me/mailFolders?$filter=displayName eq 'Specs'` |
| Mail delta (no folder) | `call_function` | `/me/messages/delta` |
| Mail delta (folder-scoped) | `call_function` | `/me/mailFolders/inbox/messages/delta` |

## "Draft" vs "send" — pick the right verb

When the user says **"draft an email"**, **"compose a reply"**, **"prepare a response"**, or any
variant asking the draft to **exist** (not just suggest wording), call `create_entity` to POST:

- Fresh draft → `/me/messages`
- Reply / reply-all / forward → `/me/messages/{id}/createReply`, `/createReplyAll`, `/createForward`

These create persisted drafts the user can open in Outlook. **Generating draft text inline
does NOT satisfy the request** — the user can't open it in Outlook.

`do_action` `/reply`, `/replyAll`, `/forward`, `/sendMail` all send **immediately** — never use
those when the user asked for a draft.

## Resolve-then-act (do not loop)

1. Resolve the message with **one** `fetch` (filter by `$search` for subject, or by `id`).
2. If the first fetch misses, try **one** `ask` to locate it semantically.
3. If still not found, **stop and report "not found"** — do not fire 10+ more
   `fetch`/`search_paths`/`ask` calls.
4. Once you have the id, call the mutation directly. Finding the message is not the goal;
   performing the requested action is.
