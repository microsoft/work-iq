#Requires -Modules Microsoft.Graph.Applications, Microsoft.Graph.Identity.SignIns

<#
.SYNOPSIS
  Provisions the Work IQ Tools service principal and grants admin consent
  for the Work IQ CLI in your tenant.

.DESCRIPTION
  Resolves AADSTS650052 ("your organization lacks a service principal")
  by creating the missing service principal for the Work IQ Tools resource,
  then granting admin consent for the Work IQ CLI application.

.PARAMETER ConsentOnly
  Skip service principal creation if already provisioned.

.NOTES
  Requires one of: Global Admin, Cloud Application Admin, or Application Admin.
  See https://github.com/microsoft/work-iq/issues/80
#>

param(
    [switch]$ConsentOnly
)

$ErrorActionPreference = 'Stop'

# App IDs
$WorkIqCliAppId   = 'ba081686-5d24-4bc6-a0d6-d034ecffed87'
$WorkIqToolsAppId = 'ea9ffc3e-8a23-4a7d-836d-234d7c7565c1'

# Connect with required scopes
Write-Host "Connecting to Microsoft Graph..." -ForegroundColor Cyan
Connect-MgGraph -Scopes 'Application.ReadWrite.All','DelegatedPermissionGrant.ReadWrite.All'

$context = Get-MgContext
Write-Host "Connected to tenant: $($context.TenantId)" -ForegroundColor Green

# --- Step 1: Provision Work IQ Tools service principal ---
if (-not $ConsentOnly) {
    Write-Host "`nChecking for Work IQ Tools service principal..." -ForegroundColor Cyan
    $toolsSp = Get-MgServicePrincipal -Filter "appId eq '$WorkIqToolsAppId'" -ErrorAction SilentlyContinue

    if ($toolsSp) {
        Write-Host "Work IQ Tools service principal already exists (Id: $($toolsSp.Id))" -ForegroundColor Green
    } else {
        Write-Host "Creating Work IQ Tools service principal..." -ForegroundColor Yellow
        $toolsSp = New-MgServicePrincipal -AppId $WorkIqToolsAppId
        Write-Host "Created successfully (Id: $($toolsSp.Id))" -ForegroundColor Green
    }
}

# --- Step 2: Verify Work IQ CLI service principal ---
Write-Host "`nChecking for Work IQ CLI service principal..." -ForegroundColor Cyan
$cliSp = Get-MgServicePrincipal -Filter "appId eq '$WorkIqCliAppId'" -ErrorAction SilentlyContinue

if (-not $cliSp) {
    Write-Host "Creating Work IQ CLI service principal..." -ForegroundColor Yellow
    $cliSp = New-MgServicePrincipal -AppId $WorkIqCliAppId
    Write-Host "Created successfully (Id: $($cliSp.Id))" -ForegroundColor Green
} else {
    Write-Host "Work IQ CLI service principal exists (Id: $($cliSp.Id))" -ForegroundColor Green
}

# --- Step 3: Grant admin consent for Graph permissions ---
Write-Host "`nGranting admin consent for Microsoft Graph permissions..." -ForegroundColor Cyan
$graphSp = Get-MgServicePrincipal -Filter "displayName eq 'Microsoft Graph'" -Top 1

$graphScopes = 'Sites.Read.All Mail.Read People.Read.All OnlineMeetingTranscript.Read.All Chat.Read ChannelMessage.Read.All ExternalItem.Read.All'

# Check for existing grant
$existingGrant = Get-MgOauth2PermissionGrant -Filter "clientId eq '$($cliSp.Id)' and resourceId eq '$($graphSp.Id)'" -ErrorAction SilentlyContinue | Select-Object -First 1

if ($existingGrant) {
    Write-Host "Updating existing Graph permission grant..." -ForegroundColor Yellow
    Update-MgOauth2PermissionGrant -OAuth2PermissionGrantId $existingGrant.Id -Scope $graphScopes
} else {
    Write-Host "Creating Graph permission grant..." -ForegroundColor Yellow
    New-MgOauth2PermissionGrant -BodyParameter @{
        ClientId    = $cliSp.Id
        ConsentType = 'AllPrincipals'
        ResourceId  = $graphSp.Id
        Scope       = $graphScopes
    }
}
Write-Host "Graph permissions granted." -ForegroundColor Green

# --- Step 4: Grant admin consent for Work IQ Tools permissions ---
Write-Host "`nGranting admin consent for Work IQ Tools permissions..." -ForegroundColor Cyan
$toolsSp = Get-MgServicePrincipal -Filter "appId eq '$WorkIqToolsAppId'"

$existingToolsGrant = Get-MgOauth2PermissionGrant -Filter "clientId eq '$($cliSp.Id)' and resourceId eq '$($toolsSp.Id)'" -ErrorAction SilentlyContinue | Select-Object -First 1

# Get the delegated scopes defined on Work IQ Tools
$toolsScopes = ($toolsSp.Oauth2PermissionScopes | Select-Object -ExpandProperty Value) -join ' '

if ($toolsScopes) {
    if ($existingToolsGrant) {
        Update-MgOauth2PermissionGrant -OAuth2PermissionGrantId $existingToolsGrant.Id -Scope $toolsScopes
    } else {
        New-MgOauth2PermissionGrant -BodyParameter @{
            ClientId    = $cliSp.Id
            ConsentType = 'AllPrincipals'
            ResourceId  = $toolsSp.Id
            Scope       = $toolsScopes
        }
    }
    Write-Host "Work IQ Tools permissions granted: $toolsScopes" -ForegroundColor Green
} else {
    Write-Host "No delegated scopes found on Work IQ Tools - skipping." -ForegroundColor Yellow
}

# --- Done ---
Write-Host "`nWork IQ tenant enablement complete!" -ForegroundColor Green
Write-Host "Users can now authenticate with the Work IQ CLI." -ForegroundColor Cyan

Disconnect-MgGraph
