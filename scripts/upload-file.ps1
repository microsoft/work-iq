#Requires -Version 7.2

[CmdletBinding()]
param(
    [string] $TransferFile,
    [string] $InFile,
    [string] $AccessToken,

    [ValidateSet('Production', 'Test')]
    [string] $Environment = 'Production',

    [ValidateLength(1, 256)]
    [ValidatePattern('^[\x21-\x7e]+$')]
    [string] $TargetPartition,

    [switch] $NonInteractive,
    [switch] $DeviceCode,
    [switch] $Logout
)

. (Join-Path $PSScriptRoot 'workiq-file-common.ps1') -Capability Act

function Test-UploadInteger {
    param($Value, [long] $Minimum, [long] $Maximum = [long]::MaxValue)
    return ($Value -is [int] -or $Value -is [long]) -and $Value -ge $Minimum -and $Value -le $Maximum
}

function Read-UploadTransfer {
    param([string] $Path)

    $text = [IO.File]::ReadAllText($ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Path))
    try { $body = ConvertFrom-Json -InputObject $text -AsHashtable -ErrorAction Stop }
    catch [ArgumentException] {
        Throw-TransferError 'INVALID_METADATA' 'The transfer file must contain the exact JSON response body from getUploadFileDetails.'
    }
    $action = $body._meta.'com.microsoft.workiq/clientAction'
    $limits = $action.constraints
    if ($body -isnot [Collections.IDictionary] -or
        $body._meta -isnot [Collections.IDictionary] -or
        $body.file -isnot [Collections.IDictionary] -or
        $body.transfer -isnot [Collections.IDictionary] -or
        $action -isnot [Collections.IDictionary] -or
        $limits -isnot [Collections.IDictionary] -or
        $action.contractVersion -cne '1.0' -or
        $action.kind -cne 'file-transfer' -or
        $action.direction -cne 'upload' -or
        $action.transferMode -cne 'upload-session' -or
        $action.requiresFollowUp -isnot [bool] -or -not $action.requiresFollowUp -or
        $action.nextActor -cne 'client' -or
        $limits.sequentialRangesRequired -isnot [bool] -or -not $limits.sequentialRangesRequired -or
        $limits.supportsRanges -isnot [bool] -or -not $limits.supportsRanges -or
        -not (Test-UploadInteger $limits.expectedSize 1) -or
        -not (Test-UploadInteger $limits.recommendedChunkSize 1 62914559) -or
        -not (Test-UploadInteger $limits.chunkSizeMultiple 1 62914559) -or
        -not (Test-UploadInteger $limits.maximumChunkSizeExclusive 2 62914560) -or
        $limits.recommendedChunkSize -ge $limits.maximumChunkSizeExclusive -or
        $limits.recommendedChunkSize % $limits.chunkSizeMultiple -ne 0 -or
        -not (Test-UploadInteger $body.file.size 1) -or
        $body.file.size -ne $limits.expectedSize -or
        $body.file.name -isnot [string] -or
        [string]::IsNullOrWhiteSpace($body.file.name) -or
        $body.transfer.method -isnot [string] -or
        $body.transfer.method -cne 'PUT' -or
        $body.transfer.preAuthenticated -isnot [bool] -or $body.transfer.preAuthenticated) {
        Throw-TransferError 'INVALID_METADATA' 'A prepared sequential WorkIQ upload ticket with valid size and chunk constraints is required.'
    }
    foreach ($key in @('contractVersion', 'kind', 'direction', 'transferMode', 'nextActor')) {
        if ($action[$key] -isnot [string]) {
            Throw-TransferError 'INVALID_METADATA' 'The upload contract identifiers must be scalar strings.'
        }
    }

    foreach ($value in @($action.contentUrl, $action.statusUrl, $action.fileId, $body.transfer.url)) {
        if ($value -isnot [string] -or [string]::IsNullOrWhiteSpace($value)) {
            Throw-TransferError 'INVALID_METADATA' 'The prepared upload ticket is missing its WorkIQ transfer references.'
        }
    }
    $content = Resolve-ContentUrl $action.contentUrl
    $status = Resolve-StatusUrl $action.statusUrl
    $transfer = Resolve-ContentUrl $body.transfer.url
    if ($content.AbsoluteUri -cne $status.AbsoluteUri + '/content' -or
        $content.AbsoluteUri -cne $transfer.AbsoluteUri -or
        $action.fileId -cne $status.Segments[-1]) {
        Throw-TransferError 'INVALID_METADATA' 'The upload content, status, and file references must identify the same WorkIQ ticket.'
    }
    return @{
        Content = $content
        Status = $status
        Size = [long] $limits.expectedSize
        ChunkSize = [int] $limits.recommendedChunkSize
    }
}

function Assert-UploadStatus {
    param($Status, [long] $Size, [long] $NextOffset, [switch] $Initial)

    if ($Status -isnot [Collections.IDictionary] -or
        $Status.direction -isnot [string] -or
        $Status.direction -cne 'upload' -or
        $Status.state -isnot [string] -or
        -not (Test-UploadInteger $Status.totalBytes 1) -or
        $Status.totalBytes -ne $Size -or
        $Status.nextExpectedRanges -isnot [array] -or
        -not [string]::IsNullOrEmpty($Status.recoveryReason)) {
        Throw-TransferError 'INVALID_STATUS' 'The upload status does not confirm this transfer. Do not resend bytes.'
    }
    if ($Initial) {
        if ($Status.state -cnotin @('prepared', 'active') -or
            $Status.nextExpectedRanges.Count -ne 1 -or $Status.nextExpectedRanges[0] -cne '0-') {
            Throw-TransferError 'INVALID_STATUS' 'The ticket is not at a confirmed initial offset. This script cannot resume or replay an earlier upload.'
        }
    }
    elseif ($NextOffset -eq $Size) {
        if ($Status.state -cne 'completed' -or $Status.nextExpectedRanges.Count -ne 0) {
            Throw-TransferError 'INVALID_STATUS' 'The service did not confirm upload completion. Do not resend bytes.'
        }
    }
    elseif ($Status.state -cne 'active' -or
        $Status.nextExpectedRanges.Count -ne 1 -or $Status.nextExpectedRanges[0] -cne "$NextOffset-") {
        Throw-TransferError 'INVALID_STATUS' 'The service did not acknowledge the exact uploaded range. Do not resend bytes.'
    }
}

function Invoke-UploadRequest {
    param(
        [Net.Http.HttpClient] $Client,
        [Net.Http.HttpRequestMessage] $Request,
        [string] $Token,
        [int] $ExpectedStatus,
        [switch] $Write
    )

    $Request.Headers.Authorization = [Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $Token)
    if ($Environment -eq 'Test') { $Request.Headers.Add('X-EndpointId', '2') }
    if (-not [string]::IsNullOrEmpty($TargetPartition)) {
        $Request.Headers.Add('targetpartition', $TargetPartition)
    }
    $code = if ($Write) { 'UPLOAD_OUTCOME_UNKNOWN' } else { 'UPLOAD_FAILED' }
    $message = if ($Write) {
        'The last fragment may have been accepted. No retry was attempted. Inspect the WorkIQ status URL; do not rerun the upload or prepare a replacement ticket until the outcome is resolved.'
    }
    else { 'The initial WorkIQ status could not be verified. No file bytes were sent.' }
    $deadline = [Threading.CancellationTokenSource]::new([TimeSpan]::FromMinutes(5))
    try {
        $response = $Client.SendAsync(
            $Request, [Net.Http.HttpCompletionOption]::ResponseHeadersRead, $deadline.Token
        ).GetAwaiter().GetResult()
        try {
            if ([int] $response.StatusCode -ne $ExpectedStatus -or
                $response.Content.Headers.ContentEncoding.Count -ne 0) {
                Throw-TransferError $code $message
            }
            # Bound the status body; never expose backend response text in errors.
            $stream = $response.Content.ReadAsStreamAsync($deadline.Token).GetAwaiter().GetResult()
            $body = [IO.MemoryStream]::new()
            try {
                $buffer = [byte[]]::new(8192)
                do {
                    $count = $stream.ReadAsync([Memory[byte]]::new($buffer), $deadline.Token).AsTask().GetAwaiter().GetResult()
                    if ($body.Length + $count -gt 65536) {
                        Throw-TransferError $code $message
                    }
                    $body.Write($buffer, 0, $count)
                } while ($count -ne 0)
                $json = [Text.UTF8Encoding]::new($false, $true).GetString($body.ToArray())
            }
            finally {
                $body.Dispose()
                $stream.Dispose()
            }
            try { return ConvertFrom-Json -InputObject $json -AsHashtable -ErrorAction Stop }
            catch [ArgumentException] { Throw-TransferError $code $message }
        }
        finally { $response.Dispose() }
    }
    catch [Net.Http.HttpRequestException], [IO.IOException], [OperationCanceledException], [Text.DecoderFallbackException] {
        Throw-TransferError $code $message
    }
    finally { $deadline.Dispose() }
}

function Invoke-FileUpload {
    param(
        [Net.Http.HttpClient] $Client,
        [Collections.IDictionary] $Transfer,
        [IO.FileStream] $Source,
        [string] $Token
    )

    if ($Source.Length -ne $Transfer.Size -or $Source.Position -ne 0) {
        Throw-TransferError 'INVALID_SOURCE' 'The local file must match the prepared byte count and start at offset zero.'
    }
    $request = [Net.Http.HttpRequestMessage]::new([Net.Http.HttpMethod]::Get, $Transfer.Status)
    try { $status = Invoke-UploadRequest $Client $request $Token 200 }
    finally { $request.Dispose() }
    Assert-UploadStatus $status $Transfer.Size 0 -Initial

    $buffer = [byte[]]::new([int] [Math]::Min($Transfer.ChunkSize, $Transfer.Size))
    [long] $offset = 0
    while ($offset -lt $Transfer.Size) {
        $count = [int] [Math]::Min($buffer.Length, $Transfer.Size - $offset)
        $read = 0
        while ($read -lt $count) {
            $received = $Source.Read($buffer, $read, $count - $read)
            if ($received -eq 0) {
                Throw-TransferError 'UPLOAD_INCOMPLETE' 'The local file ended unexpectedly. Earlier fragments may already be uploaded; do not replay them.'
            }
            $read += $received
        }
        $request = [Net.Http.HttpRequestMessage]::new([Net.Http.HttpMethod]::Put, $Transfer.Content)
        $request.Content = [Net.Http.ByteArrayContent]::new($buffer, 0, $count)
        $request.Content.Headers.ContentType = [Net.Http.Headers.MediaTypeHeaderValue]::new('application/octet-stream')
        $request.Content.Headers.ContentLength = $count
        $request.Content.Headers.ContentRange = [Net.Http.Headers.ContentRangeHeaderValue]::new(
            $offset, $offset + $count - 1, $Transfer.Size)
        $next = $offset + $count
        $expected = if ($next -eq $Transfer.Size) { 200 } else { 202 }
        try { $status = Invoke-UploadRequest $Client $request $Token $expected -Write }
        finally { $request.Dispose() }
        Assert-UploadStatus $status $Transfer.Size $next
        $offset = $next
    }
    [ordered] @{
        state = 'completed'
        path = $Source.Name
        bytesUploaded = $offset
    } | ConvertTo-Json -Compress
}

if ($Logout) {
    if (-not [string]::IsNullOrWhiteSpace($TransferFile) -or -not [string]::IsNullOrWhiteSpace($InFile) -or
        -not [string]::IsNullOrWhiteSpace($AccessToken) -or $Environment -ne 'Production' -or
        -not [string]::IsNullOrEmpty($TargetPartition) -or
        $NonInteractive -or $DeviceCode) {
        Throw-TransferError 'INVALID_ARGUMENT' 'Use -Logout without upload or authentication parameters.'
    }
    Remove-AuthCache
    [ordered] @{ state = 'logged_out'; credentialStore = Get-CacheBackend } | ConvertTo-Json -Compress
    return
}
if ([string]::IsNullOrWhiteSpace($TransferFile) -or [string]::IsNullOrWhiteSpace($InFile) -or
    ($NonInteractive -and $DeviceCode)) {
    Throw-TransferError 'INVALID_ARGUMENT' 'TransferFile and InFile are required. Device-code sign-in cannot be combined with -NonInteractive.'
}

$transfer = Read-UploadTransfer $TransferFile
$item = Get-Item -LiteralPath $InFile -Force -ErrorAction Stop
if ($item -isnot [IO.FileInfo] -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
    Throw-TransferError 'INVALID_SOURCE' 'Select a regular local file, not a directory or symbolic link.'
}
$source = [IO.File]::Open($item.FullName, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
try {
    if ($source.Length -ne $transfer.Size) {
        Throw-TransferError 'INVALID_SOURCE' 'The local file size does not match the prepared upload. No file bytes were sent.'
    }
    $token = Get-WorkIqToken $AccessToken
    $handler = [Net.Http.HttpClientHandler]::new()
    $handler.AllowAutoRedirect = $false
    $handler.UseCookies = $false
    $handler.AutomaticDecompression = [Net.DecompressionMethods]::None
    $client = [Net.Http.HttpClient]::new($handler)
    $client.Timeout = [TimeSpan]::FromMinutes(5)
    try { Invoke-FileUpload -Client $client -Transfer $transfer -Source $source -Token $token }
    finally {
        $client.Dispose()
        $handler.Dispose()
    }
}
finally { $source.Dispose() }
