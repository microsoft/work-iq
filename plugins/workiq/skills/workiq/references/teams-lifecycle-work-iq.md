# Teams details, settings and work hours

## Required before use

- [teams-query-limits-work-iq](teams-query-limits-work-iq.md)

## Teams and channels

| Operation | Tool | Path |
| --- | --- | --- |
| Description, visibility, archived state | `fetch` | `/teams/{teamId}?$select=id,displayName,description,visibility,isArchived` |
| What members may do (channels, apps, tabs, messages) | `fetch` | `/teams/{teamId}?$select=memberSettings,messagingSettings` (both groups in one fetch) |
| Every channel with membership type | `fetch` | `/teams/{teamId}/allChannels?$select=id,displayName,membershipType` |
| Organization-wide Teams settings | `fetch` | `/teamwork`, at most once; it needs admin consent, so on access denied say the setting needs a Teams admin and never guess a region |

Answer settings questions from the returned booleans
(`memberSettings.allowCreateUpdateChannels`, `allowCreatePrivateChannels`,
`allowDeleteChannels`; `messagingSettings.allowUserEditMessages`,
`allowUserDeleteMessages`). When a channel email address is requested, report the
returned `email`; an empty value means no address is provisioned.

## Inventory across teams

- **Channels and owners across my teams:** fetch
  `/me/joinedTeams?$select=id,displayName` once (never `$top`), then batch each team's
  `/teams/{teamId}/allChannels` (plus
  `/teams/{teamId}/installedApps?$expand=teamsAppDefinition` when apps are asked
  for) in one `fetch`. Standard channels inherit team owners: read
  `/teams/{teamId}/members?$filter=roles/any(r:r eq 'owner')` once per team, and
  read channel members only for private or shared channels. Report a team that
  returns 403 or another 4xx as inaccessible and continue.
- **Every team I can reach, including through shared channels:** fetch
  `/me?$select=id` with `/me/joinedTeams?$select=id,displayName` (never `$top`), then
  `/users/{id}/teamwork/associatedTeams` (the `/me/teamwork/...` form is denied).
  Teams in `associatedTeams` but not `joinedTeams` are shared-channel-only access.

## Work hours and location

Fetch `/me/settings/workHoursAndLocations/recurrences` for working hours, days and
default location; the base `/me/settings/workHoursAndLocations` does not list
hours. Recurrences hold one weekly entry per workday with `start`/`end` in the
user's time zone and `workLocationType` (`unspecified` means no default location).
Changes use the [lifecycle actions route](teams-lifecycle-actions-work-iq.md).
