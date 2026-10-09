# Teams members, tags, and presence

Use with `references/teams-routing.md` (lookups, **Which ID goes where**,
**Member body**, write outcomes). This file covers team and channel
membership, team tags, and presence.

## Paths

| Operation | Tool | Path and body |
| --- | --- | --- |
| List team or channel members/owners | `fetch` | `/teams/{teamId}/members`, `/teams/{teamId}/channels/{channelId}/members` |
| Add people to a team | `do_action` | `/teams/{teamId}/members/add`, `{"values":[member bodies]}` |
| Add a channel member or owner | `create_entity` | parentUrl `/teams/{teamId}/channels/{channelId}/members`, **member body** |
| Change a team or channel member's role | `update_entity` | `/teams/{teamId}/members/{membershipId}` or `/teams/{teamId}/channels/{channelId}/members/{membershipId}` with `{"@odata.type":"#microsoft.graph.aadUserConversationMember","roles":["owner"]}` (`[]` for a regular member) |
| Remove a team member | `delete_entity` | `/teams/{teamId}/members/{membershipId}` |
| List team tags | `fetch` | `/teams/{teamId}/tags` |
| Read one tag | `fetch` | `/teams/{teamId}/tags/{tagId}` (only when the list lacks the requested fields) |
| Create a tag | `create_entity` | parentUrl `/teams/{teamId}/tags`, `{"displayName":"{tagName}","members":[{"userId":"{directoryUserId}"}]}` |
| List a tag's members | `fetch` | `/teams/{teamId}/tags/{tagId}/members` |
| Add a person to a tag | `create_entity` | parentUrl `/teams/{teamId}/tags/{tagId}/members`, `{"userId":"{directoryUserId}"}` |
| Remove a person from a tag | `delete_entity` | `/teams/{teamId}/tags/{tagId}/members/{tagMemberId}` |
| Delete a tag | `delete_entity` | `/teams/{teamId}/tags/{tagId}` |
| Read presence | `fetch` | `/me/presence`, `/users/{id-or-UPN}/presence` (batch several people in one `fetch`) |
| Set my presence | `do_action` | `/me/presence/setUserPreferredPresence` with `{"availability":"Busy","activity":"Busy","expirationDuration":"PT1H"}` |
| Reset presence to automatic | `do_action` | `/me/presence/clearUserPreferredPresence` with `{}` |
| Set or clear a status message | `do_action` | `/me/presence/setStatusMessage` (body below) |

## Members and mentions

- For a read-only list, answer from the returned `displayName` and identity
  data.
- For a membership write or an `@mention`, identify the person in the scoped
  membership, then resolve their directory user ID through `/users/{exact-UPN}`
  or the exact-name lookup in **Finding a chat — by person**. If it cannot be
  resolved safely, use plain-text addressing when acceptable or stop and
  report the limitation.
- Tag payloads use directory user IDs only; omit `displayName`, `roles`, and
  `user@odata.bind` from them.
- To find messages that @mention the user, fetch the messages without
  `$select` (so `mentions` is returned) and match `mentions[].mentioned.user.id`
  to the user's id from `/me`; do not put `mentions` or `replyToId` in `$select`.

## Presence

- `setUserPreferredPresence` is the route for user requests. `setPresence` is
  the application-session variant and requires a `sessionId`; use it only if
  you have one, and do not cycle between presence endpoints.
- Preferred presence only shows while the user has an active Teams session
  (per Graph docs), so an `Offline` read after a successful set is expected.
- "Reset my status" or "back to automatic" means
  `clearUserPreferredPresence`; never set `Available` instead.
- Status message body:
  `{"statusMessage":{"message":{"content":"{text}","contentType":"text"},"expiryDateTime":{"dateTime":"{localDateTime}","timeZone":"{windowsOrIanaZone}"}}}`.
  Omit `expiryDateTime` when no end time is given and do not add
  `@odata.type`. Clear it by sending an empty `content`.
- Work location (today's location or showing a location in presence): see
  `references/teams-lifecycle-settings.md`.
