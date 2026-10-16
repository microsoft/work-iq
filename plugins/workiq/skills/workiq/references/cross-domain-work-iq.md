# Cross-domain sequencing

## Intent and cross-domain work

Finding existing content, suggested wording, persisted drafts and sends differ.
An ambiguous reply/message/draft phrase stays read-only pending clarification.
Resolve exact entities in their correct stores, inspect every batch result,
prepare and confirm required mutations, then execute once and report evidence.
Preserve successful sources/citations and name unresolved targets; no silent
comparison substitutes or fabricated prior context. A lookup is not permission
to act, and an absent user is not approval.

Directory users and personal contacts have incompatible IDs. Resolve personal
contacts from `/me/contacts` itself. Directory-managed fields are not editable
personal-contact fields; actual diagnostics govern privileges, not assumed
administrator/consent fixes. A missing personal contact does not authorize creation.

| Structured people request | Known route |
| --- | --- |
| Signed-in profile / manager | `fetch` `/me` or `/me/manager` with supported needed fields |
| Directory org chart / direct reports | `fetch` `/users/{id}/directReports`; preserve the actual directory ID and supported paging |
| Personal contacts | `fetch` `/me/contacts` with supported exact displayName filtering; resolve from this store before any confirmed edit |
| Outlook categories | `fetch` `/me/outlook/masterCategories`; writes require supported schema, intent and confirmation, and stop on denial |

## Routes

| Route | Intent | Read |
| --- | --- | --- |
| cross-domain-actions | Before a requested write | [Actions](cross-domain-actions-work-iq.md) |
