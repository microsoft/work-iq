---
name: setup-sso
description: >
  Automates end-to-end SSO configuration for Declarative Agent projects — whether the backend is an
  MCP server, an API plugin, or a UI-widget MCP server (MCP Apps / OAI Apps). The auth core is
  identical for all: creates an Entra ID app registration (single- or multi-tenant), registers the
  SSO configuration on the M365 Copilot side via ATK's MicrosoftEntra OAuth registration, stamps the
  service-generated Application ID URI back onto the app, exposes the access_as_user scope,
  pre-authorizes M365 Copilot, validates, and sideloads the agent. Phase 0 auto-detects the project
  shape and routes to the right wiring (ai-plugin.json for MCP/API; mcpPlugin.json /
  readiness_plugin.json runtimes[] + an injected JWKS guard for widgets). The user never picks a
  skill — this is the single SSO entry point. App registration/config are fully automated via
  CLI/ATK. SSO only — no OBO. Windows / PowerShell.
  Triggered by: "set up SSO for my agent", "configure SSO", "register an app for SSO",
  "automate SSO for my MCP server", "add SSO to my declarative agent", "add SSO to my API plugin",
  "add sso to my mcp server", "wire entra sso for my copilot agent", "setup sso for mcp apps",
  "add entra auth to my express mcp server", "add sso to my widget agent",
  "set up authentication for my agent", "configure only sso no obo"
---

# Setup SSO for a Declarative Agent (MCP server, API plugin, **or** widget)

> **CRITICAL EXECUTION RULES — READ BEFORE PROCEEDING:**
> - You MUST execute every `az`, `devtunnel`, `atk`, and PowerShell command in the TERMINAL yourself. Do NOT tell the user to run them.
> - Do NOT suggest Azure Portal or Teams Developer Portal manual steps for app registration or configuration — every such step has a CLI/ATK command.
> - Do NOT improvise or substitute different approaches. These commands are tested and verified.
> - Execute commands ONE AT A TIME. Check the output. If a command fails, diagnose and retry — do not skip.
> - The goal: user answers a few questions, you do everything else automatically.
> - **TERMINAL RULES**: Background and separate terminals get a **fresh shell** with NO variables from previous terminals. When launching commands in background/separate terminals, substitute **literal values** (e.g., `devtunnel host myapp-tunnel`) — never `$tunnelName` or `$Port`. Never set short timeouts on `az` commands — they can take 30+ seconds.

This skill uses a **hybrid architecture**: orchestration lives in this file, shared educational content (Entra create, Entra update, dev tunnel) lives in `references/`. It is the **single SSO entry point** — Phase 0 auto-detects the project shape and, for **widget** agents, hands off to the script-based widget branch in [`references/widget-path.md`](references/widget-path.md) (backed by `scripts/`). The user never chooses which SSO skill to run.

> **FORMATTING RULE**: Every **"Tell the user"** block must be rendered as a markdown blockquote (`>` prefix). Do NOT flatten these into regular paragraphs — the formatting is the deliverable.

---

## ⛔ Workspace Check — MANDATORY FIRST STEP

> **This skill expects an existing Declarative Agent project** whose action is backed by an MCP server, an API plugin, or a UI-widget MCP server. It does not scaffold the backend. If the required ATK + app-package files are missing, exit cleanly with the message below — do NOT attempt to create the missing files.

The auth core is **identical** across shapes. The differences are how the backend URL is detected/patched and (for widgets) that a JWKS guard is injected. This step verifies the project and detects which of **MCP**, **ApiPlugin**, or **Widget** it is — then, for Widget, hands off to the widget branch and stops.

```powershell
$hasPackage    = Test-Path "package.json"
$hasAtk        = (Test-Path "m365agents.yml") -or (Test-Path "teamsapp.yml")
$AppPackageDir = if (Test-Path "appPackage/declarativeAgent.json") { "appPackage" }
                 elseif (Test-Path "DeclarativeAgent/declarativeAgent.json") { "DeclarativeAgent" }
                 else { $null }
$hasAppPackage = $null -ne $AppPackageDir
$aiPluginPath  = if ($hasAppPackage) { Join-Path $AppPackageDir "ai-plugin.json" } else { $null }
$hasAiPlugin   = $aiPluginPath -and (Test-Path $aiPluginPath)

# Widget shapes (MCP Apps / OAI Apps) use a runtimes[] plugin manifest (mcpPlugin.json, or a
# *_plugin.json such as readiness_plugin.json) INSTEAD OF ai-plugin.json. Detect that first so
# these projects route to the widget branch rather than failing the ai-plugin.json check below.
$WidgetManifest = $null
if ($hasAppPackage) {
    foreach ($c in (Get-ChildItem $AppPackageDir -File -Filter "*plugin*.json" -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne "ai-plugin.json" })) {
        try { if ((Get-Content $c.FullName -Raw | ConvertFrom-Json -Depth 30).runtimes) { $WidgetManifest = $c.Name; break } } catch {}
    }
}
if ($hasAtk -and $hasAppPackage -and $WidgetManifest) { $ProjectType = "Widget" }

if ($ProjectType -ne "Widget" -and -not ($hasAtk -and $hasAppPackage -and $hasAiPlugin)) {
    # Is this a STANDALONE MCP server (e.g. create-mcp-app output) that just needs wrapping into a DA?
    $looksBareMcp = $false
    if ($hasPackage -and -not $hasAppPackage) {
        try {
            $pkg2 = Get-Content "package.json" -Raw | ConvertFrom-Json
            $deps2 = @(); if ($pkg2.dependencies) { $deps2 += $pkg2.dependencies.PSObject.Properties.Name }; if ($pkg2.devDependencies) { $deps2 += $pkg2.devDependencies.PSObject.Properties.Name }
            $hasMcpDep2 = ($deps2 | Where-Object { $_ -match '@modelcontextprotocol/sdk|@modelcontextprotocol/ext-apps' }).Count -gt 0
            $hasEntry2  = (Get-ChildItem -File -Include main.ts,server.ts,index.ts -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch '\\node_modules\\|\\dist\\' } | Select-Object -First 1) -ne $null
            $looksBareMcp = $hasMcpDep2 -and $hasEntry2
        } catch {}
    }

    Write-Host "ERROR: This does not look like a Declarative Agent project ready for SSO." -ForegroundColor Red
    Write-Host "Required:" -ForegroundColor Red
    Write-Host "  - m365agents.yml or teamsapp.yml (ATK project)" -ForegroundColor Red
    Write-Host "  - appPackage/ or DeclarativeAgent/ containing declarativeAgent.json" -ForegroundColor Red
    Write-Host "  - ai-plugin.json OR a runtimes[] plugin manifest in that folder" -ForegroundColor Red
    Write-Host ""
    if ($looksBareMcp) {
        Write-Host "This looks like a STANDALONE MCP server (e.g. a create-mcp-app widget) that isn't wrapped as a Declarative Agent yet." -ForegroundColor Cyan
        Write-Host "  ==> NEXT: wrap it into a Declarative Agent — 'atk new -c declarative-agent-with-action-from-mcp', point the action at your MCP server, then re-run /setup-sso." -ForegroundColor Cyan
        Write-Host ""
    }
    Write-Host "This skill does NOT scaffold the backend. NEXT command to get a compatible project, then re-run /setup-sso:" -ForegroundColor Yellow
    Write-Host "  - New MCP server:  atk new -c declarative-agent-with-action-from-mcp" -ForegroundColor Yellow
    Write-Host "  - API plugin:      atk new -c declarative-agent-with-action-from-scratch  (or from an OpenAPI spec)" -ForegroundColor Yellow
    Write-Host "  - Standalone MCP server (server files, no appPackage/): wrap it as a Declarative Agent first (see MCP option above)." -ForegroundColor Yellow
    return
}
Write-Host "App package folder: $AppPackageDir ✅"
```

### ⛔ Widget branch — dispatch and STOP

> **If `$ProjectType` is `"Widget"`** (a `mcpPlugin.json` / `readiness_plugin.json` runtimes[] manifest was found), this agent renders a UI widget from an MCP server. Its SSO wiring (reuse-existing-tunnel, `--env local`, plugin-manifest patch, injected JWKS guard) differs from the MCP-server / API-plugin flow below.
>
> **Do this and STOP — do NOT run any of the phases below:**
> 1. Set `$SsoScripts` to this skill's `scripts/` folder (absolute path).
> 2. Execute **[`references/widget-path.md`](references/widget-path.md)** end-to-end (Widget Phases A–F), then render its FINAL SUMMARY.
>
> Phases 1–9 below apply ONLY when `$ProjectType` is `"MCP"` or `"ApiPlugin"`.

### Detect project type (MCP vs API plugin)

> **Skip this section entirely if `$ProjectType` is already `"Widget"`** (you dispatched above).

```powershell
$ai = Get-Content $aiPluginPath -Raw | ConvertFrom-Json -Depth 20

# Signal 1: express-jwt dependency => MCP server backend
$hasExpressJwt = $false
if ($hasPackage) {
    $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
    $deps = @()
    if ($pkg.dependencies)    { $deps += $pkg.dependencies.PSObject.Properties.Name }
    if ($pkg.devDependencies) { $deps += $pkg.devDependencies.PSObject.Properties.Name }
    $hasExpressJwt = $deps -contains "express-jwt"
}

# Signal 2: runtime spec URLs — MCP endpoints end in /mcp; API plugins point at a local OpenAPI file
$specUrls = @()
foreach ($rt in $ai.runtimes) { if ($rt.spec.url) { $specUrls += [string]$rt.spec.url } }
$looksMcp = ($specUrls | Where-Object { $_ -match '/mcp/?$' }).Count -gt 0
$looksApi = ($specUrls | Where-Object { $_ -match '\.(ya?ml|json)$' -or $_ -notmatch '^https?://' }).Count -gt 0
$hasOpenApiFolder = (Test-Path (Join-Path $AppPackageDir "apiSpecificationFile")) `
                    -or (Test-Path (Join-Path $AppPackageDir "apiSpecificationFiles"))

if     ($looksMcp -or $hasExpressJwt)            { $ProjectType = "MCP" }
elseif ($looksApi -or $hasOpenApiFolder)         { $ProjectType = "ApiPlugin" }
else                                             { $ProjectType = "Unknown" }

Write-Host "Detected project type: $ProjectType"
Write-Host "Workspace check passed ✅"
```

> **If `$ProjectType` is `"Unknown"` (ambiguous):** use the **ask-questions tool** to confirm:
> - Header: "Agent backend type"
> - Question: "I couldn't auto-detect whether this agent is backed by an **MCP server** or an **API plugin**. Which is it?"
> - Options: **"MCP server"** | **"API plugin"**
>
> Set `$ProjectType` to `"MCP"` or `"ApiPlugin"` from the answer. Do NOT proceed until it is one of those two.

---

## What This Does (Plain English)

When M365 Copilot calls your agent, it must prove "this request is for an authorized, signed-in user." This skill sets up the entire trust chain using **Entra SSO** — the same way for an MCP server or an API plugin.

| Phase | What Happens | Why |
|-------|-------------|-----|
| **1** | Check & install required tools | Can't proceed without Azure CLI, ATK, devtunnel, Node.js |
| **2** | Detect app name, port, backend URL | Need to know where the backend runs |
| **3** | **Step 1 — Create Entra ID app** | App identity (single- or multi-tenant) + Copilot redirect URI |
| **4** | Set up dev tunnel *(local backends)* | Exposes localhost to the internet |
| **5** | **Step 2 — ATK OAuth registration** | Registers SSO on Copilot's side; emits **Auth ID** + **API URI** |
| **6** | **Step 3 — Update Entra app** | Sets the API URI, `access_as_user` scope, pre-auth (User.Read only if OBO) |
| **7** | Patch config files | Wire the Auth ID + backend URL into the agent |
| **8** | Validate + sideload | Installs agent into M365 Copilot |
| **9** | Build, start & test *(local backends)* | Verify SSO end-to-end |

**Tell the user:**
> **Here's the plan.** I'll set up Entra SSO for your declarative agent in three core steps — **(1)** create the Entra app, **(2)** register the SSO configuration with ATK (which generates your Application ID URI), and **(3)** update the app with that URI and the `access_as_user` scope. The auth is identical whether your agent uses an **MCP server** or an **API plugin**. You'll only answer a few questions — I'll handle the rest.

---

## Phase 1 — Prerequisites (EXECUTE)

**Tell the user:**
> **Checking prerequisites.** I need **Azure CLI** (to create your app's identity in Entra ID), **ATK CLI** (to register SSO and package your agent), and — for local backends — the **Dev Tunnel CLI** and **Node.js**. I'll install anything missing automatically.

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

| Tool | Check | Auto-install | Needed for |
|------|-------|-------------|------------|
| Azure CLI | `az version` | `winget install Microsoft.AzureCLI` | always |
| ATK CLI (>=1.1.8) | `atk --version` | `npm install -g @microsoft/m365agentstoolkit-cli` | always |
| Dev Tunnel CLI | `devtunnel --version` | `winget install Microsoft.devtunnel` | local backends |
| Node.js (>=20) | `node --version` | `winget install OpenJS.NodeJS.LTS` | MCP / local Node backends |

> **IMPORTANT**: ATK package = `@microsoft/m365agentstoolkit-cli` (no hyphens). If install conflicts with `teamsapp`, use `--force`. After installing ANY tool, refresh PATH with the snippet above.

### ATK Minimum Version Check (>=1.1.8):
```powershell
$atkVer = (atk --version 2>$null).Trim() -replace '[^0-9.]',''
if ($atkVer -and ([version]$atkVer -lt [version]'1.1.8')) {
    Write-Host "ATK CLI $atkVer is below minimum 1.1.8 — upgrading..." -ForegroundColor Yellow
    npm install -g @microsoft/m365agentstoolkit-cli@latest
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
} else {
    Write-Host "ATK CLI $atkVer ✅ (meets minimum 1.1.8)"
}
```

### Install npm dependencies and build (MCP / Node projects only):
```powershell
if ($ProjectType -eq "MCP" -and $hasPackage) {
    npm install
    npm run build
    if ($LASTEXITCODE -ne 0) { Write-Host "Fix TypeScript build errors before proceeding." -ForegroundColor Red; return }
}
```

---

## Phase 2 — Gather Inputs (EXECUTE)

**Tell the user:**
> **Detecting your project settings.** I'll read `package.json`/manifest for the app name, generate a unique display name, and — for local backends — detect the port and make sure nothing else is using it.

### Detect project name:
```powershell
if ($hasPackage) {
    $BaseAppName = (Get-Content "package.json" | ConvertFrom-Json).name
} else {
    $BaseAppName = (Get-Content (Join-Path $AppPackageDir "declarativeAgent.json") -Raw | ConvertFrom-Json).name
}
if (-not $BaseAppName) { $BaseAppName = "my-agent" }
$BaseAppName = ($BaseAppName -replace '[^A-Za-z0-9-]', '')
Write-Host "Detected app: $BaseAppName"
```

### Generate unique display name:
```powershell
$userAlias = $env:USERNAME; if (-not $userAlias) { $userAlias = $env:USER }; if (-not $userAlias) { $userAlias = "user" }
$userAlias = $userAlias.ToLower(); if ($userAlias -match '\\') { $userAlias = $userAlias.Split('\')[-1] }
$suffix = -join ((48..57) + (97..122) | Get-Random -Count 4 | ForEach-Object { [char]$_ })
$AppDisplayName = "$BaseAppName-$userAlias-$suffix"
Write-Host "App: $AppDisplayName"
```

### Determine backend location (local vs remote)

```powershell
$BackendIsLocal = $true   # MCP defaults to local during dev
```

> **If `$ProjectType` is `"ApiPlugin"`:** use the **ask-questions tool** to ask where the API backend runs:
> - Header: "API backend location"
> - Question: "Is your API plugin's backend running **locally** (I'll create a dev tunnel and start it) or is it already **hosted remotely** (I'll use its public URL)?"
> - Options: **"Local (dev tunnel)"** | **"Remote (hosted URL)"**
>
> Set `$BackendIsLocal = $true` for Local, `$false` for Remote.
>
> **If Remote**, also ask for the URL:
> - Header: "Hosted backend URL"
> - Question: "What's the public HTTPS base URL of your API backend (e.g. `https://my-api.azurewebsites.net`)?"
>
> Store it: `$BaseUrl = "<answer>"`; `$TunnelHost = ($BaseUrl -replace '^https?://','' -replace '/.*$','')`.

### Detect port + check availability (local backends only):
```powershell
if ($BackendIsLocal) {
    $Port = 3000
    $portLine = (Get-Content ".env" -ErrorAction SilentlyContinue) | Where-Object { $_ -match "^PORT=" }
    if ($portLine) { $Port = ($portLine -split "=")[1].Trim() }
    if (Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue) {
        $originalPort = $Port
        do { $Port++ } while (Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue)
        Write-Host "Port $originalPort busy → using $Port"
    } else {
        Write-Host "Port $Port available ✅"
    }
}
```

---

## Phase 3 — Step 1: Create the Entra ID App (EXECUTE)

Read and execute **every step** in [references/entra-app-registration.md](references/entra-app-registration.md).

This **creates the app only** — single tenant by default (it will ask if you need multi-tenant) and sets the M365 Copilot redirect URI. It does **NOT** add co-owners (not needed for SSO), and does **NOT** set the Application ID URI, scope, or pre-authorization yet — those come in **Step 3**, after ATK generates the URI.

Display all `> Tell the user:` blocks from that file as blockquotes during execution.

**After completion, you MUST have these variables set:**
- `$ClientId` — Application (client) ID
- `$ObjectId` — Object ID
- `$TenantId` — Azure AD tenant ID

---

## Phase 4 — Dev Tunnel Setup (EXECUTE — local backends only)

> **Skip this phase entirely if `$BackendIsLocal` is `$false`** (remote API plugin). You already captured `$BaseUrl` and `$TunnelHost` in Phase 2.

If `$BackendIsLocal` is `$true`, read and execute [references/dev-tunnel.md](references/dev-tunnel.md).

**After completion, you MUST have these variables set:**
- `$TunnelName` — dev tunnel name (lowercase)
- `$BaseUrl` — full HTTPS tunnel URL
- `$TunnelHost` — tunnel hostname (without `https://`)

---

## Phase 5 — Step 2: ATK OAuth Registration (MicrosoftEntra) (EXECUTE)

**Tell the user:**
> **Registering the SSO configuration with ATK.** This is the key step. ATK's `oauth/register` action (with the **MicrosoftEntra** identity provider) tells M365 Copilot "this agent uses Entra SSO with *this* app." In return, the service generates two values:
> - an **Auth ID** (the configuration ID Copilot uses to fetch tokens), and
> - an **Application ID URI** (the token audience your backend must accept).
>
> I'll wire the Auth ID into your agent and stamp the API URI onto the Entra app in Step 3.

### 5a. Ensure the `oauth/register` (MicrosoftEntra) action exists in the ATK yml:
```powershell
# Workspace check accepts either m365agents.yml or teamsapp.yml — pick whichever exists
# so we never patch (or fail to find) the wrong file.
$ymlPath = if (Test-Path "m365agents.yml") { "m365agents.yml" } else { "teamsapp.yml" }
$yml = Get-Content $ymlPath -Raw

if ($yml -match 'oauth/register') {
    Write-Host "oauth/register already present — reading its output keys"
    $authIdKey   = ([regex]::Match($yml, 'configurationId:\s*([A-Z0-9_]+)')).Groups[1].Value
    $appIdUriKey = ([regex]::Match($yml, 'applicationIdUri:\s*([A-Z0-9_]+)')).Groups[1].Value
}
if (-not $authIdKey)   { $authIdKey   = "MCP_DA_OAUTH_AUTH_ID" }
if (-not $appIdUriKey) { $appIdUriKey = "MCP_DA_OAUTH_APP_ID_URI" }

if ($yml -notmatch 'oauth/register') {
    # Single-quoted here-string preserves ${{...}} literally (no PowerShell interpolation).
    $action = @'
  - uses: oauth/register
    with:
      name: daSso
      flow: authorizationCode
      appId: ${{TEAMS_APP_ID}}
      clientId: ${{AAD_APP_CLIENT_ID}}
      identityProvider: MicrosoftEntra
      baseUrl: ${{BASE_URL}}
    writeToEnvironmentFile:
      configurationId: MCP_DA_OAUTH_AUTH_ID
      applicationIdUri: MCP_DA_OAUTH_APP_ID_URI

'@
    # Insert before the first teamsApp/zipAppPackage so TEAMS_APP_ID is already available.
    # Use IndexOf (not -replace) so ${{...}} is never treated as a regex group reference.
    $marker = "- uses: teamsApp/zipAppPackage"
    $idx = $yml.IndexOf($marker)
    if ($idx -ge 0) {
        $lineStart = $yml.LastIndexOf("`n", $idx) + 1
        $yml = $yml.Substring(0, $lineStart) + $action + $yml.Substring($lineStart)
    } else {
        $yml = $yml.TrimEnd() + "`r`n`r`nprovision:`r`n" + $action
    }
    Set-Content $ymlPath -Value $yml -Encoding UTF8
    $authIdKey = "MCP_DA_OAUTH_AUTH_ID"; $appIdUriKey = "MCP_DA_OAUTH_APP_ID_URI"
    Write-Host "Injected oauth/register (MicrosoftEntra) ✅"
}
Write-Host "Auth ID key: $authIdKey | API URI key: $appIdUriKey"
```

### 5b. Write environment variables (pre-set `AAD_APP_CLIENT_ID` to skip any `aadApp/create`):
```powershell
# Pre-writing AAD_APP_CLIENT_ID makes ATK's aadApp/create (if present in the yml) a no-op,
# so it reuses OUR az-created app instead of creating a second one.
if (-not (Test-Path "env")) { New-Item -ItemType Directory -Path "env" | Out-Null }
$envContent = @"
TEAMS_APP_ID=
AAD_APP_CLIENT_ID=$ClientId
$authIdKey=
$appIdUriKey=
BASE_URL=$BaseUrl
APP_NAME_SUFFIX=-dev
TEAMSFX_ENV=dev
"@
$envContent | Set-Content "env/.env.dev" -Encoding UTF8
Write-Host "Wrote env/.env.dev ✅"
```

### 5c. Ensure ATK is logged in:
```powershell
if ((atk auth list 2>&1) -notmatch "microsoft.com") { atk auth login m365 }
```

### 5d. Run ATK provision:
```powershell
atk provision --env dev --interactive false
```

### 5e. Read the generated Auth ID and API URI:
```powershell
$envLines = Get-Content "env/.env.dev"
$AuthId = (($envLines | Where-Object { $_ -match "^$authIdKey=" }) -replace "^$authIdKey=", "").Trim()
$AppIdUri = (($envLines | Where-Object { $_ -match "^$appIdUriKey=" }) -replace "^$appIdUriKey=", "").Trim()

if ([string]::IsNullOrWhiteSpace($AuthId) -or [string]::IsNullOrWhiteSpace($AppIdUri)) {
    Write-Host "ERROR: ATK did not emit the Auth ID / API URI. Re-run 'atk provision --env dev --interactive false' and verify env/.env.dev contains non-empty $authIdKey and $appIdUriKey." -ForegroundColor Red
    return
}
Write-Host "Auth ID (configurationId): $AuthId ✅"
Write-Host "API URI (applicationIdUri): $AppIdUri ✅"
```

---

## Phase 6 — Step 3: Update the Entra ID App (EXECUTE)

Read and execute **every step** in [references/entra-app-update.md](references/entra-app-update.md).

Using the `$AppIdUri` from Step 2, this: sets the **Application ID URI**, exposes the **`access_as_user`** scope, and **pre-authorizes M365 Copilot** (`ab3be6b7-f5df-413d-ac2d-abf1e3fd9c0b`) for that scope. **User.Read + admin consent are OPTIONAL** — added only when you later call Microsoft Graph/OBO (`-IncludeGraph`). Pure SSO (this skill's default) needs **no** Graph permission and **no** admin consent.

**After completion, you MUST have:** `$ScopeId` set, and the app verified (scope = `access_as_user`, 1 pre-authorized client, **0** Graph permissions for pure SSO — or 1 if you passed `-IncludeGraph`).

---

## Phase 7 — Config Patching (EXECUTE)

**Tell the user:**
> **Wiring everything together.** I'll write the **Auth ID** into your agent's `ai-plugin.json` (so Copilot knows which SSO configuration to use), point the agent at your backend URL, and configure your backend to accept the token audience (the **API URI**).

### 7a. Patch `ai-plugin.json` — auth reference (BOTH types) + MCP URL:
```powershell
$ai = Get-Content $aiPluginPath -Raw | ConvertFrom-Json -Depth 20
foreach ($rt in $ai.runtimes) {
    # Common to MCP and API plugin: point the runtime auth at the SSO registration.
    if (-not $rt.auth) { $rt | Add-Member -NotePropertyName auth -NotePropertyValue (@{}) -Force }
    $rt.auth = @{ type = "OAuthPluginVault"; reference_id = $AuthId }

    if ($ProjectType -eq "MCP" -and $rt.spec.url) {
        $rt.spec.url = "$BaseUrl/mcp"
    }
}
$ai | ConvertTo-Json -Depth 20 | Set-Content $aiPluginPath -Encoding UTF8
Write-Host "ai-plugin.json: reference_id → $AuthId ✅"
if ($ProjectType -eq "MCP") { Write-Host "ai-plugin.json: MCP URL → $BaseUrl/mcp ✅" }
```

### 7b. (API plugin only) Patch the OpenAPI spec `servers[0].url`:
```powershell
if ($ProjectType -eq "ApiPlugin") {
    # ai-plugin.json runtimes[].spec.url is a RELATIVE path to the OpenAPI doc; that doc carries the server URL.
    $specRel = ($ai.runtimes | ForEach-Object { $_.spec.url } | Where-Object { $_ }) | Select-Object -First 1
    $specPath = Join-Path $AppPackageDir $specRel
    if (Test-Path $specPath) {
        $raw = Get-Content $specPath -Raw
        if ($specPath -match '\.json$') {
            $spec = $raw | ConvertFrom-Json -Depth 30
            if (-not $spec.servers) { $spec | Add-Member -NotePropertyName servers -NotePropertyValue @(@{ url = $BaseUrl }) -Force }
            else { $spec.servers[0].url = $BaseUrl }
            $spec | ConvertTo-Json -Depth 30 | Set-Content $specPath -Encoding UTF8
        } else {
            # YAML: rewrite ONLY the first `- url:` line under `servers:` (line-based, so the rest of
            # the spec is never truncated); if no servers block exists, prepend one.
            $lines = $raw -split "`r?`n"
            $inServers = $false; $patched = $false
            for ($i = 0; $i -lt $lines.Count; $i++) {
                if ($lines[$i] -match '^\s*servers:\s*$') { $inServers = $true; continue }
                if ($inServers -and $lines[$i] -match '^(\s*-\s*url:\s*).*$') {
                    $lines[$i] = "$($matches[1])$BaseUrl"; $patched = $true; break
                }
                if ($inServers -and $lines[$i] -match '^\S') { break }  # left the servers block un-patched
            }
            $raw = if ($patched) { $lines -join "`r`n" } else { "servers:`r`n  - url: $BaseUrl`r`n" + $raw }
            Set-Content $specPath -Value $raw -Encoding UTF8
        }
        Write-Host "OpenAPI servers[0].url → $BaseUrl ✅ ($specRel)"
    } else {
        Write-Host "WARN: OpenAPI spec '$specRel' not found under $AppPackageDir — set its servers[0].url to $BaseUrl manually." -ForegroundColor Yellow
    }
}
```

### 7c. Patch backend `.env` (audience = API URI) — local Node/MCP backends:
```powershell
if ($BackendIsLocal -and $ProjectType -eq "MCP") {
    $envContent = @"
TENANT_ID=$TenantId
CLIENT_ID=$ClientId
APP_ID_URI=$AppIdUri
PORT=$Port
"@
    $envContent | Set-Content ".env" -Encoding UTF8
    Write-Host ".env created ✅ (APP_ID_URI=$AppIdUri — accept aud in ALL forms: $ClientId, api://$ClientId, $AppIdUri)"
} else {
    Write-Host "NOTE: Configure your backend to accept the token 'aud' in ANY of [$ClientId, api://$ClientId, $AppIdUri] (Copilot often sends the bare client-id GUID), issuer tenant '$TenantId'." -ForegroundColor Cyan
}
```

### 7d. Patch agent display name (with 30-char manifest clamp):
```powershell
$daJsonPath   = Join-Path $AppPackageDir "declarativeAgent.json"
$manifestPath = Join-Path $AppPackageDir "manifest.json"

$daJson = Get-Content $daJsonPath -Raw | ConvertFrom-Json
$daJson.name = "$AppDisplayName"
$daJson | ConvertTo-Json -Depth 10 | Set-Content $daJsonPath -Encoding UTF8

if (Test-Path $manifestPath) {
    $shortName = $AppDisplayName
    if ($shortName.Length -gt 30) {
        $shortName = $shortName.Substring(0, 30)
        Write-Host "NOTE: Teams short name limit is 30 chars. Truncated → '$shortName' (manifest only)." -ForegroundColor Yellow
    }
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    $manifest.name.short = "$shortName"
    $manifest.name.full  = "$AppDisplayName"
    $manifest | ConvertTo-Json -Depth 10 | Set-Content $manifestPath -Encoding UTF8
}
Write-Host "Agent name → $AppDisplayName ✅"
```

---

## Phase 8 — Validate & Sideload (EXECUTE)

**Tell the user:**
> **Validating and installing your agent.** ATK rebuilds the package with the new SSO settings, checks it for manifest errors, then sideloads it — installing a dev version directly into your M365 account for testing. Only you will see it.

### 8a. Re-provision to rebuild the zip with patched config:
```powershell
atk provision --env dev --interactive false
```

### 8b. Validate:
```powershell
$zipPath = if (Test-Path "$AppPackageDir/build/appPackage.zip") { "./$AppPackageDir/build/appPackage.zip" } else { (Get-ChildItem -Recurse -Filter "appPackage*.zip" | Select-Object -First 1).FullName }
atk validate --package-file $zipPath
```

### 8c. Sideload:
```powershell
atk install --file-path $zipPath
```

---

## Phase 9 — Build, Start & Test (EXECUTE — local backends only)

> **Skip this phase if `$BackendIsLocal` is `$false`** (remote backend). Your hosted backend is already serving; just test in Copilot per the final summary.

**Tell the user:**
> **Starting everything up.** Two things run locally: the **dev tunnel** (forwards Copilot's requests to your laptop) and your **backend server** (validates the SSO token and returns the response).

### Build (MCP / Node):
```powershell
if ($ProjectType -eq "MCP") {
    npm run build
    if ($LASTEXITCODE -ne 0) { Write-Host "Build failed — check TypeScript errors" -ForegroundColor Red; return }
    Write-Host "Build ✅"
}
```

### Start tunnel (SEPARATE terminal — use the LITERAL tunnel name):
```powershell
devtunnel host <TunnelName>
```

### Start the backend server (MCP example — `SSO_DEBUG=1` prints accepted-token claims):
```powershell
$env:SSO_DEBUG = "1"; node dist/index.js
```

> With `SSO_DEBUG=1`, each authenticated call prints one `[auth] Valid SSO token accepted: { sid, aud, tid, iss }` line in this terminal — quick proof SSO is live end-to-end. Unset it (`$env:SSO_DEBUG = "0"`) for normal runs. Rejected tokens always log `[auth] token rejected: …` regardless of the flag.

### Test the endpoint (should get 401 without auth):
```powershell
try {
    $url = if ($ProjectType -eq "MCP") { "http://localhost:$Port/mcp" } else { "http://localhost:$Port/" }
    $body = '{"jsonrpc":"2.0","method":"initialize","id":1,"params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
    Invoke-WebRequest -Uri $url -Method POST -ContentType "application/json" -Body $body | Out-Null
    Write-Host "WARNING: Got 200 — auth may not be enforced!" -ForegroundColor Yellow
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -eq 401) { Write-Host "VERIFIED: 401 Unauthorized — SSO is working ✅" -ForegroundColor Green }
    else { Write-Host "Got HTTP $code" -ForegroundColor Yellow }
}
```

---

## 🎉 FINAL SUMMARY

> **CRITICAL**: Print this entire summary VERBATIM. Render every emoji exactly as written.

# 🎉 SSO Setup Complete!

Your declarative agent is wired for Entra SSO. For local backends, keep both terminals open:
- **Terminal 1**: `devtunnel host <TunnelName>`
- **Terminal 2**: your backend server (e.g. `node dist/index.js`)

### 📋 Your App Details
| Item | Value |
|------|-------|
| Agent type | `<ProjectType>` (MCP or API plugin) |
| App Name | `<AppDisplayName>` |
| Client ID | `<ClientId>` |
| Tenant ID | `<TenantId>` |
| Auth ID (SSO config) | `<AuthId>` |
| Application ID URI | `<AppIdUri>` |
| Scope | `<AppIdUri>/access_as_user` |
| Backend URL | `<BaseUrl>` |

### 🔗 Quick Links
- **App Registration**: `https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId/<ClientId>`
- **Teams Dev Portal**: `https://dev.teams.microsoft.com/`
- **M365 Copilot**: `https://m365.cloud.microsoft/chat`

### 🧪 Test It Now

> **⏳ Heads up**: After sideloading, your agent may take **up to 15 minutes** to appear.

1. Open **[M365 Copilot](https://m365.cloud.microsoft/chat)**
2. Click **"All agents"** in the left sidebar
3. **Search** for **"<AppDisplayName>"**
4. Click your agent to start a chat
5. Ask a question that calls your backend
6. First time: click **Accept** on the consent prompt (one-time)
7. You should see authenticated data flow back via the SSO token.

### 🔧 Troubleshooting
- **401 in Copilot?** Backend must accept the token `aud` in **all** forms — bare `<ClientId>`, `api://<ClientId>`, and `<AppIdUri>` (Copilot often sends the bare GUID) — and issuer tenant `<TenantId>`
- **Agent not found after 15 min?** Re-run `atk install`
- **Extra "Allow" prompt?** Only relevant if you enabled Graph/OBO (`-IncludeGraph`); pure SSO needs no admin consent.
- **MCP build errors?** Run `npm install` then `npm run build`
- **EADDRINUSE?** Another process on port — kill it or change the port

### ☁️ Deployment note — Azure App Service (Easy Auth)
> The express-jwt / injected token guard is for **local dev**. When you host the backend on **Azure App Service**, prefer the platform's built-in **Easy Auth** (Authentication → Microsoft Entra identity provider) instead of the custom guard — reuse the Entra app this skill created (`<ClientId>`, do not create a new one), set **Issuer URL** `https://login.microsoftonline.com/<TenantId>/v2.0`, **Allowed token audiences** = the **bare** `<ClientId>` (NOT the `api://` form, else 401), and under *Allow requests from specific client applications* add BOTH `<ClientId>` **and** `ab3be6b7-f5df-413d-ac2d-abf1e3fd9c0b` (M365 Copilot host — missing it → 403). Full field-by-field guide: [references/easy-auth.md](references/easy-auth.md).

---

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `az: command not found` | Azure CLI not installed | `winget install Microsoft.AzureCLI` + refresh PATH |
| `atk: command not found` | ATK CLI not installed | `npm install -g @microsoft/m365agentstoolkit-cli` + refresh PATH |
| `oauth/register` fails: `clientId` invalid | `AAD_APP_CLIENT_ID` not written | Re-run Phase 5b, confirm `$ClientId` is set |
| Auth ID / API URI empty after provision | provision didn't run the action | Verify `oauth/register` block in `m365agents.yml`, re-run Phase 5d |
| `401 Unauthorized` in Copilot | Audience mismatch | Backend must accept `aud` in **all** forms — bare `$ClientId`, `api://$ClientId`, and `$AppIdUri` (real Copilot tokens often use the bare GUID); tenant must match |
| `EADDRINUSE` | Port in use | Kill process or change port |
| `AADSTS530084` / CA policy blocks | Conditional Access policy | Request exclusion or use a dev tenant |

## Notes
- All commands are idempotent — safe to re-run.
- The auth chain is **identical for MCP and API-plugin agents**; only backend-URL detection/patching differs (Phase 7).
- The **Application ID URI is generated by ATK's `oauth/register`** (Step 2), not chosen by you — Step 3 stamps it back onto the Entra app.
