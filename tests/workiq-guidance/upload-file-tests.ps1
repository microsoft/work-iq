#Requires -Version 7.2
param(
    [ValidateSet('metadata', 'complete', 'initial-status', 'progress', 'http-errors', 'source')]
    [string] $Case
)

$ErrorActionPreference = 'Stop'
$scripts = Join-Path $PSScriptRoot '..\..\scripts'
# Import only definitions and origins; no sign-in, cache access, or live endpoint.
foreach ($name in @('workiq-file-common.ps1', 'upload-file.ps1')) {
    $tokens = $null
    $errors = $null
    $ast = [Management.Automation.Language.Parser]::ParseFile((Join-Path $scripts $name), [ref] $tokens, [ref] $errors)
    if ($errors.Count -ne 0) { throw ($errors | Out-String) }
    foreach ($statement in $ast.EndBlock.Statements) {
        if ($statement -is [Management.Automation.Language.FunctionDefinitionAst] -or
            ($statement -is [Management.Automation.Language.AssignmentStatementAst] -and
                $statement.Left.VariablePath.UserPath -in @('publicOrigin', 'testOrigin'))) {
            Invoke-Expression $statement.Extent.Text
        }
    }
}
$Environment = 'Production'
$directory = Join-Path ([IO.Path]::GetTempPath()) "workiq-upload-test-$([Guid]::NewGuid().ToString('N'))"
$null = New-Item -ItemType Directory -Path $directory

function Assert-True {
    param([bool] $Condition, [string] $Message)
    if (-not $Condition) { throw $Message }
}

function Assert-Failure {
    param([scriptblock] $Run, [string] $Code)
    $failure = $null
    try { $null = & $Run } catch { $failure = $_.Exception.Message }
    Assert-True ($null -ne $failure -and $failure.Contains("[$Code]")) "Expected $Code; got $failure"
    Assert-True (-not $failure.Contains('sensitive-test-marker')) 'Error disclosed sensitive response or ticket data.'
}

Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

public sealed class SyntheticUploadHandler : HttpMessageHandler
{
    public readonly Queue<HttpResponseMessage> Responses = new Queue<HttpResponseMessage>();
    public readonly List<string> Methods = new List<string>();
    public readonly List<string> Urls = new List<string>();
    public readonly List<string> Tokens = new List<string>();
    public readonly List<string> Endpoints = new List<string>();
    public readonly List<string> Partitions = new List<string>();
    public readonly List<string> Ranges = new List<string>();
    public readonly List<long?> Lengths = new List<long?>();
    public readonly List<byte[]> Bodies = new List<byte[]>();
    public int FailAt;
    public Exception Failure = new HttpRequestException("sensitive-test-marker");
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellation)
    {
        Methods.Add(request.Method.Method);
        Urls.Add(request.RequestUri.OriginalString);
        Tokens.Add(request.Headers.Authorization.ToString());
        Endpoints.Add(request.Headers.TryGetValues("X-EndpointId", out var values) ? string.Join(",", values) : null);
        Partitions.Add(request.Headers.TryGetValues("targetpartition", out var partition) ? string.Join(",", partition) : null);
        Ranges.Add(request.Content?.Headers.ContentRange?.ToString());
        Lengths.Add(request.Content?.Headers.ContentLength);
        Bodies.Add(request.Content == null ? Array.Empty<byte>() : await request.Content.ReadAsByteArrayAsync(cancellation));
        if (FailAt == Methods.Count) throw Failure;
        if (Responses.Count == 0) throw new InvalidOperationException("Unexpected request");
        return Responses.Dequeue();
    }
}
'@

function New-TransferBody {
    param([long] $Size = 10, [int] $Chunk = 4)
    return @{
        file = @{ name = 'sample.bin'; size = $Size }
        transfer = @{ method = 'PUT'; preAuthenticated = $false; url = '/api/beta/files/synthetic-ticket/content' }
        _meta = @{
            'com.microsoft.workiq/clientAction' = @{
                contractVersion = '1.0'; kind = 'file-transfer'; direction = 'upload'
                transferMode = 'upload-session'; requiresFollowUp = $true; nextActor = 'client'
                fileId = 'synthetic-ticket'
                contentUrl = '/api/beta/files/synthetic-ticket/content'
                statusUrl = '/api/beta/files/synthetic-ticket'
                constraints = @{
                    expectedSize = $Size; supportsRanges = $true; sequentialRangesRequired = $true
                    recommendedChunkSize = $Chunk; chunkSizeMultiple = 2; maximumChunkSizeExclusive = 62914560
                }
            }
        }
    }
}

function Read-SyntheticTransfer {
    param($Body)
    $path = Join-Path $directory 'transfer.json'
    $Body | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $path -Encoding utf8
    return Read-UploadTransfer $path
}

function New-StatusBody {
    param([long] $Size, [long] $Next, [string] $State = 'active')
    $ranges = @()
    if ($State -ne 'completed') { $ranges = @("$Next-") }
    return @{
        direction = 'upload'; totalBytes = $Size; state = $State
        nextExpectedRanges = $ranges
    }
}

function New-Response {
    param($Body, [int] $Code = 200)
    $response = [Net.Http.HttpResponseMessage]::new([Net.HttpStatusCode] $Code)
    $response.Content = [Net.Http.StringContent]::new(($Body | ConvertTo-Json -Depth 10 -Compress))
    return $response
}

function New-UploadHandler {
    param([long] $Size = 10, [int] $Chunk = 4, [string] $InitialState = 'active')
    $handler = [SyntheticUploadHandler]::new()
    $handler.Responses.Enqueue((New-Response (New-StatusBody $Size 0 $InitialState)))
    for ([long] $next = [Math]::Min($Chunk, $Size); ; $next = [Math]::Min($next + $Chunk, $Size)) {
        $final = $next -eq $Size
        $state = if ($final) { 'completed' } else { 'active' }
        $code = if ($final) { 200 } else { 202 }
        $handler.Responses.Enqueue((New-Response (New-StatusBody $Size $next $state) $code))
        if ($final) { break }
    }
    return $handler
}

function Invoke-SyntheticUpload {
    param(
        [SyntheticUploadHandler] $Handler,
        [long] $Size = 10,
        [int] $Chunk = 4,
        [long] $SourceSize = $Size,
        [long] $Position = 0
    )
    $path = Join-Path $directory 'source.bin'
    $bytes = [byte[]]::new($SourceSize)
    for ($i = 0; $i -lt $bytes.Length; $i++) { $bytes[$i] = $i % 251 }
    [IO.File]::WriteAllBytes($path, $bytes)
    $transfer = Read-SyntheticTransfer (New-TransferBody $Size $Chunk)
    $stream = [IO.File]::Open($path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
    $stream.Position = $Position
    $client = [Net.Http.HttpClient]::new($Handler)
    try {
        return Invoke-FileUpload $client $transfer $stream 'sensitive-test-marker'
    }
    finally {
        $client.Dispose()
        $stream.Dispose()
    }
}

try {
    switch ($Case) {
        'metadata' {
            $valid = Read-SyntheticTransfer (New-TransferBody)
            Assert-True ($valid.Size -eq 10 -and $valid.ChunkSize -eq 4) 'Wrong transfer constraints.'
            foreach ($mutate in @(
                { param($b, $a) $a.direction = 'download' },
                { param($b, $a) $a.direction = @('upload') },
                { param($b, $a) $a.contractVersion = '2.0' },
                { param($b, $a) $a.kind = 'other' },
                { param($b, $a) $a.transferMode = 'other' },
                { param($b, $a) $a.requiresFollowUp = 'true' },
                { param($b, $a) $a.nextActor = 'server' },
                { param($b, $a) $a.constraints.expectedSize = 0; $b.file.size = 0 },
                { param($b, $a) $a.constraints.expectedSize = '10' },
                { param($b, $a) $a.constraints.expectedSize = 10.5 },
                { param($b, $a) $a.constraints.expectedSize = $true },
                { param($b, $a) $b.file.size = 11 },
                { param($b, $a) $a.constraints.recommendedChunkSize = 3 },
                { param($b, $a) $a.constraints.chunkSizeMultiple = 0 },
                { param($b, $a) $a.constraints.maximumChunkSizeExclusive = 4 },
                { param($b, $a) $a.constraints.maximumChunkSizeExclusive = 62914561 },
                { param($b, $a) $a.constraints.sequentialRangesRequired = $false },
                { param($b, $a) $a.constraints.supportsRanges = $false },
                { param($b, $a) $b.transfer.preAuthenticated = $true },
                { param($b, $a) $b.transfer.method = 'POST' },
                { param($b, $a) $b.transfer.method = @('PUT') },
                { param($b, $a) $a.fileId = 'different-ticket' },
                { param($b, $a) $a.statusUrl = '/api/beta/files/different-ticket' },
                { param($b, $a) $a.statusUrl = '/api/v1/files/synthetic-ticket' },
                { param($b, $a) $b.transfer.url = '/api/beta/files/different-ticket/content' },
                { param($b, $a) $a.Remove('contentUrl') }
            )) {
                $body = New-TransferBody
                & $mutate $body $body._meta.'com.microsoft.workiq/clientAction'
                Assert-Failure { Read-SyntheticTransfer $body } 'INVALID_METADATA'
            }
            foreach ($url in @(
                'https://tenant.sharepoint.com/sensitive-test-marker',
                'https://test.workiq.svc.cloud.dev.microsoft/api/beta/files/ticket/content',
                '/api/beta/files/ticket/content?secret=sensitive-test-marker',
                '/api/beta/files/ticket/content#fragment',
                '//example.invalid/api/beta/files/ticket/content'
            )) {
                $body = New-TransferBody
                $body._meta.'com.microsoft.workiq/clientAction'.contentUrl = $url
                Assert-Failure { Read-SyntheticTransfer $body } 'INVALID_REFERENCE'
            }
            foreach ($url in @(
                '/api/beta/files/synthetic-ticket/content',
                '/api/beta/files/synthetic-ticket?secret=sensitive-test-marker',
                'https://example.invalid/api/beta/files/synthetic-ticket'
            )) {
                $body = New-TransferBody
                $body._meta.'com.microsoft.workiq/clientAction'.statusUrl = $url
                Assert-Failure { Read-SyntheticTransfer $body } 'INVALID_REFERENCE'
            }
            $body = New-TransferBody
            $action = $body._meta.'com.microsoft.workiq/clientAction'
            $action.contentUrl = $body.transfer.url = 'https://workiq.svc.cloud.microsoft/api/v1/files/synthetic-ticket/content'
            $action.statusUrl = 'https://workiq.svc.cloud.microsoft/api/v1/files/synthetic-ticket'
            $null = Read-SyntheticTransfer $body
            $Environment = 'Test'
            $test = Read-SyntheticTransfer (New-TransferBody)
            Assert-True ($test.Content.Host -eq 'test.workiq.svc.cloud.dev.microsoft') 'Wrong test origin.'
            $Environment = 'Production'
            $path = Join-Path $directory 'malformed.json'
            Set-Content -LiteralPath $path -Value 'sensitive-test-marker invalid JSON'
            Assert-Failure { Read-UploadTransfer $path } 'INVALID_METADATA'
        }
        'complete' {
            foreach ($size in @(1, 4, 10, 5242881)) {
                $chunk = if ($size -gt 10) { 2097152 } else { 4 }
                $state = if ($size -eq 1) { 'prepared' } else { 'active' }
                $handler = New-UploadHandler $size $chunk $state
                $result = Invoke-SyntheticUpload $handler $size $chunk | ConvertFrom-Json
                Assert-True ($result.state -eq 'completed' -and $result.bytesUploaded -eq $size) 'Upload not completed.'
                Assert-True ($result.path -eq (Join-Path $directory 'source.bin')) 'Wrong source receipt.'
                Assert-True ($handler.Methods[0] -eq 'GET' -and $handler.Urls[0].EndsWith('/synthetic-ticket')) 'Missing initial status GET.'
                [long] $offset = 0
                for ($index = 1; $index -lt $handler.Methods.Count; $index++) {
                    $count = [Math]::Min($chunk, $size - $offset)
                    Assert-True ($handler.Methods[$index] -eq 'PUT') 'Wrong upload method.'
                    Assert-True ($handler.Urls[$index].EndsWith('/synthetic-ticket/content')) 'Wrong upload URL.'
                    Assert-True ($handler.Ranges[$index] -eq "bytes $offset-$($offset + $count - 1)/$size") 'Wrong content range.'
                    Assert-True ($handler.Lengths[$index] -eq $count -and $handler.Bodies[$index].Length -eq $count) 'Wrong content length.'
                    for ($j = 0; $j -lt $count; $j++) {
                        if ($handler.Bodies[$index][$j] -ne ($offset + $j) % 251) { throw 'Upload bytes changed.' }
                    }
                    $offset += $count
                }
                Assert-True ($offset -eq $size) 'Incomplete upload.'
                Assert-True (@($handler.Partitions | Where-Object { $null -ne $_ }).Count -eq 0) 'Unexpected default target partition.'
                Assert-True ($handler.Methods.Count -eq 1 + [Math]::Ceiling($size / $chunk)) 'Unexpected retry or request.'
                Assert-True (@($handler.Tokens | Where-Object { $_ -cne 'Bearer sensitive-test-marker' }).Count -eq 0) 'Wrong bearer token.'
            }
            $Environment = 'Test'
            $handler = New-UploadHandler
            $null = Invoke-SyntheticUpload $handler
            Assert-True (@($handler.Endpoints | Where-Object { $_ -cne '2' }).Count -eq 0) 'Missing test endpoint header.'
            Assert-True (@($handler.Urls | Where-Object { -not $_.StartsWith('https://test.workiq.svc.cloud.dev.microsoft/') }).Count -eq 0) 'Wrong test endpoint.'
            $Environment = 'Production'
            $TargetPartition = 'ClusterSet/ITM\SDFV2'
            $handler = New-UploadHandler
            $null = Invoke-SyntheticUpload $handler
            Assert-True (@($handler.Partitions | Where-Object { $_ -cne $TargetPartition }).Count -eq 0) 'Missing target partition on status or chunk request.'
        }
        'initial-status' {
            foreach ($mutate in @(
                { param($s) $s.state = 'completed'; $s.nextExpectedRanges = @() },
                { param($s) $s.state = 'indeterminate' },
                { param($s) $s.state = 'unknown' },
                { param($s) $s.nextExpectedRanges = @('4-') },
                { param($s) $s.nextExpectedRanges = @('0-9') },
                { param($s) $s.nextExpectedRanges = @('0-', '4-') },
                { param($s) $s.nextExpectedRanges = '0-' },
                { param($s) $s.direction = 'download' },
                { param($s) $s.direction = @('upload') },
                { param($s) $s.state = @('active') },
                { param($s) $s.totalBytes = 11 },
                { param($s) $s.totalBytes = '10' },
                { param($s) $s.recoveryReason = 'upload_outcome_unknown' }
            )) {
                $handler = [SyntheticUploadHandler]::new()
                $status = New-StatusBody 10 0 'prepared'
                & $mutate $status
                $handler.Responses.Enqueue((New-Response $status))
                Assert-Failure { Invoke-SyntheticUpload $handler } 'INVALID_STATUS'
                Assert-True ($handler.Methods.Count -eq 1) 'Sent bytes for an invalid or previously started transfer.'
            }
        }
        'progress' {
            foreach ($mutate in @(
                { param($s) $s.nextExpectedRanges = @('0-') },
                { param($s) $s.nextExpectedRanges = @('8-') },
                { param($s) $s.state = 'prepared' },
                { param($s) $s.state = 'indeterminate' },
                { param($s) $s.state = 'completed'; $s.nextExpectedRanges = @() },
                { param($s) $s.totalBytes = 11 }
            )) {
                $handler = [SyntheticUploadHandler]::new()
                $handler.Responses.Enqueue((New-Response (New-StatusBody 10 0)))
                $status = New-StatusBody 10 4
                & $mutate $status
                $handler.Responses.Enqueue((New-Response $status 202))
                Assert-Failure { Invoke-SyntheticUpload $handler } 'INVALID_STATUS'
                Assert-True ($handler.Methods.Count -eq 2) 'Replayed or continued an unconfirmed fragment.'
            }
            foreach ($status in @((New-StatusBody 1 1), (New-StatusBody 1 0 'indeterminate'))) {
                $handler = [SyntheticUploadHandler]::new()
                $handler.Responses.Enqueue((New-Response (New-StatusBody 1 0)))
                $handler.Responses.Enqueue((New-Response $status))
                Assert-Failure { Invoke-SyntheticUpload $handler 1 } 'INVALID_STATUS'
                Assert-True ($handler.Methods.Count -eq 2) 'Replayed uncertain final fragment.'
            }
        }
        'http-errors' {
            foreach ($code in @(202, 301, 302, 307, 308, 400, 401, 403, 404, 409, 429, 500, 503)) {
                $handler = [SyntheticUploadHandler]::new()
                $handler.Responses.Enqueue((New-Response (New-StatusBody 1 0)))
                $response = New-Response @{ error = 'sensitive-test-marker' } $code
                $response.Headers.Location = [Uri] 'https://example.invalid/sensitive-test-marker'
                $handler.Responses.Enqueue($response)
                Assert-Failure { Invoke-SyntheticUpload $handler 1 } 'UPLOAD_OUTCOME_UNKNOWN'
                Assert-True ($handler.Methods.Count -eq 2) 'Retried or followed a redirect after an unsuccessful PUT.'
            }
            foreach ($body in @('sensitive-test-marker invalid JSON', ('x' * 65537))) {
                $handler = [SyntheticUploadHandler]::new()
                $handler.Responses.Enqueue((New-Response (New-StatusBody 1 0)))
                $response = [Net.Http.HttpResponseMessage]::new([Net.HttpStatusCode]::OK)
                $response.Content = [Net.Http.StringContent]::new($body)
                $handler.Responses.Enqueue($response)
                Assert-Failure { Invoke-SyntheticUpload $handler 1 } 'UPLOAD_OUTCOME_UNKNOWN'
                Assert-True ($handler.Methods.Count -eq 2) 'Retried after an invalid response.'
            }
            foreach ($failAt in @(1, 2, 3, 4)) {
                $handler = New-UploadHandler
                $handler.FailAt = $failAt
                $code = if ($failAt -eq 1) { 'UPLOAD_FAILED' } else { 'UPLOAD_OUTCOME_UNKNOWN' }
                Assert-Failure { Invoke-SyntheticUpload $handler } $code
                Assert-True ($handler.Methods.Count -eq $failAt) 'Replayed a request with a lost response.'
            }
            $handler = New-UploadHandler
            $handler.FailAt = 2
            $handler.Failure = [OperationCanceledException]::new('sensitive-test-marker')
            Assert-Failure { Invoke-SyntheticUpload $handler } 'UPLOAD_OUTCOME_UNKNOWN'
            Assert-True ($handler.Methods.Count -eq 2) 'Retried after cancellation.'
            $handler = New-UploadHandler 1
            $responses = $handler.Responses.ToArray()
            $responses[1].Content.Headers.ContentEncoding.Add('gzip')
            Assert-Failure { Invoke-SyntheticUpload $handler 1 } 'UPLOAD_OUTCOME_UNKNOWN'
        }
        'source' {
            foreach ($size in @(0, 9, 11)) {
                $handler = New-UploadHandler
                Assert-Failure { Invoke-SyntheticUpload $handler -SourceSize $size } 'INVALID_SOURCE'
                Assert-True ($handler.Methods.Count -eq 0) 'Contacted WorkIQ for a mismatched local file.'
            }
            $handler = New-UploadHandler
            Assert-Failure { Invoke-SyntheticUpload $handler -Position 1 } 'INVALID_SOURCE'
            Assert-True ($handler.Methods.Count -eq 0) 'Resumed a nonzero local stream.'
        }
    }
    "PASS $Case"
}
finally {
    Remove-Item -LiteralPath $directory -Recurse -Force
}
