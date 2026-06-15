---
name: azure-provision-deploy
description: |
  Make the Agents Toolkit "Provision" and "Deploy" actions do real Azure work for an
  existing Microsoft 365 Agents Toolkit project. Fixes the two failure modes seen in
  practice: (1) Provision fails or does nothing because m365agents.yml has no Azure
  infrastructure step, and (2) there is no Deploy stage, so there is no way to push the
  MCP server to Azure. The skill rewrites m365agents.yml, adds Bicep under infra/, and
  fixes the env/.env.<env> + env/.env.<env>.user files so Provision creates resources and
  Deploy ships code to Azure App Service.
when_to_use:
  - "make the Provision and Deploy buttons work in Agents Toolkit"
  - "Provision does nothing / Provision fails with no Azure resources"
  - "no way to deploy the MCP server to Azure"
  - "wire m365agents.yml to Azure with Bicep"
  - "add provision + deploy lifecycle to an M365 agent project"
  - "deploy MCP server to Azure App Service from the Agents Toolkit extension"
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
- **Runtime app settings** — scan the server source for `process.env.*`. Each one must
  become an App Service setting.
- **Manifest `${{VARS}}`** — those must exist in `env/.env.<env>` by the time
  `teamsApp/zipAppPackage` runs.

## Step 2 — Generate `infra/azure.bicep`

Required structure (App Service path):

```bicep
@description('Base name used for all resources')
param baseName string = '<short-project-key>'

@description('Environment suffix, e.g. dev/test/prod')
param envSuffix string = 'dev'

@description('Location for all resources')
param location string = resourceGroup().location

@description('SKU for the App Service Plan')
param appServicePlanSku string = 'F1'   // pick F1 only if the dev tenant has no B1 quota

@description('Node runtime version for the App Service')
param nodeVersion string = 'NODE|22-lts'

// Add @secure() params for any secret your server needs:
@secure()
param aadAppClientSecret string
param aadAppClientId string
param teamsAppTenantId string
// ... add more as needed

// Resources: storage / tables / app service plan / site
// (omit storage if the server doesn't need it)

resource site 'Microsoft.Web/sites@2023-12-01' = {
  // ...
  properties: {
    siteConfig: {
      linuxFxVersion: nodeVersion
      appCommandLine: 'node server/dist/index.js'  // adjust to the staged layout
      alwaysOn: appServicePlanSku != 'F1' && appServicePlanSku != 'D1'
      appSettings: [
        { name: 'WEBSITE_NODE_DEFAULT_VERSION', value: '~22' }
        { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'false' }
        { name: 'AAD_APP_CLIENT_ID', value: aadAppClientId }
        { name: 'AAD_APP_CLIENT_SECRET', value: aadAppClientSecret }
        { name: 'TEAMS_APP_TENANT_ID', value: teamsAppTenantId }
        // ... one entry per process.env.* the server reads
      ]
    }
  }
}

// Outputs: emit anything the toolkit / yaml needs downstream
output appServiceResourceId string = site.id
output mcpServerUrl string = 'https://${site.properties.defaultHostName}'
```

### CRITICAL — Bicep output → env-var naming

After `arm/deploy` runs, the toolkit writes each Bicep `output` into
`env/.env.<env>` by **uppercasing the camelCase identifier and stripping
underscores**:

| Bicep output name      | Resulting env var      |
| ---------------------- | ---------------------- |
| `appServiceResourceId` | `APPSERVICERESOURCEID` |
| `mcpServerUrl`         | `MCPSERVERURL`         |
| `storageAccountName`   | `STORAGEACCOUNTNAME`   |

**Always** reference these in `m365agents.yml` exactly as written — e.g.
`${{APPSERVICERESOURCEID}}`. Using `APP_SERVICE_RESOURCE_ID` fails with
`Unresolved placeholders`.

If the manifest already references something like `${{MCP_SERVER_URL}}` (with
underscores), either keep that variable written manually in `env/.env.<env>` and
emit the same value as a no-underscore output, or rename the manifest var to the
no-underscore form.

## Step 3 — Generate `infra/azure.parameters.json`

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "envSuffix": { "value": "${{TEAMSFX_ENV}}" },
    "appServicePlanSku": { "value": "F1" },
    "aadAppClientId": { "value": "${{AAD_APP_CLIENT_ID}}" },
    "aadAppClientSecret": { "value": "${{SECRET_AAD_APP_CLIENT_SECRET}}" },
    "teamsAppTenantId": { "value": "${{TEAMS_APP_TENANT_ID}}" }
  }
}
```

Only `${{SECRET_*}}` values may come from `env/.env.<env>.user` — all other
interpolations must come from `env/.env.<env>`.

## Step 4 — Generate a stage script (only for non-trivial layouts)

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

## Step 5 — Rewrite `m365agents.yml`

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
      run: node infra/stage.mjs            # only if Step 4 produced a stage script
  - uses: azureAppService/zipDeploy
    with:
      artifactFolder: <stage-output-or-dist-folder>
      ignoreFile: .deployignore
      resourceId: ${{APPSERVICERESOURCEID}}   # NOTE: no underscores
```

## Step 6 — Update env files

`env/.env.dev` (committed, no secrets):
```
TEAMSFX_ENV=dev
APP_NAME_SUFFIX=dev
AZURE_SUBSCRIPTION_ID=<subId>
AZURE_RESOURCE_GROUP_NAME=<rg-name>
TEAMS_APP_TENANT_ID=<tenantId>
AAD_APP_CLIENT_ID=<clientId>
# Any var the manifest already references (MCP_SERVER_URL etc.)
```

`env/.env.dev.user` (gitignored, secrets only — must start with `SECRET_`):
```
SECRET_AAD_APP_CLIENT_SECRET=<secret>
```

`env/.env.dev.sample` (committed, doc-only):
- mirror the keys with empty values, plus a comment for the `.user` keys.

> Replace `dev` with the actual environment name for any non-local env (e.g. `test`,
> `prod`). The `local` env is handled by `m365agents.local.yml` and is out of scope here.

## Step 7 — `.gitignore` and `.deployignore`

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

## Step 8 — Verify, don't just edit

After writing the files, run from the extension (or the CLI fallback) and confirm
each step actually succeeds:

1. **Provision** — `atk provision --env dev` (or `npx teamsapp provision --env dev`)
   must succeed end-to-end and create the App Service.
2. **Deploy** — `atk deploy --env dev` (or `npx teamsapp deploy --env dev`) must
   succeed end-to-end.
3. **Health check** — `curl -I https://<app-service>.azurewebsites.net/<health-route>`
   must eventually return 2xx (App Service may need ~30s to warm up after the first
   deploy).

If anything fails, consult the troubleshooting table before changing unrelated things.

## Troubleshooting cheatsheet

| Symptom | Root cause | Fix |
| --- | --- | --- |
| **Provision does nothing / no Azure resources appear** | `m365agents.yml` has no `arm/deploy` step | Add the `arm/deploy` action (Step 5) pointing at `infra/azure.bicep`. |
| **Deploy button missing or "nothing to deploy"** | No `deploy:` stage in `m365agents.yml` | Add the `deploy:` stage with `cli/runNpmCommand` build steps + `azureAppService/zipDeploy`. |
| `InvalidYamlSchemaError ... Unable to parse yaml file` | Action key not in v1.11 schema, extra property like `writeToEnvironmentFile` on `arm/deploy`, or `script.shell: pwsh` (must be a path) | Validate against `https://aka.ms/m365-agents-toolkits/v1.11/yaml.schema.json`. `arm/deploy` has no `writeToEnvironmentFile` — outputs are auto-saved. Drop `shell:` from `script`. |
| `CompileBicepError ... spawn bicep ENOENT` | Bicep CLI not on PATH | Add `bicepCliVersion: v0.30.23` (or any released version) under `arm/deploy.with`. |
| `Unresolved placeholders ["FOO_BAR"]` during deploy | Variable name in yaml doesn't match what `arm/deploy` wrote | Bicep outputs become `UPPERCASENOUNDERSCORE`. Use `${{APPSERVICERESOURCEID}}`, not `${{APP_SERVICE_RESOURCE_ID}}`. |
| `MissingEnvironmentVariablesError ... SECRET_X` | Secret missing from `env/.env.<env>.user` | Secrets must be prefixed `SECRET_` and live in the `.user` file. |
| App Service responds 404 / `Cannot GET /mcp` | Wrong `appCommandLine` or wrong `artifactFolder` layout | Make `appCommandLine` match the staged layout (`server/dist/index.js`). |
| App Service 401/500 on a specific route | Runtime app settings missing (e.g. `AAD_APP_CLIENT_SECRET`) | Add to Bicep `appSettings`; re-provision; secret comes from the `${{SECRET_*}}` parameter. |
| `arm/deploy` leaks a secret in deployment outputs | `output ... = ...storageConnectionString` | Don't output it, or annotate `#disable-next-line outputs-should-not-contain-secrets`. |

## Conventions to remember

1. **Provision = `arm/deploy`; Deploy = `azureAppService/zipDeploy`.** If either button
   "doesn't work," the corresponding stage is usually missing from `m365agents.yml`.
2. **Bicep output naming**: camelCase becomes UPPERCASE-NO-UNDERSCORES. Always.
3. **Secrets**: `@secure()` Bicep param ⇐ `${{SECRET_*}}` parameters file ⇐
   `env/.env.<env>.user`.
4. **Provision order**: `arm/deploy` first, then `teamsApp/create`,
   `teamsApp/zipAppPackage`, `teamsApp/update`, `teamsApp/extendToM365`. The Teams package
   step runs **after** Bicep so the manifest can interpolate Bicep outputs
   (e.g. `${{MCPSERVERURL}}`).
5. **Stage before zipDeploy**: never zip the source repo. Always stage a clean folder.
6. **Idempotence**: `arm/deploy` with the same `deploymentName` is a safe upsert — re-run
   Provision freely.
