$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$fixture = Join-Path ([System.IO.Path]::GetTempPath()) "workiq-claude-test-$([guid]::NewGuid())"
$null = New-Item -ItemType Directory -Path $fixture
try {
    $null = New-Item -ItemType Directory -Path (Join-Path $fixture 'scripts'), (Join-Path $fixture 'plugins')
    Copy-Item -LiteralPath (Join-Path $root 'scripts\package-workiq-claude.ps1') -Destination (Join-Path $fixture 'scripts')
    Copy-Item -LiteralPath (Join-Path $root 'plugins\workiq') -Destination (Join-Path $fixture 'plugins\workiq') -Recurse -Force
    foreach ($name in @('LICENSE', 'NOTICES.TXT')) {
        Copy-Item -LiteralPath (Join-Path $root $name) -Destination $fixture
    }
    $packager = Join-Path $fixture 'scripts\package-workiq-claude.ps1'
    $output = Join-Path $fixture 'workiq.zip'
    $sourceMcpPath = Join-Path $fixture 'plugins\workiq\.mcp.json'
    $sourceMcp = Get-Content -LiteralPath $sourceMcpPath -Raw
    & $packager -OutputPath $output
    if ((Get-Content -LiteralPath $sourceMcpPath -Raw) -cne $sourceMcp) {
        throw 'Packaging modified the source MCP configuration.'
    }

    Add-Type -AssemblyName System.IO.Compression
    $zip = [System.IO.Compression.ZipFile]::OpenRead($output)
    try {
        function Read-ZipJson([string]$Name) {
            $reader = [System.IO.StreamReader]::new($zip.GetEntry($Name).Open())
            try { return ($reader.ReadToEnd() | ConvertFrom-Json) } finally { $reader.Dispose() }
        }
        $manifest = Read-ZipJson '.claude-plugin/plugin.json'
        if ($manifest.name -ne 'workiq' -or $manifest.skills -ne './skills/') {
            throw 'Invalid Claude manifest or skill reference.'
        }
        $mcp = Read-ZipJson '.mcp.json'
        $servers = @($mcp.mcpServers.PSObject.Properties)
        if ($servers.Count -ne 1 -or $servers[0].Name -ne 'workiq' -or
            $servers[0].Value.type -ne 'http' -or
            $servers[0].Value.url -ne 'https://workiq.svc.cloud.microsoft/mcp') {
            throw 'Expected exactly one hosted WorkIQ HTTP server.'
        }
        if (@($servers[0].Value.PSObject.Properties).Count -ne 2) {
            throw 'Copilot-specific authentication settings leaked into the Claude package.'
        }
        $expected = @('.claude-plugin/plugin.json', '.mcp.json', 'claude-package/icon.png', 'README.md', 'LICENSE', 'NOTICES.TXT')
        if ($null -eq $zip.GetEntry(($manifest.icon -replace '^\./', ''))) {
            throw 'Claude manifest must reference the packaged icon.'
        }
        $skills = Join-Path $root 'plugins\workiq\skills'
        foreach ($file in Get-ChildItem -LiteralPath $skills -File -Recurse -Force) {
            $expected += 'skills/' + $file.FullName.Substring($skills.Length + 1).Replace('\', '/')
        }
        if (Compare-Object ($expected | Sort-Object) ($zip.Entries.FullName | Sort-Object)) {
            throw 'Archive contains missing or unexpected files.'
        }
        foreach ($entry in $zip.Entries) {
            if ($entry.FullName -eq '.mcp.json') { continue }
            $source = switch ($entry.FullName) {
                'README.md' { Join-Path $root 'plugins\workiq\claude-package\README.md' }
                'LICENSE' { Join-Path $root 'LICENSE' }
                'NOTICES.TXT' { Join-Path $root 'NOTICES.TXT' }
                default { Join-Path (Join-Path $root 'plugins\workiq') $entry.FullName.Replace('/', '\') }
            }
            $stream = $entry.Open()
            $sha = [System.Security.Cryptography.SHA256]::Create()
            try { $actual = ([System.BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-', '') }
            finally { $sha.Dispose(); $stream.Dispose() }
            if ($actual -ne (Get-FileHash -LiteralPath $source).Hash) {
                throw "Package bytes changed: $($entry.FullName)"
            }
        }
    } finally { $zip.Dispose() }
    Write-Output 'PASS: Claude-only layout, hosted MCP configuration, unchanged skills and source configuration'

    function Assert-Rejected([scriptblock]$Action, [string]$Message) {
        $rejected = $false
        try { & $Action } catch {
            if ($_.Exception.Message -notmatch $Message) { throw }
            $rejected = $true
        }
        if (-not $rejected) { throw "Expected rejection matching: $Message" }
    }
    $hash = (Get-FileHash -LiteralPath $output).Hash
    Assert-Rejected { & $packager -OutputPath $output } 'Refusing to overwrite'
    if ($hash -ne (Get-FileHash -LiteralPath $output).Hash) { throw 'Existing ZIP changed.' }
    Assert-Rejected { & $packager -OutputPath (Join-Path $fixture 'invalid.txt') } 'must name a .zip'
    foreach ($count in @(0, 2)) {
        $config = $sourceMcp | ConvertFrom-Json
        if ($count -eq 0) { $config.mcpServers.PSObject.Properties.Remove('workiq') }
        else { $config.mcpServers | Add-Member -NotePropertyName 'extra' -NotePropertyValue $config.mcpServers.workiq }
        $config | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $sourceMcpPath
        Assert-Rejected { & $packager -OutputPath (Join-Path $fixture "invalid-$count.zip") } 'exactly one MCP server'
        if (Test-Path -LiteralPath (Join-Path $fixture "invalid-$count.zip")) { throw 'Rejected build created a ZIP.' }
    }
    $config = $sourceMcp | ConvertFrom-Json
    $config.mcpServers.workiq.url = 'http://example.invalid/mcp'
    $config | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $sourceMcpPath
    Assert-Rejected { & $packager -OutputPath (Join-Path $fixture 'insecure.zip') } 'remote HTTPS'
    Set-Content -LiteralPath $sourceMcpPath -Value $sourceMcp
    $iconPath = Join-Path $fixture 'plugins\workiq\claude-package\icon.png'
    Remove-Item -LiteralPath $iconPath
    Assert-Rejected { & $packager -OutputPath (Join-Path $fixture 'missing-icon.zip') } 'Missing package input:.*icon\.png'
    Copy-Item -LiteralPath (Join-Path $root 'plugins\workiq\claude-package\icon.png') -Destination $iconPath
    Remove-Item -LiteralPath (Join-Path $fixture 'plugins\workiq\skills\workiq\SKILL.md')
    Assert-Rejected { & $packager -OutputPath (Join-Path $fixture 'missing-skill.zip') } 'Missing required WorkIQ skill'
    Write-Output 'PASS: overwrite, extension, server count, insecure endpoint, missing icon, and missing skill rejection'
} finally {
    Remove-Item -LiteralPath $fixture -Recurse -Force
}
