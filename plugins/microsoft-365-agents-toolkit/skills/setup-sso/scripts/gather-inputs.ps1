# Phase 2 — Gather Inputs + Reuse Existing Tunnel.
# Derives the Entra app display name (persisted as SSO_APP_DISPLAY_NAME) and reads the EXISTING
# dev tunnel from env/.env.local. Never creates a second tunnel.
. "$PSScriptRoot/_lib.ps1"

$AppPackageDir = Get-AppPackageDir
if (-not $AppPackageDir) { Fail "AppPackageDir not found — run detect-project.ps1 first." }

# 2a. App display name
$BaseAppName = (Get-Content (Join-Path $AppPackageDir "manifest.json") -Raw -ErrorAction SilentlyContinue | ConvertFrom-Json).name.short
if (-not $BaseAppName) { $BaseAppName = (Get-Content (Join-Path $AppPackageDir "declarativeAgent.json") -Raw -ErrorAction SilentlyContinue | ConvertFrom-Json).name }
$BaseAppName = ($BaseAppName -replace '\$\{\{[^}]+\}\}', '' -replace '[^A-Za-z0-9-]', '')
if (-not $BaseAppName) { $BaseAppName = "uiwidget-agent" }
$userAlias = ($env:USERNAME); if (-not $userAlias) { $userAlias = "user" }
$userAlias = $userAlias.ToLower(); if ($userAlias -match '\\') { $userAlias = $userAlias.Split('\')[-1] }
$suffix = -join ((48..57) + (97..122) | Get-Random -Count 4 | ForEach-Object { [char]$_ })
$AppDisplayName = "$BaseAppName-$userAlias-$suffix"
Set-EnvValue -Key "SSO_APP_DISPLAY_NAME" -Value $AppDisplayName
Write-Host "App display name: $AppDisplayName"

# 2b. Read the EXISTING tunnel + port
$BaseUrl   = Get-EnvValue -Key "MCP_SERVER_URL"
$TunnelDom = Get-EnvValue -Key "MCP_SERVER_DOMAIN"
$TunnelName = Get-EnvValue -Key "DEVTUNNEL_NAME"
$Port      = Get-EnvValue -Key "DEVTUNNEL_PORT"
if (-not $Port) { $Port = "3001"; Set-EnvDefault -Key "DEVTUNNEL_PORT" -Value $Port }

if ($BaseUrl) {
    $TunnelHost = if ($TunnelDom) { $TunnelDom } else { $BaseUrl -replace '^https?://', '' -replace '/.*', '' }

    # Proactive drift check: the OAuth registration (Phase 4) bakes the tunnel domain into the
    # baseUrl / App ID URI / Entra identifierUris, so a stale env URL would register against the
    # wrong tunnel. If a named tunnel exists and its LIVE host differs from env, self-correct now.
    if ($TunnelName) {
        $liveHost = $null
        try {
            $show = devtunnel show $TunnelName 2>&1
            if ($LASTEXITCODE -eq 0) {
                $line = $show | Where-Object { $_ -match "Connect via browser" -or $_ -match "https://" } | Select-Object -First 1
                $liveHost = ($line -replace '.*https://', '' -replace '/.*', '').Trim()
            }
        } catch { $liveHost = $null }

        if ($liveHost -and $liveHost -ne $TunnelHost) {
            Write-Host "Tunnel drift detected — env points at '$TunnelHost' but tunnel '$TunnelName' is live at '$liveHost'." -ForegroundColor Yellow
            $BaseUrl = "https://$liveHost"; $TunnelHost = $liveHost
            Set-EnvValue -Key "MCP_SERVER_URL"    -Value $BaseUrl
            Set-EnvValue -Key "MCP_SERVER_DOMAIN" -Value $TunnelHost
            Write-Host "Self-corrected env/.env.local -> $BaseUrl (OAuth in Phase 4 will register against the current tunnel)." -ForegroundColor Green
            Write-Host "NOTE: if SSO was already set up against the old URL, run resync-tunnel-url.ps1 instead of a fresh setup." -ForegroundColor DarkGray
        }
    }

    Write-Host "Reusing existing tunnel from env/.env.local -> $BaseUrl (port $Port, name '$TunnelName') OK" -ForegroundColor Green
} else {
    Write-Host "No MCP_SERVER_URL found in env/.env.local — the ui-widget devtunnel may not have been started yet." -ForegroundColor Yellow
    Write-Host "Start it first (in the project root run the ui-widget tunnel script: npm run tunnel / tunnel:win), then re-run." -ForegroundColor Yellow
    Write-Host "If you choose to proceed, create ONE tunnel with create-tunnel.ps1 on port $Port." -ForegroundColor Yellow
}
