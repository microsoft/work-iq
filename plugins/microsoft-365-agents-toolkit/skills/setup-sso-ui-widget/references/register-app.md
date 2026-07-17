# Register + Configure the Entra App (Phases 3, 4, 5)

> Invoke each script with `pwsh -NoProfile -File "$SsoScripts/<name>.ps1"`. Values persist to
> `env/.env.local`, so later scripts read what earlier ones wrote.

## Phase 3 — Create the Entra app (single-tenant)

```powershell
pwsh -NoProfile -File "$SsoScripts/register-entra-app.ps1"
```

Signs in to Azure (a browser popup opens if you're not signed in — sign in once and it resumes), then creates a **single-tenant** app registration, a service principal, and the M365 Copilot redirect URI (`oAuthConsentRedirect`). Persists `TENANT_ID` / `CLIENT_ID`.

> **Single-tenant only.** This skill's guard pins the issuer to one tenant. Multi-tenant is not supported (it would require `tid`-aware issuer validation).
>
> **Restricted tenants:** some Entra tenants enforce a policy that requires a `--service-management-reference` (a service/tracking ID) on `az ad app create`. If the create call fails with such a policy error, add that flag manually to the `az ad app create` command in `register-entra-app.ps1` (or run that command yourself with the flag), then continue.

## Phase 4 — ATK OAuth registration (MicrosoftEntra), env = `local`

```powershell
pwsh -NoProfile -File "$SsoScripts/atk-oauth-register.ps1"
```

Injects the `oauth/register` (MicrosoftEntra) action into the LOCAL ATK lifecycle file (`m365agents.local.yml`), pre-seeds `env/.env.local`, provisions with `--env local`, and verifies the generated Auth ID + Application ID URI (`MCP_DA_OAUTH_AUTH_ID` / `MCP_DA_OAUTH_APP_ID_URI`).

## Phase 5 — Update the Entra app

```powershell
pwsh -NoProfile -File "$SsoScripts/update-entra-app.ps1"
```

Sets the Application ID URI, forces **v2.0** tokens, exposes the `access_as_user` scope, and pre-authorizes **M365 Copilot** (`ab3be6b7-…`) — the only client a Declarative Agent needs.

> **Graph `User.Read` + admin consent are OPTIONAL** — pure SSO identity validation needs neither (the claims come from the token itself). Only if you plan to call Microsoft Graph on the user's behalf later (OBO), re-run with `-IncludeGraph`:
> ```powershell
> pwsh -NoProfile -File "$SsoScripts/update-entra-app.ps1" -IncludeGraph
> ```
> then grant admin consent for the tenant (Azure Portal → your app → **API permissions** → **Grant admin consent**).
