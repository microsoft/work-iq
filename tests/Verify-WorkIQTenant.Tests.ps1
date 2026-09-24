$ErrorActionPreference = 'Stop'

$global:servicePrincipalCalls = 0
$global:disconnectCalls = 0

$workIqToolsAppId = 'ea9ffc3e-8a23-4a7d-836d-234d7c7565c1'
$cliAppId = 'ba081686-5d24-4bc6-a0d6-d034ecffed87'
$graphAppId = '00000003-0000-0000-c000-000000000000'
$serverAppIds = @(
    $workIqToolsAppId,
    '16b1878d-62c7-4009-aa25-68989d63bbad',
    '147dc821-b413-44c0-8009-1a3098378012',
    '910333d2-47e9-43ca-981f-6df2f4531ef4',
    'ce5029ee-c1d3-45c0-bdcc-efb5a4245687',
    'b0b2a2bb-6361-4549-a00c-a018417eb8e2',
    '292cff14-c0e8-4116-9e3b-99934ae05766',
    '2dbeefeb-6462-48a4-abe6-1c4989699319',
    'c2d0c2b6-8013-4346-9f8b-b81d3b754a29',
    'ab7c82de-7946-4454-ac28-70249d17c95e'
)

$servicePrincipals = @{}
foreach ($appId in $serverAppIds + $cliAppId + $graphAppId) {
    $servicePrincipals[$appId] = [pscustomobject]@{
        AppId       = $appId
        DisplayName = "Service principal $appId"
        Id          = "id-$appId"
    }
}

$graphScopes = 'Sites.Read.All Mail.Read People.Read.All OnlineMeetingTranscript.Read.All Chat.Read ChannelMessage.Read.All ExternalItem.Read.All'
$workIqToolsScopes = 'McpServers.CopilotMCP.All McpServers.Me.All McpServers.Mail.All McpServers.Calendar.All McpServers.Teams.All McpServers.Word.All McpServers.OneDriveSharepoint.All McpServers.SharepointLists.All McpServers.SharePoint.All McpServers.OneDrive.All McpServers.Dataverse.All McpServers.M365Admin.All McpServers.Management.All'
$grants = foreach ($appId in $serverAppIds + $graphAppId) {
    [pscustomobject]@{
        ResourceId = $servicePrincipals[$appId].Id
        Scope = if ($appId -eq $graphAppId) {
            $graphScopes
        } elseif ($appId -eq $workIqToolsAppId) {
            $workIqToolsScopes
        } else {
            'Example.Read'
        }
    }
}

function Get-Module {
    param(
        [switch]$ListAvailable,
        [string]$Name
    )

    [pscustomobject]@{ Name = $Name }
}

function Connect-MgGraph {
    param(
        [string[]]$Scopes,
        [bool]$NoWelcome,
        [switch]$UseDeviceCode
    )
}

function Get-MgContext {
    [pscustomobject]@{ TenantId = 'test-tenant' }
}

function Get-MgServicePrincipal {
    param(
        [string]$Filter,
        [string]$ErrorAction
    )

    $global:servicePrincipalCalls++
    if ($Filter -notmatch "^appId eq '([^']+)'$") {
        throw "Unexpected service-principal filter: $Filter"
    }

    $servicePrincipals[$Matches[1]]
}

function Get-MgOauth2PermissionGrant {
    param(
        [string]$Filter,
        [string]$ErrorAction
    )

    $grants
}

function Disconnect-MgGraph {
    $global:disconnectCalls++
}

$scriptPath = Join-Path $PSScriptRoot '..\scripts\Verify-WorkIQTenant.ps1'
& $scriptPath *> $null

$expectedServicePrincipalCalls = $serverAppIds.Count + 2
if ($global:servicePrincipalCalls -ne $expectedServicePrincipalCalls) {
    throw "Expected $expectedServicePrincipalCalls service-principal calls, got $global:servicePrincipalCalls."
}

if ($global:disconnectCalls -ne 1) {
    throw "Expected one Graph disconnect, got $global:disconnectCalls."
}

Write-Host "PASS: tenant verification used $global:servicePrincipalCalls service-principal calls (10 redundant calls avoided)."
