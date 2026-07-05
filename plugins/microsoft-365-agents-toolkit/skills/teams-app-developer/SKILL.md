---
name: teams-app-developer
description: >
  Build, test, and deploy code-based Teams apps using the M365 Agents Toolkit CLI.
  USE FOR: Custom Engine Agents (CEA), Teams bots, tabs, message extensions, Agents Playground
  local testing, Azure provision/deploy, Slack-to-Teams migration, cross-platform bot development,
  Block Kit to Adaptive Cards conversion, AI model integration (OpenAI/Azure/Anthropic/Bedrock).
  DO NOT USE FOR: declarative agents — use the `declarative-agent-developer` skill instead.
  Triggers: "build a teams bot", "custom engine agent", "CEA", "teams agent", "tab app",
  "message extension", "test with agents playground", "provision to azure", "deploy to azure",
  "migrate slack bot", "slack to teams", "convert block kit", "add azure openai to my bot"
---

# Teams App Developer Skill

Build code-based Microsoft 365 agents and Teams apps (CEA, bot, tab, message extension) using the ATK CLI.

> **Declarative Agents (DA):** Use the **`declarative-agent-developer`** skill — it owns all DA
> workflows including scaffolding, manifest editing, capability config, API/MCP plugins, OAuth,
> localization, and deployment. This skill covers code-based project types only.

## AI Behavior Guidelines

1. **Testing Strategy:** Recommend Agents Playground first (faster, no M365 needed). Use Teams workflow only if user explicitly requests it.

2. **Environment Variables:** NEVER hardcode secrets or make up placeholder values. Always ask users for real values.

3. **Error Handling:** Read error messages carefully. Check `env/.env.local`, `.localConfigs`, and `atk auth list`. Common pitfalls:
   - **`AADSTS7000229`** → `aadApp/create` missing `generateServicePrincipal: true` in YAML — add it and re-provision
   - **Missing `TENANT_ID`** in `.localConfigs` → SDK uses wrong token authority → 401 from Bot Connector
   - **401 persists after auth fix** → devtunnel URL may be blacklisted — create a fresh tunnel
   - See [troubleshoot/troubleshoot.md](troubleshoot/troubleshoot.md) for full diagnostic steps

4. **Long-Running Commands — WAIT for completion:**
   - `atk new`, `atk provision`, `atk deploy` can take several minutes
   - Always wait for completion before running the next step (timeout 120000ms+)

5. **Local Service Startup — Hangs terminal (expected):**
   - `npm run dev`, `npm start`, `python app.py`, `devtunnel host`, etc. will hang — the process keeps running indefinitely
   - ALWAYS run as a background process (`isBackground=true`) — NEVER use `isBackground=false` for these commands
   - Do NOT wait for it to "finish" — verify startup by checking output for "listening on port" or tunnel URL
   - If errors appear, read logs, diagnose, fix, restart
   - Use a **NEW terminal** to launch Agents Playground or open Teams sideloading URL

6. **Monitor App Logs:** Periodically check background terminal output for runtime errors. If the app crashes, read the error, fix the root cause, and restart.

7. **Telemetry Tagging:** Before running any `atk` CLI commands, set the session environment variable so all CLI invocations are tagged as skill-initiated:
   ```bash
   export ATK_CLI_SKILL=true
   ```
   Run this once at the start of the session. All subsequent `atk` commands in the same terminal will inherit it.

## ATK CLI Setup

Before any ATK commands, verify the CLI is available:

```bash
atk --version  # Must be > 1.1.5-beta
```

If ATK is not found or the version is too old → **use the `install-atk` skill** to install or
update it, then return here to continue.

## CLI Global Options

| Option | Meaning | Recommendation |
| --- | --- | --- |
| `-i` | Interactive mode | Always use `-i false` in automation to avoid hanging |
| `-f` | Project folder | Default to be current directory, used when specifying a custom folder. When scaffolding a new project, this is the parent folder where the project folder will be created under. |
| `-h` | Command help | Use `atk <command> -h` for quick syntax checks |

## Sub-Skills

| Sub-Skill | When to Use | Reference |
|-----------|-------------|-----------|
| **create-project** | Scaffold new project from template, choose template, `atk new` | [create-project/create-project.md](create-project/create-project.md) |
| **test-playground** | Test locally with Agents Playground, `agentsplayground`, quick testing | [test-playground/test-playground.md](test-playground/test-playground.md) |
| **test-teams** | Run on Teams, devtunnel, sideload, Teams testing, test in Copilot | [test-teams/test-teams.md](test-teams/test-teams.md) |
| **provision-deploy** | Provision Azure resources, deploy to cloud, `atk provision`, `atk deploy` | [provision-deploy/provision-deploy.md](provision-deploy/provision-deploy.md) |
| **troubleshoot** | Fix errors, 401, port conflicts, YAML errors, stale bots | [troubleshoot/troubleshoot.md](troubleshoot/troubleshoot.md) |
| **slack-to-teams** | Migrate Slack bot to Teams, cross-platform bridging, Block Kit to Adaptive Cards | [slack-to-teams/SKILL.md](slack-to-teams/SKILL.md) |

> **MANDATORY:** Before executing any workflow, read the corresponding sub-skill document.

## Workflow Chains

Match user intent to the smallest valid workflow.

| User Intent | Workflow (read in order) |
|---|---|
| Build new CEA/bot/tab/ME from scratch | create-project → test-playground |
| Test existing project locally | test-playground (recommended) or test-teams |
| Deploy to Azure | provision-deploy |
| Fix broken bot | troubleshoot → re-test |
| Migrate Slack bot to Teams | slack-to-teams |
| Create Declarative Agent | **Use `declarative-agent-developer` skill** |

> **MANDATORY:** Before executing any slack-to-teams workflow, read [slack-to-teams/SKILL.md](slack-to-teams/SKILL.md) first. The sub-skill contains a routed expert system with 100+ micro-expert files for cross-platform bot development.

## Shared References

- [manifest-and-yaml.md](toolkit/manifest-and-yaml.md) — Project files, YAML config, env vars, .localConfigs flow
- [commands.md](toolkit/commands.md) — ATK CLI commands: package, validate, share, collaborate
- [templates.md](toolkit/templates.md) — Complete template catalog with language support
- [experts/](experts/index.md) — 100+ micro-expert files: Teams SDK, Slack SDK, cross-platform bridging, deploy, AI models, security, language conversion
- [docs/](docs/README.md) — Platform comparison guides: UI, messaging, identity, infrastructure, feature gaps

## ATK Project Context Resolution

Resolve config values only when missing. If a value is already known in the session, reuse it.

### Step 1: Detect ATK Project

If `m365agentstoolkit*.yml` exists in the current folder, treat it as an ATK project and parse configuration.

### Step 2: Resolve Common Configuration

Resolve variables referenced in `m365agentstoolkit*.yml`. Common variables:
AZURE_OPENAI_API_KEY
AZURE_OPENAI_ENDPOINT
AZURE_OPENAI_DEPLOYMENT_NAME

### Step 3: Collect Missing Values

If required values are missing, ask the user for only the missing ones.

Refer to [manifest-and-yaml.md](toolkit/manifest-and-yaml.md) for full config-file details.
