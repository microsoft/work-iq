# Phase 4 (Step 2) — ATK OAuth Registration (MicrosoftEntra), env = local.
# Injects oauth/register into the LOCAL ATK yml, pre-seeds env/.env.local, provisions, and verifies
# the generated Auth ID + Application ID URI (written by ATK as MCP_DA_OAUTH_AUTH_ID / _APP_ID_URI).
. "$PSScriptRoot/_lib.ps1"

$ClientId = Get-EnvValue -Key "CLIENT_ID"
if (-not $ClientId) { Fail "CLIENT_ID not set — run register-entra-app.ps1 first." }

# 4a. Ensure the oauth/register action exists in the LOCAL lifecycle yml (--env local runs .local.yml).
$ymlPath = if (Test-Path "m365agents.local.yml") { "m365agents.local.yml" }
           elseif (Test-Path "teamsapp.local.yml") { "teamsapp.local.yml" }
           elseif (Test-Path "m365agents.yml") { "m365agents.yml" }
           else { "teamsapp.yml" }
$yml = Get-Content $ymlPath -Raw

$authIdKey = "MCP_DA_OAUTH_AUTH_ID"; $appIdUriKey = "MCP_DA_OAUTH_APP_ID_URI"
if ($yml -match 'oauth/register') {
    $m1 = [regex]::Match($yml, 'configurationId:\s*([A-Z0-9_]+)');   if ($m1.Success) { $authIdKey   = $m1.Groups[1].Value }
    $m2 = [regex]::Match($yml, 'applicationIdUri:\s*([A-Z0-9_]+)');  if ($m2.Success) { $appIdUriKey = $m2.Groups[1].Value }
} else {
    $action = @'
  - uses: oauth/register
    with:
      name: daSso
      flow: authorizationCode
      appId: ${{TEAMS_APP_ID}}
      clientId: ${{AAD_APP_CLIENT_ID}}
      identityProvider: MicrosoftEntra
      baseUrl: ${{MCP_SERVER_URL}}
    writeToEnvironmentFile:
      configurationId: MCP_DA_OAUTH_AUTH_ID
      applicationIdUri: MCP_DA_OAUTH_APP_ID_URI

'@
    $marker = "- uses: teamsApp/zipAppPackage"
    $idx = $yml.IndexOf($marker)
    if ($idx -ge 0) {
        $lineStart = $yml.LastIndexOf("`n", $idx) + 1
        $yml = $yml.Substring(0, $lineStart) + $action + $yml.Substring($lineStart)
    } elseif ($yml -match '(?m)^provision:\s*$') {
        $pidx = [regex]::Match($yml, '(?m)^provision:\s*$').Index
        $nl = $yml.IndexOf("`n", $pidx)
        if ($nl -lt 0) {
            # 'provision:' is the file's LAST line with no trailing newline — append after it.
            $yml = $yml.TrimEnd() + "`r`n" + $action
        } else {
            $yml = $yml.Substring(0, $nl + 1) + $action + $yml.Substring($nl + 1)
        }
    } else {
        $yml = $yml.TrimEnd() + "`r`n`r`nprovision:`r`n" + $action
    }
    Set-Content $ymlPath -Value $yml -Encoding UTF8
    Write-Host "Injected oauth/register (MicrosoftEntra) into $ymlPath OK"
}
Write-Host "Auth ID key: $authIdKey | API URI key: $appIdUriKey"

# 4b. Pre-seed env vars (leave the oauth keys empty; ATK's provision fills them).
Set-EnvValue   -Key "AAD_APP_CLIENT_ID" -Value $ClientId
Set-EnvValue   -Key $authIdKey   -Value ""
Set-EnvValue   -Key $appIdUriKey -Value ""
Set-EnvDefault -Key "TEAMS_APP_ID" -Value ""
Write-Host "Pre-seeded env/.env.local"

# 4c. Ensure ATK login, then provision.
if ((atk auth list 2>&1) -notmatch "microsoft.com") { atk auth login m365 }
atk provision --env local --interactive false

# 4d. Read + verify the generated Auth ID + Application ID URI.
$AuthId   = Get-EnvValue -Key $authIdKey
$AppIdUri = Get-EnvValue -Key $appIdUriKey
if ([string]::IsNullOrWhiteSpace($AuthId) -or [string]::IsNullOrWhiteSpace($AppIdUri)) {
    Fail "ATK did not emit Auth ID / App ID URI. Re-run 'atk provision --env local --interactive false' and check env/.env.local."
}
Write-Host "Auth ID: $AuthId OK" -ForegroundColor Green
Write-Host "App ID URI: $AppIdUri OK" -ForegroundColor Green
