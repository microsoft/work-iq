# People and personal contacts

## People, directory, and contacts

Directory users and personal Outlook contacts are separate stores with
incompatible IDs. A directory user ID, conversation-member ID, or semantic hit
must not become a personal contact ID or an authoritative mutation target.

| Intent | Prerequisites and logical operation | Result and limits |
|---|---|---|
| Signed-in profile | `fetch` `/me` (or supported needed `$select` fields) | Use the authenticated profile, not local identity |
| Resolve an exact directory person | `fetch` `/users?$filter=displayName%20eq%20'{escapedName}'&$select=id,displayName,mail,userPrincipalName&$top=5` | Match the complete name; disambiguate duplicate results by supported identity details before acting |
| Manager/direct reports | `fetch` `/me/manager`, then `/users/{managerId}/directReports` using the returned directory ID | Page when complete coverage is requested; this reports a management hierarchy, not every possible project team |
| Personal contact read | `fetch` `/me/contacts` with supported exact-name filtering | Resolve from this store; do not substitute `/users` after denial |
| Personal contact create/update/delete | Resolve contact/intent, inspect unfamiliar create/update schema, prepare, obtain required confirmation, then use the matching entity tool on `/me/contacts` or `/me/contacts/{contactId}` | If absent, report not found; creating a new contact is a separate action, never an implicit fix |
| Outlook categories | `fetch` `/me/outlook/masterCategories`; schema-gated entity writes only after confirmation | Respect the connected endpoint's privileges; do not infer write permission from a successful read |
| Signed-in profile photo metadata | `fetch` `/me?$select=id`, then `/users/{id}/photo?$select=id,width,height` | Inherited user-ID route; read the returned media-type annotation, not a selected annotation or binary `/$value` |

For an OData name, double embedded apostrophes first, then URL-encode the literal
value once; see [file identity](files-work-iq.md). `$top` is a page bound, not proof
that a name is unique. Retain returned IDs verbatim with supported transport.
The photo route above is not a fallback after a denied alias. A returned
`ImageNotFound` can support "no photo"; a generic 403 or null cannot.

Directory-managed fields such as job title, department, and manager have distinct
privilege requirements; inspect actual writable fields rather than promising
that extra end-user consent fixes an administrative restriction. No route
switching after access/policy denial. All writes follow
[operation-aware recovery and completion](troubleshooting.md).

## Routes

| Route | Intent | Read |
| --- | --- | --- |
| people-actions | Before a requested write | [Actions](people-actions-work-iq.md) |
