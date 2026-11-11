$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$fixture = Join-Path ([System.IO.Path]::GetTempPath()) "workiq-openai-test-$([guid]::NewGuid())"
$null = New-Item -ItemType Directory -Path $fixture
try {
    $null = New-Item -ItemType Directory -Path (Join-Path $fixture 'scripts'), (Join-Path $fixture 'plugins')
    Copy-Item -LiteralPath (Join-Path $root 'scripts\package-workiq-openai.ps1') -Destination (Join-Path $fixture 'scripts')
    Copy-Item -LiteralPath (Join-Path $root 'plugins\workiq') -Destination (Join-Path $fixture 'plugins\workiq') -Recurse -Force
    foreach ($name in @('LICENSE', 'NOTICES.TXT')) {
        Copy-Item -LiteralPath (Join-Path $root $name) -Destination $fixture
    }
    $packager = Join-Path $fixture 'scripts\package-workiq-openai.ps1'
    $output = Join-Path $fixture 'submission.zip'
    & $packager -OutputPath $output

    Add-Type -AssemblyName System.IO.Compression
    $zip = [System.IO.Compression.ZipFile]::OpenRead($output)
    try {
        function Read-ZipJson([string]$Name) {
            $reader = [System.IO.StreamReader]::new($zip.GetEntry($Name).Open())
            try { return ($reader.ReadToEnd() | ConvertFrom-Json) } finally { $reader.Dispose() }
        }
        if ($null -ne $zip.GetEntry('.codex-plugin/plugin.json') -or $null -ne $zip.GetEntry('.mcp.json')) {
            throw 'Compatibility manifests must not shadow the portable submission manifests.'
        }
        $manifest = Read-ZipJson 'plugin.json'
        if ($manifest.'$schema' -ne 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json') {
            throw 'Missing portable plugin schema.'
        }
        $mcp = Read-ZipJson 'mcp.json'
        if ($mcp.'$schema' -ne 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json') {
            throw 'Missing portable MCP schema.'
        }
        $servers = @($mcp.mcpServers.PSObject.Properties)
        if ($servers.Count -ne 1 -or $servers[0].Name -ne 'workiq') {
            throw 'Review cases must resolve to exactly one WorkIQ MCP server.'
        }
        if ($servers[0].Value.type -ne 'streamable-http' -or
            $servers[0].Value.url -ne 'https://workiq.svc.cloud.microsoft/mcp' -or
            $servers[0].Value.extensions.'com.openai'.auth.type -ne 'oauth') {
            throw 'Hosted transport, endpoint, or OAuth settings were lost in packaging.'
        }
        $scopes = @($servers[0].Value.extensions.'com.openai'.auth.defaultScopes)
        if ($scopes.Count -ne 1 -or $scopes[0] -cne 'fdcc1f02-fc51-4226-8753-f668596af7f7/WorkIQAgent.Ask') {
            throw 'The advertised WorkIQ OAuth default scope was lost in packaging.'
        }
        $client = $servers[0].Value.extensions.'com.openai'.auth.client
        $sourceMcp = Get-Content -LiteralPath (Join-Path $fixture 'plugins\workiq\openai-submission\mcp.json') -Raw | ConvertFrom-Json
        if ($client.mode -ne 'provided' -or
            [string]::IsNullOrWhiteSpace($client.clientId) -or
            $client.clientId -cne $sourceMcp.mcpServers.workiq.extensions.'com.openai'.auth.client.clientId) {
            throw 'The provided OAuth client ID was lost in packaging.'
        }
        $cases = $manifest.extensions.'com.openai'.review.test_cases
        if ($cases.positive.Count -ne 5 -or $cases.negative.Count -ne 3) {
            throw 'Review scenarios were lost in packaging.'
        }
        $interface = $manifest.extensions.'com.openai'.interface
        if ($interface.shortDescription.Length -gt 30 -or $interface.defaultPrompt.Count -gt 3) {
            throw 'Listing exceeds submission limits.'
        }
        foreach ($path in @($interface.logo, $interface.composerIcon)) {
            if ($null -eq $zip.GetEntry($path.Substring(2))) {
                throw "Missing referenced icon: $path"
            }
        }
        $skills = Join-Path $root 'plugins\workiq\skills'
        $sourceFiles = @(Get-ChildItem -LiteralPath $skills -File -Recurse -Force)
        if (@($zip.Entries | Where-Object { $_.FullName.StartsWith('skills/') }).Count -ne $sourceFiles.Count) {
            throw 'Skill file count changed.'
        }
        foreach ($file in $sourceFiles) {
            $name = 'skills/' + $file.FullName.Substring($skills.Length + 1).Replace('\', '/')
            $entry = $zip.GetEntry($name)
            if ($null -eq $entry) { throw "Missing skill file: $name" }
            $stream = $entry.Open()
            $sha = [System.Security.Cryptography.SHA256]::Create()
            try { $actual = ([System.BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-', '') }
            finally { $sha.Dispose(); $stream.Dispose() }
            if ($actual -ne (Get-FileHash -LiteralPath $file.FullName).Hash) {
                throw "Skill bytes changed: $name"
            }
        }
        Write-Output 'PASS: root portable manifests, provided OAuth client ID, scope, review cases, listing, assets, and unchanged skills'
    } finally { $zip.Dispose() }

    function Assert-Rejected([scriptblock]$Action, [string]$Message) {
        $rejected = $false
        try { & $Action } catch {
            if ($_.Exception.Message -notmatch $Message) { throw }
            $rejected = $true
        }
        if (-not $rejected) { throw "Expected rejection matching: $Message" }
    }
    $hash = (Get-FileHash -LiteralPath $output).Hash
    Assert-Rejected { & $packager -Draft -OutputPath $output } 'Refusing to overwrite'
    if ($hash -ne (Get-FileHash -LiteralPath $output).Hash) { throw 'Existing ZIP changed.' }

    $manifestPath = Join-Path $fixture 'plugins\workiq\openai-submission\plugin.json'
    $originalManifest = Get-Content -LiteralPath $manifestPath -Raw
    foreach ($field in @('description', 'longDescription')) {
        $config = $originalManifest | ConvertFrom-Json
        if ($field -eq 'description') { $config.description = 'A Copilot integration for workplace data.' }
        else { $config.extensions.'com.openai'.interface.longDescription = 'Requires Microsoft 365 Copilot licensing.' }
        $config | ConvertTo-Json -Depth 50 | Set-Content -LiteralPath $manifestPath
        Assert-Rejected { & $packager -Draft -OutputPath (Join-Path $fixture "invalid-$field.zip") } 'Listing names and descriptions'
        if (Test-Path -LiteralPath (Join-Path $fixture "invalid-$field.zip")) { throw 'Rejected listing created a ZIP.' }
    }
    Set-Content -LiteralPath $manifestPath -Value $originalManifest
    Write-Output 'PASS: assistant-brand references rejected in package and listing descriptions'

    $mcpPath = Join-Path $fixture 'plugins\workiq\openai-submission\mcp.json'
    $original = Get-Content -LiteralPath $mcpPath -Raw
    foreach ($count in @(0, 2)) {
        $config = $original | ConvertFrom-Json
        if ($count -eq 0) { $config.mcpServers.PSObject.Properties.Remove('workiq') }
        else { $config.mcpServers | Add-Member -NotePropertyName 'extra' -NotePropertyValue $config.mcpServers.workiq }
        $config | ConvertTo-Json -Depth 50 | Set-Content -LiteralPath $mcpPath
        Assert-Rejected { & $packager -Draft -OutputPath (Join-Path $fixture "invalid-$count.zip") } 'exactly one MCP server'
        if (Test-Path -LiteralPath (Join-Path $fixture "invalid-$count.zip")) { throw 'Rejected build created a ZIP.' }
    }
    Set-Content -LiteralPath $mcpPath -Value $original
    $config = $originalManifest | ConvertFrom-Json
    $config.extensions.'com.openai'.interface.supportURL = 'https://pending.invalid/support'
    $config | ConvertTo-Json -Depth 50 | Set-Content -LiteralPath $manifestPath
    Assert-Rejected { & $packager -OutputPath (Join-Path $fixture 'pending.zip') } 'Submission inputs are incomplete'
    Set-Content -LiteralPath $manifestPath -Value $originalManifest
    Remove-Item -LiteralPath (Join-Path $fixture 'plugins\workiq\openai-submission\assets\icon.png')
    Assert-Rejected { & $packager -Draft -OutputPath (Join-Path $fixture 'missing-icon.zip') } 'Missing referenced icon'
    Write-Output 'PASS: zero/multiple servers, missing icons, pending release metadata, and overwrite rejection'
} finally {
    Remove-Item -LiteralPath $fixture -Recurse -Force
}
