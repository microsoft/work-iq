---
name: azure-provision-deploy
description: |
  Make the Agents Toolkit "Provision" and "Deploy" actions do real Azure work for an
  existing Microsoft 365 Agents Toolkit project. Fixes the two failure modes seen in
  practice: (1) Provision fails or does nothing because m365agents.yml has no Azure
  infrastructure step, and (2) there is no Deploy stage, so there is no way to push the
  MCP server to Azure. The skill rewrites m365agents.yml, adds Bicep under infra/, and
  fixes the env/.env.<env> + env/.env.<env>.user files so Provision creates resources and
  Deploy ships code to Azure App Service. Provisioning creates (or reuses) a resource
  group, an App Service (Linux, Node 22) with a user-assigned managed identity instead of
  secrets, optional Storage, and Application Insights for monitoring.
when_to_use:
  - "make the Provision and Deploy buttons work in Agents Toolkit"
  - "Provision does nothing / Provision fails with no Azure resources"
  - "no way to deploy the MCP server to Azure"
  - "wire m365agents.yml to Azure with Bicep"
  - "add provision + deploy lifecycle to an M365 agent project"
  - "deploy MCP server to Azure App Service from the Agents Toolkit extension"
  - "create or reuse a resource group and store its id in env"
  - "use managed identity instead of secrets for the MCP server"
  - "add Application Insights / monitoring to the MCP server deployment"
  - "choose the App Service plan SKU (B1 default) for the MCP server"
schema_version: m365agents v1.11
---

# Provision & Deploy an M365 Agents Toolkit project to Azure

The objective of this skill is simple: after running it, the user can open the
**Microsoft 365 Agents Toolkit** VS Code extension, click **Provision** to create
Azure resources, then click **Deploy** to push the MCP server code to **Azure App
Service** — and end up with a working remote environment.

It fixes the two real-world failures:

1. **"Not able to provision."** `m365agents.yml` has no `arm/deploy` step (or the Bicep
   CLI is missing), so the Provision action creates nothing or errors out.
2. **"No information to deploy to Azure."** There is no `deploy:` stage and no App
   Service target, so there is nowhere for the code to go.

> **How it runs:** prefer the extension buttons (**Provision** / **Deploy** in the
> Agents Toolkit lifecycle tree). The exact same lifecycle can be run from a terminal
> as a fallback:
> ```bash
> atk provision --env dev      # or: npx teamsapp provision --env dev
> atk deploy    --env dev      # or: npx teamsapp deploy    --env dev
> ```

## What this skill is NOT

- It is **not** a fresh `azd init` or a brand-new scaffold — it patches an **existing**
  M365 Agents Toolkit project whose `m365agents.yml` already has at least
  `teamsApp/create`, `teamsApp/zipAppPackage`, `teamsApp/update`, and
  `teamsApp/extendToM365`.
- It does **not** stop to ask clarifying questions — it inspects the repo and infers the
  answers. Only stop if a critical fact (Azure resource type or build commands) genuinely
  cannot be inferred.
- It does **not** author the declarative agent itself (manifest, instructions). That is
  the `declarative-agent-developer` skill's job.

## Provisioning model — what "good" looks like

Aim for a deployment the user can trust and operate. Provision in this order and favour
identity over secrets:

1. **Resource group** (Step 2) — create a new one (offer the user a location) or reuse an
   existing one. Persist both the name and the resource id in `env/.env.<env>` so later
   stages and re-runs target the same group.
2. **Hosting** (Step 3) — an Azure App Service (Linux, Node 22) plus a **user-assigned
   managed identity**, and Storage only if the server needs it. Authenticate to Azure
   resources through the managed identity — **do not** issue connection strings or client
   secrets unless a third-party dependency genuinely requires one.
3. **Monitoring** (Step 3) — always wire up **Application Insights** (backed by a Log
   Analytics workspace) so the user can watch the live service and debug failures.

Default the App Service plan to **B1 (Linux)**: it is the cheapest SKU that supports
`alwaysOn`, which avoids the worst cold-start stalls. Offer the user a larger plan
(`S1`, `P1v3`, `P2v3`) when they need lower latency or more throughput, and warn that
free/shared tiers (`F1`) cannot keep the server warm — expect slow first requests there.

## Step 1 — Inspect the repo

Read these files (in parallel where possible) and remember what you find:

| File | What to extract |
| --- | --- |
| `m365agents.yml` | current `provision` actions; whether an `arm/deploy` step and a `deploy:` stage exist |
| `m365agents.local.yml` | local debug commands (hints at dev script names) |
| `env/.env.dev` (and other non-local envs) | which envs exist; existing keys and values |
| `env/.env.dev.user` | secret keys (must start with `SECRET_`) |
| `.gitignore` | confirm `env/.env.*.user` and `env/.env.<env>` are ignored |
| `appPackage/manifest.json` and any `*-plugin.json` | which `${{VARS}}` are referenced (e.g. `MCP_SERVER_URL`) |
| `infra/*.bicep` | existing infra, if any (App Service / Functions / Storage) |
| `package.json` (root) | npm workspaces? build scripts? |
| `src/**/package.json` | per-project build commands; production deps |
| Any `widgets/build.*` or `vite.config.*` | ad-hoc build scripts that must run before zip |

From this, infer:

- **Target compute** — Azure App Service (Linux, Node.js) is the default. Only choose
  Functions or SWA if the project clearly requires it (`host.json`,
  `staticwebapp.config.json`).
- **What to build** — every workspace with a `build` script that produces runtime output
  (server `dist/`, widget `assets/*.html`, etc.).
- **What to ship** — the runtime closure: `dist/`, prod-only `node_modules/`,
  `package.json`, plus built assets. Not source, tests, or markdown.
- **Identity & access** — does the server call Azure resources (Storage, Key Vault,
  etc.)? If so, plan a **managed identity + role assignments** instead of keys or
  connection strings.
- **Runtime app settings** — scan the server source for `process.env.*`. Each one must
  become an App Service setting.
- **Manifest `${{VARS}}`** — those must exist in `env/.env.<env>` by the time
  `teamsApp/zipAppPackage` runs.

## Step 2 — Choose or create the resource group

All resources land in one resource group. Decide which group **before** generating Bicep,
and record it so every later step and re-run is consistent.

1. Confirm the signed-in subscription and capture its id → `AZURE_SUBSCRIPTION_ID`:
   ```bash
   az account show --query "{name:name, id:id}" -o table
   ```

2. Ask the user (AskUserQuestion) whether to **reuse an existing group** or **create a
   new one**.

   - **Reuse** — list candidates and let them pick:
     ```bash
     az group list --query "[].{name:name, location:location}" -o table
     ```
   - **Create** — offer a location choice first (never hard-code one):
     ```bash
     az account list-locations --query "[].name" -o tsv   # full list
     ```
     Suggest a few common ones (e.g. `eastus`, `westus2`, `westeurope`,
     `australiaeast`), let the user choose, then create the group:
     ```bash
     az group create -n <rg-name> -l <chosen-location>
     ```

3. Capture the group's name **and** resource id and write both to `env/.env.<env>`
   (Step 7):
   ```bash
   az group show -n <rg-name> --query "{name:name, id:id}" -o table
   ```
   - `AZURE_RESOURCE_GROUP_NAME=<rg-name>`
   - `AZURE_RESOURCE_GROUP_ID=<full /subscriptions/.../resourceGroups/... id>`

> `arm/deploy` (Step 6) deploys *into* this group. Storing the resource id means re-runs,
> teardown, and other tooling all act on the same group without re-prompting.

## Step 3 — Generate `infra/azure.bicep`

The template provisions, in one deployment: a **user-assigned managed identity**, optional
**Storage** (identity-auth, no keys), **Log Analytics + Application Insights**, and the
**App Service** (Linux, Node 22). Prefer the managed identity for every Azure dependency
and keep secrets out.

```bicep
@description('Base name used for all resources')
param baseName string = '<short-project-key>'

@description('Environment suffix, e.g. dev/test/prod')
param envSuffix string = 'dev'

@description('Location for all resources')
param location string = resourceGroup().location

@description('App Service Plan SKU. B1 (Basic, Linux) is the recommended default — it is the cheapest tier that supports alwaysOn. Scale up (S1, P1v3, P2v3) for lower cold-start latency and more throughput.')
@allowed([
  'B1'    // recommended default — Basic, alwaysOn capable
  'B2'
  'B3'
  'S1'    // Standard — better performance, deployment slots
  'P1v3'  // Premium v3 — lowest cold start, production workloads
  'P2v3'
])
param appServicePlanSku string = 'B1'

@description('Linux Node runtime. Must match the MCP server (Node 22).')
param nodeVersion string = 'NODE|22-lts'

var miName      = '${baseName}-mi-${envSuffix}'
var planName    = '${baseName}-plan-${envSuffix}'
var siteName    = '${baseName}-app-${envSuffix}'
var laName      = '${baseName}-logs-${envSuffix}'
var aiName      = '${baseName}-ai-${envSuffix}'
var storageName = toLower(replace('${baseName}st${envSuffix}', '-', ''))

// ---- User-assigned managed identity (preferred over secrets) ----
resource uami 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: miName
  location: location
}

// ---- Storage (only if the server needs it) — managed-identity auth, keys disabled ----
resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowSharedKeyAccess: false   // force Entra ID / managed-identity auth
    minimumTlsVersion: 'TLS1_2'
  }
}

// Grant the app's identity data-plane access to storage (no connection strings)
resource storageBlobRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, uami.id, 'Storage Blob Data Contributor')
  scope: storage
  properties: {
    // Storage Blob Data Contributor
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
    principalId: uami.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// ---- Monitoring: Log Analytics + Application Insights (always provisioned) ----
resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: laName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: aiName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logs.id
  }
}

// ---- Compute ----
resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  sku: {
    name: appServicePlanSku
  }
  kind: 'linux'
  properties: {
    reserved: true   // required for Linux plans
  }
}

resource site 'Microsoft.Web/sites@2023-12-01' = {
  name: siteName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${uami.id}': {}
    }
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: nodeVersion
      appCommandLine: 'node server/dist/index.js'  // adjust to the staged layout
      alwaysOn: appServicePlanSku != 'F1' && appServicePlanSku != 'D1'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      appSettings: [
        { name: 'WEBSITE_NODE_DEFAULT_VERSION', value: '~22' }
        { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'false' }
        // Application Insights — connection string only, no instrumentation secret
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
        { name: 'ApplicationInsightsAgent_EXTENSION_VERSION', value: '~3' }
        // Managed identity: the server uses DefaultAzureCredential with this client id
        { name: 'AZURE_CLIENT_ID', value: uami.properties.clientId }
        { name: 'STORAGE_ACCOUNT_NAME', value: storage.name }
        // ... one entry per process.env.* the server reads
      ]
    }
  }
}

// Outputs: emit anything the toolkit / yaml needs downstream (never secrets)
output appServiceResourceId string = site.id
output mcpServerUrl string = 'https://${site.properties.defaultHostName}'
output managedIdentityClientId string = uami.properties.clientId
```

> **No storage needed?** Delete the `storage` account, the `storageBlobRole` assignment,
> and the `STORAGE_ACCOUNT_NAME` app setting. Keep the managed identity, Log Analytics,
> and Application Insights regardless.

### CRITICAL — Bicep output → env-var naming

After `arm/deploy` runs, the toolkit writes each Bicep `output` into
`env/.env.<env>` by **uppercasing the camelCase identifier and stripping
underscores**:

| Bicep output name         | Resulting env var         |
| ------------------------- | ------------------------- |
| `appServiceResourceId`    | `APPSERVICERESOURCEID`    |
| `mcpServerUrl`            | `MCPSERVERURL`            |
| `managedIdentityClientId` | `MANAGEDIDENTITYCLIENTID` |
| `storageAccountName`      | `STORAGEACCOUNTNAME`      |

**Always** reference these in `m365agents.yml` exactly as written — e.g.
`${{APPSERVICERESOURCEID}}`. Using `APP_SERVICE_RESOURCE_ID` fails with
`Unresolved placeholders`.

If the manifest already references something like `${{MCP_SERVER_URL}}` (with
underscores), either keep that variable written manually in `env/.env.<env>` and
emit the same value as a no-underscore output, or rename the manifest var to the
no-underscore form.

## Step 4 — Generate `infra/azure.parameters.json`

With managed identity there are usually **no secrets** to pass. Keep the parameter file
small and identity-first:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "baseName": { "value": "<short-project-key>" },
    "envSuffix": { "value": "${{TEAMSFX_ENV}}" },
    "appServicePlanSku": { "value": "B1" }
  }
}
```

**Prefer managed identity over secrets.** Only reach for a stored secret when a
dependency genuinely cannot use Azure identity. When a secret *is* required, present the
user with **both** options below and let them choose (AskUserQuestion) — never silently
bake a raw secret into app settings.

### When the project needs a secret — offer two options

**Option A — Move to a managed identity (recommended).**
Replace the secret entirely with the user-assigned managed identity already provisioned in
Step 3. Nothing to rotate, nothing to leak, no expiry-driven downtime.

- Best choice whenever the dependency supports Entra ID auth, and the **required choice if
  the solution needs OBO** (on-behalf-of) — OBO flows should ride on the identity, not a
  static secret.
- This usually requires **code changes**: swap secret/connection-string auth for
  `DefaultAzureCredential` (passing `AZURE_CLIENT_ID` from the injected app setting), and
  add the matching role assignment in Bicep (as shown for Storage in Step 3).
- Outcome: no secret on the server to manage.

**Option B — Store the secret in Key Vault, referenced by the App Service.**
Use this when the secret is unavoidable (e.g. a third-party API key with no identity
support). Do **not** put the raw value in `appSettings` — store it in Key Vault and let
App Service resolve it at runtime via a **Key Vault reference**:

```
@Microsoft.KeyVault(SecretUri=https://<vault-name>.vault.azure.net/secrets/<secret-name>)
```

For this to resolve you MUST:

1. Provision a **Key Vault** in `infra/azure.bicep` and store the secret in it.
2. Ensure the App Service has a **managed identity** (the Step 3 user-assigned identity is
   fine — it's already attached to the site).
3. **Authorize that identity to read secrets** from the vault — either an RBAC role
   assignment (`Key Vault Secrets User`, role id
   `4633458b-17de-408a-b874-0445c86b69e6`) when the vault uses Azure RBAC, or a Key Vault
   access policy granting `get` on secrets.
4. Set the app setting to the `@Microsoft.KeyVault(...)` reference string instead of the
   literal secret. App Service substitutes the live value at startup.

Sketch for the Bicep additions (App Service path):

```bicep
@description('Name of the secret to seed into Key Vault (value passed securely)')
@secure()
param thirdPartyApiKey string

resource vault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${baseName}-kv-${envSuffix}'
  location: location
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true        // use RBAC, not access policies
    enableSoftDelete: true
  }
}

resource apiKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: vault
  name: 'thirdPartyApiKey'
  properties: { value: thirdPartyApiKey }
}

// Authorize the app's managed identity to read secrets
resource kvSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(vault.id, uami.id, 'Key Vault Secrets User')
  scope: vault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: uami.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// ...then in the site's appSettings:
//   { name: 'THIRD_PARTY_API_KEY', value: '@Microsoft.KeyVault(SecretUri=${apiKeySecret.properties.secretUri})' }
```

Only the *seed* value (`thirdPartyApiKey`) flows through the `@secure()` param from
`env/.env.<env>.user` (key prefixed `SECRET_`) during Provision. At runtime the server
reads the resolved value from its app setting — it never handles the Key Vault credential
itself. Every non-secret interpolation still comes from `env/.env.<env>`.

> Whichever option is chosen, secrets must never appear in committed files, Bicep outputs,
> or `appSettings` as literals.

## Step 5 — Generate a stage script (only for non-trivial layouts)

If `azureAppService/zipDeploy` cannot simply zip a single `dist/` folder (e.g. a
Node.js app that needs prod-only `node_modules` plus extra asset folders), create
`infra/stage.mjs`:

```js
// installs --omit=dev in server/, copies dist + node_modules + package.json
// + assets/ into a clean stage directory referenced by zipDeploy.
```

Layout the script must produce, matching the Bicep `appCommandLine`:

```
deploy-stage/
  server/
    package.json
    dist/
    node_modules/      # production only
  assets/              # only if the server serves static HTML
```

Skip this whole step if a single `dist/` folder is enough.

## Step 6 — Rewrite `m365agents.yml`

This is the file that actually wires the **Provision** and **Deploy** buttons. The
`arm/deploy` step is what makes Provision create Azure resources; the `deploy:` stage is
what makes Deploy ship code.

```yaml
# yaml-language-server: $schema=https://aka.ms/m365-agents-toolkits/v1.11/yaml.schema.json
version: v1.11
environmentFolderPath: ./env

provision:
  - uses: arm/deploy                      # <- makes "Provision" create Azure resources
    with:
      subscriptionId: ${{AZURE_SUBSCRIPTION_ID}}
      resourceGroupName: ${{AZURE_RESOURCE_GROUP_NAME}}
      bicepCliVersion: v0.30.23           # download Bicep CLI if not on PATH
      templates:
        - path: ./infra/azure.bicep
          parameters: ./infra/azure.parameters.json
          deploymentName: <project-key>-${{TEAMSFX_ENV}}
  - uses: teamsApp/create
    with:
      name: <app-name>${{APP_NAME_SUFFIX}}
    writeToEnvironmentFile:
      teamsAppId: TEAMS_APP_ID
  - uses: teamsApp/zipAppPackage
    with:
      manifestPath: ./appPackage/manifest.json
      outputZipPath: ./appPackage/build/appPackage.${{TEAMSFX_ENV}}.zip
      outputFolder: ./appPackage/build
  - uses: teamsApp/update
    with:
      appPackagePath: ./appPackage/build/appPackage.${{TEAMSFX_ENV}}.zip
  - uses: teamsApp/extendToM365
    with:
      appPackagePath: ./appPackage/build/appPackage.${{TEAMSFX_ENV}}.zip
    writeToEnvironmentFile:
      titleId: M365_TITLE_ID
      appId: M365_APP_ID

deploy:                                    # <- makes "Deploy" push code to Azure
  - uses: cli/runNpmCommand
    with:
      workingDirectory: src/<server>
      args: install --no-audit --no-fund
  - uses: cli/runNpmCommand
    with:
      workingDirectory: src/<server>
      args: run build
  # repeat for every workspace with runtime-consumed build output (widgets, etc.)
  - uses: script
    with:
      run: node infra/stage.mjs            # only if Step 5 produced a stage script
  - uses: azureAppService/zipDeploy
    with:
      artifactFolder: <stage-output-or-dist-folder>
      ignoreFile: .deployignore
      resourceId: ${{APPSERVICERESOURCEID}}   # NOTE: no underscores
```

## Step 7 — Update env files

`env/.env.dev` (committed, no secrets):
```
TEAMSFX_ENV=dev
APP_NAME_SUFFIX=dev
AZURE_SUBSCRIPTION_ID=<subId>
AZURE_RESOURCE_GROUP_NAME=<rg-name>
AZURE_RESOURCE_GROUP_ID=<full resource-group id from Step 2>
TEAMS_APP_TENANT_ID=<tenantId>
# Any var the manifest already references (MCP_SERVER_URL etc.)
# Bicep outputs are appended here automatically after Provision
# (APPSERVICERESOURCEID, MCPSERVERURL, MANAGEDIDENTITYCLIENTID, ...)
```

`env/.env.dev.user` (gitignored, secrets only — must start with `SECRET_`):
```
# Empty by design when using managed identity. Add SECRET_* keys only for
# unavoidable third-party secrets that Azure identity cannot cover.
```

`env/.env.dev.sample` (committed, doc-only):
- mirror the keys with empty values, plus a comment for the `.user` keys.

> Replace `dev` with the actual environment name for any non-local env (e.g. `test`,
> `prod`). The `local` env is handled by `m365agents.local.yml` and is out of scope here.

## Step 8 — `.gitignore` and `.deployignore`

`.gitignore` must ignore:
```
env/.env.*.user
env/.env.<each-non-local-env>
```

Create `.deployignore` so `zipDeploy` skips dev-only files:
```
.git/
.github/
.vscode/
*.md
src/                   # source — only the staged dist is shipped
tests/
*.test.*
node_modules/.cache/
```

## Step 9 — Verify, don't just edit

After writing the files, run from the extension (or the CLI fallback) and confirm
each step actually succeeds:

1. **Provision** — `atk provision --env dev` (or `npx teamsapp provision --env dev`)
   must succeed end-to-end and create the App Service, managed identity, and
   Application Insights in the chosen resource group:
   ```bash
   az resource list -g <rg-name> -o table
   ```
2. **Deploy** — `atk deploy --env dev` (or `npx teamsapp deploy --env dev`) must
   succeed end-to-end.
3. **Health check** — `curl -I https://<app-service>.azurewebsites.net/<health-route>`
   must eventually return 2xx (App Service may need ~30s to warm up after the first
   deploy; on B1 the first request after idle can be slow).
4. **Monitoring** — confirm Application Insights is receiving telemetry (open the
   resource in the portal, or verify `APPLICATIONINSIGHTS_CONNECTION_STRING` is present
   in the App Service settings) so the user has live diagnostics.

If anything fails, consult the troubleshooting table before changing unrelated things.

## Troubleshooting cheatsheet

| Symptom | Root cause | Fix |
| --- | --- | --- |
| **Provision does nothing / no Azure resources appear** | `m365agents.yml` has no `arm/deploy` step | Add the `arm/deploy` action (Step 6) pointing at `infra/azure.bicep`. |
| **Deploy button missing or "nothing to deploy"** | No `deploy:` stage in `m365agents.yml` | Add the `deploy:` stage with `cli/runNpmCommand` build steps + `azureAppService/zipDeploy`. |
| `InvalidYamlSchemaError ... Unable to parse yaml file` | Action key not in v1.11 schema, extra property like `writeToEnvironmentFile` on `arm/deploy`, or `script.shell: pwsh` (must be a path) | Validate against `https://aka.ms/m365-agents-toolkits/v1.11/yaml.schema.json`. `arm/deploy` has no `writeToEnvironmentFile` — outputs are auto-saved. Drop `shell:` from `script`. |
| `CompileBicepError ... spawn bicep ENOENT` | Bicep CLI not on PATH | Add `bicepCliVersion: v0.30.23` (or any released version) under `arm/deploy.with`. |
| `Unresolved placeholders ["FOO_BAR"]` during deploy | Variable name in yaml doesn't match what `arm/deploy` wrote | Bicep outputs become `UPPERCASENOUNDERSCORE`. Use `${{APPSERVICERESOURCEID}}`, not `${{APP_SERVICE_RESOURCE_ID}}`. |
| `MissingEnvironmentVariablesError ... SECRET_X` | Secret missing from `env/.env.<env>.user` | Secrets must be prefixed `SECRET_` and live in the `.user` file. |
| App Service responds 404 / `Cannot GET /mcp` | Wrong `appCommandLine` or wrong `artifactFolder` layout | Make `appCommandLine` match the staged layout (`server/dist/index.js`). |
| App Service 401/500 on a specific route | Runtime app settings missing (e.g. `AAD_APP_CLIENT_SECRET`) | Add to Bicep `appSettings`; re-provision; secret comes from the `${{SECRET_*}}` parameter. |
| `arm/deploy` leaks a secret in deployment outputs | `output ... = ...storageConnectionString` | Don't output it, or annotate `#disable-next-line outputs-should-not-contain-secrets`. |
| `AuthorizationFailed` / `RoleAssignmentUpdateNotPermitted` during Provision | The Bicep `roleAssignments` resource needs the deployer to have **Owner** or **User Access Administrator** on the resource group | Grant that role on the RG (or have an owner run Provision once); role assignments can't be created by Contributor alone. |
| Storage returns **403** at runtime with the managed identity | Role assignment not yet propagated, or code still uses keys while `allowSharedKeyAccess: false` | Use `DefaultAzureCredential` with `AZURE_CLIENT_ID` from the env; wait ~1–2 min for the role to propagate; never re-enable shared keys. |
| Application Insights shows **no telemetry** | `APPLICATIONINSIGHTS_CONNECTION_STRING` or `ApplicationInsightsAgent_EXTENSION_VERSION` missing from `appSettings` | Add both app settings in the Bicep `site` resource and re-provision. |
| First request very slow / server seems asleep | `F1`/shared plan (no `alwaysOn`) or cold container | Default to **B1** (alwaysOn capable); scale to `S1`/`P1v3` for lower cold start. |
| App setting shows the literal `@Microsoft.KeyVault(...)` string / value not resolved | App Service identity can't read the vault, wrong `SecretUri`, or vault uses access policies while you granted RBAC (or vice-versa) | Confirm the managed identity has `Key Vault Secrets User` (RBAC vaults) or a `get` access policy; verify the `SecretUri` matches the secret; re-provision. |

## Conventions to remember

1. **Provision = `arm/deploy`; Deploy = `azureAppService/zipDeploy`.** If either button
   "doesn't work," the corresponding stage is usually missing from `m365agents.yml`.
2. **Bicep output naming**: camelCase becomes UPPERCASE-NO-UNDERSCORES. Always.
3. **Identity over secrets**: prefer a user-assigned managed identity + role assignments.
   When a secret is unavoidable, offer the user **two** options — (A) move to managed
   identity (required for OBO), or (B) store it in Key Vault and reference it from app
   settings via `@Microsoft.KeyVault(SecretUri=...)` with the identity authorized on the
   vault. Never bake a raw secret into `appSettings`.
4. **One resource group**: create or reuse a group up front; store its name and id in
   `env/.env.<env>` so every run targets the same group.
5. **Always add Application Insights**: every App Service ships with App Insights + Log
   Analytics wired in for monitoring and debugging.
6. **Default plan B1 (Linux)**: cheapest SKU with `alwaysOn`; offer `S1`/`P1v3` for
   performance, and warn that `F1` cannot stay warm.
7. **Provision order**: `arm/deploy` first, then `teamsApp/create`,
   `teamsApp/zipAppPackage`, `teamsApp/update`, `teamsApp/extendToM365`. The Teams package
   step runs **after** Bicep so the manifest can interpolate Bicep outputs
   (e.g. `${{MCPSERVERURL}}`).
8. **Stage before zipDeploy**: never zip the source repo. Always stage a clean folder.
9. **Idempotence**: `arm/deploy` with the same `deploymentName` is a safe upsert — re-run
   Provision freely.
