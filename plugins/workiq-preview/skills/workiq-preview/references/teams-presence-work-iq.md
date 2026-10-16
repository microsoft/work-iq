# Teams presence and sync

## Presence and sync

Read `/me/presence` or `/users/{id}/presence` with `fetch`. For preferred presence,
confirm requested status/duration then `do_action`
`/me/presence/setUserPreferredPresence` with
`{"availability":"Busy","activity":"Busy","expirationDuration":"PT1H"}`.
`/me/presence/setPresence` is the application-session variant needing sessionId,
not an alternative after a failed preferred-presence write. No ambiguous replay
or denial bypass; a supported current-state read need not prove causation.

For explicit channel delta use `call_function`
`/teams/{teamId}/channels/{channelId}/messages/delta`. Preserve checkpoints,
next/delta links and removals under [functions](call-function-work-iq.md).
No checkpoint means initial sync, not changes since an arbitrary date. Semantic
catch-up does not automatically mean delta.
