# Phase 8 — Write the server's SSO env (TENANT_ID / CLIENT_ID / APP_ID_URI) into env/.env.local.
# The ui-widget server reads these via dotenv. If your server loads a different env file, target that.
. "$PSScriptRoot/_lib.ps1"

$TenantId = Get-EnvValue -Key "TENANT_ID"
$ClientId = Get-EnvValue -Key "CLIENT_ID"
$AppIdUri = Get-EnvValue -Key "MCP_DA_OAUTH_APP_ID_URI"
if (-not $TenantId -or -not $ClientId -or -not $AppIdUri) {
    Fail "Missing TENANT_ID / CLIENT_ID / APP_ID_URI. Run Phases 3-5 first."
}

Set-EnvValue -Key "TENANT_ID"  -Value $TenantId
Set-EnvValue -Key "CLIENT_ID"  -Value $ClientId
Set-EnvValue -Key "APP_ID_URI" -Value $AppIdUri
Write-Host "env/.env.local: TENANT_ID, CLIENT_ID, APP_ID_URI written OK (server audience = $AppIdUri)" -ForegroundColor Green
