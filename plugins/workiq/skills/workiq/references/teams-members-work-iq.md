# Teams members and tags

## Required before use

- [teams-query-limits-work-iq](teams-query-limits-work-iq.md)

## Paths

| Operation | Tool | Path |
| --- | --- | --- |
| List team or channel members/owners | `fetch` | `/teams/{teamId}/members`, `/teams/{teamId}/channels/{channelId}/members` |
| List team tags | `fetch` | `/teams/{teamId}/tags` |
| Read one tag | `fetch` | `/teams/{teamId}/tags/{tagId}` (only when the list lacks the requested fields) |
| List a tag's members | `fetch` | `/teams/{teamId}/tags/{tagId}/members` |

For a read-only list, resolve the team/channel, then answer from the returned
`displayName` and identity data. Do not add `$top` or select `email`/`userId`.

## Members and mentions

- For a membership write or an `@mention`, identify the person in the scoped
  membership, then resolve their directory user ID through `/users/{exact-UPN}` or
  the [exact directory-person contract](people-work-iq.md#exact-directory-person-lookup).
  If it cannot be resolved safely, use plain-text addressing when acceptable or
  stop and report the limitation.
- Membership changes and tag changes use the
  [members actions route](teams-members-actions-work-iq.md).
