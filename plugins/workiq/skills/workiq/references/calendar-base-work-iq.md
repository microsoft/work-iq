# Calendar prerequisites

Known-date listings use `fetch` `/me/calendarView` with the requested start/end,
not `ask`. Resolve each boundary's UTC offset for its own requested date and
timezone; do not reuse today's offset across daylight-saving transitions.
Preserve recurrence/instance intent and clarify a genuinely missing date or
referent rather than inventing "that week" or "these attendees".

Exact event reads and comparison sets must verify identity, participant and time
constraints. Read the selected event's body for agenda, not an unrelated meeting.
For actions, establish intent, resolve exact event/recipient IDs, verify organizer
status where required, prepare and obtain required confirmation. `202` means
accepted/pending. No replay after ambiguous results; see [recovery](troubleshooting.md).
