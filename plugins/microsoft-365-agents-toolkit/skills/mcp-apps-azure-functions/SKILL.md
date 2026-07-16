---
name: mcp-apps-azure-functions
description: >
  Scaffold, run, and deploy a serverless MCP Apps server on Azure Functions (C# / .NET isolated)
  with the Azure Functions MCP extension and the Azure Developer CLI (azd). MCP Apps are MCP servers
  whose tools return rich interactive UI widgets. Use when the user wants a serverless, pay-per-use
  host for an MCP Apps server on the Flex Consumption plan. Covers: azd template init
  (remote-mcp-functions-dotnet), building the UI app, McpToolTrigger + McpResourceTrigger +
  McpMetadata patterns, local run with Azurite + Functions Core Tools, verifying with GitHub Copilot,
  and deploy via azd or func with built-in Microsoft Entra auth. DO NOT USE FOR: building the MCP
  server + widget without serverless hosting (use ui-widget-developer) or scaffolding the declarative
  agent (use declarative-agent-developer). Triggers: "MCP Apps on Azure Functions", "serverless MCP
  server", "MCP server Azure Functions C#", "azd MCP Apps", "Flex Consumption MCP", "McpToolTrigger",
  "remote-mcp-functions-dotnet"
---

# MCP Apps on Azure Functions (Serverless, C# / .NET)

Build and deploy a **serverless MCP Apps server** on **Azure Functions** using the **Azure Functions
MCP extension** (C# / .NET isolated) and the **Azure Developer CLI (`azd`)**. The result is an MCP
server whose tools return **rich interactive UI widgets** — hosted on the **Flex Consumption** plan
(pay-for-what-you-use) and secured by default with **Microsoft Entra** built-in authorization.

Based on the official quickstart: [Build an MCP Apps server using Azure Functions](https://learn.microsoft.com/azure/azure-functions/scenario-mcp-apps?pivots=programming-language-csharp)
and the template repo [Azure-Samples/remote-mcp-functions-dotnet](https://github.com/Azure-Samples/remote-mcp-functions-dotnet).

## When to use

- The user wants a **serverless** hosting option for an MCP Apps server (no always-on server/VM).
- The user wants **C# / .NET** on Azure Functions with the MCP extension.
- The user wants an `azd` + Bicep deployment to the **Flex Consumption** plan following best practices.
- The user wants an MCP server whose tools render **interactive UI** (MCP Apps standard) in Copilot.

## When NOT to use

| Situation | Use instead |
|-----------|-------------|
| Build the MCP server + widget code itself (any host), design widgets | `ui-widget-developer` |
| Scaffold or configure the **declarative agent** (manifest, capabilities, deploy the agent) | `declarative-agent-developer` |
| Generate/run **evals** for an agent | `m365-agent-evaluator` |

> This skill focuses on the **serverless hosting path** on Azure Functions. It scaffolds a working
> MCP Apps server from the official template and takes it to production on Azure.

## Architecture

```
MCP host (Copilot / VS Code) ──▶ Remote MCP server on Azure Functions ──▶ MCP tool (McpToolTrigger)
                                    (Flex Consumption, Entra auth)              │  returns JSON data
                                                                                ▼
                                                          ui.resourceUri ──▶ MCP resource (McpResourceTrigger)
                                                                             serves bundled HTML widget
                                                                             at ui://weather/index.html
```

An MCP Apps tool requires **two components**:
1. A **tool with UI metadata** that declares a `ui.resourceUri` (via `[McpMetadata]`).
2. A **resource** that serves the bundled HTML/JS at the matching `ui://` URI (via `[McpResourceTrigger]`).

## Prerequisites

Install/verify these before scaffolding (install automatically when missing — see Automation rules):

| Tool | Notes |
|------|-------|
| [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0) | Required by the .NET isolated template |
| [Azure Functions Core Tools](https://learn.microsoft.com/azure/azure-functions/functions-run-local) `>= 4.5.0` | Local run + `func` publish |
| [Azure Developer CLI (`azd`)](https://aka.ms/azd) `1.23.x`+ | Provision + deploy |
| [Node.js 22](https://nodejs.org/) | Build the MCP Apps UI (`npm run build`) |
| [Azurite](https://learn.microsoft.com/azure/storage/common/storage-use-azurite) (or Docker) | Local storage emulator |
| [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) + Azure subscription | Auth + deployment target |

Optional but recommended: VS Code with the **Azure Functions** and **Azure Developer CLI** extensions.

## Workflow

### 1. Scaffold from the official azd template

```bash
azd init --template remote-mcp-functions-dotnet -e mcpweather-dotnet
cd remote-mcp-functions-dotnet
```

`-e` sets the `azd` environment name (used for the deployment context and resource names). This pulls the
full project (functions, `infra/` Bicep, `.vscode/mcp.json`, `azure.yaml`). The MCP Apps demo lives under
`src/McpWeatherApp` (with the UI app in `src/McpWeatherApp/app`).

### 2. Build the MCP Apps UI

The widget UI must be built before running — the resource serves `app/dist/index.html`.

```bash
cd src/McpWeatherApp/app
npm install
npm run build
cd ../
```

### 3. Start the storage emulator (Azurite)

Start Azurite before running the Functions host. VS Code: press F1 → `Azurite: Start`. CLI: run `azurite`
in a background process, or start the Azurite Docker container. See [references/deployment.md](references/deployment.md#local-storage-azurite).

### 4. Run the MCP server locally

- **VS Code:** press F5 (Run and Debug). When prompted, select **`src/McpWeatherApp`**.
- **CLI:** from `src/McpWeatherApp`, run `func start`.

The Functions host prints the running functions (`GetWeather`, `GetWeatherWidget`) and the local MCP endpoint.

> Spawn the Functions host and Azurite as **independent background OS processes** (see Automation rules) so
> they survive between agent turns.

### 5. Verify with GitHub Copilot

The template ships a `.vscode/mcp.json` with a `local-mcp-function` server pointing at your local endpoint.

1. With the host running, open `.vscode/mcp.json` and click **Start** above `local-mcp-function`.
2. In Copilot Chat, select **Agent** mode → **Configure tools** → enable `MCP Server: local-mcp-function`.
3. Prompt: `What's the weather in Seattle?` → approve the tool run. Because the tool declares UI metadata,
   the host fetches the UI resource and renders the **interactive weather widget** in a sandboxed iframe.

### 6. Review / adapt the code

The MCP App is defined in `src/McpWeatherApp` using `[McpToolTrigger]`, `[McpMetadata]`, and
`[McpResourceTrigger]`. To rename the tool or add your own tool + widget, follow the C# patterns in
**[references/csharp-code-patterns.md](references/csharp-code-patterns.md)**.

### 7. Deploy to Azure (serverless)

`azd` provisions a Flex Consumption function app via the included Bicep and deploys the app:

```bash
azd env set DEPLOY_SERVICE weather
azd provision            # pick subscription + region; vnetEnabled = false to simplify
azd deploy --service weather
```

For the full deployment flow, the Core Tools alternative, remote connection, cost notes, and
troubleshooting, see **[references/deployment.md](references/deployment.md)**.

### 8. Connect to the remote server & clean up

- Get the app name: `azd env get-value AZURE_FUNCTION_NAME`.
- In `.vscode/mcp.json`, click **Start** above `remote-mcp-function`; enter the app name; complete the
  Microsoft Entra sign-in (built-in MCP authorization is on by default). Re-run the same Copilot prompt.
- When finished, remove all resources: `azd down`.

## Automation rules

- **Full automation:** install missing tools, authenticate, build the UI, start Azurite + the Functions
  host, and deploy — do not ask the user to run commands manually. Only stop for interactive input that
  genuinely requires the user (Azure sign-in / device code, subscription & region selection).
- **Background processes:** the Functions host (`func start` / F5) and Azurite must run as **detached OS
  processes**, not inside the agent shell session (which is killed between turns). On Windows use
  `Start-Process -WindowStyle Hidden`; on Linux/Mac use `nohup ... &`. Save PIDs to stop them later.
- **Build before run:** always run `npm run build` in the UI `app/` folder before starting the host, or
  the widget resource returns the fallback HTML.
- **Tool naming:** MCP tool names must match `^[A-Za-z0-9_]+$` (no hyphens).
- **Region:** `azd provision` only lists regions that currently support the **Flex Consumption** plan.

## References

- [references/csharp-code-patterns.md](references/csharp-code-patterns.md) — `McpToolTrigger`,
  `McpResourceTrigger`, `McpMetadata`, the `ui.resourceUri` contract, and how to add a new tool + widget.
- [references/deployment.md](references/deployment.md) — `azd` provision/deploy, `func` Core Tools
  alternative, Flex Consumption, Entra built-in auth, Azurite, cost, and troubleshooting.
