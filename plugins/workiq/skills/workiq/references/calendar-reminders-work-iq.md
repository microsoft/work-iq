# Reminders

## Required before use

- [calendar-base-work-iq](calendar-base-work-iq.md)
- [call-function-work-iq](call-function-work-iq.md)

## Reminders

- **Intent/prerequisites:** determine today, remaining workday, or rolling
  24-hour window using the [date/window rules](calendar-base-work-iq.md).
  Establish requested calendar coverage.
- **Operation/query:** `call_function`, not `fetch`. The inherited candidate
  syntax is `/me/reminderView(startDateTime='...',endDateTime='...')`.
  Confirm the deployed GET function's live path and inline parameter syntax
  with `get_schema` (and focused `search_paths` if necessary) before using
  unvalidated details; URL-encode resolved timestamp values once. No body.
- **Effects/completion:** read-only reminders, not a meeting listing. Interpret
  only returned reminder fields and documented boundaries. State the window,
  timezone and any bound assumption; retain date/window prerequisites.
- **Inventory:** inspect every returned reminder, including the exact file when
  a tool says `Saved to:`, and follow relevant `@odata.nextLink` pages for a
  complete view. Filter by reminder trigger time, not solely by event start.
  Report every matching reminder with its source-backed subject and
  reminder/start times; do not drop matching records as examples.
- **Empty versus unavailable:** a successful, adequately covered read with zero
  matching reminders supports an explicit zero-match result for the selected
  scope. A failed/null read, unusable response, missing required timestamps or
  unresolved relevant pages does not. State that failure or partial coverage,
  not a fabricated empty view.
- **Coverage/failures:** actual multi-calendar reminder coverage is **unverified**
  by these examples. Disclose that limitation; never claim the default calendar
  listing or a single reminder function is equivalent to reminders across all
  calendars. Do not invent per-calendar reminder paths. If the required
  coverage cannot be established, report that limitation separately from the
  known matching reminders or supported zero-match result. Do not replace the
  result with only "I cannot confirm your reminders" or silently substitute
  ordinary events. Denials stop; read transient recovery stays bounded.
