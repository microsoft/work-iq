# Teams presence and sync

## Presence and sync

Before batching presence reads, read
[batch mechanics](fetch-work-iq.md#batches-paging-and-host-caps).

Read `/me/presence` or `/users/{id}/presence` with `fetch`; batch several people
in one `fetch`. For preferred presence, resolve and confirm the requested status
and duration, then call `do_action` `/me/presence/setUserPreferredPresence`
directly, with no `get_schema` first:
`{"availability":"{availability}","activity":"{activity}","expirationDuration":"{ISO8601Duration}"}`.
The [Graph contract](https://learn.microsoft.com/en-us/graph/api/presence-setuserpreferredpresence?view=graph-rest-1.0)
supports these availability/activity pairs: `Available`/`Available`,
`Busy`/`Busy`, `DoNotDisturb`/`DoNotDisturb`, `BeRightBack`/`BeRightBack`,
`Away`/`Away` and `Offline`/`OffWork`. `expirationDuration` is optional; when the
user gives no duration, omit it (Graph applies 1 day for `Busy` and
`DoNotDisturb`, 7 days otherwise). For a status outside these pairs, report the
limitation rather than guessing.
`/me/presence/setPresence` is the application-session variant needing sessionId,
not an alternative after a failed preferred-presence write. No ambiguous replay
or denial bypass; a supported current-state read need not prove causation.
Preferred presence only shows while the user has an active Teams session (per
Graph documentation), so an `Offline` read after a successful set is expected.

"Reset my status" or "back to automatic" means `do_action`
`/me/presence/clearUserPreferredPresence` with `{}`; never set `Available` instead.
A status message uses `/me/presence/setStatusMessage` with
`{"statusMessage":{"message":{"content":"{text}","contentType":"text"},"expiryDateTime":{"dateTime":"{localDateTime}","timeZone":"{windowsOrIanaZone}"}}}`.
Omit `expiryDateTime` when no end time is given and do not add `@odata.type`;
clear it by sending an empty `content`. Read presence without `$select`.

Before channel delta, read [functions](call-function-work-iq.md).
For explicit channel delta use `call_function`
`/teams/{teamId}/channels/{channelId}/messages/delta`. Preserve checkpoints,
next/delta links and removals under [functions](call-function-work-iq.md).
No checkpoint means initial sync, not changes since an arbitrary date. For
changes since a stated time without a checkpoint, put
`$filter=lastModifiedDateTime gt {ISO8601UtcDateTime}` on the initial delta call
only, then follow the returned links; never claim "no changes" from an
unfiltered initial sync. Any `get_schema` for it uses `operationType: "fetch"`.
Semantic catch-up does not automatically mean delta.
