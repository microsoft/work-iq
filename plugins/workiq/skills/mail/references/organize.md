# Mail organize: read state, flags, categories, folders, delete, and settings

Use this reference for mailbox mutations other than composing/sending text. Pattern: resolve target, preview exact change, confirm, mutate, report only confirmed results.

## Shared write workflow

1. If a trustworthy message/folder/category ID is already available, use it. Otherwise resolve with one `workiq-fetch`.
2. If multiple targets match, show candidates and ask the user to choose. Never mutate all plausible matches unless that exact list is confirmed.
3. Preview the exact current state and new state. Stop for confirmation.
4. Execute one mutation per resolved target. Do not retry identical failing writes.
5. Report success only when the response confirms the operation on the same entity.

## Mark read or unread

Resolve by subject with `$search` when needed:

```text
workiq-fetch(
  entityUrls: ["/me/messages?$search=%22{subjectPhrase}%22&$top=5&$select=id,subject,from,receivedDateTime,isRead,webLink"]
)
```

After confirmation:

```text
workiq-update_entity(
  entityUrl: "/me/messages/{id}",
  jsonBody: {"isRead": true}
)
```

Use `false` for mark unread. The final answer must say it was marked read/unread only if the mutation evidence confirms the requested state for the same message.

## Mark thread read

1. Search the subject; capture `conversationId`.
2. Fetch messages in the conversation, selecting `id,subject,isRead,conversationId,from,receivedDateTime,webLink`.
3. Preview every unread message that will be patched.
4. After confirmation, call `workiq-update_entity` for each message with `{"isRead": true}`.

The response must say the thread was marked read only when every in-scope message update succeeded or clearly report partial failures.

## Flags

After resolving the message and confirming:

| Intent | Body |
|---|---|
| Flag for follow-up | `{"flag": {"flagStatus": "flagged"}}` |
| Complete flag | `{"flag": {"flagStatus": "complete"}}` |
| Clear flag | `{"flag": {"flagStatus": "notFlagged"}}` |

Use `workiq-update_entity` on `/me/messages/{id}`. Final answer must tie the confirmed flag state to the exact subject.

## Categories

Applying categories to a message is a message PATCH, not a master-category write:

```text
workiq-update_entity(
  entityUrl: "/me/messages/{id}",
  jsonBody: {"categories": ["Project Apollo", "Follow up"]}
)
```

`categories` replacement is all-or-nothing. Fetch current `categories` first, preserve any categories that should remain, and preview the final array. If the user asks to create/delete/rename master categories, see [Outlook categories](#outlook-categories).

## Move

Resolve the source message and destination folder. Folder display names can use exact `$filter`:

```text
workiq-fetch(
  entityUrls: [
    "/me/messages?$search=%22{subjectPhrase}%22&$top=5&$select=id,subject,from,receivedDateTime,parentFolderId,webLink",
    "/me/mailFolders?$filter=displayName%20eq%20%27{folderName}%27&$select=id,displayName"
  ]
)
```

After confirmation:

```text
workiq-do_action(
  actionUrl: "/me/messages/{id}/move",
  jsonBody: {"destinationId": "{folderId}"}
)
```

Use folder IDs, not display names. A move may return a new message ID or parentFolderId; report returned evidence.

## Delete to Deleted Items

Normal delete of a message or draft uses `workiq-delete_entity` and moves mail to Deleted Items:

```text
workiq-delete_entity(entityUrl: "/me/messages/{id}")
```

Fetch first unless the ID is already known. For a draft, prove it is the requested draft with fields such as `id,subject,isDraft,toRecipients` when available. Confirm before deletion. Do not call `permanentDelete` for ordinary delete/remove/get-rid-of wording.

## Permanent delete

Only use `workiq-do_action` `/me/messages/{id}/permanentDelete` when all are true:

1. The user explicitly asked for permanent, unrecoverable removal.
2. Exactly one message ID is resolved, usually in Deleted Items for eval coverage.
3. The confirmation prompt says it bypasses Deleted Items and cannot be undone.
4. The operation is not looped across a batch.

```text
workiq-do_action(actionUrl: "/me/messages/{id}/permanentDelete")
```

The eval scores normal `delete_entity` at most 3 for permanent-removal prompts.

## Draft updates

For editing an existing draft, fetch the draft first unless the ID is already known:

```text
workiq-fetch(
  entityUrls: ["/me/messages?$search=%22{draftSubject}%22&$top=5&$select=id,subject,isDraft,toRecipients,ccRecipients,bodyPreview,webLink"]
)
```

### Add a recipient

Preserve existing recipients. Build the new `toRecipients` array from the fetched draft plus the requested address:

```text
workiq-update_entity(
  entityUrl: "/me/messages/{draftId}",
  jsonBody: {
    "toRecipients": [
      {"emailAddress": {"address": "existing@example.com", "name": "Existing"}},
      {"emailAddress": {"address": "new@example.com"}}
    ]
  }
)
```

### Update draft subject

```text
workiq-update_entity(
  entityUrl: "/me/messages/{draftId}",
  jsonBody: {"subject": "[new exact subject]"}
)
```

Do not send a draft unless the user explicitly asked to send and confirmed the send preview.

## Mailbox folders

| Intent | Tool/path |
|---|---|
| List folders | `workiq-fetch` `/me/mailFolders?$top=100&$select=id,displayName,totalItemCount,unreadItemCount` |
| Create folder | `workiq-create_entity` parentUrl `/me/mailFolders`, body `{"displayName":"Name"}` |
| Rename folder | Resolve folder, then `workiq-update_entity` `/me/mailFolders/{id}` with `{"displayName":"New name"}` |
| Delete folder | Resolve folder, then `workiq-delete_entity` `/me/mailFolders/{id}` |

For create/rename/delete, preview and confirm. For schema questions, use `workiq-get_schema(path: "/me/mailFolders", operationType: "create")` or `operationType: "update"` on `/me/mailFolders/{id}`.

## Outlook categories

> **⚠️ Outlook categories are commonly denied entirely — reads included.** Verified live:
> `workiq-fetch /me/outlook/masterCategories` returns `Access denied for GET path`. Treat the whole
> family as unavailable unless a call proves otherwise: attempt the read **once**, and if it is denied,
> tell the user Outlook categories are blocked by tenant policy and stop. Do not retry, do not try the
> write paths, and do not fall back to `ask`/`retrieve` to infer category names.
>
> When available, the paths are `/me/outlook/masterCategories` (list/create) and
> `/me/outlook/masterCategories/{id}` (update/delete). Categories **on a message** are a different
> thing — the `categories` string array on `/me/messages/{id}` is writable via `workiq-update_entity`
> independently of whether the master list is readable.

## Automatic replies (out of office) — NOT SUPPORTED

Automatic replies live on mailbox settings, and **there is no exposed path for them**.
`/me/mailboxSettings` returns `Access denied for GET path`, and `/me/settings` is blocked, so
neither reading nor writing an out-of-office message is possible through WorkIQ today.

When the user asks to set, change, or check an out-of-office / automatic reply:

1. Say plainly that WorkIQ cannot read or set automatic replies.
2. Point them at Outlook (File > Automatic Replies, or Settings > Mail > Automatic replies on the web).
3. **Do not** invent a path such as `/me/mailboxSettings`, do not call `get_schema` hunting for one,
   and do not report the reply as set.

## Schema and path discovery

- Email updatable fields: `workiq-get_schema(path: "/me/messages/{id}", operationType: "update")`.
- Mail folder create shape: `workiq-get_schema(path: "/me/mailFolders", operationType: "create")`.
- Folder/category paths: `workiq-search_paths(filter: "mailFolder|mailFolders|outlook/masterCategories")`.

Use discovery only for user schema/path questions or when a body-shape error proves the common shape is wrong.
