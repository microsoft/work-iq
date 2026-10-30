#Requires -Version 7.2

[CmdletBinding()]
param(
    [string] $ContentUrl,

    [string] $OutFile,

    [Nullable[long]] $ExpectedBytes,

    [string] $AccessToken,

    [ValidateSet('Production', 'Test')]
    [string] $Environment = 'Production',

    [ValidateLength(1, 256)]
    [ValidatePattern('^[\x21-\x7e]+$')]
    [string] $TargetPartition,

    [switch] $Overwrite,

    [switch] $NonInteractive,

    [switch] $DeviceCode,

    [switch] $Logout
)

. (Join-Path $PSScriptRoot 'workiq-file-common.ps1') -Capability Read

function Resolve-OutputPath {
    param([string] $Value)

    if ([string]::IsNullOrWhiteSpace($Value) -or (Test-ControlCharacter $Value)) {
        Throw-TransferError 'NOT_WRITABLE' 'The output path is invalid.'
    }

    $fullPath = [IO.Path]::GetFullPath($Value)
    $parent = [IO.Path]::GetDirectoryName($fullPath)
    if (-not [IO.Directory]::Exists($parent)) {
        Throw-TransferError 'NOT_WRITABLE' 'The output directory does not exist.'
    }

    for ($current = $parent; -not [string]::IsNullOrWhiteSpace($current); $current = [IO.Path]::GetDirectoryName($current)) {
        $item = Get-Item -LiteralPath $current -Force
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
            Throw-TransferError 'NOT_WRITABLE' 'The output path traverses a link.'
        }
    }

    if (Test-Path -LiteralPath $fullPath) {
        $item = Get-Item -LiteralPath $fullPath -Force
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or $item.PSIsContainer) {
            Throw-TransferError 'NOT_WRITABLE' 'The output path must be a regular file.'
        }
        if (-not $Overwrite) {
            Throw-TransferError 'TARGET_EXISTS' 'The output file exists. Use -Overwrite or another path.'
        }
    }

    return $fullPath
}

function Invoke-FileDownload {
    param(
        [Net.Http.HttpClient] $Client,
        [Uri] $Reference,
        [string] $Target,
        [long] $Size,
        [string] $Token
    )

    $temporary = [IO.Path]::Combine([IO.Path]::GetDirectoryName($Target), ".workiq-file-$([Guid]::NewGuid().ToString('N')).tmp")
    $deadline = [Threading.CancellationTokenSource]::new([TimeSpan]::FromMinutes(5))
    try {
        $request = [Net.Http.HttpRequestMessage]::new([Net.Http.HttpMethod]::Get, $Reference)
        $request.Headers.Authorization = [Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $Token)
        if ($Reference.GetLeftPart([UriPartial]::Authority) -eq $testOrigin) {
            $request.Headers.Add('X-EndpointId', '2')
        }
        if (-not [string]::IsNullOrEmpty($TargetPartition)) {
            $request.Headers.Add('targetpartition', $TargetPartition)
        }

        try {
            $response = $Client.SendAsync($request, [Net.Http.HttpCompletionOption]::ResponseHeadersRead, $deadline.Token).GetAwaiter().GetResult()
        }
        finally {
            $request.Dispose()
        }

        try {
            if ($response.StatusCode -in @([Net.HttpStatusCode]::Unauthorized, [Net.HttpStatusCode]::Forbidden)) {
                Throw-TransferError 'AUTH_FAILED' 'WorkIQ rejected the authenticated file request. Do not retry with another identity or endpoint.'
            }
            if ($response.StatusCode -eq [Net.HttpStatusCode]::NotFound) {
                Throw-TransferError 'TICKET_UNAVAILABLE' 'The ticket is expired, unavailable, or belongs to a different caller. Check the preparation environment and caller; do not bypass a denial.'
            }
            if ($response.Headers.Location -or [int] $response.StatusCode -in 300..399) {
                Throw-TransferError 'DOWNLOAD_FAILED' 'Redirected file responses are not allowed.'
            }
            if ($response.StatusCode -ne [Net.HttpStatusCode]::OK -or
                $null -ne $response.Content.Headers.ContentRange) {
                Throw-TransferError 'DOWNLOAD_FAILED' "A complete download requires HTTP 200 without Content-Range; WorkIQ returned HTTP $([int] $response.StatusCode)."
            }
            if ($response.Content.Headers.ContentEncoding.Count -ne 0 -or
                ($null -ne $response.Content.Headers.ContentLength -and $response.Content.Headers.ContentLength -ne $Size)) {
                Throw-TransferError 'DOWNLOAD_FAILED' 'The response length or encoding does not match the prepared file.'
            }

            $source = $response.Content.ReadAsStreamAsync($deadline.Token).GetAwaiter().GetResult()
            $destination = $null
            try {
                $destination = [IO.FileStream]::new(
                    $temporary,
                    [IO.FileMode]::CreateNew,
                    [IO.FileAccess]::Write,
                    [IO.FileShare]::None,
                    65536,
                    [IO.FileOptions]::SequentialScan)
                $buffer = [byte[]]::new(65536)
                [long] $written = 0
                while (($count = $source.ReadAsync([Memory[byte]]::new($buffer), $deadline.Token).AsTask().GetAwaiter().GetResult()) -gt 0) {
                    if ($count -gt $Size - $written) {
                        Throw-TransferError 'DOWNLOAD_FAILED' 'The file response exceeded its prepared size.'
                    }
                    $destination.Write($buffer, 0, $count)
                    $written += $count
                }
                $destination.Flush($true)
            }
            finally {
                if ($null -ne $destination) {
                    $destination.Dispose()
                }
                $source.Dispose()
            }

            if ($written -ne $Size) {
                Throw-TransferError 'DOWNLOAD_FAILED' 'The file response was incomplete.'
            }

            $null = Resolve-OutputPath $Target
            [IO.File]::Move($temporary, $Target, [bool] $Overwrite)
            $hash = (Get-FileHash -LiteralPath $Target -Algorithm SHA256).Hash.ToLowerInvariant()
            [ordered] @{
                state = 'completed'
                path = $Target
                bytesWritten = $written
                contentType = [string] $response.Content.Headers.ContentType
                sha256 = $hash
            } | ConvertTo-Json -Compress
        }
        finally {
            $response.Dispose()
        }
    }
    catch [Net.Http.HttpRequestException], [IO.IOException], [OperationCanceledException] {
        Throw-TransferError 'DOWNLOAD_FAILED' 'The file transfer failed or timed out. No completed download was reported.'
    }
    finally {
        $deadline.Dispose()
        if (Test-Path -LiteralPath $temporary) {
            Remove-Item -LiteralPath $temporary -Force
        }
    }
}

if ($Logout) {
    if (-not [string]::IsNullOrWhiteSpace($ContentUrl) -or
        -not [string]::IsNullOrWhiteSpace($OutFile) -or
        $null -ne $ExpectedBytes -or
        -not [string]::IsNullOrWhiteSpace($AccessToken) -or
        $Environment -ne 'Production' -or
        -not [string]::IsNullOrEmpty($TargetPartition) -or
        $Overwrite -or
        $NonInteractive -or
        $DeviceCode) {
        Throw-TransferError 'INVALID_ARGUMENT' 'Use -Logout without download or authentication parameters.'
    }

    Remove-AuthCache
    [ordered] @{
        state = 'logged_out'
        credentialStore = Get-CacheBackend
    } | ConvertTo-Json -Compress
    return
}

if ([string]::IsNullOrWhiteSpace($ContentUrl) -or [string]::IsNullOrWhiteSpace($OutFile) -or
    $null -eq $ExpectedBytes -or $ExpectedBytes -lt 0) {
    Throw-TransferError 'INVALID_ARGUMENT' 'ContentUrl, OutFile, and a nonnegative ExpectedBytes value are required for a download.'
}
if ($NonInteractive -and $DeviceCode) {
    Throw-TransferError 'INVALID_ARGUMENT' 'Device-code sign-in is interactive and cannot be combined with -NonInteractive.'
}

$reference = Resolve-ContentUrl $ContentUrl
$target = Resolve-OutputPath $OutFile
Write-Verbose "WorkIQ endpoint: $($reference.GetLeftPart([UriPartial]::Authority))"
$token = Get-WorkIqToken $AccessToken
$handler = [Net.Http.HttpClientHandler]::new()
$handler.AllowAutoRedirect = $false
$handler.UseCookies = $false
$handler.AutomaticDecompression = [Net.DecompressionMethods]::None
$client = [Net.Http.HttpClient]::new($handler)
$client.Timeout = [TimeSpan]::FromMinutes(5)

try {
    Invoke-FileDownload -Client $client -Reference $reference -Target $target -Size $ExpectedBytes -Token $token
}
finally {
    $client.Dispose()
    $handler.Dispose()
}
