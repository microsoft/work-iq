#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Sync the teams-app-developer skill from OfficeDev/microsoft-365-agents-toolkit on GitHub.

.DESCRIPTION
  Downloads the ATK skill tree from GitHub (no local clone required), then copies bulk
  content into work-iq/plugins/microsoft-365-agents-toolkit/skills/teams-app-developer/
  and re-injects DA redirect notices into conflict files. Skips SKILL.md (manually maintained).

  After syncing, updates scripts/sync-manifest.json with the source commit hash.

.PARAMETER Ref
  Branch, tag, or commit SHA to sync from (default: main).

.PARAMETER TargetPath
  Path to the work-iq teams-app-developer skill root (defaults to the standard relative location).

.PARAMETER DryRun
  Print what would be copied/updated without writing any files.

.EXAMPLE
  .\sync-atk-skill.ps1
  .\sync-atk-skill.ps1 -Ref "v5.12.0"
  .\sync-atk-skill.ps1 -DryRun
#>
param(
  [string]$Ref = "main",

  [string]$TargetPath = (Join-Path $PSScriptRoot "..\plugins\microsoft-365-agents-toolkit\skills\teams-app-developer"),

  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$TargetPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($TargetPath)
$ManifestPath = Join-Path $PSScriptRoot "sync-manifest.json"

$SourceRepo   = "OfficeDev/microsoft-365-agents-toolkit"
$SourcePrefix = "packages/vscode-extension/skills/microsoft-365-agents-toolkit"
$ApiBase      = "https://api.github.com/repos/$SourceRepo"
$RawBase      = "https://raw.githubusercontent.com/$SourceRepo"

Write-Host "Source : github.com/$SourceRepo @ $Ref"
Write-Host "Prefix : $SourcePrefix"
Write-Host "Target : $TargetPath"
if ($DryRun) { Write-Host "[DRY RUN] No files will be written.`n" -ForegroundColor Yellow }

# ── Resolve ref to commit SHA ─────────────────────────────────────────────────
Write-Host "`nResolving ref '$Ref'..."
$commitResp = Invoke-RestMethod "$ApiBase/commits/$Ref" -Headers @{ "User-Agent" = "sync-atk-skill" }
$SourceCommit = $commitResp.sha
Write-Host "  Resolved to: $SourceCommit"

# ── Fetch file tree via GitHub API ────────────────────────────────────────────
Write-Host "`nFetching file tree..."
$treeResp = Invoke-RestMethod "$ApiBase/git/trees/$SourceCommit`?recursive=1" `
  -Headers @{ "User-Agent" = "sync-atk-skill" }
$allFiles = $treeResp.tree | Where-Object { $_.type -eq "blob" -and $_.path -like "$SourcePrefix/*" }
Write-Host "  Found $($allFiles.Count) files under $SourcePrefix"

# ── Directories to copy verbatim ─────────────────────────────────────────────
$BulkDirs = @(
  "experts",
  "docs",
  "toolkit",
  "test-playground",
  "test-teams",
  "troubleshoot",
  "slack-to-teams"
)

# Dirs that need DA redirect patching after copy
$PatchDirs = @("create-project", "provision-deploy")
$SyncDirs  = $BulkDirs + $PatchDirs
$Changed   = [System.Collections.Generic.List[string]]::new()

function Download-File {
  param([string]$RepoPath, [string]$LocalPath)
  $url = "$RawBase/$SourceCommit/$RepoPath"
  $dir = Split-Path $LocalPath -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  Invoke-WebRequest $url -OutFile $LocalPath -UseBasicParsing
}

foreach ($dir in $SyncDirs) {
  $prefix = "$SourcePrefix/$dir/"
  $dirFiles = $allFiles | Where-Object { $_.path -like "$prefix*" }
  if ($dirFiles.Count -eq 0) {
    Write-Warning "No files found for $dir/, skipping"
    continue
  }

  if ($DryRun) {
    Write-Host "  [WOULD COPY] $dir/ ($($dirFiles.Count) files)"
  } else {
    Write-Host "  [COPYING] $dir/ ($($dirFiles.Count) files)..."
    foreach ($file in $dirFiles) {
      $relativePath = $file.path.Substring($SourcePrefix.Length + 1)  # strip source prefix
      $localPath = Join-Path $TargetPath $relativePath
      Download-File -RepoPath $file.path -LocalPath $localPath
    }
    Write-Host "  [DONE] $dir/"
  }
  $Changed.Add($dir)
}

# ── DA redirect patching ──────────────────────────────────────────────────────
$DA_CREATE_PROJECT_REDIRECT = @'

> **Creating a Declarative Agent?** Use the **`declarative-agent-developer`** skill instead — it
> provides deeper guidance on DA scaffolding, manifest authoring, capability configuration,
> API/MCP plugin setup, OAuth, localization, and deployment. The templates below include DA
> options for reference, but the `declarative-agent-developer` skill owns that workflow end-to-end.

'@

$DA_PROVISION_REDIRECT = @'

> **Declarative Agent deployment?** After provisioning, you need a test link to verify your DA in
> M365 Copilot. That post-deploy review UX (reading `M365_TITLE_ID` and presenting the test URL)
> is owned by the **`declarative-agent-developer`** skill — use that skill for all DA end-to-end
> workflows. This document covers the `atk provision / atk deploy` commands shared by all project
> types (DA, CEA, bot, tab, message extension).
'@

function Patch-DARedirect {
  param([string]$FilePath, [string]$Marker, [string]$Redirect)
  if (-not (Test-Path $FilePath)) { return }
  $content = Get-Content $FilePath -Raw -Encoding UTF8
  if ($content -match [regex]::Escape($Redirect.Trim())) {
    Write-Host "  [SKIP PATCH] Redirect already present: $(Split-Path $FilePath -Leaf)"
    return
  }
  $patched = $content -replace [regex]::Escape($Marker), "$Marker`n$Redirect"
  if (-not $DryRun) {
    Set-Content $FilePath $patched -Encoding UTF8 -NoNewline
    Write-Host "  [PATCHED] $(Split-Path $FilePath -Leaf)"
  } else {
    Write-Host "  [WOULD PATCH] $(Split-Path $FilePath -Leaf)"
  }
}

Patch-DARedirect `
  -FilePath (Join-Path $TargetPath "create-project\create-project.md") `
  -Marker "## Template Selection Guide" `
  -Redirect $DA_CREATE_PROJECT_REDIRECT

Patch-DARedirect `
  -FilePath (Join-Path $TargetPath "provision-deploy\provision-deploy.md") `
  -Marker "Provision Azure and M365 resources, then deploy your agent to the cloud." `
  -Redirect $DA_PROVISION_REDIRECT

# ── SKILL.md: skip (manually maintained) ─────────────────────────────────────
Write-Host "`n  [SKIPPED] SKILL.md (manually maintained — review source changes and update by hand)"

# ── Update sync-manifest.json ─────────────────────────────────────────────────
$manifest = [ordered]@{
  last_sync            = (Get-Date -Format "yyyy-MM-dd")
  source_repo          = $SourceRepo
  source_ref           = $Ref
  source_commit        = $SourceCommit
  source_prefix        = $SourcePrefix
  target_skill         = "teams-app-developer"
  manually_maintained  = @("SKILL.md")
  da_redirect_injected = @("create-project/create-project.md", "provision-deploy/provision-deploy.md")
  synced_dirs          = $Changed.ToArray()
}

if (-not $DryRun) {
  $manifest | ConvertTo-Json -Depth 5 | Set-Content $ManifestPath -Encoding UTF8
  Write-Host "  [WRITTEN] sync-manifest.json (commit: $($SourceCommit.Substring(0,12)))"
} else {
  Write-Host "  [WOULD WRITE] sync-manifest.json (commit: $($SourceCommit.Substring(0,12)))"
}

Write-Host "`nSync complete.`n"
