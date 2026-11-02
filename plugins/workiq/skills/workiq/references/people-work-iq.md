# People and personal contacts

Use this reference for directory profiles, organization relationships, personal
contacts, and profile-photo metadata.

Directory users (`/users/{id}`) and personal Outlook contacts
(`/me/contacts/{id}`) are separate stores with incompatible IDs. Resolve a
personal contact from `/me/contacts`, never from directory or people search.
Do not PATCH personal contact fields onto directory users. If a person exists
only in the directory, report that a personal contact must be created first.

## Validated task recipes

| User Question Pattern | Example | Action |
|-----------------------|---------|--------|
| Get a personal contact by name | "Get the contact card for Morgan Avery" | `fetch` (`/me/contacts?$filter=...`) — subject to server policy |
| Org chart / direct reports / manager lookup | "Who are Rob's direct reports?" | `fetch` (`/users/{id}/directReports`) |
| Signed-in user's profile photo metadata | "Show my profile photo dimensions and content type" | `fetch` `/me?$select=id`, then `fetch` `/users/{id}/photo?$select=id,width,height`. Do not use the policy-denied `/me/photo` alias, request `/$value`, or put `@odata.mediaContentType` in `$select`; read the media content type annotation returned with the metadata. |
