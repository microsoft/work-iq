# Deployment & Local Run — MCP Apps on Azure Functions

Covers running locally and deploying the serverless MCP Apps server to Azure with `azd` (recommended) or
the Azure Functions Core Tools. Source: [Build an MCP Apps server using Azure Functions](https://learn.microsoft.com/azure/azure-functions/scenario-mcp-apps?pivots=programming-language-csharp).

## Local storage (Azurite)

The Functions host needs a storage connection. Use Azurite locally:

- **VS Code:** press F1 → run `Azurite: Start`.
- **CLI:** run `azurite` (install with `npm install -g azurite`) as a background process.
- **Docker:** `docker run -p 10000:10000 -p 10001:10001 -p 10002:10002 mcr.microsoft.com/azure-storage/azurite`.

Start Azurite **before** `func start` / F5. Spawn it as a detached background process (see SKILL.md
Automation rules).

## Deploy with azd (recommended — Flex Consumption)

The template includes Bicep in `infra/` that `azd` uses to create a secure Flex Consumption deployment
following best practices. `DEPLOY_SERVICE` selects which sample app's resources to provision.

```bash
# 1. Select the weather app service
azd env set DEPLOY_SERVICE weather

# 2. Provision Azure resources (pick subscription + region; vnetEnabled = false to simplify)
azd provision

# 3. Deploy the app code
azd deploy --service weather
```

Provisioning prompts:

| Parameter | Description |
|-----------|-------------|
| Azure subscription | Subscription in which resources are created |
| Azure location | Region — only regions that support the **Flex Consumption** plan are listed |
| `vnetEnabled` | `false` skips virtual network resources (simpler deployment) |

> `azd up` runs package + provision + deploy in one step. Use the split `provision` → `deploy` flow when
> you want to provision once and redeploy code changes repeatedly (`azd deploy --service weather`).

After deploy, `azd` prints links to the created resources.

## Connect to the remote MCP server

Built-in MCP authorization (Microsoft Entra) is enabled by default; VS Code handles the OAuth sign-in.

```bash
azd env get-value AZURE_FUNCTION_NAME
```

1. In `.vscode/mcp.json`, click **Start** above the `remote-mcp-function` configuration.
2. When prompted, enter the function app name from the command above.
3. Complete the Microsoft Entra sign-in to authorize access.
4. In Copilot Agent mode, re-run the same prompt (e.g., `What's the weather in Seattle?`) — the code now
   runs securely in Azure and renders the same widget.

## Alternative: Azure Functions Core Tools

If you provisioned the function app separately (e.g., with Azure CLI/Bicep) and only need to publish code:

```bash
# From the function app project folder (src/McpWeatherApp), after building the UI
func azure functionapp publish <function-app-name>
```

`azd` remains the recommended path because it provisions the Flex Consumption plan, storage, and Entra
auth via the template's Bicep. Use `func publish` only for code-only updates to an already-provisioned app.

## Cost

The app runs on the **Flex Consumption** plan — a *pay-for-what-you-use* model. Completing the quickstart
typically costs a few USD cents or less. Delete resources when done to avoid ongoing charges.

## Clean up

```bash
azd down
```

Removes the function app and all related resources created by `azd provision`.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Widget shows fallback "content not found" HTML | Run `npm run build` in the UI `app/` folder before starting the host; confirm `app/dist/index.html` exists |
| Host fails to start / storage error | Ensure Azurite is running before `func start` / F5 |
| `azd provision` region list is short | Only Flex Consumption regions are shown — pick one of the listed regions |
| Build/runtime errors about SDK version | Install the **.NET 10 SDK**; ensure Core Tools `>= 4.5.0` |
| Remote MCP connection prompts repeatedly | Complete the Entra sign-in; built-in MCP authorization is on by default |
| Tool not discovered by the host | Tool name must match `^[A-Za-z0-9_]+$` (no hyphens); restart the MCP server entry in `.vscode/mcp.json` |
