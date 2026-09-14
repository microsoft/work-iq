# Detect + Gather Inputs (Phases 0, 2)

> All scripts live in the skill's `scripts/` folder. Set `$SsoScripts` once to that folder's
> absolute path, then invoke each script with `pwsh -NoProfile -File "$SsoScripts/<name>.ps1"`.
> State flows between phases through `env/.env.local`, so the scripts need almost no arguments.

## Phase 0 — Workspace check

```powershell
pwsh -NoProfile -File "$SsoScripts/detect-project.ps1"
```

Confirms a `ui-widget-developer` layout (`appPackage/mcpPlugin.json` + an MCP server folder with `@modelcontextprotocol/sdk`) and STOPS (non-zero exit) if it isn't one.

**Tell the user:**
> **Detected your ui-widget agent.** I'll add Entra SSO without touching your widget code — register an Entra app, reuse your existing dev tunnel, add a small token-validation guard to your MCP server, wire the auth into `mcpPlugin.json`, then sideload and verify. No OBO.

## Phase 2 — Gather inputs + reuse the existing tunnel

```powershell
pwsh -NoProfile -File "$SsoScripts/gather-inputs.ps1"
```

Derives the Entra app display name (persisted as `SSO_APP_DISPLAY_NAME`) and reads the EXISTING dev tunnel (`MCP_SERVER_URL` / `MCP_SERVER_DOMAIN` / `DEVTUNNEL_NAME` / `DEVTUNNEL_PORT`) from `env/.env.local`.

> If it reports **no `MCP_SERVER_URL`**, the ui-widget devtunnel isn't running — ask the user to start it (`npm run tunnel` / `tunnel:win`) then re-run. Only if they choose to proceed, create ONE tunnel:
> ```powershell
> pwsh -NoProfile -File "$SsoScripts/create-tunnel.ps1"
> ```
