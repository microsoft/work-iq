# Phase 9 — Build the server with the guard, re-provision, validate, and sideload.
. "$PSScriptRoot/_lib.ps1"

$McpServerDir  = Get-McpServerDir
$AppPackageDir = Get-AppPackageDir
if (-not $McpServerDir)  { Fail "McpServerDir not found — run detect-project.ps1 first." }
if (-not $AppPackageDir) { Fail "AppPackageDir not found — run detect-project.ps1 first." }

# Build the server with the new guard.
npm --prefix $McpServerDir install
npm --prefix $McpServerDir run build
if ($LASTEXITCODE -ne 0) { Fail "Build failed — fix the TypeScript errors, then re-run." }

# Rebuild the app package with the patched mcpPlugin.json auth, then validate + sideload.
atk provision --env local --interactive false

$zipPath = if (Test-Path "$AppPackageDir/build/appPackage.zip") { "./$AppPackageDir/build/appPackage.zip" }
           else { (Get-ChildItem -Recurse -Filter "appPackage*.zip" | Select-Object -First 1).FullName }
if (-not $zipPath) { Fail "Could not find the built appPackage*.zip." }
atk validate --package-file $zipPath
atk install --file-path $zipPath
Write-Host "Validated + sideloaded: $zipPath OK" -ForegroundColor Green
