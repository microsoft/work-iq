# Phase 7a — Add jose to the MCP server and write the auth guard from references/auth.ts.
# (7b — inserting the guard into the /mcp handler — is a code edit the model performs; see
#  wire-and-guard.md. This script only does the mechanical, deterministic part.)
. "$PSScriptRoot/_lib.ps1"

$McpServerDir = Get-McpServerDir
if (-not $McpServerDir) { Fail "McpServerDir not found — run detect-project.ps1 first." }
$style = Get-ServerStyle -ServerDir $McpServerDir

# jose (idempotent) — token verification for both layouts.
npm --prefix $McpServerDir install jose@^5 --save
if ($LASTEXITCODE -ne 0) { Fail "npm install jose failed in $McpServerDir." }

# MCP Apps (Express) servers usually don't bundle dotenv, but auth.ts needs TENANT_ID / CLIENT_ID /
# APP_ID_URI from env/.env.local at runtime. Ensure it (idempotent; harmless if already present).
if ($style -eq "express") {
    npm --prefix $McpServerDir install dotenv --save
    if ($LASTEXITCODE -ne 0) { Fail "npm install dotenv failed in $McpServerDir." }
}

# Place auth.ts NEXT TO the server entry (the file that wires the /mcp route) so the guard's
# `import "./auth.js"` resolves. OAI Apps: src/index.ts -> src/. MCP Apps: main.ts at root -> root.
$entry = Get-ChildItem $McpServerDir -Recurse -File -Include *.ts, *.js -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '\\node_modules\\|\\dist\\' } |
    Where-Object { $c = (Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue); ($c -match 'StreamableHTTPServerTransport') -or ($c -match '/mcp') } |
    Select-Object -First 1
$destDir = if ($entry) { $entry.Directory.FullName }
           elseif (Test-Path (Join-Path $McpServerDir "src")) { Join-Path $McpServerDir "src" }
           else { $McpServerDir }
$destAuth = Join-Path $destDir "auth.ts"
$srcAuth  = Join-Path $PSScriptRoot "../references/auth.ts"
Copy-Item -Path $srcAuth -Destination $destAuth -Force
Write-Host "Wrote $destAuth OK (from references/auth.ts)" -ForegroundColor Green
$where = if ($style -eq "express") { 'the Express app.all("/mcp") handler (main.ts)' } else { 'the raw-http /mcp handler' }
Write-Host "Server style: $style. Next: insert the guard into $where + add Authorization to CORS (see wire-and-guard.md 7b/7c)."
