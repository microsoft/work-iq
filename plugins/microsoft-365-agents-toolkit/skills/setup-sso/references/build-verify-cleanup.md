# Build + Verify + Clean Up (Phases 9, 10, 11)

## Phase 9 — Build, re-provision, validate, sideload

```powershell
pwsh -NoProfile -File "$SsoScripts/build-sideload.ps1"
```

Builds the MCP server with the guard, re-provisions with `--env local`, then `atk validate` + `atk install` (sideload) the app package.

## Phase 10 — Start the server + verify 401

Start the server in a SEPARATE terminal with `SSO_DEBUG=1` (so the per-request `[auth]` proof line prints — it's gated off by default so it never logs identifiers in production):
```powershell
$env:SSO_DEBUG = "1"; node dist/index.js
```

Then verify an unauthenticated `/mcp` POST is rejected:
```powershell
pwsh -NoProfile -File "$SsoScripts/verify-401.ps1"
```
Expect `VERIFIED: 401 Unauthorized`. If you see `WARNING: Got 200`, the Phase 7 guard isn't wired into the `/mcp` handler — recheck that insertion.

## Phase 11 — Clean up SSO scratch

```powershell
pwsh -NoProfile -File "$SsoScripts/cleanup.ps1"
```

Removes only transient SSO scratch (`sso-*.log` / `.txt` / `.ps1`, `server-sso.*.log`, `server-pid.txt`, `sso-state.json`) and strips the build-time `SSO_` helper keys from `env/.env.local` — leaving `TENANT_ID` / `CLIENT_ID` / `APP_ID_URI` and the ui-widget logs (`tunnel.log` / `server.log` / `pids.txt`) intact.
