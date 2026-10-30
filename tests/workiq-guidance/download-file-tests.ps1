#Requires -Version 7.2
param(
    [ValidateSet('urls', 'complete', 'incomplete', 'http-errors', 'output', 'authentication', 'permission-scopes')]
    [string] $Case
)

$ErrorActionPreference = 'Stop'
$scriptPath = Join-Path $PSScriptRoot '..\..\scripts\download-file.ps1'
$tokens = $null
$errors = $null
# Load functions, not the entry point, so tests cannot sign in or contact WorkIQ.
foreach ($source in @((Join-Path (Split-Path $scriptPath) 'workiq-file-common.ps1'), $scriptPath)) {
    $ast = [Management.Automation.Language.Parser]::ParseFile($source, [ref] $tokens, [ref] $errors)
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
$Overwrite = $false
$directory = Join-Path ([IO.Path]::GetTempPath()) "workiq-file-test-$([Guid]::NewGuid().ToString('N'))"
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
    Assert-True (-not $failure.Contains('sensitive-test-marker')) 'Error disclosed a response, token, or ticket.'
}

Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

public sealed class SyntheticFileContent : HttpContent
{
    private readonly byte[] body;
    public SyntheticFileContent(byte[] body) { this.body = body; }
    protected override bool TryComputeLength(out long length) { length = 0; return false; }
    protected override Task SerializeToStreamAsync(Stream stream, TransportContext context)
        => stream.WriteAsync(body, 0, body.Length);
}

public sealed class SyntheticFileHandler : HttpMessageHandler
{
    public HttpResponseMessage Response;
    public Exception Failure;
    public int Requests;
    public string Method, Url, Authorization, Endpoint, Partition;
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellation)
    {
        Requests++;
        Method = request.Method.Method;
        Url = request.RequestUri.OriginalString;
        Authorization = request.Headers.Authorization.ToString();
        Endpoint = request.Headers.TryGetValues("X-EndpointId", out var values) ? string.Join(",", values) : null;
        Partition = request.Headers.TryGetValues("targetpartition", out var partition) ? string.Join(",", partition) : null;
        if (Failure != null) throw Failure;
        return Task.FromResult(Response);
    }
}
'@

function Invoke-SyntheticDownload {
    param(
        [string] $Body = 'data',
        [long] $Size = 4,
        [Nullable[long]] $Length = 4,
        [int] $Status = 200,
        [switch] $Partial,
        [switch] $Encoded,
        [Exception] $Failure
    )
    $handler = [SyntheticFileHandler]::new()
    $handler.Response = [Net.Http.HttpResponseMessage]::new([Net.HttpStatusCode] $Status)
    $handler.Response.Content = [SyntheticFileContent]::new([Text.Encoding]::UTF8.GetBytes($Body))
    $handler.Response.Content.Headers.ContentType = [Net.Http.Headers.MediaTypeHeaderValue]::new('application/octet-stream')
    $handler.Response.Content.Headers.ContentLength = $Length
    if ($Partial) {
        $handler.Response.Content.Headers.ContentRange = [Net.Http.Headers.ContentRangeHeaderValue]::new(0, 1, 4)
    }
    if ($Encoded) { $handler.Response.Content.Headers.ContentEncoding.Add('gzip') }
    if ($Status -eq 302) {
        $handler.Response.Headers.Location = [Uri] 'https://example.invalid/sensitive-test-marker'
    }
    $handler.Failure = $Failure
    $client = [Net.Http.HttpClient]::new($handler)
    $reference = Resolve-ContentUrl '/api/beta/files/synthetic-ticket/content'
    $target = Join-Path $directory 'result.bin'
    try {
        $result = Invoke-FileDownload -Client $client -Reference $reference -Target $target -Size $Size -Token 'sensitive-test-marker'
        $parsed = $result | ConvertFrom-Json
        Assert-True ($parsed.state -eq 'completed' -and $parsed.bytesWritten -eq $Size) 'Incorrect completion metadata.'
        Assert-True ($parsed.path -eq $target) 'Wrong output path.'
        Assert-True ((Get-Content -LiteralPath $target -Raw) -ceq $Body -or $Size -eq 0) 'File bytes changed.'
        Assert-True ($parsed.sha256 -eq (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()) 'Incorrect digest.'
        Assert-True ($handler.Method -eq 'GET' -and $handler.Requests -eq 1) 'Unexpected HTTP method or retry.'
        Assert-True ($handler.Url -ceq $reference.OriginalString) 'Content ticket changed.'
        Assert-True ($handler.Authorization -ceq 'Bearer sensitive-test-marker') 'Missing WorkIQ authorization.'
        Assert-True (($Environment -eq 'Test' -and $handler.Endpoint -eq '2') -or
            ($Environment -eq 'Production' -and $null -eq $handler.Endpoint)) 'Wrong environment header.'
        Assert-True ([string] $handler.Partition -ceq [string] $TargetPartition) 'Wrong target partition header.'
        Assert-True (-not $result.Contains('sensitive-test-marker') -and -not $result.Contains('synthetic-ticket')) 'Output leaked credentials or ticket.'
    }
    finally {
        $client.Dispose()
        $handler.Response.Dispose()
        Assert-True ($handler.Requests -eq 1) 'A failure retried or followed a redirect.'
        Assert-True (@(Get-ChildItem -LiteralPath $directory -Filter '.workiq-file-*.tmp' -Force).Count -eq 0) 'Staging file leaked.'
    }
}

try {
    switch ($Case) {
        'urls' {
            foreach ($version in @('beta', 'v1')) {
                $relative = "/api/$version/files/Az_09-ticket/content"
                Assert-True ((Resolve-ContentUrl $relative).AbsoluteUri -ceq "$publicOrigin$relative") 'Relative content path changed.'
                Assert-True ((Resolve-ContentUrl "$publicOrigin$relative").AbsoluteUri -ceq "$publicOrigin$relative") 'Absolute content URL changed.'
            }
            foreach ($url in @(
                'https://tenant.sharepoint.com/native-content',
                'https://workiq.svc.cloud.microsoft.example.invalid/api/beta/files/id/content',
                'http://workiq.svc.cloud.microsoft/api/beta/files/id/content',
                'https://user@workiq.svc.cloud.microsoft/api/beta/files/id/content',
                'https://workiq.svc.cloud.microsoft:444/api/beta/files/id/content',
                'https://workiq.svc.cloud.microsoft:443/api/beta/files/id/content',
                'https://workiq.svc.cloud.microsoft/api/beta/files/id/../content',
                '/api/beta/files/id%2fother/content',
                '/api/beta/files/id%5cother/content',
                '/api/beta/files/id/content?token=synthetic',
                '/api/beta/files/id/content#fragment',
                '/api/beta/files/id',
                '/api/catalogs/artifact-references/id',
                '//example.invalid/api/beta/files/id/content',
                '/api/beta/files/../content',
                '/api/beta/files/id\other/content',
                "/api/beta/files/id/content`n"
            )) { Assert-Failure { Resolve-ContentUrl $url } 'INVALID_REFERENCE' }
            $Environment = 'Test'
            Assert-True ((Resolve-ContentUrl '/api/beta/files/id/content').Host -eq ([Uri] $testOrigin).Host) 'Wrong Test origin.'
            Assert-Failure { Resolve-ContentUrl "$publicOrigin/api/beta/files/id/content" } 'INVALID_REFERENCE'
            $Environment = 'Production'
            Assert-Failure { Resolve-ContentUrl "$testOrigin/api/beta/files/id/content" } 'INVALID_REFERENCE'
        }
        'complete' {
            Invoke-SyntheticDownload
            Remove-Item -LiteralPath (Join-Path $directory 'result.bin')
            Invoke-SyntheticDownload -Body '' -Size 0 -Length 0
            Remove-Item -LiteralPath (Join-Path $directory 'result.bin')
            $largeBody = 'x' * (4 * 1024 * 1024 + 17)
            Invoke-SyntheticDownload -Body $largeBody -Size $largeBody.Length -Length $largeBody.Length
            Remove-Item -LiteralPath (Join-Path $directory 'result.bin')
            $Environment = 'Test'
            Invoke-SyntheticDownload -Length $null
            Remove-Item -LiteralPath (Join-Path $directory 'result.bin')
            $Environment = 'Production'
            $TargetPartition = 'ClusterSet/ITM\SDFV2'
            Invoke-SyntheticDownload
        }
        'incomplete' {
            Assert-Failure { Invoke-SyntheticDownload -Body 'da' } 'DOWNLOAD_FAILED'
            Assert-Failure { Invoke-SyntheticDownload -Body 'data-extra' } 'DOWNLOAD_FAILED'
            Assert-Failure { Invoke-SyntheticDownload -Length 3 } 'DOWNLOAD_FAILED'
            Assert-Failure { Invoke-SyntheticDownload -Partial } 'DOWNLOAD_FAILED'
            Assert-Failure { Invoke-SyntheticDownload -Encoded } 'DOWNLOAD_FAILED'
            Assert-True (-not (Test-Path -LiteralPath (Join-Path $directory 'result.bin'))) 'Incomplete file was published.'
        }
        'http-errors' {
            foreach ($status in @(401, 403)) {
                Assert-Failure { Invoke-SyntheticDownload -Status $status -Body 'sensitive-test-marker' } 'AUTH_FAILED'
            }
            Assert-Failure { Invoke-SyntheticDownload -Status 404 } 'TICKET_UNAVAILABLE'
            foreach ($status in @(202, 204, 206, 302, 429, 503)) {
                Assert-Failure { Invoke-SyntheticDownload -Status $status } 'DOWNLOAD_FAILED'
            }
            Assert-Failure {
                Invoke-SyntheticDownload -Failure ([Net.Http.HttpRequestException]::new('sensitive-test-marker'))
            } 'DOWNLOAD_FAILED'
            Assert-Failure {
                Invoke-SyntheticDownload -Failure ([OperationCanceledException]::new('sensitive-test-marker'))
            } 'DOWNLOAD_FAILED'
            Assert-True (-not (Test-Path -LiteralPath (Join-Path $directory 'result.bin'))) 'Failed response was published.'
        }
        'output' {
            $target = Join-Path $directory 'result.bin'
            Set-Content -LiteralPath $target -Value 'original' -NoNewline
            Assert-Failure { Resolve-OutputPath $target } 'TARGET_EXISTS'
            Assert-Failure { Invoke-SyntheticDownload } 'TARGET_EXISTS'
            Assert-True ((Get-Content -LiteralPath $target -Raw) -ceq 'original') 'Existing file was overwritten.'
            $Overwrite = $true
            Invoke-SyntheticDownload
            Assert-Failure { Resolve-OutputPath $directory } 'NOT_WRITABLE'
            Assert-Failure { Resolve-OutputPath (Join-Path $directory 'missing\file.bin') } 'NOT_WRITABLE'
        }
        'authentication' {
            function Read-RefreshToken { return $null }
            function Update-TokenSilently { return $null }
            function Invoke-BrowserLogin { throw 'Interactive authentication was attempted.' }
            function Invoke-DeviceCodeLogin { throw 'Interactive authentication was attempted.' }
            $savedToken = $env:WORKIQ_ACCESS_TOKEN
            try {
                $env:WORKIQ_ACCESS_TOKEN = 'synthetic-environment-token'
                Assert-True ((Get-WorkIqToken 'synthetic-explicit-token') -ceq 'synthetic-explicit-token') 'Explicit token was ignored.'
                Assert-True ((Get-WorkIqToken '') -ceq 'synthetic-environment-token') 'Environment token was ignored.'
                $env:WORKIQ_ACCESS_TOKEN = $null
                $NonInteractive = $true
                Assert-Failure { Get-WorkIqToken '' } 'AUTH_REQUIRED'
            }
            finally { $env:WORKIQ_ACCESS_TOKEN = $savedToken }
        }
        'permission-scopes' {
            foreach ($entry in @(
                @{ Name = 'download-file.ps1'; Permission = 'WorkIQ.Read' },
                @{ Name = 'upload-file.ps1'; Permission = 'WorkIQ.Act' }
            )) {
                & {
                    $scripts = Split-Path $scriptPath
                    $entryAst = [Management.Automation.Language.Parser]::ParseFile(
                        (Join-Path $scripts $entry.Name), [ref] $tokens, [ref] $errors)
                    Assert-True ($errors.Count -eq 0) 'Entry-point parse failed.'
                    # Execute only the caller's helper import, not its transfer entry point.
                    $import = $entryAst.EndBlock.Statements[0].Extent.Text.Replace(
                        '$PSScriptRoot', ("'" + $scripts.Replace("'", "''") + "'"))
                    Invoke-Expression $import
                    $script:capturedAuthBody = $null
                    function Invoke-RestMethod {
                        param($Method, $Uri, $ContentType, $Body)
                        $script:capturedAuthBody = $Body
                        return @{ access_token = 'synthetic-access-token'; refresh_token = 'synthetic-refresh-token' }
                    }
                    function Save-RefreshToken { param([string] $RefreshToken) }
                    $result = Update-TokenSilently 'synthetic-refresh-token'
                    Assert-True ($result -ceq 'synthetic-access-token') 'Token response was not used.'
                    $requested = @($script:capturedAuthBody.scope.Split(' '))
                    Assert-True ($requested -contains "api://workiq.svc.cloud.microsoft/$($entry.Permission)") 'Missing explicit transfer permission.'
                    Assert-True ($requested -notcontains 'api://workiq.svc.cloud.microsoft/.default') 'Legacy default scopes were requested.'
                    Assert-True ($script:capturedAuthBody.grant_type -eq 'refresh_token') 'Wrong grant type.'
                }
            }
        }
    }
    Write-Output "PASS $Case"
}
finally {
    Get-ChildItem -LiteralPath $directory -File -Force | Remove-Item -Force
    Remove-Item -LiteralPath $directory
}
