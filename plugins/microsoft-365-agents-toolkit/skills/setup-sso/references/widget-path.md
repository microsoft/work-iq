# Widget Path — SSO for MCP-server widget agents (MCP Apps / OAI Apps)

> This is the **widget branch** of `setup-sso`. The main `SKILL.md` Phase 0 dispatches here after it
> detects a widget-shaped project — a Declarative Agent whose tools are served by an MCP server that
> renders a UI widget. It supports **both** widget standards:
> - **MCP Apps** (Express): a `runtimes[]` plugin manifest such as `appPackage/readiness_plugin.json`
>   (or another `*_plugin.json` with a `runtimes[]` block) and an **Express**-based MCP server.
> - **OAI Apps** (raw-http): `appPackage/mcpPlugin.json` and a **raw-http** MCP server under
>   `mcp-server/` (no express, no express-jwt).
>
> Both provide a **named devtunnel that is already running** and `env/.env.local`. This branch
> auto-detects the layout (server framework + plugin manifest) and adapts the manifest patch and
> guard injection accordingly — it never re-scaffolds, so the user's server stays intact.

> **New to how SSO works here?** Read [`references/sso-explained.md`](references/sso-explained.md)
> first — it covers what SSO gives you (verified identity, not downstream access), the end-to-end
> token flow, how claims reach your tools via `claimsStore`, failure modes, and how to go further
> with OBO / Microsoft Graph. This file is the procedural runbook; that doc is the mental model.

> **CRITICAL EXECUTION RULES — READ BEFORE PROCEEDING:**
> - Execute every `az`, `devtunnel`, `atk`, `npm`, and PowerShell command in the TERMINAL yourself. Do NOT tell the user to run them.
> - Do NOT improvise alternate approaches for the Entra/ATK steps — reuse the shared reference files under `references/`.
> - Execute commands ONE AT A TIME, check output, diagnose failures, retry — never skip.
> - **NO SCRATCH FILES — PATTERN-BASED, NOT NAME-BASED**: Run commands **directly** in the terminal and keep all state in shell variables. NEVER create a file whose purpose is to capture, stage, or read back command output — *regardless of its name or extension* (`.txt`, `.json`, `.log`, `.ps1`, …). This ban covers redirecting with `>`, `Out-File`, `Tee-Object`, or `Set-Content` so you can read the result later. **Permitted exception:** a short-lived temp file used *only* to pass a request body to `az rest --body @file` (as the shared reference files do) — written immediately before the call and deleted immediately after with `Remove-Item`; it never captures or reads back output. Concrete violations that are FORBIDDEN: `atk provision ... > atk_prov_out.txt`, `az ad app show ... > appverify.json`, plus `sso-step*.ps1`, `sso-*.log`, `sso-*.txt`, `sso-state.json`, `*-precheck.txt`, `server-sso.*.log`, `server-pid.txt`. The ONLY files this branch writes are the ones explicitly shown in its phases (`auth.ts`, edits to the plugin manifest (`mcpPlugin.json` / `readiness_plugin.json`) / `declarativeAgent.json` / `env/.env.local` / `m365agents.local.yml` / `m365agents.yml` / the MCP server entry file). Do NOT delete or alter the widget project's own files (`tunnel.log`, `server.log`, `pids.txt`, etc.).
> - **TERMINAL OUTPUT LAGS? DO NOT REDIRECT TO A FILE.** If the terminal renders "one step behind", capture the output into a variable in the SAME shell and print it — no file: `$out = az ad app show --id $ClientId 2>&1 | Out-String; $out`. For `atk provision`, do NOT scrape stdout at all — read the generated values straight from `env/.env.local`. Re-running a read-only query (`az ... show`) is always safe. Inventing a file to work around lag is never acceptable.
> - **TERMINAL RULES**: Background/separate terminals get a fresh shell with NO inherited variables. Use **literal values** (e.g., `devtunnel host myapp-tunnel`) in those terminals. Never put short timeouts on `az` commands.

> **FORMATTING RULES:**
> - When you need a decision or input from the user, ask it with the **ask-questions tool** — one structured question at a time. Do NOT bury questions in prose.
> - Render every **"Tell the user"** note as a markdown blockquote (`>` prefix); do NOT flatten it into a paragraph.

## Scope Guardrails

- **SSO only**: Entra app registration + ATK OAuth registration + plugin-manifest (`mcpPlugin.json` / `readiness_plugin.json`) auth wiring + minimal token validation + sideload.
- **No OBO**: do NOT add downstream delegated token exchange / Microsoft Graph calls.
- **Minimal touch**: do NOT refactor the widget or rewrite the MCP server to express. Only add a small JWKS guard + a per-request claims store.
- **One tunnel**: REUSE the tunnel the widget project already created. Never create a second tunnel on the same port.

---

## Widget Phase A — Confirm layout (EXECUTE)

The main `SKILL.md` already classified this as a widget project. Re-confirm the exact layout (Express
vs raw-http; which plugin manifest) so the later steps adapt correctly.

▶ Run the **Phase 0** step in [`references/detect-and-inputs.md`](references/detect-and-inputs.md) — it
detects the widget layout (server framework + plugin manifest) and STOPS if the project is not a
widget MCP-server output.

---

## Widget Phase B — Prerequisites (EXECUTE)

> **Windows only** — refresh PATH in the current PowerShell session (skip on macOS/Linux):
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

**Set `$SsoScripts`** to this skill's `scripts/` folder (absolute path). Every phase runs its logic via `pwsh -NoProfile -File "$SsoScripts/<name>.ps1"` — the scripts carry state through `env/.env.local`, so you rarely pass arguments:
```powershell
$SsoScripts = "<absolute path to the setup-sso skill>/scripts"
```

| Tool | Check | Auto-install |
|------|-------|--------------|
| Azure CLI | `az version` | `winget install Microsoft.AzureCLI` |
| ATK CLI (>=1.1.8) | `atk --version` | `npm install -g @microsoft/m365agentstoolkit-cli` |
| Dev Tunnel CLI | `devtunnel --version` | `winget install Microsoft.devtunnel` |
| Node.js (>=20) | `node --version` | `winget install OpenJS.NodeJS.LTS` |

After installing any tool, refresh PATH with the snippet above. Tag CLI usage once: `$env:ATK_CLI_SKILL = "true"`.

---

## Widget Phase C — Gather Inputs + Reuse Existing Tunnel (EXECUTE)

▶ Run the **Phase 2** step in [`references/detect-and-inputs.md`](references/detect-and-inputs.md) — derives the Entra app display name and reuses the EXISTING dev tunnel from `env/.env.local` (never creates a second one).

---

## Widget Phase D — Register + Configure the Entra App (EXECUTE)

▶ Execute [`references/register-app.md`](references/register-app.md) — creates the single-tenant Entra app + service principal + redirect URI, injects `oauth/register` and provisions with `--env local` (yielding the Auth ID + Application ID URI), then sets the App ID URI, v2 tokens, the `access_as_user` scope, and pre-authorizes M365 Copilot. Graph `User.Read` + admin consent stay **opt-in** (OBO only).

---

## Widget Phase E — Wire SSO + Inject Guard + Write Env (EXECUTE)

▶ Execute [`references/wire-and-guard.md`](references/wire-and-guard.md) — flips the plugin manifest (`mcpPlugin.json` / `readiness_plugin.json`) runtime auth to `OAuthPluginVault` (+ conditional starters), adds `jose`, copies the hardened guard from [`references/auth.ts`](references/auth.ts) and inserts it into the `/mcp` handler (+ CORS), and writes `TENANT_ID` / `CLIENT_ID` / `APP_ID_URI` for the server. Includes the Azure/Easy Auth deployment note.

---

## Widget Phase F — Build, Verify, Clean Up (EXECUTE)

▶ Execute [`references/build-verify-cleanup.md`](references/build-verify-cleanup.md) — builds + re-provisions + `atk validate`/`atk install` (sideload), starts the server (with `SSO_DEBUG=1`) and verifies an unauthenticated `/mcp` POST returns **401**, then cleans up SSO scratch.

---

## 🎉 FINAL SUMMARY (render DIRECTLY in your reply — NOT inside a code fence)

> Output the following structure as plain markdown in your chat reply. Do NOT wrap it in ``` ``` fences. Fill every `<placeholder>` with the actual value gathered during the run; mark unknowns `N/A`. Use **bold-label bullets** (shown below) — do NOT convert to a markdown table, since some chat surfaces render tables inconsistently.

# 🎉 ✅ SSO Setup Complete — widget agent

## What changed (minimal-touch, no OBO)
- Registered an Entra app and ATK OAuth (MicrosoftEntra) configuration.
- Reused the EXISTING dev tunnel — no second tunnel created.
- Added a JWKS bearer-token guard to the MCP server (new `auth.ts` + a guard in the `/mcp` handler).
- Switched the plugin manifest runtime auth from `None` → `OAuthPluginVault`.
- Wrote `TENANT_ID` / `CLIENT_ID` / `APP_ID_URI` into `env/.env.local`.
- Re-provisioned, validated, and sideloaded the agent.

## App registration details
- **App display name:** `<AppDisplayName>`
- **Client ID:** `<ClientId>`
- **Object ID:** `<ObjectId>`
- **Tenant ID:** `<TenantId>`
- **Auth configuration ID (SSO):** `<AuthId>`
- **Application ID URI:** `<AppIdUri>`
- **Scope:** `<AppIdUri>/access_as_user`
- **Backend (reused tunnel):** `<BaseUrl>`
- **Tunnel name:** `<TunnelName>`
- **Local port:** `<Port>`

## Changed files
- `<AppPackageDir>/<plugin manifest>` — runtime auth (`mcpPlugin.json` or `readiness_plugin.json`)
- `<McpServerDir>/src/auth.ts` — new
- `<McpServerDir>/src/index.ts` (or `main.ts`) — guard + CORS header + success-path log
- `<McpServerDir>/package.json` — `jose` dep
- `env/.env.local` — `TENANT_ID` / `CLIENT_ID` / `APP_ID_URI`
- `m365agents.yml` — `oauth/register`

## Deployment note — Azure (Easy Auth)
`auth.ts` is for **local dev/testing** only. When you host the MCP server on **Azure App Service**, use the platform's built-in **Easy Auth** instead of the custom guard. **Reproduce this entire block in your summary — do NOT paraphrase it away.** Configure **App Service → Authentication → Microsoft Entra identity provider** with:
- **App registration:** the Entra app this skill created (`<ClientId>`) — do not create a new one.
- **Supported account types:** Single tenant.
- **Issuer URL:** `https://login.microsoftonline.com/<TenantId>/v2.0`
- **Allowed token audiences:** `<ClientId>` — the **bare client-id** form (NOT `api://…`), else `401`.
- **Client application requirement:** *Allow requests from specific client applications* → add BOTH `<ClientId>` **and** `ab3be6b7-f5df-413d-ac2d-abf1e3fd9c0b` (M365 Copilot host). Missing the host id → `403` even with a valid token.
- **Unauthenticated action:** Return HTTP 401.

📄 **Full field-by-field guide**: **[`references/easy-auth.md`](references/easy-auth.md)** — cite it by name in the summary. Also include:
- [Authentication and authorization in Azure App Service](https://learn.microsoft.com/azure/app-service/overview-authentication-authorization)
- [Configure MCP server authorization in Azure App Service](https://learn.microsoft.com/azure/app-service/configure-authentication-mcp)

## ⚠️ Caveat — if your dev tunnel URL changes later
The OAuth registration's base URL, the Application ID URI, and the Entra app's `identifierUris` are all tied to the **current dev tunnel domain**. If that tunnel URL changes, authentication will break. Re-sync with `pwsh -NoProfile -File "$SsoScripts/resync-tunnel-url.ps1"` (or just re-run `/setup-sso`) so the OAuth base URL + App ID URI match the new tunnel, then restart the server and re-test.

---

## Notes & Error Handling

> **Concepts, behavior & failure modes** are documented in
> [`references/sso-explained.md`](references/sso-explained.md) — including the runtime token flow, the
> `aud`/`iss` validation rules, the `claimsStore` per-request identity pattern, a symptom→cause table,
> and how to extend to OBO / Microsoft Graph. Start there when debugging or when you need to
> understand *why* a phase does what it does.

- **Two tunnels?** This branch reuses the tunnel from `env/.env.local`. If you ever see a second tunnel, stop it and keep the named one the widget project created.
- **Dev tunnel URL changed → auth suddenly broken.** The OAuth registration is created with `baseUrl: ${{MCP_SERVER_URL}}`, ATK derives the Application ID URI from that tunnel domain, and it's written into the Entra app's `identifierUris`. If the tunnel URL changes (deleted/recreated, expired, new name/port, different machine), the token audience stops matching and every authenticated call fails. **Recovery:** run `pwsh -NoProfile -File "$SsoScripts/resync-tunnel-url.ps1"` from the project root — it detects the new URL (or pass `-NewUrl https://...`), updates `MCP_SERVER_URL`/`MCP_SERVER_DOMAIN`, and re-runs the register/update/wire steps so the OAuth base URL, App ID URI, `identifierUris`, and plugin manifest all realign. Then restart the server against the new tunnel and re-test.
- **401 in Copilot (not local):** server audience must equal `$AppIdUri` and issuer tenant `$TenantId` — confirm `env/.env.local` and that the server loads it. (See §5 of `sso-explained.md`.)
- **Plugin manifest vs `ai-plugin.json`:** this branch is for the widget `mcpPlugin.json` / `readiness_plugin.json` runtimes[] layout; `ai-plugin.json` (express-jwt) projects use the main MCP-server path in `SKILL.md`, not this branch.
- **No OBO here.** For Microsoft Graph / downstream APIs, use a separate OBO flow later (out of scope). See §7 of `sso-explained.md` for what that delta looks like.
