# Recovery — re-sync the OAuth registration after the dev tunnel URL changes.
#
# WHY: the OAuth registration is created with `baseUrl: ${{MCP_SERVER_URL}}` (see
# atk-oauth-register.ps1), and ATK derives the Application ID URI from that tunnel domain, which is
# then written into the Entra app's identifierUris. So the tunnel domain is baked into THREE coupled
# places — the OAuth registration baseUrl, MCP_DA_OAUTH_APP_ID_URI, and the Entra app identifierUris.
# If the tunnel URL changes (tunnel deleted/recreated, anonymous tunnel expired, new name/port, or a
# different machine), the token audience no longer matches and authentication breaks.
#
# WHAT this does: detects the current tunnel URL (or takes -NewUrl), and if it differs from
# env/.env.local, updates MCP_SERVER_URL / MCP_SERVER_DOMAIN and re-runs the OAuth chain
# (Phase 4 -> 5 -> 6 -> 9) so every reference points at the new tunnel.
#
# Run from the PROJECT ROOT (same cwd as the rest of the setup scripts).
param(
    [string]$NewUrl,           # optional: force this base URL (e.g. https://myapp-tunnel-xyz.usw2.devtunnels.ms)
    [switch]$IncludeGraph      # pass through to update-entra-app.ps1 if the original run used -IncludeGraph (OBO)
)
. "$PSScriptRoot/_lib.ps1"

$AppPackageDir = Get-AppPackageDir
if (-not $AppPackageDir) { Fail "AppPackageDir not found — run this from the project root." }

$CurrentUrl = Get-EnvValue -Key "MCP_SERVER_URL"
$TunnelName = Get-EnvValue -Key "DEVTUNNEL_NAME"

# 1. Determine the new base URL.
if ($NewUrl) {
    $BaseUrl = $NewUrl.TrimEnd('/')
    Write-Host "Using supplied tunnel URL -> $BaseUrl"
} elseif ($TunnelName) {
    $show = devtunnel show $TunnelName 2>&1
    if ($LASTEXITCODE -ne 0) { Fail "'devtunnel show $TunnelName' failed. Pass -NewUrl <https://...> explicitly." }
    $line = $show | Where-Object { $_ -match "Connect via browser" -or $_ -match "https://" } | Select-Object -First 1
    $TunnelHost = ($line -replace '.*https://', '' -replace '/.*', '').Trim()
    if (-not $TunnelHost) { Fail "Could not parse the tunnel host from 'devtunnel show'. Pass -NewUrl <https://...> explicitly." }
    $BaseUrl = "https://$TunnelHost"
    Write-Host "Detected current tunnel URL -> $BaseUrl"
} else {
    Fail "No -NewUrl given and no DEVTUNNEL_NAME in env/.env.local — cannot detect the tunnel. Re-run /setup-sso-ui-widget instead."
}

$Domain = $BaseUrl -replace '^https?://', '' -replace '/.*', ''

# 2. If nothing changed, stop — re-registering would be a no-op churn.
if ($CurrentUrl -and ($CurrentUrl.TrimEnd('/') -eq $BaseUrl)) {
    Write-Host "MCP_SERVER_URL already matches the tunnel ($BaseUrl) — nothing to re-sync." -ForegroundColor Green
    return
}

Write-Host "Tunnel URL changed:" -ForegroundColor Yellow
Write-Host "  old: $CurrentUrl"
Write-Host "  new: $BaseUrl"

# 3. Update the env state bus.
Set-EnvValue -Key "MCP_SERVER_URL"    -Value $BaseUrl
Set-EnvValue -Key "MCP_SERVER_DOMAIN" -Value $Domain
Write-Host "env/.env.local updated (MCP_SERVER_URL / MCP_SERVER_DOMAIN)."

# 4. Re-run the OAuth chain so baseUrl, App ID URI, identifierUris, and mcpPlugin.json realign.
#    atk-oauth-register.ps1 clears MCP_DA_OAUTH_AUTH_ID / _APP_ID_URI before provisioning, so ATK
#    re-registers against the new baseUrl.
Write-Host "`n== Phase 4: re-register OAuth (new baseUrl) ==" -ForegroundColor Cyan
& "$PSScriptRoot/atk-oauth-register.ps1"
if ($LASTEXITCODE -ne 0) { Fail "atk-oauth-register.ps1 failed during re-sync." }

Write-Host "`n== Phase 5: update Entra app (identifierUris + preauth) ==" -ForegroundColor Cyan
if ($IncludeGraph) { & "$PSScriptRoot/update-entra-app.ps1" -IncludeGraph } else { & "$PSScriptRoot/update-entra-app.ps1" }
if ($LASTEXITCODE -ne 0) { Fail "update-entra-app.ps1 failed during re-sync." }

Write-Host "`n== Phase 6: re-point mcpPlugin.json auth ==" -ForegroundColor Cyan
& "$PSScriptRoot/wire-mcpplugin.ps1"
if ($LASTEXITCODE -ne 0) { Fail "wire-mcpplugin.ps1 failed during re-sync." }

Write-Host "`n== Phase 9: re-provision + re-sideload ==" -ForegroundColor Cyan
& "$PSScriptRoot/build-sideload.ps1"
if ($LASTEXITCODE -ne 0) { Fail "build-sideload.ps1 failed during re-sync." }

Write-Host "`nRe-sync complete — OAuth base URL + App ID URI now match $BaseUrl." -ForegroundColor Green
Write-Host "Restart the MCP server against the new tunnel and re-test in Copilot."
