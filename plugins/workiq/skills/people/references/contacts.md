# Personal Outlook contacts

Use this reference for personal contact cards and contact CRUD under `/me/contacts`.

## Critical boundary

Personal contacts and directory users are different stores:

- `/me/contacts/{id}` is the signed-in user's Outlook contact.
- `/users/{id}` is an organization directory user.
- A directory ID, people-search ID, or `workiq-retrieve` candidate ID cannot be patched, deleted, or treated as `/me/contacts/{id}`.
- If a person exists in the directory but not in `/me/contacts`, say that no personal contact was found. To edit them as a contact, create a personal contact first.
- Directory writes are admin-only; never fall back to `/users/{id}` when `/me/contacts` is denied.

## Common paths

| Need | Tool and path |
|---|---|
| Discover contact endpoints | `workiq-search_paths` with `contacts` |
| Create schema | `workiq-get_schema` path `/me/contacts`, operationType `create` |
| List/resolve contacts | `workiq-fetch` `/me/contacts?$filter=displayName%20eq%20%27Name%27&$select=id,displayName,emailAddresses,businessPhones,mobilePhone,companyName,jobTitle&$top=10` |
| Get a known contact | `workiq-fetch` `/me/contacts/{id}` |
| Create contact | `workiq-create_entity` parentUrl `/me/contacts` |
| Update contact | `workiq-update_entity` entityUrl `/me/contacts/{id}` |
| Delete contact | `workiq-delete_entity` entityUrl `/me/contacts/{id}` |
| Contacts delta | `workiq-call_function` `/me/contacts/delta` |

`/me/contacts` availability varies by tenant and over time — it has been observed both denied and working on the same tenant. Attempt the call; do not pre-emptively tell the user it is unavailable. If WorkIQ returns `Access denied for path: /me/contacts...`, report it and stop.

## Resolve a personal contact

1. Search `/me/contacts` by exact display name or another user-provided field.
2. If one contact matches, use that returned contact ID for update/delete.
3. If several contacts match, list the candidates and ask which one.
4. If none match, say no personal contact was found. Do not switch to a directory write.
5. Preserve the returned `id`; contact IDs can contain characters that must remain URL-safe when placed in `/me/contacts/{id}`.

## Create a contact

Creating a contact is a write. Confirm first.

```md
About to create a personal Outlook contact via workiq-create_entity:
- **Target store:** `/me/contacts`
- **Display name:** <displayName>
- **Fields:** <email/phone/company/etc.>

Confirm?
```

After confirmation, call `workiq-create_entity` with `parentUrl: "/me/contacts"` and the provided fields. If the user asks what payload is required, or you are unsure of field names, call `workiq-get_schema` once for `/me/contacts` with `operationType: "create"` before the confirmation.

## Update a contact

1. Resolve the contact from `/me/contacts` unless the contact ID is already known from a prior `/me/contacts` response.
2. Confirm the exact field change and target contact.
3. Call `workiq-update_entity` on `/me/contacts/{id}` with only the requested fields.
4. Report success only when the response confirms the update, or a follow-up contact fetch confirms the final state.

For phone-number updates, update the phone field the user named. If they say only "phone number", use the existing phone field when there is one; otherwise ask whether it should be business or mobile rather than guessing when the distinction matters.

## Delete a contact

1. Resolve the contact from `/me/contacts` unless the ID is already known from that store.
2. Confirm deletion with the display name and any disambiguating email/phone.
3. Call `workiq-delete_entity` on `/me/contacts/{id}` only after confirmation.
4. Report success only on a confirmed delete response. If the call returns `null` without detail, say the outcome is unconfirmed.

## Contact cards

"Contact card" can mean either a directory card or a personal contact card. Use context:

- "from the directory", employee, manager, title, alias, direct reports -> directory `/users/...` in `directory.md`.
- "my contact", vendor, Outlook contact, create/update/delete -> `/me/contacts` here.
- If both are plausible and an action depends on the store, ask which store the user means.

## Contacts delta

Use `workiq-call_function`, never `workiq-fetch`, for contacts delta.

- Initial sync: `functionUrl: "/me/contacts/delta"`.
- Follow `@odata.nextLink` by converting it to a server-relative function URL, up to 5 pages or 500 contacts by default. If the bound is hit before a delta link, disclose partial coverage in `*Notes*` and ask before an intentionally exhaustive sync.
- Resume from a saved `@odata.deltaLink` by using that path/query verbatim. Tokens are opaque; do not edit or invent them.
- Items with `@removed` are deletions. Report additions/changes/removals separately.
- If the user says "since last week" but no saved delta token exists, explain in `*Notes*` that the initial delta response is not a true historical filter; do not approximate with `lastModifiedDateTime` fetch.

## Error handling

- **Access denied:** report the denied `/me/contacts` path and stop.
- **Ambiguous contact:** list candidates and ask.
- **No contact found:** state that no personal contact exists; offer to create one after confirmation.
- **Wrong-store ID:** if the only ID came from `/users`, re-resolve in `/me/contacts` before any contact write.
- **Schema/body error:** read `/me/contacts` create/update schema once, fix the body, and retry at most once.
