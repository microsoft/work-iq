# Phase 11 — Remove only transient SSO scratch. Never touch the ui-widget background-process files
# (tunnel.log, server.log, pids.txt, etc.) or any source/config/build output.
. "$PSScriptRoot/_lib.ps1"

$scratch  = @("server-sso.out.log", "server-sso.err.log", "server-pid.txt", "sso-state.json")
$patterns = @("sso-step*.ps1", "sso-*.log", "sso-*.txt", "sso-precheck*", "sso-provision*.log", "sso-az.txt", "sso-atkcheck.txt")
foreach ($f in $scratch)  { if (Test-Path $f) { Remove-Item $f -Force -ErrorAction SilentlyContinue } }
foreach ($p in $patterns) { Get-ChildItem -Path . -Filter $p -File -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue }

# Strip the build-time SSO_ helper keys from env/.env.local (leave the real TENANT_ID/CLIENT_ID/APP_ID_URI).
if (Test-Path $script:EnvFile) {
    (Get-Content $script:EnvFile) | Where-Object { $_ -notmatch '^SSO_[A-Z0-9_]+=' } | Set-Content $script:EnvFile -Encoding UTF8
}
Write-Host "SSO scratch cleaned — ui-widget logs (tunnel.log/server.log/pids.txt) left intact OK" -ForegroundColor Green
