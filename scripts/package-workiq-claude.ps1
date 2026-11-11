[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$OutputPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = Split-Path $PSScriptRoot -Parent
$pluginRoot = Join-Path $root 'plugins\workiq'
$manifestPath = Join-Path $pluginRoot '.claude-plugin\plugin.json'
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$sourceMcp = Get-Content -LiteralPath (Join-Path $pluginRoot '.mcp.json') -Raw | ConvertFrom-Json
$servers = @($sourceMcp.mcpServers.PSObject.Properties)
if ($manifest.name -ne 'workiq' -or $manifest.skills -ne './skills/') {
    throw 'Expected the canonical WorkIQ Claude manifest and skills directory.'
}
if ($servers.Count -ne 1 -or $servers[0].Name -ne 'workiq') {
    throw 'The Claude package requires exactly one MCP server named workiq.'
}
if ($servers[0].Value.type -ne 'http' -or $servers[0].Value.url -notmatch '^https://') {
    throw 'The Claude package requires a remote HTTPS HTTP MCP server.'
}
$mcp = @{
    mcpServers = @{
        workiq = @{
            type = 'http'
            url = $servers[0].Value.url
        }
    }
}

$files = @(
    @{ Source = $manifestPath; Entry = '.claude-plugin/plugin.json' }
    @{ Source = (Join-Path $pluginRoot 'claude-package\icon.png'); Entry = 'claude-package/icon.png' }
    @{ Content = ($mcp | ConvertTo-Json -Depth 10); Entry = '.mcp.json' }
    @{ Source = (Join-Path $pluginRoot 'claude-package\README.md'); Entry = 'README.md' }
    @{ Source = (Join-Path $root 'LICENSE'); Entry = 'LICENSE' }
    @{ Source = (Join-Path $root 'NOTICES.TXT'); Entry = 'NOTICES.TXT' }
)
$skills = Join-Path $pluginRoot 'skills'
if (-not (Test-Path -LiteralPath (Join-Path $skills 'workiq\SKILL.md') -PathType Leaf)) {
    throw 'Missing required WorkIQ skill.'
}
foreach ($file in Get-ChildItem -LiteralPath $skills -Recurse -File -Force) {
    $relative = $file.FullName.Substring($skills.Length + 1).Replace('\', '/')
    $files += @{ Source = $file.FullName; Entry = 'skills/' + $relative }
}
foreach ($file in $files) {
    if ($file.ContainsKey('Source') -and -not (Test-Path -LiteralPath $file.Source -PathType Leaf)) {
        throw "Missing package input: $($file.Source)"
    }
}

$output = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputPath)
if ([System.IO.Path]::GetExtension($output) -ne '.zip') {
    throw 'OutputPath must name a .zip file.'
}
if (Test-Path -LiteralPath $output) {
    throw "Refusing to overwrite an existing path: $output"
}
$null = New-Item -ItemType Directory -Force -Path (Split-Path $output -Parent)

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
