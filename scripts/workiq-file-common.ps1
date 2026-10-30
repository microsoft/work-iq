#Requires -Version 7.2

param(
    [ValidateSet('Read', 'Act')]
    [string] $Capability = 'Read'
)

$ErrorActionPreference = 'Stop'
$clientId = 'ba081686-5d24-4bc6-a0d6-d034ecffed87'
$authorizeUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
$tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
$deviceCodeUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/devicecode'
$scope = "api://workiq.svc.cloud.microsoft/WorkIQ.$Capability offline_access openid profile"
$cacheService = 'workiq-file-downloader'
$publicOrigin = 'https://workiq.svc.cloud.microsoft'
$testOrigin = 'https://test.workiq.svc.cloud.dev.microsoft'

function Throw-TransferError {
    param([string] $Code, [string] $Message)

    throw "[$Code] $Message"
}

function Test-ControlCharacter {
    param([string] $Value)

    foreach ($character in $Value.ToCharArray()) {
        if ([char]::IsControl($character)) {
            return $true
        }
    }

    return $false
}

function Resolve-TransferUrl {
    param([string] $Value, [switch] $Status)

    $origin = if ($Environment -eq 'Test') { $testOrigin } else { $publicOrigin }
    if ($Value.StartsWith('/') -and -not $Value.StartsWith('//')) {
        $Value = $origin + $Value
    }

    $uri = $null
    if (-not [Uri]::TryCreate($Value, [UriKind]::Absolute, [ref] $uri) -or
        $uri.Scheme -ne 'https' -or
        -not $uri.IsDefaultPort -or
        $uri.UserInfo.Length -ne 0 -or
        $uri.Fragment.Length -ne 0 -or
        (Test-ControlCharacter $Value) -or
        $Value.Contains('\')) {
        Throw-TransferError 'INVALID_REFERENCE' 'The content URL is not a valid HTTPS WorkIQ URL.'
    }

    if ($uri.GetLeftPart([UriPartial]::Authority) -cne $origin) {
        Throw-TransferError 'INVALID_REFERENCE' 'The content URL does not belong to the selected WorkIQ environment.'
    }

    if ($Value -cne $origin + $uri.PathAndQuery) {
        Throw-TransferError 'INVALID_REFERENCE' 'The content URL contains an alternate URL spelling.'
    }

    $pattern = if ($Status) { '^/api/(beta|v1)/files/[A-Za-z0-9_-]+$' }
        else { '^/api/(beta|v1)/files/[A-Za-z0-9_-]+/content$' }
    if ($uri.Query.Length -ne 0 -or $uri.AbsolutePath -cnotmatch $pattern) {
        Throw-TransferError 'INVALID_REFERENCE' 'Only a returned WorkIQ file-transfer ticket URL is allowed.'
    }

    return $uri
}

function Resolve-ContentUrl {
    param([string] $Value)
    return Resolve-TransferUrl $Value
}

function Resolve-StatusUrl {
    param([string] $Value)
    return Resolve-TransferUrl $Value -Status
}

function ConvertTo-Base64Url {
    param([byte[]] $Bytes)

    return [Convert]::ToBase64String($Bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function Get-CacheBackend {
    if ($IsWindows) {
        return 'WindowsDpapi'
    }
    if ($IsMacOS -and (Test-Path -LiteralPath '/usr/bin/security')) {
        return 'MacOSKeychain'
    }
    if ($IsLinux -and $null -ne (Get-Command secret-tool -ErrorAction SilentlyContinue)) {
        return 'LinuxSecretService'
    }

    return 'None'
}

function Get-WindowsCacheFile {
    $baseDirectory = if ([string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) {
        [Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
    }
    else {
        $env:LOCALAPPDATA
    }
    return Join-Path (Join-Path $baseDirectory $cacheService) 'auth.dat'
}

function Save-RefreshToken {
    param([string] $RefreshToken)

    if ([string]::IsNullOrWhiteSpace($RefreshToken)) {
        return
    }

    $cache = [ordered] @{
        refresh_token = $RefreshToken
    } | ConvertTo-Json -Compress

    try {
        switch (Get-CacheBackend) {
            'WindowsDpapi' {
                $authFile = Get-WindowsCacheFile
                $authDirectory = [IO.Path]::GetDirectoryName($authFile)
                if (-not (Test-Path -LiteralPath $authDirectory)) {
                    New-Item -ItemType Directory -Path $authDirectory -Force | Out-Null
                }

                $encrypted = ConvertTo-SecureString $cache -AsPlainText -Force | ConvertFrom-SecureString
                Set-Content -LiteralPath $authFile -Value $encrypted -Encoding ascii
            }
            'MacOSKeychain' {
                & /usr/bin/security add-generic-password `
                    -a ([Environment]::UserName) `
                    -s $cacheService `
                    -w $cache `
                    -U | Out-Null
                if ($LASTEXITCODE -ne 0) {
                    throw 'Keychain write failed.'
                }
            }
            'LinuxSecretService' {
                $secretTool = (Get-Command secret-tool -ErrorAction Stop).Source
                $cache | & $secretTool store --label='WorkIQ file downloader' service $cacheService
                if ($LASTEXITCODE -ne 0) {
                    throw 'Secret Service write failed.'
                }
            }
            'None' {
                Write-Verbose 'No supported secure credential store is available; the refresh token was not saved.'
            }
        }
    }
    catch {
        Write-Warning 'The sign-in succeeded, but the refresh token could not be saved in the platform credential store.'
    }
}

function Read-RefreshToken {
    try {
        $cache = switch (Get-CacheBackend) {
            'WindowsDpapi' {
                $authFile = Get-WindowsCacheFile
                if (-not (Test-Path -LiteralPath $authFile)) {
                    return $null
                }

                $secureValue = (Get-Content -LiteralPath $authFile -Raw).Trim() | ConvertTo-SecureString
                $valuePointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
                try {
                    [Runtime.InteropServices.Marshal]::PtrToStringBSTR($valuePointer)
                }
                finally {
                    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($valuePointer)
                }
            }
            'MacOSKeychain' {
                $value = & /usr/bin/security find-generic-password `
                    -a ([Environment]::UserName) `
                    -s $cacheService `
                    -w 2>$null
                if ($LASTEXITCODE -ne 0) {
                    return $null
                }
                $value
            }
            'LinuxSecretService' {
                $secretTool = (Get-Command secret-tool -ErrorAction Stop).Source
                $value = & $secretTool lookup service $cacheService 2>$null
                if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($value)) {
                    return $null
                }
                $value
            }
            'None' {
                return $null
            }
        }

        return ($cache | ConvertFrom-Json).refresh_token
    }
    catch {
        Write-Verbose 'The cached WorkIQ credential could not be read.'
        return $null
    }
}

function Remove-AuthCache {
    try {
        switch (Get-CacheBackend) {
            'WindowsDpapi' {
                $authFile = Get-WindowsCacheFile
                if (Test-Path -LiteralPath $authFile) {
                    Remove-Item -LiteralPath $authFile -Force
                }
            }
            'MacOSKeychain' {
                & /usr/bin/security delete-generic-password `
                    -a ([Environment]::UserName) `
                    -s $cacheService 2>$null | Out-Null
                if ($LASTEXITCODE -notin @(0, 44)) {
                    throw 'Keychain delete failed.'
                }
            }
            'LinuxSecretService' {
                $secretTool = (Get-Command secret-tool -ErrorAction Stop).Source
                & $secretTool clear service $cacheService 2>$null
                if ($LASTEXITCODE -ne 0) {
                    throw 'Secret Service delete failed.'
                }
            }
        }
    }
    catch {
        Throw-TransferError 'LOGOUT_FAILED' 'The cached credential could not be removed from the platform credential store.'
    }
}

function Open-SystemBrowser {
    param([string] $Url)

    try {
        if ($IsWindows) {
            Start-Process $Url | Out-Null
            return $true
        }
        if ($IsMacOS) {
            & /usr/bin/open $Url
            return $LASTEXITCODE -eq 0
        }
        if ($IsLinux) {
            $isWsl = -not [string]::IsNullOrWhiteSpace($env:WSL_DISTRO_NAME) -or
                (Test-Path -LiteralPath '/proc/sys/fs/binfmt_misc/WSLInterop')
            if ($isWsl) {
                $wslView = Get-Command wslview -ErrorAction SilentlyContinue
                if ($null -ne $wslView) {
                    & $wslView.Source $Url
                    return $LASTEXITCODE -eq 0
                }

                $windowsShell = Get-Command cmd.exe -ErrorAction SilentlyContinue
                if ($null -ne $windowsShell) {
                    & $windowsShell.Source /c start '""' $Url
                    return $LASTEXITCODE -eq 0
                }
            }

            $xdgOpen = Get-Command xdg-open -ErrorAction SilentlyContinue
            if ($null -ne $xdgOpen) {
                & $xdgOpen.Source $Url
                return $LASTEXITCODE -eq 0
            }
        }
    }
    catch {
        return $false
    }

    return $false
}

function New-TokenResult {
    param([object] $TokenResponse)

    if ([string]::IsNullOrWhiteSpace($TokenResponse.access_token)) {
        Throw-TransferError 'AUTH_FAILED' 'Microsoft identity did not return an access token.'
    }

    Save-RefreshToken ([string] $TokenResponse.refresh_token)
    return [string] $TokenResponse.access_token
}

function Invoke-BrowserLogin {
    $verifierBytes = [byte[]]::new(32)
    [Security.Cryptography.RandomNumberGenerator]::Fill($verifierBytes)
    $verifier = ConvertTo-Base64Url $verifierBytes
    $challengeBytes = [Security.Cryptography.SHA256]::HashData([Text.Encoding]::ASCII.GetBytes($verifier))
    $challenge = ConvertTo-Base64Url $challengeBytes
    $stateBytes = [byte[]]::new(16)
    [Security.Cryptography.RandomNumberGenerator]::Fill($stateBytes)
    $state = ConvertTo-Base64Url $stateBytes

    $portListener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
    $portListener.Start()
    $port = $portListener.LocalEndpoint.Port
    $portListener.Stop()

    $redirectUrl = "http://localhost:$port/"
    $listener = [Net.HttpListener]::new()
    $listener.Prefixes.Add($redirectUrl)
    try {
        $listener.Start()
        $loginUrl =
            "$authorizeUrl`?client_id=$clientId" +
            '&response_type=code' +
            "&redirect_uri=$([Uri]::EscapeDataString($redirectUrl))" +
            '&response_mode=query' +
            "&scope=$([Uri]::EscapeDataString($scope))" +
            "&state=$state" +
            "&code_challenge=$challenge" +
            '&code_challenge_method=S256' +
            '&prompt=select_account'
        Write-Host 'Opening a browser to sign in to WorkIQ.'
        if (-not (Open-SystemBrowser $loginUrl)) {
            return $null
        }

        $contextTask = $listener.GetContextAsync()
        if (-not $contextTask.Wait([TimeSpan]::FromSeconds(120))) {
            Write-Warning 'The browser callback timed out; switching to device-code sign-in.'
            return $null
        }

        $context = $contextTask.GetAwaiter().GetResult()
        $query = $context.Request.QueryString
        $responseHtml = '<html><body><h3>WorkIQ sign-in complete.</h3>You can close this tab.</body></html>'
        $responseBytes = [Text.Encoding]::UTF8.GetBytes($responseHtml)
        $context.Response.ContentType = 'text/html'
        $context.Response.OutputStream.Write($responseBytes, 0, $responseBytes.Length)
        $context.Response.Close()

        if (-not [string]::IsNullOrWhiteSpace($query['error'])) {
            Throw-TransferError 'AUTH_FAILED' 'Microsoft identity sign-in was not completed.'
        }
        if ($query['state'] -ne $state) {
            Throw-TransferError 'AUTH_FAILED' 'Microsoft identity returned an invalid sign-in state.'
        }

        $code = $query['code']
        if ([string]::IsNullOrWhiteSpace($code)) {
            Throw-TransferError 'AUTH_FAILED' 'Microsoft identity did not return an authorization code.'
        }

        $tokenResponse = Invoke-RestMethod -Method Post -Uri $tokenUrl -ContentType 'application/x-www-form-urlencoded' -Body @{
            client_id = $clientId
            grant_type = 'authorization_code'
            code = $code
            redirect_uri = $redirectUrl
            code_verifier = $verifier
            scope = $scope
        }
    }
    catch {
        if ($_.Exception.Message.StartsWith('[AUTH_FAILED]', [StringComparison]::Ordinal)) {
            throw
        }

        Write-Warning 'Browser sign-in was unavailable; switching to device-code sign-in.'
        return $null
    }
    finally {
        if ($listener.IsListening) {
            $listener.Stop()
        }
        $listener.Close()
    }

    return New-TokenResult $tokenResponse
}

function Invoke-DeviceCodeLogin {
    try {
        $deviceResponse = Invoke-RestMethod -Method Post -Uri $deviceCodeUrl `
            -ContentType 'application/x-www-form-urlencoded' `
            -Body @{
                client_id = $clientId
                scope = $scope
            }
    }
    catch {
        Throw-TransferError 'AUTH_FAILED' 'Microsoft identity could not start device-code sign-in.'
    }

    Write-Host ([string] $deviceResponse.message)
    $interval = [Math]::Max(1, [int] $deviceResponse.interval)
    $deadline = [DateTimeOffset]::UtcNow.AddSeconds([int] $deviceResponse.expires_in)

    while ([DateTimeOffset]::UtcNow -lt $deadline) {
        Start-Sleep -Seconds $interval
        try {
            $statusCode = 0
            $tokenResponse = Invoke-RestMethod -Method Post -Uri $tokenUrl `
                -ContentType 'application/x-www-form-urlencoded' `
                -SkipHttpErrorCheck `
                -StatusCodeVariable statusCode `
                -Body @{
                    client_id = $clientId
                    grant_type = 'urn:ietf:params:oauth:grant-type:device_code'
                    device_code = $deviceResponse.device_code
                }
        }
        catch {
            Throw-TransferError 'AUTH_FAILED' 'Microsoft identity could not complete device-code sign-in.'
        }

        if ($statusCode -eq 200) {
            return New-TokenResult $tokenResponse
        }

        switch ([string] $tokenResponse.error) {
            'authorization_pending' {
                continue
            }
            'slow_down' {
                $interval += 5
                continue
            }
            'authorization_declined' {
                Throw-TransferError 'AUTH_FAILED' 'Device-code sign-in was declined.'
            }
            'expired_token' {
                Throw-TransferError 'AUTH_FAILED' 'The device code expired before sign-in completed.'
            }
            default {
                Throw-TransferError 'AUTH_FAILED' 'Device-code sign-in failed.'
            }
        }
    }

    Throw-TransferError 'AUTH_FAILED' 'The device code expired before sign-in completed.'
}

function Update-TokenSilently {
    param([string] $RefreshToken)

    if ([string]::IsNullOrWhiteSpace($RefreshToken)) {
        return $null
    }

    try {
        $tokenResponse = Invoke-RestMethod -Method Post -Uri $tokenUrl -ContentType 'application/x-www-form-urlencoded' -Body @{
            client_id = $clientId
            grant_type = 'refresh_token'
            refresh_token = $RefreshToken
            scope = $scope
        }
    }
    catch {
        return $null
    }

    if ([string]::IsNullOrWhiteSpace($tokenResponse.refresh_token)) {
        $tokenResponse | Add-Member -NotePropertyName refresh_token -NotePropertyValue $RefreshToken
    }
    return New-TokenResult $tokenResponse
}

function Get-WorkIqToken {
    param([string] $SuppliedToken)

    if (-not [string]::IsNullOrWhiteSpace($SuppliedToken)) {
        return $SuppliedToken
    }
    if (-not [string]::IsNullOrWhiteSpace($env:WORKIQ_ACCESS_TOKEN)) {
        return $env:WORKIQ_ACCESS_TOKEN
    }

    $token = Update-TokenSilently (Read-RefreshToken)
    if (-not [string]::IsNullOrWhiteSpace($token)) {
        return $token
    }

    if ($NonInteractive) {
        Throw-TransferError 'AUTH_REQUIRED' 'No supplied token or usable cached credential is available in noninteractive mode.'
    }

    if ($DeviceCode) {
        return Invoke-DeviceCodeLogin
    }

    $token = Invoke-BrowserLogin
    if ([string]::IsNullOrWhiteSpace($token)) {
        $token = Invoke-DeviceCodeLogin
    }

    return $token
}
