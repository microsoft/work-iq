# Authentication for M365 Agent Plugins

This guide explains how to configure authentication for MCP server plugins and API plugins in your M365 Copilot agent. It covers two patterns — **Entra SSO** (sign in the current M365 user) and **third-party OAuth** (connect to an external service) — including endpoint discovery, credential acquisition, PKCE, and the `oauth/register` lifecycle step in `m365agents.yml`.

> **When to use this guide:**
> - You want your agent to sign in the current M365 user and pass their verified identity to your plugin (Entra SSO)
> - Your MCP server requires OAuth authentication (most third-party MCP servers do)
> - Your API plugin requires OAuth (not just API key auth)
> - You need to register SSO or OAuth credentials in the Teams Developer Portal via ATK

> **When NOT to use this guide:**
> - The MCP server or API is unauthenticated → use `"auth": {"type": "None"}` directly
> - You're using API key authentication → see `api-plugins.md` → *API Key Authentication* (`ApiKeyPluginVault`)

---

## Choose Your Auth Pattern

This guide covers two distinct patterns. Pick the one that matches your goal — they use **different** `identityProvider` values and are **not** interchangeable:

| Pattern | Use when | `identityProvider` | Covered in |
|---|---|---|---|
| **Entra SSO** *(recommended default)* | You want the agent to sign in the **current M365 user** and pass their verified identity to your plugin backend (single sign-on, no separate login). | `MicrosoftEntra` | [Entra SSO](#entra-sso-sign-in-the-m365-user) below |
| **Third-party OAuth** | You need to connect to an **external service** (e.g., HubSpot, Canva) that has its own OAuth server and accounts. | `Custom` | [Third-Party OAuth](#third-party-oauth-connect-to-an-external-service) |
| **API key** | The API authenticates with a static key/secret, not OAuth. | — | `api-plugins.md` → *API Key Authentication* (`ApiKeyPluginVault`) |
| **None** | The MCP server or API is unauthenticated. | — | Use `"auth": {"type": "None"}` |

> **Same wiring for API plugins and MCP servers.** The Entra SSO and OAuth setup is identical for both — only the manifest shape differs (MCP uses `runtimes[]`; the API plugin uses `functions[].capabilities`). The `oauth/register` step and the `OAuthPluginVault` reference are the same.

> **Recommendation — start with Entra SSO.** For agents acting on behalf of the signed-in M365 user, Entra SSO is the simplest and most secure default: no client secret, no external accounts, verified identity out of the box. Consider **third-party OAuth** only when you must connect to an external service with its own accounts, or when you need downstream API access but can't implement OBO.

---

## Entra SSO (Sign In the M365 User)

Use this pattern when you want the agent to authenticate the **signed-in M365 user** and pass their verified identity (claims like `name`, `oid`, `tid`) to your plugin's backend — no separate login screen. This is **single sign-on against your own Entra tenant**, not a connection to a third-party OAuth service.

> **⚡ Automate this end-to-end.** For an agent built with the `ui-widget-developer` skill (OAI Apps path — `mcpPlugin.json` + a raw-http MCP server), the **`setup-sso-ui-widget`** skill (in this same `microsoft-365-agents-toolkit` plugin) performs every step below automatically — Entra app registration, ATK OAuth, manifest wiring, JWKS token guard, and sideload. Its [`sso-explained.md`](../../setup-sso-ui-widget/references/sso-explained.md) has the runtime token-flow deep dive.

> **Same config for API plugins and MCP servers.** The Entra app registration, the `oauth/register` step, and the `OAuthPluginVault` manifest reference are identical for both. Only the location of the `auth` block in the manifest differs.

> **Scope of this section.** This covers *registration and wiring* only. For SSO to actually protect the plugin, your backend must **validate the incoming bearer token** (verify the Entra JWKS signature, `aud`, and `iss`). Token validation is out of scope here.

> **SSO ≠ downstream access (no OBO here).** Using Entra means you **don't need a client secret** — the user's identity token proves *who* is calling. But that SSO token is scoped to *your* API (`access_as_user`); it does **not** grant access to Microsoft Graph or other downstream APIs. To call those, exchange the SSO token for a downstream access token via the **On-Behalf-Of (OBO)** flow — which *does* require a client secret or certificate. **If you can't implement OBO, prefer a third-party OAuth (`Custom`) configuration — even against Entra ID — over SSO**, because SSO alone won't get you the downstream tokens you need.

### How it differs from third-party OAuth

| | Entra SSO | Third-party OAuth (Steps 1–4) |
|---|---|---|
| `identityProvider` | `MicrosoftEntra` | `Custom` |
| Client secret | Not required (ATK derives it from the tenant) | Required |
| `authorizationUrl` / `tokenUrl` | Not needed (derived from tenant) | Required |
| Who signs in | The current M365 user | An account on the external service |
| Result | Verified caller identity (no downstream access without OBO) | Delegated access to the external API |

### Step S1 — Register the Entra App

Create the Entra application, its service principal, and the M365 Copilot redirect URI. Default to **single-tenant** (`AzureADMyOrg`) unless you're shipping to external orgs (`AzureADMultipleOrgs`):

```powershell
# Create the app (single-tenant default)
$app = az ad app create --display-name "<app-display-name>" --sign-in-audience AzureADMyOrg | ConvertFrom-Json
$ClientId = $app.appId      # Application (client) ID  → AAD_APP_CLIENT_ID
$ObjectId = $app.id         # Object ID (used by the Graph /applications PATCH)
$TenantId = az account show --query tenantId -o tsv

# Service principal (required so the app can be consented/used in the tenant)
az ad sp create --id $ClientId

# M365 Copilot SSO redirect URI — note: oAuthConsentRedirect, NOT oAuthRedirect
az ad app update --id $ClientId `
  --web-redirect-uris "https://teams.microsoft.com/api/platform/v1.0/oAuthConsentRedirect"
```

> **Tenants with an app-creation policy:** some tenants require additional metadata on `az ad app create` (for example a `--service-management-reference <id>` value), and may require multiple owners on both the app and its service principal before admin consent can be granted. If your tenant enforces such a policy, `az ad app create` will fail with a policy error — add the value it asks for and retry.

### Step S2 — Register the SSO Config with ATK (`MicrosoftEntra`)

Add an `oauth/register` step to **both** `m365agents.yml` and `m365agents.local.yml`. The `MicrosoftEntra` flow only needs the **Client ID** and the **service (base) URL** — **no** `clientSecret`, `authorizationUrl`, or `tokenUrl`. ATK derives those from the tenant and writes back the generated **Application ID URI**:

```yaml
  - uses: oauth/register
    with:
      name: <slug>-sso
      flow: authorizationCode
      appId: ${{TEAMS_APP_ID}}
      clientId: ${{AAD_APP_CLIENT_ID}}
      identityProvider: MicrosoftEntra
      baseUrl: ${{<PREFIX>_SERVER_URL}}
    writeToEnvironmentFile:
      configurationId: <PREFIX>_SSO_AUTH_ID
      applicationIdUri: <PREFIX>_SSO_APP_ID_URI
```

> Pre-seed `AAD_APP_CLIENT_ID=<appId>` and empty `<PREFIX>_SSO_AUTH_ID=` / `<PREFIX>_SSO_APP_ID_URI=` in your env file **before** provisioning. Run `atk provision` (use `--env local` for local projects, which runs `m365agents.local.yml`), then read the generated `<PREFIX>_SSO_AUTH_ID` and `<PREFIX>_SSO_APP_ID_URI` back from the env file.

> **Concrete key names used by the `setup-sso-ui-widget` skill:** `<PREFIX>` and the middle segment are project-chosen. Wherever this doc shows `<PREFIX>_SSO_AUTH_ID` / `<PREFIX>_SSO_APP_ID_URI`, that skill's automation concretely uses **`MCP_DA_OAUTH_AUTH_ID`** (the `configurationId`) and **`MCP_DA_OAUTH_APP_ID_URI`** (the `applicationIdUri`).

### Step S3 — Link the Application ID URI Back to the Entra App

`oauth/register` **outputs** the Application ID URI (`<PREFIX>_SSO_APP_ID_URI`). Read it back from the env file and set it as the app's identifier URI so the ATK OAuth config and the Entra app point at the same identity:

```powershell
$AppIdUri = ((Get-Content env/.env.local | Where-Object { $_ -match '^<PREFIX>_SSO_APP_ID_URI=' }) -replace '^<PREFIX>_SSO_APP_ID_URI=','').Trim()
az ad app update --id $ClientId --identifier-uris "$AppIdUri"
```

> This link is what lets Copilot request a token whose `aud` matches the URI your backend validates. Do this **after** S2 so you use the exact URI ATK generated.
>
> **⛔ Critical — accept every audience form Entra may emit.** A real SSO token's `aud` is frequently the **bare client-id GUID**, *not* the `api://` URI — even on a `ver: 2.0` token. Validate `aud` against **all** of `[<clientId GUID>, api://<clientId>, <AppIdUri>]`. Accepting only the `api://` / Application ID URI form will **401 a valid token** and trigger the endless sign-in loop (see *SSO Behavior — 401 vs 403* below). Still reject tokens minted for a *different* app.

### Step S4 — Expose `access_as_user` and Pre-Authorize Copilot

Microsoft Graph merges the sub-properties of the `api` object, so each PATCH below updates only what it sets. Use a **temp body file** for `az rest` — inline JSON is unreliable on Windows. Use the **Object ID** from S1, and run S3 (identifier URI) first.

**1. Expose the `access_as_user` delegated scope:**

```powershell
$ScopeId = [guid]::NewGuid().ToString()
$scopeBody = @{ api = @{ oauth2PermissionScopes = @(
  @{
    id    = $ScopeId
    value = "access_as_user"
    type  = "User"
    isEnabled = $true
    adminConsentDisplayName = "Access as user"
    adminConsentDescription = "Allow the app to access the server on behalf of the signed-in user"
    userConsentDisplayName  = "Access as user"
    userConsentDescription  = "Allow the app to access the server on your behalf"
  }
) } } | ConvertTo-Json -Depth 5 -Compress

$bodyFile = [System.IO.Path]::GetTempFileName(); $scopeBody | Set-Content $bodyFile -Encoding UTF8
az rest --method PATCH --uri "https://graph.microsoft.com/v1.0/applications/$ObjectId" `
  --headers "Content-Type=application/json" --body "@$bodyFile"
Remove-Item $bodyFile -ErrorAction SilentlyContinue
```

> **Re-run safe:** if the scope already exists, read its id instead of creating a duplicate:
> ```powershell
> $existing = az ad app show --id $ClientId | ConvertFrom-Json
> $s = $existing.api.oauth2PermissionScopes | Where-Object { $_.value -eq "access_as_user" }
> if ($s) { $ScopeId = $s.id }
> ```

**2. Pre-authorize M365 Copilot for that scope.** For **declarative agents, only the M365 Copilot client** needs pre-authorization — it's the sole app that requests tokens to call your agent (identical for MCP and API-plugin agents):

```powershell
$preAuthBody = @{ api = @{ preAuthorizedApplications = @(
  @{ appId = "ab3be6b7-f5df-413d-ac2d-abf1e3fd9c0b"; delegatedPermissionIds = @($ScopeId) }  # M365 Copilot
) } } | ConvertTo-Json -Depth 5 -Compress

$bodyFile = [System.IO.Path]::GetTempFileName(); $preAuthBody | Set-Content $bodyFile -Encoding UTF8
az rest --method PATCH --uri "https://graph.microsoft.com/v1.0/applications/$ObjectId" `
  --headers "Content-Type=application/json" --body "@$bodyFile"
Remove-Item $bodyFile -ErrorAction SilentlyContinue
```

> **Only if you also reuse this app for Teams bots / message extensions** do you add the host clients below — a declarative agent does **not** need them:
> `1fec8e78-bce4-4aaf-ab1b-5451cc387264` (Teams desktop/mobile), `5e3ce6c0-2b1f-4285-8d4b-75ee78787346` (Teams web), `d3590ed6-52b3-4102-aeff-aad2292ab01c` (Office desktop), `4765445b-32c6-49b0-83e6-1d93765276ca` (Microsoft 365 web), `bc59ab01-8403-45c6-8796-ac3ef710b3e3` (Outlook desktop), `27922004-5251-4030-b22d-91ecd9a37ea4` (Outlook web).

**3. Add the Graph `User.Read` delegated permission and grant consent:**

```powershell
az ad app permission add --id $ClientId `
  --api 00000003-0000-0000-c000-000000000000 `
  --api-permissions e1fe6dd8-ba31-4d61-89e7-88639da4683d=Scope
az ad app permission admin-consent --id $ClientId   # requires an admin
```

> `00000003-0000-0000-c000-000000000000` is Microsoft Graph; `e1fe6dd8-…-88639da4683d` is the `User.Read` delegated permission ID — both fixed, well-known values.

### Step S5 — Require v2 Access Tokens

M365 Copilot SSO requires **v2.0** tokens. Set `requestedAccessTokenVersion = 2` so the `iss`, `aud`, and claim shape match what your backend validates — v1 tokens use a different issuer/claim set and fail validation:

```powershell
$verBody = @{ api = @{ requestedAccessTokenVersion = 2 } } | ConvertTo-Json -Depth 5 -Compress
$bodyFile = [System.IO.Path]::GetTempFileName(); $verBody | Set-Content $bodyFile -Encoding UTF8
az rest --method PATCH --uri "https://graph.microsoft.com/v1.0/applications/$ObjectId" `
  --headers "Content-Type=application/json" --body "@$bodyFile"
Remove-Item $bodyFile -ErrorAction SilentlyContinue
```

> Confirm your token validation accepts issuer `https://login.microsoftonline.com/<tenantId>/v2.0`. A v1/v2 token-version mismatch is a common cause of 401s in Copilot.

**Verify the registration** before wiring the manifest:

```powershell
az ad app show --id $ClientId --query "{appIdUri:identifierUris[0], tokenVersion:api.requestedAccessTokenVersion, scopes:api.oauth2PermissionScopes[].value, preAuthCount:length(api.preAuthorizedApplications), graphPerms:length(requiredResourceAccess)}" -o json
```

Expected: `appIdUri` = the ATK-generated URI, `tokenVersion` = `2`, `scopes` = `["access_as_user"]`, `preAuthCount` = `1` (M365 Copilot), `graphPerms` = `1`.

### Step S6 — Wire SSO into the Plugin Manifest

The **`auth` block is identical** for MCP servers and API plugins — only the surrounding runtime `type`/`spec` differs. Reference the ATK-generated SSO config via `OAuthPluginVault`:

```json
"auth": {
  "type": "OAuthPluginVault",
  "reference_id": "${{<PREFIX>_SSO_AUTH_ID}}"
}
```

**MCP server runtime** (`RemoteMCPServer`):

```json
{
  "type": "RemoteMCPServer",
  "auth": {
    "type": "OAuthPluginVault",
    "reference_id": "${{<PREFIX>_SSO_AUTH_ID}}"
  },
  "spec": {
    "url": "<SERVER_URL>"
  }
}
```

**API plugin runtime** (`OpenApi` — `spec.url` points to the OpenAPI file; the server URL lives in that spec's `servers[0].url`):

```json
{
  "type": "OpenApi",
  "auth": {
    "type": "OAuthPluginVault",
    "reference_id": "${{<PREFIX>_SSO_AUTH_ID}}"
  },
  "spec": {
    "url": "apiSpecificationFile/openapi.json"
  },
  "run_for_functions": [ ... ]
}
```

> The `OAuthPluginVault` block is the same shape whether the config was registered as `MicrosoftEntra` (SSO) or `Custom` (third-party OAuth) — the difference lives entirely in the `oauth/register` step, not the manifest.

### SSO Behavior — 401 vs 403 (Copilot's Consent UX)

Once SSO is wired, the HTTP status your backend returns drives Copilot's sign-in UX — this is non-obvious and a frequent source of confusion:

- **Silent by default.** Because S4 pre-authorizes M365 Copilot, the base `access_as_user` token is acquired **without a consent prompt** — users see **no sign-in button** during normal use.
- **A sign-in button appears only when your backend returns `401`.** Copilot then shows consent and **retries with the same token**.

| Your backend returns | What M365 Copilot does |
|---|---|
| **401 Unauthorized** | Shows sign-in/consent, then **retries with the same SSO token**. If your guard wrongly rejects a *valid* token, this **loops forever** — consent can't fix it because the retried token is identical. |
| **403 Forbidden** | **Stops, breaks the loop, and surfaces the error** to the user. No further retries. |

Guidance:
- Reserve **401** for "acquire / step-up consent, then retry."
- Return **403** when a retry with the same token can't succeed (authenticated but **not authorized**, or a hard policy/permission failure) — this is what stops an endless sign-in loop.

> **Endless sign-in loop = your server is returning 401 for a token it should accept.** The most common cause is an **audience mismatch**: the real token's `aud` is the bare client-id GUID, but the guard only accepts `api://<clientId>` / the Application ID URI (see S3). Accept all three forms. Consent can never fix this, so fix the guard rather than re-consenting.

### Environment Files (SSO)

**`env/.env.<env>`** (committed, no secrets):
```
AAD_APP_CLIENT_ID=<appId>
<PREFIX>_SSO_AUTH_ID=
<PREFIX>_SSO_APP_ID_URI=
```

No `client_secret` is stored for the `MicrosoftEntra` flow.

---

## Third-Party OAuth (Connect to an External Service)

Use this pattern to connect your plugin to an **external service** that has its own OAuth server and user accounts (e.g., HubSpot, Canva). Unlike Entra SSO, it needs a client secret and the service's own authorization/token endpoints. Prefer **Entra SSO** (above) whenever you're acting for the signed-in M365 user.

### Overview

Authenticated plugins use a three-part setup:

1. **Discover** OAuth endpoints from the server's well-known metadata
2. **Obtain** client credentials (via Dynamic Client Registration or manual entry)
3. **Register** the OAuth configuration in `m365agents.yml` so ATK provisions it in the Teams Developer Portal

The result is a `<PREFIX>_MCP_AUTH_ID` environment variable that the plugin manifest references via `OAuthPluginVault`.

### Step 1: OAuth Endpoint Discovery

Attempt to auto-discover OAuth endpoints from the server's well-known metadata. Try **both** URLs in parallel:

```
GET <SERVER_ROOT>/.well-known/oauth-authorization-server
GET <SERVER_ROOT>/.well-known/openid-configuration
```

Where `<SERVER_ROOT>` is the scheme + host of the server URL (e.g., `https://mcp.example.com`).

#### Field Mapping

| Plugin field | Well-known field |
|---|---|
| `authorizationUrl` | `authorization_endpoint` |
| `tokenUrl` | `token_endpoint` |
| `refreshUrl` | `token_endpoint` (same endpoint handles refresh grants) |
| `scope` | `scopes_supported` → join with comma (e.g., `"openid,email,profile"`). If no scopes are discovered or provided, default to `"openid"`. **If `scope` has no value, it MUST be quoted as `""`** — a bare `scope:` with no value is YAML null, not an empty string, and will fail schema validation. |

#### If discovered

Show the values to the user and confirm:

> "I found the following OAuth endpoints for [name]. Shall I use these?
> - Authorization URL: ...
> - Token URL: ...
> - Refresh URL: ...
> - Scopes: ..."

#### If not discovered

Ask the user to provide the four values. If the user doesn't have them, offer:

> "I can search for these values online — shall I proceed?"

Only search if the user confirms. Show results and confirm before using.

### Step 2: Client Credentials

#### Dynamic Client Registration (DCR)

First, check if `registration_endpoint` is present in the well-known metadata from Step 1.

**If `registration_endpoint` is present → attempt DCR automatically:**

```bash
curl -s -X POST <registration_endpoint> \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "<display name> M365 Connector",
    "redirect_uris": ["https://teams.microsoft.com/api/platform/v1.0/oAuthRedirect"],
    "grant_types": ["authorization_code", "refresh_token"],
    "response_types": ["code"],
    "token_endpoint_auth_method": "client_secret_basic",
    "scope": "<discovered scopes>"
  }'
```

- If the response contains `client_id` and `client_secret` → use them directly. Tell the user credentials were obtained via dynamic registration. **Do NOT ask the user for credentials.**
- If DCR returns an error or no `client_secret` → fall through to manual entry below.

#### Manual Credential Entry

**If `registration_endpoint` is absent OR DCR fails → ask the user:**

> "Please provide your OAuth client credentials for [name]:
> - Client ID:
> - Client Secret:"

#### PKCE

After obtaining credentials (whether via DCR or manual entry), ask the user:

> "Would you like to enable PKCE (Proof Key for Code Exchange) for this connector? (yes/no)"

- If the user says yes → `isPKCEEnabled: true`
- If the user says no, or asks you to decide → `isPKCEEnabled: false`

#### ⛔ Security Rules

- **NEVER** print, display, or reveal access tokens, bearer tokens, or client secrets in your output
- **NEVER** write secrets to any file — they are passed as OS environment variables at provision time only
- Treat `client_secret` as sensitive — store it only in `.env.*.user` files (which are gitignored)

### Step 3: Register in `m365agents.yml` and `m365agents.local.yml`

**⛔ CRITICAL:** You MUST add the `oauth/register` step to BOTH `m365agents.yml` AND `m365agents.local.yml`. Both files need identical `oauth/register` blocks — if you only update one, authentication will fail in that environment.

Add the `oauth/register` step to the `provision` lifecycle in both files, after `teamsApp/create` and before `teamsApp/zipAppPackage`:

```yaml
provision:
  - uses: teamsApp/create
    with:
      name: <app-name>${{APP_NAME_SUFFIX}}
    writeToEnvironmentFile:
      teamsAppId: TEAMS_APP_ID

  - uses: oauth/register
    with:
      name: <slug>-oauth
      appId: ${{TEAMS_APP_ID}}
      clientId: ${{<PREFIX>_MCP_CLIENT_ID}}
      clientSecret: ${{<PREFIX>_MCP_CLIENT_SECRET}}
      authorizationUrl: <authorizationUrl>
      tokenUrl: <tokenUrl>
      refreshUrl: <refreshUrl>
      scope: <comma-separated-scopes or "openid" if none provided>
      # ⚠️ If scope has no value, use `scope: ""` (quoted empty string).
      # A bare `scope:` is YAML null and will fail schema validation.
      flow: authorizationCode
      identityProvider: Custom
      isPKCEEnabled: <true or false>
      tokenExchangeMethodType: PostRequestBody
      baseUrl: <SERVER_URL>
    writeToEnvironmentFile:
      configurationId: <PREFIX>_MCP_AUTH_ID

  - uses: teamsApp/zipAppPackage
    with:
      manifestPath: ./appPackage/manifest.json
      outputZipPath: ./appPackage/build/appPackage.zip
      outputFolder: ./appPackage/build

  - uses: teamsApp/update
    with:
      appPackagePath: ./appPackage/build/appPackage.zip
```

#### Naming Conventions

| Value | Derivation | Example |
|---|---|---|
| `<PREFIX>` | Uppercase slug, hyphens/spaces → underscores | `CANVA_V1`, `HUBSPOT` |
| `<slug>` | Display name lowercased, spaces → hyphens | `canva-v1`, `hubspot` |
| `name` in oauth/register | `<slug>-oauth` | `canva-v1-oauth` |
| `<PREFIX>_MCP_CLIENT_ID` | Client ID env var | `CANVA_V1_MCP_CLIENT_ID` |
| `<PREFIX>_MCP_CLIENT_SECRET` | Client secret env var | `CANVA_V1_MCP_CLIENT_SECRET` |
| `<PREFIX>_MCP_AUTH_ID` | Auth config ID (written by provision) | `CANVA_V1_MCP_AUTH_ID` |

#### Environment Files

**`env/.env.dev`** (committed, no secrets):
```
TEAMS_APP_ID=
<PREFIX>_MCP_AUTH_ID=
APP_NAME_SUFFIX=-dev
TEAMSFX_ENV=dev
```

**`env/.env.dev.user`** (gitignored, contains secrets):
```
<PREFIX>_MCP_CLIENT_ID=<client_id>
<PREFIX>_MCP_CLIENT_SECRET=<client_secret>
```

> **Important:** Add `<PREFIX>_MCP_AUTH_ID=` to `.env.dev` as soon as you detect the server requires OAuth — before running provision. The `oauth/register` step will populate its value during provisioning.
>
> **⛔ NEVER set a placeholder value** for `<PREFIX>_MCP_AUTH_ID` (e.g., `PLACEHOLDER`, `TODO`, `temp`). Leave it empty (`<PREFIX>_MCP_AUTH_ID=`). The `oauth/register` automation will write the real value during provisioning. If a placeholder is present, it will be treated as the actual value and will NOT be overwritten.

### Step 4: Plugin Manifest Auth Block

In the plugin manifest's `runtimes[]` entry, reference the registered OAuth configuration:

#### Authenticated (OAuthPluginVault)

```json
{
  "type": "RemoteMCPServer",
  "auth": {
    "type": "OAuthPluginVault",
    "reference_id": "${{<PREFIX>_MCP_AUTH_ID}}"
  },
  "spec": {
    "url": "<SERVER_URL>",
    "mcp_tool_description": {
      "tools": [ ... ]
    }
  },
  "run_for_functions": [ ... ]
}
```

#### Unauthenticated (None)

```json
{
  "type": "RemoteMCPServer",
  "auth": {
    "type": "None"
  },
  "spec": {
    "url": "<SERVER_URL>",
    "mcp_tool_description": {
      "tools": [ ... ]
    }
  },
  "run_for_functions": [ ... ]
}
```

---

## Decision Tree

Use this decision tree to determine the authentication flow:

```
Plugin / server needs auth?
│
├── Sign in the CURRENT M365 user (verified identity)?
│   │
│   ├── Need to call DOWNSTREAM APIs (Graph, etc.) as that user?
│   │   ├── NO  → Entra SSO: S1 (register Entra app) → S2 (oauth/register MicrosoftEntra)
│   │   │        → S3 (link App ID URI) → S4 (access_as_user + pre-authorize Copilot)
│   │   │        → S5 (require v2 tokens) → S6 (OAuthPluginVault)
│   │   └── YES → Can you implement On-Behalf-Of (OBO) token exchange?
│   │            ├── YES → Entra SSO (S1–S6) + OBO exchange in your backend (needs client secret/cert)
│   │            └── NO  → Use third-party OAuth (Custom) instead — even against Entra ID
│   │                      (SSO alone won't get you downstream tokens)
│
├── Connect to an EXTERNAL service with its own accounts?
│   ├── Probe /.well-known/oauth-authorization-server AND /.well-known/openid-configuration
│   └── OAuth metadata found?
│       ├── YES → Step 1 (map endpoints) → Step 2 (DCR or manual creds) → Step 3 (oauth/register Custom) → Step 4 (OAuthPluginVault)
│       └── NO  → ask the user for endpoints, then Steps 1–4
│
├── Static API key? → ApiKeyPluginVault (see api-plugins.md)
│
└── Unauthenticated? → "auth": {"type": "None"}

For API plugins: the same flow applies — the oauth/register step and OAuthPluginVault
reference are identical; only the manifest shape differs.
```

---

## Common Issues

| Issue | Solution |
|---|---|
| `registration_endpoint` returns 404 | DCR not supported — ask user for credentials manually |
| Token refresh fails | Verify `refreshUrl` matches `token_endpoint` from well-known metadata |
| `<PREFIX>_MCP_AUTH_ID` empty after provision | Check that `oauth/register` step is in `m365agents.yml` and credentials are correct |
| "Invalid redirect URI" during OAuth | For **SSO (MicrosoftEntra)** use `https://teams.microsoft.com/api/platform/v1.0/oAuthConsentRedirect`; for **third-party OAuth** use `https://teams.microsoft.com/api/platform/v1.0/oAuthRedirect` |
| PKCE errors | Some providers don't support PKCE — set `isPKCEEnabled: false` |
| `<PREFIX>_SSO_AUTH_ID` / `_APP_ID_URI` empty after provision (SSO) | Ensure `oauth/register` uses `identityProvider: MicrosoftEntra` and is present in the env's lifecycle file (`m365agents.local.yml` for `--env local`) |
| 401 in Copilot after SSO setup | Backend token validation must accept `aud = <App ID URI>` and the issuer for your tenant; confirm the app exposes `access_as_user` and Copilot is pre-authorized |
| User prompted to consent repeatedly (SSO) | Pre-authorize the M365 Copilot first-party client for the `access_as_user` scope, and grant admin consent |
