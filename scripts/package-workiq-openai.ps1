[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$OutputPath,
    [switch]$Draft
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = Split-Path $PSScriptRoot -Parent
$pluginRoot = Join-Path $root 'plugins\workiq'
$submissionRoot = Join-Path $pluginRoot 'openai-submission'
$manifestText = Get-Content -LiteralPath (Join-Path $submissionRoot 'plugin.json') -Raw
$mcpText = Get-Content -LiteralPath (Join-Path $submissionRoot 'mcp.json') -Raw
$manifest = $manifestText | ConvertFrom-Json
$mcp = $mcpText | ConvertFrom-Json
$canonical = Get-Content -LiteralPath (Join-Path $pluginRoot '.codex-plugin\plugin.json') -Raw | ConvertFrom-Json

if ($manifest.name -ne 'workiq' -or $manifest.version -ne $canonical.version) {
    throw 'Submission identity/version must match the canonical WorkIQ manifest.'
}
if (-not (Test-Path -LiteralPath (Join-Path $pluginRoot 'skills\workiq\SKILL.md') -PathType Leaf)) {
    throw 'Missing required WorkIQ skill.'
}
$servers = @($mcp.mcpServers.PSObject.Properties)
if ($servers.Count -ne 1 -or $servers[0].Name -ne 'workiq') {
    throw 'WorkIQ review cases require exactly one MCP server named workiq.'
}
if ($servers[0].Value.type -ne 'streamable-http' -or $servers[0].Value.url -notmatch '^https://') {
    throw 'WorkIQ submission requires a remote HTTPS Streamable HTTP MCP server.'
}

$pending = [System.Collections.Generic.List[string]]::new()
if ("$manifestText`n$mcpText" -match '(?i)pending[_.]') {
    $pending.Add('Replace all pending metadata and configuration values.')
}
$interface = $manifest.extensions.'com.openai'.interface
$listingText = @($manifest.name, $manifest.description, $interface.displayName,
    $interface.shortDescription, $interface.longDescription) -join "`n"
if ($listingText -match '(?i)\b(?:Copilot|Claude|Codex|ChatGPT|OpenAI|Gemini|GPT(?:-\w+)?)\b') {
    throw 'Listing names and descriptions must describe WorkIQ without referencing AI assistant or model brands.'
}
if ($interface.shortDescription.Length -gt 30 -or @($interface.defaultPrompt).Count -gt 3) {
    throw 'Listing requires a short description of at most 30 characters and at most three starter prompts.'
}
foreach ($icon in @($interface.logo, $interface.composerIcon)) {
    if ($icon -notmatch '^\./assets/[a-zA-Z0-9_-]+\.png$') {
        throw "Expected an icon path under ./assets/: $icon"
    }
    if (-not (Test-Path -LiteralPath (Join-Path $submissionRoot $icon) -PathType Leaf)) {
        throw "Missing referenced icon: $icon. Draft builds must include referenced files."
    }
}
if ($pending.Count -gt 0) {
    $message = $pending -join [Environment]::NewLine
    if (-not $Draft) {
        throw "Submission inputs are incomplete. Use -Draft only for inspection.`n$message"
    }
    Write-Warning "DRAFT ONLY - not ready for submission.`n$message"
}

$output = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputPath)
if ([System.IO.Path]::GetExtension($output) -ne '.zip') {
    throw 'OutputPath must name a .zip file.'
}
if (Test-Path -LiteralPath $output) {
    throw "Refusing to overwrite an existing path: $output"
}
$null = New-Item -ItemType Directory -Force -Path (Split-Path $output -Parent)

$files = @(
    @{ Source = (Join-Path $submissionRoot 'plugin.json'); Entry = 'plugin.json' }
    @{ Source = (Join-Path $submissionRoot 'mcp.json'); Entry = 'mcp.json' }
    @{ Source = (Join-Path $submissionRoot 'README.md'); Entry = 'README.md' }
    @{ Source = (Join-Path $root 'LICENSE'); Entry = 'LICENSE' }
    @{ Source = (Join-Path $root 'NOTICES.TXT'); Entry = 'NOTICES.TXT' }
)
foreach ($directory in @(
    @{ Path = (Join-Path $pluginRoot 'skills'); Prefix = 'skills/' }
    @{ Path = (Join-Path $submissionRoot 'assets'); Prefix = 'assets/' }
)) {
    if (Test-Path -LiteralPath $directory.Path -PathType Container) {
        foreach ($file in Get-ChildItem -LiteralPath $directory.Path -Recurse -File -Force) {
            $relative = $file.FullName.Substring($directory.Path.Length + 1).Replace('\', '/')
            $files += @{ Source = $file.FullName; Entry = $directory.Prefix + $relative }
        }
    }
}
foreach ($file in $files) {
    if ($file.ContainsKey('Source') -and -not (Test-Path -LiteralPath $file.Source -PathType Leaf)) {
        throw "Missing package input: $($file.Source)"
    }
}

Add-Type -AssemblyName System.IO.Compression
$stream = [System.IO.File]::Open($output, [System.IO.FileMode]::CreateNew)
try {
    $archive = [System.IO.Compression.ZipArchive]::new($stream, [System.IO.Compression.ZipArchiveMode]::Create, $true)
    try {
        foreach ($file in $files) {
            $entry = $archive.CreateEntry($file.Entry)
            $target = $entry.Open()
            try {
                if ($file.ContainsKey('Content')) {
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes($file.Content)
                    $target.Write($bytes, 0, $bytes.Length)
                } else {
                    $source = [System.IO.File]::OpenRead($file.Source)
                    try { $source.CopyTo($target) } finally { $source.Dispose() }
                }
            } finally { $target.Dispose() }
        }
    } finally { $archive.Dispose() }
} finally { $stream.Dispose() }

Write-Output "Created $output"
