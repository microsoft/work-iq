# Teams query limits and read discipline

## Required before use

- [teams-targets-work-iq](teams-targets-work-iq.md)

## Query limits

Generic advice to add `$select`, `$top`, `$filter` or `$orderby` does not apply
uniformly to Teams. These are deployed WorkIQ constraints; when this table
conflicts with generic query guidance, this table wins.

| Path | Supported approach | Do not send |
| --- | --- | --- |
| `/me/joinedTeams` | `$select` only (`$select=id,displayName`, plus fields such as `description` when needed); never `$top`, even when batched | `$top` |
| `/teams/{teamId}/channels` | `$select=id,displayName` (add `membershipType` when needed) | `$top` |
| `/teams/{teamId}/incomingChannels` | The base collection | `$select` |
| `/teams/{teamId}/members`, `/teams/{teamId}/channels/{channelId}/members` | Base `conversationMember` fields; for owners only, `$filter=roles/any(r:r eq 'owner')` | `$top`; `email`, `userId` or `tenantId` in `$select` |
| `/chats/{chatId}/members` | The unfiltered collection | Any query string |
| `/teams/{teamId}/tags`, `/teams/{teamId}/tags/{tagId}/members` | The base collection | Any query string |
| `/me/chats` | `$expand=members` without nested projection; the exact-topic or `chatType` `$filter` in [targets](teams-targets-work-iq.md); `members/any` only on `displayName` | `$orderby=lastUpdatedDateTime`; `$skip`; nested `$select` inside `$expand=members(...)`; `members/any` on `userId` or `email` |
| `/chats/{chatId}/messages` | Fetch, then filter or sort locally | `$top`; created-date filters; `$search` |
| `/teams/{teamId}/channels/{channelId}/messages` | Fetch, then filter locally | `$top`; `$filter` (including `createdDateTime` ranges); `$orderby`; `$search`; `$skiptoken`; `replyToId` in `$select`; nested `$select` inside `$expand=replies(...)` |
| Any message read that needs `attachments`, `reactions`, `mentions` or `importance` | Omit `$select` entirely | Those fields in `$select` |
| `/chats/{chatId}/pinnedMessages` | `$expand=message` | `$select`, including nested `$select` in the expansion |
| `/chats/{chatId}/tabs`, `/teams/{teamId}/channels/{channelId}/tabs` | `$expand=teamsApp` | `$top` |
| `.../installedApps`, `/me/teamwork/installedApps`, `/users/{id}/teamwork/installedApps` | `$expand=teamsAppDefinition` | `$top` |
| `/me/presence`, `/users/{id-or-UPN}/presence` | The presence resource directly | `$select` |
| `/me/settings/workHoursAndLocations/recurrences` | The collection (`daysOfWeek` is inside `recurrence.pattern`) | `$select` |
| `getAllTranscripts(...)` | No projection; select the transcript locally | `$select` |

After a `400` on a query option, use the supported approach and filter locally;
do not probe query variants.

## Read discipline

- Once an exact team, channel, chat, message, thread or meeting is confirmed,
  keep its ID. Do not inspect another same-named container unless the selected
  one is disproven.
- When a collection response already has every requested field, use it; do not
  fetch each item again for enrichment.
- Before batching, read [batch mechanics](fetch-work-iq.md#batches-paging-and-host-caps).
  Retain successful entries even when one URL fails; do not re-fetch them.
- Start with minimal fields; request message bodies, meeting details or app
  definitions only for selected items.
- For ordinary reads, a page or two is enough; answer from them and say the
  result is partial. Unless complete coverage is requested, do not follow
  `@odata.nextLink` for dozens of pages, and never replay or rewrite a rejected
  `$skiptoken`.
