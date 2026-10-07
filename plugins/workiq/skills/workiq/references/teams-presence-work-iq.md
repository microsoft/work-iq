# Teams presence

## Presence

- "Set my presence to Busy/Away/DoNotDisturb" → `do_action` on
  `/me/presence/setUserPreferredPresence` with
  `{"availability": "Busy", "activity": "Busy", "expirationDuration": "PT1H"}`.
  This is the user-preferred presence and the right route for user requests.
- `/me/presence/setPresence` is the **application session** variant and requires a `sessionId` —
  only use it if you have one. If a presence write has an ambiguous result, do
  not replay it; fetch the current presence when possible and otherwise report
  the outcome as indeterminate. Do not cycle through alternate presence
  endpoints.

### Set my Teams presence to Busy
```json
{
  "actionUrl": "/me/presence/setUserPreferredPresence",
  "jsonBody": "{\"availability\":\"Busy\",\"activity\":\"Busy\",\"expirationDuration\":\"PT1H\"}"
}
```

Use `setUserPreferredPresence` for user requests ("set me to Busy"). The `setPresence` action is the application-session variant and requires a `sessionId` — don't fall back to it without one.
