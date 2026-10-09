# Teams lifecycle, channels, and work settings

Use with `references/teams-routing.md` (lookups, **Member body**, write
outcomes). This file covers team details and settings, archiving, channels,
cross-team inventory, and work hours and location.

## Teams

| Operation | Tool | Path and body |
| --- | --- | --- |
| Description, visibility, archived state | `fetch` | `/teams/{teamId}?$select=id,displayName,description,visibility,isArchived` |
| What members may do (channels, apps, tabs, messages) | `fetch` | `/teams/{teamId}?$select=memberSettings,messagingSettings` (both groups in one fetch) |
| Change description (owner) | `update_entity` | `/teams/{teamId}` with only `{"description":"{text}"}` |
| Archive (owner) | `do_action` | `/teams/{teamId}/archive` with `{"shouldSetSpoSiteReadOnlyForMembers":false}` (or `{}`); send `true` only when the user asks to make the site read-only |
| Unarchive (owner) | `do_action` | `/teams/{teamId}/unarchive` with `{}` |
| Organization-wide Teams settings | `fetch` | `/teamwork`, at most once; it needs admin consent, so on access denied say the setting needs a Teams admin and never guess a region |

Answer settings questions from the returned booleans
(`memberSettings.allowCreateUpdateChannels`, `allowCreatePrivateChannels`,
`allowDeleteChannels`; `messagingSettings.allowUserEditMessages`,
`allowUserDeleteMessages`).

## Channels

| Operation | Tool | Path and body |
| --- | --- | --- |
| Every channel with membership type | `fetch` | `/teams/{teamId}/allChannels?$select=id,displayName,membershipType` |
| Update a channel's description or name | `update_entity` | `/teams/{teamId}/channels/{channelId}` with only the changed field, such as `{"description":"{text}"}` or `{"displayName":"{name}"}` (private channels you belong to are listed by **Finding a channel**) |
| Create a private channel | `create_entity` | parentUrl `/teams/{teamId}/channels`, `{"displayName":"{name}","membershipType":"private","members":[...]}` with a **member body** per person: the caller `["owner"]`, others `[]` |
| Create a shared channel | `create_entity` | parentUrl `/teams/{teamId}/channels`, `{"displayName":"{name}","membershipType":"shared"}`, with at most one owner (the caller) in `members` |
| Archive or unarchive a channel | `do_action` | `/teams/{teamId}/channels/{channelId}/archive` or `/unarchive` with `{}` |

- **Check the roster after creating a private channel with members:** the
  create response doesn't confirm the roster. If the user asked for other members,
  read the new channel's `/members` once and add anyone missing (see
  `references/teams-members-presence.md`).
- **Create a shared channel and add people:** the create returns 202 with no
  ID, and only the caller can be an owner in the create body (listing more
  returns 400). Follow these steps:
  1. `fetch` `/me/joinedTeams?$select=id,displayName` (`$select` only; never
     `$top`) and take the exact team.
  2. `create_entity` on `/teams/{teamId}/channels` with
     `{"displayName":"{name}","membershipType":"shared"}`. Don't list the
     team's channels first, and don't put other people in the body.
  3. `fetch` `/teams/{teamId}/channels?$select=id,displayName,membershipType`
     and take the exact new channel. If it isn't listed, fetch the list once
     more. If it's still missing, say the create was accepted and is still
     provisioning, and stop.
  4. For each person to add, `create_entity` on
     `/teams/{teamId}/channels/{channelId}/members` with a **member body**:
     bind the UPN the user gave directly (`users('{upn}')`, no `/users`
     lookup) and use `"roles":["owner"]` for an owner, `[]` for a member. Don't
     read the roster before the add or after the 201.

  Report a policy block honestly; never substitute a standard or private
  channel.
- When a channel email address is requested, report the returned `email`; an
  empty value means no address is provisioned.

## Inventory across teams

- **Channels and owners across my teams:** fetch
  `/me/joinedTeams?$select=id,displayName` once (`$select` only; never
  `$top`), then
  batch each team's `/teams/{teamId}/allChannels` (plus
  `/teams/{teamId}/installedApps?$expand=teamsAppDefinition` when apps are
  asked for) in one `fetch`. Standard channels inherit team owners: read
  `/teams/{teamId}/members?$filter=roles/any(r:r eq 'owner')` once per team,
  and read channel members only for private or shared channels. Report a team
  that returns 403 or another 4xx as inaccessible and continue.
- **Every team I can reach, including through shared channels:** fetch
  `/me?$select=id` with `/me/joinedTeams?$select=id,displayName` (`$select`
  only; never `$top`), then
  `/users/{id}/teamwork/associatedTeams` (the `/me/teamwork/...` form is
  denied). Teams in `associatedTeams` but not `joinedTeams` are
  shared-channel-only access.

## Work hours and work location

| Request | Tool | Path and body |
| --- | --- | --- |
| Working hours, days, default location | `fetch` | `/me/settings/workHoursAndLocations/recurrences` (the base `/me/settings/workHoursAndLocations` does not list hours) |
| Set **today's** location | `do_action` | `/me/settings/workHoursAndLocations/occurrences/setCurrentLocation` with `{"workLocationType":"office"}` (`remote` for home; valid values are `office`, `remote`, `timeOff`, `unspecified`) |
| Change a weekday **going forward** | `update_entity` | `/me/settings/workHoursAndLocations/recurrences/{recurrenceId}` (body below) |
| Show a location in presence | `do_action` | `/me/presence/setManualLocation` with `{"workLocationType":"remote"}` (`office` for the office); clear with `/me/presence/clearLocation` and `{}` |

"Show me as …" is a presence display request (`setManualLocation`); use
`setCurrentLocation` only when the user asks to set or change their work
location or work plan. Do not create work-plan occurrences for "today".

Recurrences hold one weekly entry per workday with `start`/`end` in the user's
time zone and `workLocationType` (`unspecified` means no default location). To
change a weekday going forward, update that day's existing recurrence; creating
another one fails as an overlapping segment. The PATCH must include
`workLocationType` plus `start`, `end`, and `recurrence` (pattern and range)
copied from the fetched recurrence; a body with only `workLocationType` is
rejected. The service returns the updated recurrence under a new ID:

```json
{"workLocationType":"remote","start":{"dateTime":"{existingStart}","timeZone":"{tz}"},"end":{"dateTime":"{existingEnd}","timeZone":"{tz}"},"recurrence":{"pattern":{"type":"weekly","interval":1,"daysOfWeek":["friday"]},"range":{"type":"noEnd","startDate":"{existingStartDate}","recurrenceTimeZone":"{tz}"}}}
```
