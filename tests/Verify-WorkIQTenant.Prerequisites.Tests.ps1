param(
    [string]$ScriptPath = (Join-Path $PSScriptRoot '..\scripts\Verify-WorkIQTenant.ps1')
)

$ErrorActionPreference = 'Stop'

$scriptText = Get-Content -LiteralPath $scriptPath -Raw
$workIqAppId = 'fdcc1f02-fc51-4226-8753-f668596af7f7'
$toolsAppId = 'ea9ffc3e-8a23-4a7d-836d-234d7c7565c1'
$cliAppId = 'ba081686-5d24-4bc6-a0d6-d034ecffed87'
$graphAppId = '00000003-0000-0000-c000-000000000000'
$serverAppIds = @(
    $toolsAppId,
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
$graphScopes = 'Sites.Read.All Mail.Read People.Read.All OnlineMeetingTranscript.Read.All Chat.Read ChannelMessage.Read.All ExternalItem.Read.All'
$toolsScopes = 'McpServers.CopilotMCP.All McpServers.Me.All McpServers.Mail.All McpServers.Calendar.All McpServers.Teams.All McpServers.Word.All McpServers.OneDriveSharepoint.All McpServers.SharepointLists.All McpServers.SharePoint.All McpServers.OneDrive.All McpServers.Dataverse.All McpServers.M365Admin.All McpServers.Management.All'

function Assert-Condition([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
}

$mocks = @{
    'Get-Module' = @'
param([switch]$ListAvailable, [string]$Name)
if (-not $ListAvailable -or $Name -notin @('Microsoft.Graph.Authentication','Microsoft.Graph.Applications','Microsoft.Graph.Identity.SignIns')) {
    $Violations.Add('Unexpected module lookup'); throw 'Unexpected module lookup'
}
[pscustomobject]@{Name=$Name}
'@
    'Install-Module' = @'
param([string]$Name, [string]$Scope, [switch]$Force, [string]$ErrorAction)
$Violations.Add('Installation attempted'); throw 'Tests must not install modules'
'@
    'Connect-MgGraph' = @'
param([string[]]$Scopes, [bool]$NoWelcome, [switch]$UseDeviceCode)
if ($Scopes.Count -ne 1 -or $Scopes[0] -ne 'Application.Read.All' -or -not $NoWelcome) {
    $Violations.Add('Unexpected authentication parameters'); throw 'Unexpected authentication parameters'
}
$Calls.Add(@{Command='Connect-MgGraph'; UseDeviceCode=[bool]$UseDeviceCode})
'@
    'Get-MgContext' = @'
[pscustomobject]@{TenantId='synthetic-tenant'}
'@
    'Get-MgServicePrincipal' = @'
[CmdletBinding()]
param([string]$Filter)
if ($Filter -notmatch "^appId eq '([^']+)'$" -or -not $Principals.ContainsKey($Matches[1])) {
    $Violations.Add("Unexpected principal filter: $Filter"); throw "Unexpected principal filter: $Filter"
}
$id=$Matches[1]
$Calls.Add(@{Command='Get-MgServicePrincipal'; AppId=$id})
if ($LookupFailure -and $id -eq 'fdcc1f02-fc51-4226-8753-f668596af7f7') {
    if ($LookupFailure -eq 'Denied') {
        throw [System.UnauthorizedAccessException]::new('Synthetic read access denied')
    }
    if ($LookupFailure -eq 'Forbidden') {
        throw [System.Net.Http.HttpRequestException]::new('403 Forbidden', $null, [System.Net.HttpStatusCode]::Forbidden)
    }
    if ($LookupFailure -eq 'NonTerminating') {
        $PSCmdlet.WriteError([Management.Automation.ErrorRecord]::new(
            [System.InvalidOperationException]::new('Synthetic lookup failure'),
            'SyntheticLookupFailure',
            [Management.Automation.ErrorCategory]::ReadError,
            $null))
        return
    }
    throw [System.InvalidOperationException]::new('Synthetic lookup failure')
}
$Principals[$id]
'@
    'Get-MgOauth2PermissionGrant' = @'
param([string]$Filter, [string]$ErrorAction)
if ($Filter -ne "clientId eq 'synthetic-ba081686-5d24-4bc6-a0d6-d034ecffed87'") {
    $Violations.Add("Unexpected grant filter: $Filter"); throw "Unexpected grant filter: $Filter"
}
$Calls.Add(@{Command='Get-MgOauth2PermissionGrant'})
$Grants
'@
    'Disconnect-MgGraph' = @'
$Calls.Add(@{Command='Disconnect-MgGraph'})
'@
}

$tokens = $null
$parseErrors = $null
$ast = [Management.Automation.Language.Parser]::ParseInput($scriptText, [ref]$tokens, [ref]$parseErrors)
Assert-Condition ($parseErrors.Count -eq 0) 'Verifier must parse.'
$allowedCommands = @('Write-Host', 'Where-Object', 'Select-Object') + @($mocks.Keys)
foreach ($command in $ast.FindAll({param($node) $node -is [Management.Automation.Language.CommandAst]}, $true)) {
    Assert-Condition ($command.GetCommandName() -in $allowedCommands) "Review and mock new command before running: $($command.Extent.Text)"
}
Assert-Condition ($ast.FindAll({param($node) $node -is [Management.Automation.Language.InvokeMemberExpressionAst]}, $true).Count -eq 0) 'Review member invocations before running the verifier offline.'
Assert-Condition ($ast.FindAll({param($node) $node -is [Management.Automation.Language.ExitStatementAst]}, $true).Count -eq 0) 'Preserve the existing no-explicit-exit contract.'

$cases = @(
    @{Name='missing-workiq'; Missing=$workIqAppId; Expected="[MISSING] Work IQ (AppId: $workIqAppId)"},
    @{Name='all-present'; Success=$true},
    @{Name='missing-tools'; Missing=$toolsAppId; Expected='[MISSING] Work IQ Tools'; Issues=1},
    @{Name='missing-cli'; Missing=$cliAppId; Expected='[MISSING] Work IQ CLI'},
    @{Name='partial-graph-grant'; PartialGraph=$true; Expected='[PARTIAL] Microsoft Graph'; Issues=1},
    @{Name='missing-workiq-and-cli'; Missing=$workIqAppId; MissingCli=$true; Expected="[MISSING] Work IQ (AppId: $workIqAppId)"},
    @{Name='workiq-lookup-error'; LookupFailure='Typed'; Expected='[ERROR] Could not verify Work IQ'; Issues=1},
    @{Name='device-code-control'; DeviceCode=$true; Success=$true},
    @{Name='workiq-lookup-denied'; LookupFailure='Denied'; Expected='[ERROR] Could not verify Work IQ'; Issues=1},
    @{Name='workiq-generic-forbidden'; LookupFailure='Forbidden'; Expected='[ERROR] Could not verify Work IQ'; Issues=1},
    @{Name='workiq-nonterminating-error'; LookupFailure='NonTerminating'; Expected='[ERROR] Could not verify Work IQ'; Issues=1},
    @{Name='empty-grants'; EmptyGrants=$true; Expected='[MISSING] No Graph permission grant found'; Issues=11},
    @{Name='partial-tools-grant'; PartialTools=$true; Expected='[PARTIAL] Work IQ Tools'; Issues=1}
)
$failures = [Collections.Generic.List[string]]::new()
$originalPath = $env:PATH
try {
    foreach ($case in $cases) {
        $principals = @{}
        foreach ($id in $serverAppIds + @($cliAppId, $graphAppId, $workIqAppId)) {
            $principals[$id] = [pscustomobject]@{AppId=$id; Id="synthetic-$id"; DisplayName="Synthetic $id"}
        }
        if ($case.Missing) { $principals[$case.Missing] = $null }
        if ($case.MissingCli) { $principals[$cliAppId] = $null }
        # No OAuth grant is invented for the standalone Work IQ principal.
        $grants = @(foreach ($id in $serverAppIds + $graphAppId) {
            [pscustomobject]@{
                ResourceId = "synthetic-$id"
                Scope = if ($id -eq $graphAppId) {
                    if ($case.PartialGraph) { 'Mail.Read' } else { $graphScopes }
                } elseif ($id -eq $toolsAppId) {
                    if ($case.PartialTools) { 'McpServers.Me.All' } else { $toolsScopes }
                } else { 'Synthetic.Read' }
            }
        })
        if ($case.EmptyGrants) { $grants = @() }
        $calls = [Collections.Generic.List[object]]::new()
        $violations = [Collections.Generic.List[string]]::new()
        $state = [Management.Automation.Runspaces.InitialSessionState]::Create()
        $state.LanguageMode = [Management.Automation.PSLanguageMode]::FullLanguage
        foreach ($name in @('Write-Host', 'Where-Object', 'Select-Object')) {
            $state.Commands.Add([Management.Automation.Runspaces.SessionStateCmdletEntry]::new($name, (Get-Command $name -CommandType Cmdlet).ImplementingType, $null))
        }
        foreach ($name in $mocks.Keys) {
            $state.Commands.Add([Management.Automation.Runspaces.SessionStateFunctionEntry]::new($name, $mocks[$name]))
        }
        foreach ($entry in @{
            PSModuleAutoLoadingPreference='None'
            ErrorActionPreference=[Management.Automation.ActionPreference]::Continue
            Principals=$principals; Grants=$grants; Calls=$calls; Violations=$violations
            LookupFailure=$case.LookupFailure
        }.GetEnumerator()) {
            $state.Variables.Add([Management.Automation.Runspaces.SessionStateVariableEntry]::new($entry.Key, $entry.Value, 'Synthetic test fixture'))
        }
        # An empty runspace alone does not disable PATH-based native command discovery.
        $env:PATH = ''
        $runspace = [Management.Automation.Runspaces.RunspaceFactory]::CreateRunspace($state)
        $engine = [Management.Automation.PowerShell]::Create()
        try {
            $runspace.Open()
            $engine.Runspace = $runspace
            $null = $engine.AddScript(@'
foreach ($name in @('Invoke-WebRequest','Invoke-RestMethod','Import-Module','New-MgServicePrincipal','New-MgOauth2PermissionGrant','curl.exe')) {
    if ($null -ne $ExecutionContext.SessionState.InvokeCommand.GetCommand($name, [System.Management.Automation.CommandTypes]::All)) {
        throw "Unexpected external command: $name"
    }
}
'@)
            $null = $engine.Invoke()
            Assert-Condition (-not $engine.HadErrors) 'External commands must be unavailable.'
            $engine.Commands.Clear()
            $null = $engine.AddScript($scriptText)
            if ($case.DeviceCode) { $null = $engine.AddParameter('UseDeviceCode') }
            $null = $engine.Invoke()
            $text = ($engine.Streams.Information | ForEach-Object { $_.MessageData.ToString() }) -join "`n"
            $success = $text.Contains('All checks passed. Work IQ is fully provisioned in this tenant.')
            Assert-Condition ($success -eq [bool]$case.Success) "Fully-provisioned success must be $([bool]$case.Success) for $($case.Name)."
            if ($case.Expected) {
                Assert-Condition ($text.Contains($case.Expected)) "Expected diagnostic: $($case.Expected)"
            }
            if ($case.Missing -eq $workIqAppId) {
                Assert-Condition ($text.Contains('https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/work-iq/enable-work-iq')) 'Missing principal needs separate setup guidance.'
                Assert-Condition (-not $text.Contains('issue(s) found. Run .\scripts\Enable-WorkIQToolsForTenant.ps1 to fix.')) 'Do not claim the existing provisioning script fixes the standalone prerequisite.'
            }
            if ($case.LookupFailure) {
                Assert-Condition (-not $text.Contains('[MISSING] Work IQ (')) 'Lookup failure must not be reported as confirmed absence.'
                Assert-Condition ($text.Contains('The prerequisite status is unknown.')) 'Failed lookup must explicitly report unknown prerequisite status.'
                Assert-Condition ($text.Contains('Stop this check; do not provision or grant consent based on this lookup failure.')) 'Failed lookup must not prescribe provisioning or consent.'
                Assert-Condition (-not $text.Contains('Setup instructions:') -and -not $text.Contains('then retry verification')) 'Failed lookup must not offer missing-principal setup or unconditional retry advice.'
                Assert-Condition (-not $text.Contains('Synthetic lookup failure') -and -not $text.Contains('Synthetic read access denied')) 'Do not expose raw lookup exception details.'
            }
            if ($case.Success) {
                Assert-Condition ($text -notmatch '\[(MISSING|PARTIAL|ERROR)\]') 'Healthy fixture must not report prerequisite or grant issues.'
            }
            if ($case.Issues) {
                Assert-Condition ($text.Contains("$($case.Issues) issue(s) found.")) 'Preserve the expected issue count.'
            }
            Assert-Condition ($violations.Count -eq 0) "Forbidden operation: $($violations -join '; ')"
            Assert-Condition ($engine.Streams.Error.Count -eq 0) "Unexpected runtime errors: $($engine.Streams.Error -join '; ')"
            # Legacy controls must pass the baseline too; only defect cases require the new lookup.
            if ($case.Missing -eq $workIqAppId -or $case.LookupFailure) {
                Assert-Condition (@($calls | Where-Object { $_.Command -eq 'Get-MgServicePrincipal' -and $_.AppId -eq $workIqAppId }).Count -eq 1) 'Check the standalone Work IQ prerequisite exactly once.'
            }
            foreach ($id in $serverAppIds + $cliAppId) {
                Assert-Condition (@($calls | Where-Object { $_.Command -eq 'Get-MgServicePrincipal' -and $_.AppId -eq $id }).Count -ge 1) "Preserve legacy principal check: $id"
            }
            Assert-Condition (@($calls | Where-Object Command -EQ 'Disconnect-MgGraph').Count -eq 1) 'Disconnect exactly once.'
            Assert-Condition ($calls[$calls.Count - 1].Command -eq 'Disconnect-MgGraph') 'Disconnect after verification operations.'
            $connectCalls = @($calls | Where-Object Command -EQ 'Connect-MgGraph')
            Assert-Condition ($connectCalls.Count -eq 1 -and $connectCalls[0].UseDeviceCode -eq [bool]$case.DeviceCode) 'Preserve authentication options.'
            if ($null -eq $principals[$cliAppId]) {
                Assert-Condition (@($calls | Where-Object Command -EQ 'Get-MgOauth2PermissionGrant').Count -eq 0) 'Do not query grants without a CLI principal.'
                Assert-Condition ($text.Contains('[MISSING] Work IQ CLI') -and $text.Contains('Cannot verify permission grants without CLI service principal.')) 'Preserve missing-CLI early-return diagnostics.'
            } else {
                Assert-Condition (@($calls | Where-Object Command -EQ 'Get-MgOauth2PermissionGrant').Count -eq 1) 'Read the existing CLI grants exactly once.'
            }
            Write-Host "PASS: $($case.Name)"
        }
        catch {
            $failures.Add("$($case.Name): $($_.Exception.Message)")
            Write-Host "FAIL: $($failures[$failures.Count - 1])"
        }
        finally {
            $engine.Dispose()
            $runspace.Dispose()
        }
    }
}
finally {
    $env:PATH = $originalPath
}
if ($failures.Count) {
    throw "$($failures.Count) of $($cases.Count) prerequisite scenarios failed."
}
Write-Host "PASS: all $($cases.Count) offline prerequisite scenarios."
