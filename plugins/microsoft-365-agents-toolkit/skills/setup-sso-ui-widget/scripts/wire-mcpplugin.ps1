# Phase 6 — Wire SSO into the plugin manifest (mcpPlugin.json for OAI Apps, readiness_plugin.json
# for MCP Apps) + add SSO-aware conversation starters (conditional).
. "$PSScriptRoot/_lib.ps1"

$AppPackageDir = Get-AppPackageDir
if (-not $AppPackageDir) { Fail "AppPackageDir not found — run detect-project.ps1 first." }
$AuthId = Get-EnvValue -Key "MCP_DA_OAUTH_AUTH_ID"
if (-not $AuthId) { Fail "MCP_DA_OAUTH_AUTH_ID is empty — re-run atk-oauth-register.ps1 (Phase 4)." }

# Resolve the runtimes[] plugin manifest (filename-agnostic: mcpPlugin.json OR readiness_plugin.json).
$mcpPluginPath = Get-PluginManifest
if (-not $mcpPluginPath) { Fail "No plugin manifest (mcpPlugin.json / readiness_plugin.json) found — run detect-project.ps1 first." }
$manifestName = Split-Path $mcpPluginPath -Leaf

# Switch the RemoteMCPServer runtime auth None -> OAuthPluginVault. Leave spec.url's
# ${{MCP_SERVER_URL}}/mcp placeholder intact so ATK keeps resolving it from env/.env.local.
$mcp = Get-Content $mcpPluginPath -Raw | ConvertFrom-Json -Depth 30
foreach ($rt in $mcp.runtimes) {
    if ($rt.type -eq "RemoteMCPServer") {
        $rt.auth = [pscustomobject]@{ type = "OAuthPluginVault"; reference_id = $AuthId }
    }
}
$mcp | ConvertTo-Json -Depth 30 | Set-Content $mcpPluginPath -Encoding UTF8
Write-Host "$manifestName : runtime auth -> OAuthPluginVault ($AuthId) OK"

# Conversation starters: surface the widget's OWN starters in declarativeAgent.json when the DA
# defines none. The widget already declares tool-driven starters under mcpPlugin.json
# capabilities.conversation_starters; those trigger the MCP tool, which performs the SSO token
# exchange — so they double as the SSO proof. We do NOT inject synthetic identity starters.
# NOTE: @($null).Count is 1 in PowerShell, so guard the absent case explicitly.
$daJsonPath = Join-Path $AppPackageDir "declarativeAgent.json"
if (Test-Path $daJsonPath) {
    $daJson = Get-Content $daJsonPath -Raw | ConvertFrom-Json

    $daExisting = $daJson.conversation_starters
    $daCount = if ($null -eq $daExisting) { 0 } else { @($daExisting).Count }

    if ($daCount -gt 0) {
        Write-Host "declarativeAgent.json already defines $daCount conversation_starter(s) — leaving them intact."
    } else {
        # Pull the widget's own starters from mcpPlugin.json capabilities.conversation_starters.
        $widgetStarters = $mcp.capabilities.conversation_starters
        $wsCount = if ($null -eq $widgetStarters) { 0 } else { @($widgetStarters).Count }

        if ($wsCount -gt 0) {
            $copied = @($widgetStarters | ForEach-Object {
                [pscustomobject]@{ title = $_.title; text = $_.text }
            })
            $daJson | Add-Member -NotePropertyName conversation_starters -NotePropertyValue $copied -Force
            $daJson | ConvertTo-Json -Depth 10 | Set-Content $daJsonPath -Encoding UTF8
            Write-Host "Copied $wsCount widget conversation_starter(s) from mcpPlugin.json into declarativeAgent.json."
        } else {
            Write-Host "No conversation_starters found in mcpPlugin.json either — leaving declarativeAgent.json unchanged."
        }
    }
} else {
    Write-Host "WARNING: $daJsonPath not found; skipping conversation_starters update." -ForegroundColor Yellow
}
