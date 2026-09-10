# Phase 10 — Verify an unauthenticated /mcp POST returns 401.
# (Start the server first in a SEPARATE terminal with SSO_DEBUG=1 — see build-verify-cleanup.md.)
. "$PSScriptRoot/_lib.ps1"

$Port = Get-EnvValue -Key "DEVTUNNEL_PORT"; if (-not $Port) { $Port = "3001" }

$body = '{"jsonrpc":"2.0","method":"initialize","id":1,"params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
try {
    Invoke-WebRequest -Uri "http://localhost:$Port/mcp" -Method POST -ContentType "application/json" -Body $body | Out-Null
    Write-Host "WARNING: Got 200 — auth not enforced. Check the Phase 7 guard insertion." -ForegroundColor Yellow
} catch {
    # $_.Exception.Response is null on connection-refused/DNS failures — guard before reading StatusCode
    # so we reliably print the "server not running" message instead of masking it with a null-access error.
    $resp = $_.Exception.Response
    $code = if ($resp) { $resp.StatusCode.value__ } else { $null }
    if ($code -eq 401) { Write-Host "VERIFIED: 401 Unauthorized — SSO guard working OK" -ForegroundColor Green }
    elseif (-not $code) { Write-Host "Could not reach http://localhost:$Port/mcp — is the server running?" -ForegroundColor Yellow }
    else { Write-Host "Got HTTP $code" -ForegroundColor Yellow }
}
