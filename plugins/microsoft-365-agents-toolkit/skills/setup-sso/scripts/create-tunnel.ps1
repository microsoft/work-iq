# Optional fallback — create ONE dev tunnel if the ui-widget tunnel isn't already running.
# Only run this when gather-inputs.ps1 reported no MCP_SERVER_URL and you choose to proceed.
. "$PSScriptRoot/_lib.ps1"

$AppDisplayName = Get-EnvValue -Key "SSO_APP_DISPLAY_NAME"; if (-not $AppDisplayName) { $AppDisplayName = "uiwidget-agent" }
$Port = Get-EnvValue -Key "DEVTUNNEL_PORT"; if (-not $Port) { $Port = "3001" }

# Login if needed.
$status = devtunnel user show 2>&1
if ($status -match "not logged in" -or $LASTEXITCODE -ne 0) { devtunnel user login }

# Tunnel name: all-lowercase, valid chars, <=60, no leading/trailing hyphen.
$TunnelName = (($AppDisplayName -replace '[^a-z0-9-]', '') + "-tunnel").ToLower()
if ($TunnelName.Length -gt 60) { $TunnelName = $TunnelName.Substring(0, 60) }
$TunnelName = $TunnelName.Trim('-')

devtunnel create $TunnelName --allow-anonymous --host-header unchanged
devtunnel port create $TunnelName -p $Port

# Parse the tunnel host from `devtunnel show`.
$show = devtunnel show $TunnelName
$line = $show | Where-Object { $_ -match "Connect via browser" -or $_ -match "https://" } | Select-Object -First 1
$TunnelHost = ($line -replace '.*https://', '' -replace '/.*', '').Trim()
if (-not $TunnelHost) { Fail "Could not parse the tunnel host from 'devtunnel show'." }
$BaseUrl = "https://$TunnelHost"

Set-EnvValue -Key "DEVTUNNEL_NAME"    -Value $TunnelName
Set-EnvValue -Key "MCP_SERVER_URL"    -Value $BaseUrl
Set-EnvValue -Key "MCP_SERVER_DOMAIN" -Value $TunnelHost
Write-Host "Tunnel created: $BaseUrl (name '$TunnelName', port $Port) OK" -ForegroundColor Green
