# Phase 3 (Step 1) — Create the Entra ID app (single-tenant).
# Persists TENANT_ID, CLIENT_ID, AAD_APP_CLIENT_ID to env/.env.local.
. "$PSScriptRoot/_lib.ps1"

$AppDisplayName = Get-EnvValue -Key "SSO_APP_DISPLAY_NAME"
if (-not $AppDisplayName) { Fail "SSO_APP_DISPLAY_NAME not set — run gather-inputs.ps1 first." }

# Sign-in check via Microsoft Graph (az account show needs an ARM subscription; app registration
# only needs tenant/Graph context). --allow-no-subscriptions lets subscription-less users sign in.
$signedIn = az ad signed-in-user show --only-show-errors 2>$null | ConvertFrom-Json
if (-not $signedIn) {
    Write-Host "Not signed in to Azure CLI — launching browser. Sign in in the popup; this resumes automatically." -ForegroundColor Yellow
    az login --allow-no-subscriptions --only-show-errors | Out-Null
    $signedIn = az ad signed-in-user show --only-show-errors 2>$null | ConvertFrom-Json
}
if (-not $signedIn) { Fail "Azure login failed. Run 'az login' manually, then re-run." }

$TenantId = az rest --method GET --uri "https://graph.microsoft.com/v1.0/organization" --only-show-errors 2>$null | ConvertFrom-Json | ForEach-Object { $_.value[0].id }
if (-not $TenantId) { Fail "Could not determine tenant ID from Microsoft Graph. Verify Azure CLI login + Graph access." }
Write-Host "Logged in as: $($signedIn.userPrincipalName) | Tenant: $TenantId"

# Single-tenant only — this skill's guard pins the issuer to one tenant.
$SignInAudience = "AzureADMyOrg"

$appJson = az ad app create --display-name "$AppDisplayName" --sign-in-audience $SignInAudience
$app = $appJson | ConvertFrom-Json
$ClientId = $app.appId
$ObjectId = $app.id
if ([string]::IsNullOrWhiteSpace($ClientId)) {
    Fail "'az ad app create' did not return an appId. Review the az output above (permissions / tenant policy) and retry."
}
Write-Host "App created: $AppDisplayName | Client ID: $ClientId"

az ad sp create --id $ClientId 2>$null | Out-Null
Write-Host "Service principal created"

# M365 Copilot's SSO flow uses the oAuthConsentRedirect URI (matches ATK's oauth/register default).
az ad app update --id $ClientId --web-redirect-uris "https://teams.microsoft.com/api/platform/v1.0/oAuthConsentRedirect"
Write-Host "Redirect URI set"

Set-EnvValue -Key "TENANT_ID"         -Value $TenantId
Set-EnvValue -Key "CLIENT_ID"         -Value $ClientId
Set-EnvValue -Key "AAD_APP_CLIENT_ID" -Value $ClientId
Write-Host "Persisted TENANT_ID / CLIENT_ID / AAD_APP_CLIENT_ID to env/.env.local OK" -ForegroundColor Green
