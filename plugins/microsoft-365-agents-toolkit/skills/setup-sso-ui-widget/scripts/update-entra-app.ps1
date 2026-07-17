# Phase 5 (Step 3) — Update the Entra app: set the Application ID URI, v2 tokens, the access_as_user
# scope, and pre-authorize M365 Copilot. Graph User.Read is opt-in via -IncludeGraph (pure SSO
# needs no Graph permission).
param([switch]$IncludeGraph)
. "$PSScriptRoot/_lib.ps1"

$ClientId = Get-EnvValue -Key "CLIENT_ID"
$AppIdUri = Get-EnvValue -Key "MCP_DA_OAUTH_APP_ID_URI"
if (-not $ClientId) { Fail "CLIENT_ID not set — run register-entra-app.ps1 first." }
if (-not $AppIdUri) { Fail "MCP_DA_OAUTH_APP_ID_URI is empty — re-run atk-oauth-register.ps1 (Phase 4)." }

$ObjectId = az ad app show --id $ClientId --query id -o tsv
if (-not $ObjectId) { Fail "Could not resolve the app Object ID from CLIENT_ID $ClientId." }

# Helper: PATCH the application via Microsoft Graph with a short-lived body file.
function Invoke-GraphPatch([hashtable]$Body, [string]$What) {
    $json = $Body | ConvertTo-Json -Depth 6 -Compress
    $file = [System.IO.Path]::GetTempFileName()
    $json | Set-Content -Path $file -Encoding UTF8
    $out = az rest --method PATCH --uri "https://graph.microsoft.com/v1.0/applications/$ObjectId" --headers "Content-Type=application/json" --body "@$file" 2>&1
    Remove-Item $file -ErrorAction SilentlyContinue
    if ($LASTEXITCODE -ne 0) { Write-Host $out -ForegroundColor Red; Fail "$What failed — do not continue." }
}

# Step 1 — Application ID URI (use the ATK-generated URI, not api://$ClientId).
az ad app update --id $ClientId --identifier-uris "$AppIdUri"
Write-Host "Application ID URI set -> $AppIdUri"

# v2.0 tokens (M365 Copilot SSO requires v2).
Invoke-GraphPatch @{ api = @{ requestedAccessTokenVersion = 2 } } "Set access token version"
Write-Host "Access token version set -> v2.0"

# Step 2 — access_as_user scope (reuse the id if it already exists).
$existing = az ad app show --id $ClientId 2>$null | ConvertFrom-Json
$ScopeId = ($existing.api.oauth2PermissionScopes | Where-Object { $_.value -eq "access_as_user" } | Select-Object -First 1).id
if (-not $ScopeId) {
    $ScopeId = [guid]::NewGuid().ToString()
    Invoke-GraphPatch @{ api = @{ oauth2PermissionScopes = @(@{
        adminConsentDescription = "Allow the application to access the server on behalf of the signed-in user"
        adminConsentDisplayName = "Access as user"
        id = $ScopeId; isEnabled = $true; type = "User"
        userConsentDescription = "Allow the application to access the server on your behalf"
        userConsentDisplayName = "Access as user"; value = "access_as_user"
    }) } } "Add access_as_user scope"
}
Write-Host "Scope: access_as_user"

# Step 3 — pre-authorize M365 Copilot ONLY (the single client a DA needs).
Invoke-GraphPatch @{ api = @{ preAuthorizedApplications = @(@{
    appId = "ab3be6b7-f5df-413d-ac2d-abf1e3fd9c0b"; delegatedPermissionIds = @($ScopeId)
}) } } "Pre-authorize M365 Copilot"
Write-Host "Pre-authorized M365 Copilot client"

# Step 4 — Graph User.Read is OPTIONAL (only for OBO/Graph). Pure SSO needs no Graph permission.
if ($IncludeGraph) {
    $perms = az ad app show --id $ClientId --query "requiredResourceAccess" -o json 2>$null | ConvertFrom-Json
    $hasUserRead = $perms | Where-Object { $_.resourceAccess | Where-Object { $_.id -eq "e1fe6dd8-ba31-4d61-89e7-88639da4683d" } }
    if (-not $hasUserRead) {
        az ad app permission add --id $ClientId --api 00000003-0000-0000-c000-000000000000 --api-permissions e1fe6dd8-ba31-4d61-89e7-88639da4683d=Scope
        Write-Host "User.Read permission added (Graph/OBO) — admin consent may be required; see register-app.md."
    }
} else {
    Write-Host "Skipped Graph User.Read (pure SSO). Pass -IncludeGraph only if you plan to call Microsoft Graph (OBO)."
}

Write-Host "Entra app updated OK" -ForegroundColor Green
