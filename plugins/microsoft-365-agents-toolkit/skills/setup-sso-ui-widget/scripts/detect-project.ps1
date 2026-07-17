# Phase 0 — Workspace Check. Detects a Copilot MCP-server agent project (MCP Apps OR OAI Apps)
# and stops if it isn't one. Supports both widget standards.
. "$PSScriptRoot/_lib.ps1"

$AppPackageDir = Get-AppPackageDir
$hasAtk        = (Test-Path "m365agents.yml") -or (Test-Path "m365agents.local.yml") -or (Test-Path "teamsapp.yml")
$Manifest      = Get-PluginManifest
$McpServerDir  = Get-McpServerDir
$ServerStyle   = if ($McpServerDir) { Get-ServerStyle -ServerDir $McpServerDir } else { $null }
$hasAiPlugin   = $AppPackageDir -and (Test-Path (Join-Path $AppPackageDir "ai-plugin.json")) -and -not $Manifest

$ManifestName  = if ($Manifest) { Split-Path $Manifest -Leaf } else { "<none>" }
$Layout        = if ($ServerStyle -eq "express") { "MCP Apps (Express)" } else { "OAI Apps (raw-http)" }
Write-Host "AppPackageDir=$AppPackageDir hasAtk=$hasAtk manifest=$ManifestName serverStyle=$ServerStyle McpServerDir=$McpServerDir"

if (-not ($hasAtk -and $AppPackageDir -and $Manifest -and $McpServerDir)) {
    Write-Host "This does not look like a Copilot MCP-server agent project." -ForegroundColor Red
    Write-Host "Expected: m365agents.yml + $AppPackageDir/declarativeAgent.json + a runtimes[] plugin manifest (mcpPlugin.json for OAI Apps, or readiness_plugin.json for MCP Apps) + an MCP server with @modelcontextprotocol/sdk." -ForegroundColor Red
    if ($hasAiPlugin) {
        Write-Host "Found ai-plugin.json (express-jwt API-plugin layout) — this skill targets the runtimes[] plugin manifest layout, not ai-plugin.json." -ForegroundColor Yellow
    }
    Fail "Build/wrap the agent first (create-mcp-app for MCP Apps, or ui-widget-developer for OAI Apps), then re-run this skill."
}

# Persist the detected server style so Phase 7b picks the right guard variant (SSO_ = stripped by cleanup).
Set-EnvValue -Key "SSO_SERVER_STYLE" -Value $ServerStyle

Write-Host "$Layout project detected OK  (manifest: $ManifestName, server: $McpServerDir)" -ForegroundColor Green
