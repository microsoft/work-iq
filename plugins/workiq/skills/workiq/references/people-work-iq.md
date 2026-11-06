# People and personal contacts

## People, directory, and contacts

Directory users and personal Outlook contacts are separate stores with
incompatible IDs. A directory user ID, conversation-member ID, or semantic hit
must not become a personal contact ID or an authoritative mutation target.

| Intent | Prerequisites and logical operation | Result and limits |
|---|---|---|
| Signed-in profile | `fetch` `/me` (or supported needed `$select` fields) | Use the authenticated profile, not local identity |
| Resolve an exact directory person | Use the [exact lookup contract](#exact-directory-person-lookup) | Match authoritative email/UPN or complete name; disambiguate duplicates before acting |
| Manager, reports or hierarchy aggregates | Use the [relationship and scope contract](#directory-relationships-and-hierarchy-scope) for the resolved subject | Distinguish the subject's reports, manager and peers; disclose incomplete coverage |
| Personal contact read | `fetch` `/me/contacts` with supported exact-name filtering | Resolve from this store; do not substitute `/users` after denial |
| Personal contact create/update/delete | Resolve contact/intent, inspect unfamiliar create/update schema, prepare, obtain required confirmation, then use the matching entity tool on `/me/contacts` or `/me/contacts/{contactId}` | If absent, report not found; creating a new contact is a separate action, never an implicit fix |
| Outlook categories | `fetch` `/me/outlook/masterCategories`; schema-gated entity writes only after confirmation | Respect the connected endpoint's privileges; do not infer write permission from a successful read |
| Signed-in profile photo metadata | `fetch` `/me?$select=id`, then `/users/{id}/photo?$select=id,width,height` | Inherited user-ID route; read the returned media-type annotation, not a selected annotation or binary `/$value` |

## Exact directory-person lookup

For a supplied email or UPN, use `fetch`
`/users/{urlEncodedUserPrincipalName}?$select=id,displayName,mail,userPrincipalName`
with the supplied address as the candidate UPN. Accept the result only when that
address case-insensitively matches returned `userPrincipalName` or `mail`.
These fields can differ. A `404` is a miss for that key path/scope, not proof
that the person does not exist. If unresolved, use a supported exact directory
lookup whose contract is known or discovered, or ask for an authoritative UPN
or full name. Do not invent a filter or switch paths after denial.
For a complete display name, use
`/users?$filter=displayName%20eq%20%27{odataEscapedAndUrlEncodedExactDisplayName}%27&$select=id,displayName,mail,userPrincipalName&$top=10`.
Double embedded apostrophes before URL-encoding the literal once; see the
[escape-then-encode example](files-identity-work-iq.md). Match the supplied
identity, not a similar name. A page bound is not proof of uniqueness: use
supported paging or focused identity details to disambiguate, or ask for selection.
Retain returned IDs verbatim with supported transport. Personal-contact and
conversation-member IDs are not directory-user IDs.

## Directory relationships and hierarchy scope

Resolve the requested person and relationship first; `/me` is only the signed-in
user. Reuse an authoritative directory ID, or use the exact lookup above.
For that person's manager, use `fetch` `/users/{personId}/manager`
(`/me/manager` for the signed-in user). For their immediate reports, use
`fetch` `/users/{personId}/directReports`, not their manager's reports.

Validate identity and relationship separately. A missing user lookup does not
prove a missing manager; a resolved user with a missing manager relationship
does not prove there are no peers. Report the relationship-specific gap.
Same department is not evidence of same-manager peers. Use only known supported,
authorized relationship evidence; denial stops, and no speculative department
lookup may replace the requested relationship.

Define direct/immediate versus transitive descendants, whether to include the
root person, and the fields to aggregate before reading. Clarify an ambiguous
"team" or "organisation" from context or the user; peers and project membership
are not automatically a reporting subtree.

An empty reporting set stays empty; do not substitute the manager's team or
peers. For a requested transitive set, traverse only known supported reporting
relationships within authorised scope, following supported pages for each
branch. Deduplicate by directory ID and stop cycles. Do not guess a transitive
endpoint or use traversal to bypass denial.

If errors, missing fields or runtime bounds leave coverage partial, disclose
the population read rather than claiming a complete total. Count or compare
only the defined population; a failed branch is not an empty branch.

## Permissions and outcomes

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
