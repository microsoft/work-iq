# Teams lifecycle and work location changes

## Required before use

- [teams-write-contract-work-iq](teams-write-contract-work-iq.md)

## Teams and channels

After exact resolution and required confirmation:

| Operation | Tool | Path and body |
| --- | --- | --- |
| Change team description (owner) | `update_entity` | `/teams/{teamId}` with only `{"description":"{text}"}` |
| Archive a team (owner) | `do_action` | `/teams/{teamId}/archive` with `{"shouldSetSpoSiteReadOnlyForMembers":false}` (or `{}`); send `true` only when the user asks to make the site read-only |
| Unarchive a team (owner) | `do_action` | `/teams/{teamId}/unarchive` with `{}` |
| Update a channel's description or name | `update_entity` | `/teams/{teamId}/channels/{channelId}` with only the changed field (private channels you belong to are listed by the channel lookup) |
| Create a private channel | `create_entity` | `/teams/{teamId}/channels`, `{"displayName":"{name}","membershipType":"private","members":[...]}` with a member body per person: the caller `["owner"]`, others `[]` |
| Create a shared channel | `create_entity` | `/teams/{teamId}/channels`, `{"displayName":"{name}","membershipType":"shared"}`, with at most one owner (the caller) in `members` |
| Archive or unarchive a channel | `do_action` | `/teams/{teamId}/channels/{channelId}/archive` or `/unarchive` with `{}` |

- **Private channel roster:** the create response does not confirm the roster. If
  other members were requested, read the new channel's `/members` once with no
  query string and add anyone missing.
- **Shared channel:** the create returns 202 with no ID, and only the caller can
  be an owner in the create body (listing more returns 400). Fetch
  `/teams/{teamId}/channels?$select=id,displayName,membershipType` and take the
  exact new channel; if it is not listed, fetch once more, then say the create
  was accepted and is still provisioning and stop. Do not list the team's channels
  before the create or put other people in its body. Add each person with
  `create_entity` on `.../channels/{channelId}/members` and a member body that
  binds the UPN the user gave (`users('{upn}')`, no `/users` lookup); do not read
  the roster before the add or after the 201. Report a policy block honestly;
  never substitute a standard or private channel.

## Work location

| Request | Tool | Path and body |
| --- | --- | --- |
| Set **today's** location | `do_action` | `/me/settings/workHoursAndLocations/occurrences/setCurrentLocation` with `{"workLocationType":"office"}` (`remote` for home; valid values are `office`, `remote`, `timeOff`, `unspecified`) |
| Change a weekday **going forward** | `update_entity` | `/me/settings/workHoursAndLocations/recurrences/{recurrenceId}` (body below) |
| Show a location in presence | `do_action` | `/me/presence/setManualLocation` with `{"workLocationType":"remote"}` (`office` for the office); clear with `/me/presence/clearLocation` and `{}` |

"Show me as ..." is a presence display request (`setManualLocation`); use
`setCurrentLocation` only to set or change the work location or plan. Do not
create work-plan occurrences for "today". To change a weekday going forward,
update that day's existing recurrence; creating another fails as an overlapping
segment. The PATCH must include `workLocationType` plus `start`, `end` and
`recurrence` copied from the fetched recurrence; the service returns it under a
new ID:

```json
{"workLocationType":"remote","start":{"dateTime":"{existingStart}","timeZone":"{tz}"},"end":{"dateTime":"{existingEnd}","timeZone":"{tz}"},"recurrence":{"pattern":{"type":"weekly","interval":1,"daysOfWeek":["friday"]},"range":{"type":"noEnd","startDate":"{existingStartDate}","recurrenceTimeZone":"{tz}"}}}
```
