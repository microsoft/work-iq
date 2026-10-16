# Reminders

## Required before use

- [calendar-base-work-iq](calendar-base-work-iq.md)
- [call-function-work-iq](call-function-work-iq.md)

## Reminders

- **Intent/prerequisites:** determine today, remaining workday, or rolling
  24-hour window using the rules above. Establish requested calendar coverage.
- **Operation/query:** `call_function`, not `fetch`. The inherited candidate
  syntax is `/me/reminderView(startDateTime='...',endDateTime='...')`.
  Confirm the deployed GET function's live path and inline parameter syntax
  with `get_schema` (and focused `search_paths` if necessary) before using
  unvalidated details; URL-encode resolved timestamp values once. No body.
- **Effects/completion:** read-only reminders, not a meeting listing. Interpret
  only returned reminder fields and documented boundaries.
- **Coverage/failures:** actual multi-calendar reminder coverage is **unverified**
  by these examples. Disclose that limitation; never claim the default calendar
  listing or a single reminder function is equivalent to reminders across all
  calendars. Do not invent per-calendar reminder paths. If the required
  coverage cannot be established, report that rather than silently substituting
  ordinary events. Denials stop; read transient recovery stays bounded.
