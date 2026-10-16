# Mail read and thread reconstruction

Use the WorkIQ **entity tools** for mail requests — listing/searching messages, reading folders,
drafting/sending/replying/forwarding, marking read, copying/moving, and deleting. Use `ask` only
for synthesis questions ("summarize the deadline thread with John"), not for finding,
listing, or mutating individual messages.
## Semantic and exact exchange boundaries

Public semantic mail questions start with `ask`; a failure/timeout does not
automatically authorize fan-out, an entity sweep or denial bypass. Follow
[diagnostic-driven recovery](troubleshooting.md). A concrete missing in-scope fact
can use a bounded supported refinement/exact read; no automatic broader search.

For an exact supplied or named exchange, use structured reads and local synthesis.
Select `id,subject,conversationId,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,body,bodyPreview,isDraft`.
Verify subject, participants, time and conversation. Exclude `isDraft:true` from
exchanged history, order sent messages by their actual timestamps, and quote
actual bodies rather than previews. The latest non-draft match is a reply target,
not necessarily the whole thread. Follow supported pages and relevant conversation
reads for requested complete history, or disclose missing coverage. Never invent
owners, decisions, dates or an ordering unsupported by returned evidence.


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
