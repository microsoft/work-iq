# WorkIQ for Claude

WorkIQ connects Claude to Microsoft 365 work data through the hosted
`https://workiq.svc.cloud.microsoft/mcp` endpoint. The package includes the
WorkIQ skill and its reference documents for searching and summarizing work
content, structured reads, downloads, and supported writes across mail,
calendar, Teams, SharePoint, OneDrive, people, and tasks.

## Listing description

The manifest retains the shared WorkIQ host description. The longer listing
copy is preserved here:

Bring your work context with Work IQ, a Microsoft-built plugin for organizations
using AI agents. Ask questions and prepare for work using Outlook email and
calendar events, Teams conversations, OneDrive and SharePoint files, and the
people and organizational context you are permitted to access. Where enabled
and supported, Work IQ can also connect business data from Power Apps and
Dynamics 365 through Microsoft Dataverse, helping agents relate customer and
operational records to the work happening across Microsoft 365.

Catch up on a project, prepare for a meeting, find relevant documents, or
summarize decisions and next steps across your work and business context.
Rather than returning only raw items from one app, Work IQ assembles relevant,
agent-ready context; this can reduce repeated retrieval calls and unnecessary
data passed to an agent, helping it work more efficiently.

Enterprise security and governance features include permission-aware access,
Microsoft identity and administrator controls, and respect for applicable
organizational policies. Access is scoped to the signed-in user's permissions;
availability of data, actions, security controls and performance benefits
depends on your organization's configuration and the plugin's enabled tools.

Intended for commercial organizations and users authorized to use Work IQ;
a Microsoft 365 commercial license, administrator enablement or consent, and
usage-based billing setup may be required. This is not a consumer Outlook
connector and does not guarantee access to every Microsoft product or the
ability to create Office files. Review important outputs against their sources
before acting.

## Install and connect

In Claude's plugin settings, use the ZIP upload option where available.
In claude.ai and Cowork, open the installed plugin's **Connectors** tab,
add or connect WorkIQ, and sign in with your work account. Workspace policies
may require an organization owner to add the connector first.

For Claude Code, extract the ZIP into a directory named `workiq`, then run:

```powershell
claude plugin validate .\workiq
claude --plugin-dir .\workiq
```

In that Claude Code session, open `/mcp` and authenticate the WorkIQ server.
The skill is available as `/workiq:workiq` and can also load when a request
matches its description. Try "List my next three meetings" as a read-only
connection test.

The package declares the remote endpoint without Copilot-specific OAuth
fields, a fixed localhost port, tokens, or secrets. Claude must discover and
complete the service's OAuth flow. This package does not register an OAuth
application or enable the service for a tenant. If sign-in requires a
pre-registered client, obtain a Claude-compatible registration and its exact
callback requirements from the WorkIQ service owner; do not assume the Copilot
client ID works in Claude. Tenant administrator consent, workload permissions,
and applicable licensing are still required. Semantic queries may require
Microsoft 365 Copilot licensing.

## Use and data flow

Ask "Summarize the launch-plan thread" for semantic synthesis or "List my unread
emails" for structured reads. The skill requires confirmation for consequential
writes such as sending mail or deleting content. Tool calls send the requested
queries, entity identifiers, and any approved write payloads to the hosted
Microsoft WorkIQ service. Returned workplace content becomes available in the
Claude conversation. Review your organization's policies before connecting.

## Validation status

Archive contents and manifest syntax can be checked offline. Successful
packaging or manifest validation does not establish live OAuth compatibility,
tenant availability, or end-to-end tool behavior. Before distributing as a
verified integration, test sign-in, tool discovery, a read-only request, and
confirmation behavior for writes on each intended Claude surface.

## Build from this repository

```powershell
.\scripts\package-workiq-claude.ps1 -OutputPath .\artifacts\workiq-claude.zip
pwsh -NoProfile -File .\tests\workiq-claude\package.test.ps1
```

The archive contains only WorkIQ's Claude manifest, a Claude-compatible MCP
configuration, the icon, unchanged skills, this README, and license/notice files.
Existing Copilot and OpenAI configurations are not modified.
Keep generated ZIPs in the Git-ignored `artifacts` directory, not in commits.

Format reference: <https://claude.com/docs/plugins/build>
