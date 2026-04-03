<#
.SYNOPSIS
  Verifies that all Work IQ service principals and permission grants
  are correctly provisioned in your tenant.

.DESCRIPTION
  Read-only script that checks for the existence of the required service principals
  and permission grants for Work IQ tools.
  Reports missing service principals and missing or incomplete permission grants.

.PARAMETER UseDeviceCode
  Use device code flow for authentication.
#>

param(
    [switch]$UseDeviceCode
)

# Validate prerequisites — install Microsoft.Graph modules if not present
foreach ($mod in @('Microsoft.Graph.Authentication', 'Microsoft.Graph.Applications', 'Microsoft.Graph.Identity.SignIns')) {
    if (-not (Get-Module -ListAvailable -Name $mod)) {
        Write-Host "  '$mod' not found. Installing..." -ForegroundColor Yellow
        Install-Module $mod -Scope CurrentUser -Force -ErrorAction Stop
    }
}

$connectParams = @{ Scopes = 'Application.Read.All'; NoWelcome = $true }
if ($UseDeviceCode) { $connectParams['UseDeviceCode'] = $true }
Connect-MgGraph @connectParams

$context = Get-MgContext
Write-Host "Connected to tenant: $($context.TenantId)" -ForegroundColor Green

$issues = 0

# --- App IDs ---
$WorkIqCliAppId = 'ba081686-5d24-4bc6-a0d6-d034ecffed87'

$McpServers = @(
    @{ Name = 'Work IQ Tools';              AppId = 'ea9ffc3e-8a23-4a7d-836d-234d7c7565c1' }
    @{ Name = 'mcp_MailTools';              AppId = '16b1878d-62c7-4009-aa25-68989d63bbad' }
    @{ Name = 'mcp_MeServer';              AppId = '147dc821-b413-44c0-8009-1a3098378012' }
    @{ Name = 'mcp_CalendarTools';          AppId = '910333d2-47e9-43ca-981f-6df2f4531ef4' }
    @{ Name = 'mcp_TeamsServer';            AppId = 'ce5029ee-c1d3-45c0-bdcc-efb5a4245687' }
    @{ Name = 'mcp_OneDriveRemoteServer';   AppId = 'b0b2a2bb-6361-4549-a00c-a018417eb8e2' }
    @{ Name = 'mcp_SharePointRemoteServer'; AppId = '292cff14-c0e8-4116-9e3b-99934ae05766' }
    @{ Name = 'mcp_AdminTools';             AppId = '2dbeefeb-6462-48a4-abe6-1c4989699319' }
    @{ Name = 'mcp_WordServer';             AppId = 'c2d0c2b6-8013-4346-9f8b-b81d3b754a29' }
    @{ Name = 'mcp_M365Copilot';            AppId = 'ab7c82de-7946-4454-ac28-70249d17c95e' }
)

$expectedGraphScopes = @('Sites.Read.All','Mail.Read','People.Read.All','OnlineMeetingTranscript.Read.All','Chat.Read','ChannelMessage.Read.All','ExternalItem.Read.All')
$expectedWorkIqToolsScopes = @('McpServers.CopilotMCP.All','McpServers.Me.All','McpServers.Mail.All','McpServers.Calendar.All','McpServers.Teams.All','McpServers.Word.All','McpServers.OneDriveSharepoint.All','McpServers.SharepointLists.All','McpServers.SharePoint.All','McpServers.OneDrive.All','McpServers.Dataverse.All','McpServers.M365Admin.All','McpServers.Management.All')

# --- Verify MCP Server service principals ---
Write-Host "`n--- MCP Server Service Principals ---" -ForegroundColor Cyan
foreach ($server in $McpServers) {
    $sp = Get-MgServicePrincipal -Filter "appId eq '$($server.AppId)'" -ErrorAction SilentlyContinue
    if ($sp) {
        Write-Host "  [OK] $($server.Name) (Id: $($sp.Id))" -ForegroundColor Green
    } else {
        Write-Host "  [MISSING] $($server.Name) (AppId: $($server.AppId))" -ForegroundColor Red
        $issues++
    }
}

# --- Verify Work IQ CLI service principal ---
Write-Host "`n--- Work IQ CLI Service Principal ---" -ForegroundColor Cyan
$cliSp = Get-MgServicePrincipal -Filter "appId eq '$WorkIqCliAppId'" -ErrorAction SilentlyContinue
if ($cliSp) {
    Write-Host "  [OK] $($cliSp.DisplayName) (Id: $($cliSp.Id))" -ForegroundColor Green
} else {
    Write-Host "  [MISSING] Work IQ CLI (AppId: $WorkIqCliAppId)" -ForegroundColor Red
    $issues++
}

if (-not $cliSp) {
    Write-Host "`nCannot verify permission grants without CLI service principal." -ForegroundColor Red
    Write-Host "Run .\scripts\Enable-WorkIQToolsForTenant.ps1 to provision." -ForegroundColor Yellow
    Disconnect-MgGraph
    return
}

# --- Verify Microsoft Graph permission grant ---
Write-Host "`n--- Microsoft Graph Permission Grant ---" -ForegroundColor Cyan
$graphSp = Get-MgServicePrincipal -Filter "appId eq '00000003-0000-0000-c000-000000000000'" | Select-Object -First 1
$grants = Get-MgOauth2PermissionGrant -Filter "clientId eq '$($cliSp.Id)'" -ErrorAction SilentlyContinue

$graphGrant = $grants | Where-Object { $_.ResourceId -eq $graphSp.Id } | Select-Object -First 1
if ($graphGrant) {
    $grantedScopes = $graphGrant.Scope -split ' ' | Where-Object { $_ }
    $missingScopes = $expectedGraphScopes | Where-Object { $_ -notin $grantedScopes }
    if ($missingScopes) {
        Write-Host "  [PARTIAL] Microsoft Graph — missing scopes: $($missingScopes -join ', ')" -ForegroundColor Red
        $issues++
    } else {
        Write-Host "  [OK] Microsoft Graph — all $($expectedGraphScopes.Count) scopes granted" -ForegroundColor Green
    }
    Write-Host "  Scopes: $($graphGrant.Scope)" -ForegroundColor Gray
} else {
    Write-Host "  [MISSING] No Graph permission grant found" -ForegroundColor Red
    $issues++
}

# --- Verify MCP Server permission grants ---
Write-Host "`n--- MCP Server Permission Grants ---" -ForegroundColor Cyan
foreach ($server in $McpServers) {
    $sp = Get-MgServicePrincipal -Filter "appId eq '$($server.AppId)'" -ErrorAction SilentlyContinue
    if (-not $sp) { continue }

    $grant = $grants | Where-Object { $_.ResourceId -eq $sp.Id } | Select-Object -First 1
    if ($grant) {
        $grantedScopes = $grant.Scope -split ' ' | Where-Object { $_ }

        # Validate explicit scopes for Work IQ Tools
        if ($server.AppId -eq 'ea9ffc3e-8a23-4a7d-836d-234d7c7565c1') {
            $missingScopes = $expectedWorkIqToolsScopes | Where-Object { $_ -notin $grantedScopes }
            if ($missingScopes) {
                Write-Host "  [PARTIAL] $($server.Name) — missing scopes: $($missingScopes -join ', ')" -ForegroundColor Red
                $issues++
            } else {
                Write-Host "  [OK] $($server.Name) — all $($expectedWorkIqToolsScopes.Count) scopes granted" -ForegroundColor Green
            }
        } else {
            Write-Host "  [OK] $($server.Name) — scopes granted" -ForegroundColor Green
        }
        Write-Host "  Scopes: $($grant.Scope)" -ForegroundColor Gray
    } else {
        Write-Host "  [MISSING] $($server.Name) — no permission grant found" -ForegroundColor Red
        $issues++
    }
}

# --- Summary ---
Write-Host "`n--- Summary ---" -ForegroundColor Cyan
if ($issues -eq 0) {
    Write-Host "All checks passed. Work IQ is fully provisioned in this tenant." -ForegroundColor Green
} else {
    Write-Host "$issues issue(s) found. Run .\scripts\Enable-WorkIQToolsForTenant.ps1 to fix." -ForegroundColor Red
}

Disconnect-MgGraph
