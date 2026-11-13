# Work IQ

Work IQ is a **Copilot CLI plugin marketplace** for managing AI agent plugins for GitHub Copilot CLI. It provides MCP servers, skills, and tools that connect AI assistants to Microsoft 365 data.

## Repository Structure

```
work-iq/
├── marketplace.json          # Copilot marketplace registry
├── .claude-plugin/
│   └── marketplace.json      # Equivalent Claude marketplace registry
├── plugins/                  # Plugin packages (skills + MCP servers)
│   ├── workiq/
│   ├── microsoft-365-agents-toolkit/
│   └── workiq-productivity/
├── tests/
│   └── workiq-guidance/      # Offline stable guidance and trace-contract checks
├── ADMIN-INSTRUCTIONS.md     # Tenant admin consent guide
├── CONTRIBUTING.md           # Guide for adding new plugins
├── PLUGINS.md                # Plugin catalog — skills, agents, and commands
└── AGENTS.md                 # This file
```

## Installing Plugins

This repo is a [Copilot CLI plugin marketplace](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-marketplace). Install plugins using the marketplace workflow below.

### Quick install (copy-paste ready)

```bash
copilot plugin install ./plugins/workiq
copilot plugin install ./plugins/microsoft-365-agents-toolkit
copilot plugin install ./plugins/workiq-productivity
```

> **Important:** After installing, restart your Copilot CLI session for new skills to become available.

### Check what's installed

```bash
copilot plugin list
```

### Removing a plugin

```bash
copilot plugin uninstall workiq
copilot plugin uninstall microsoft-365-agents-toolkit
copilot plugin uninstall workiq-productivity
```

## Plugins

Plugins live in `plugins/<plugin-name>/` and follow this structure:

```
plugins/<plugin-name>/
├── .mcp.json              # MCP server config (if plugin has an MCP server)
├── README.md              # Plugin documentation
└── skills/                # Skill definitions
    └── <skill-name>/
        ├── SKILL.md       # Skill definition with YAML frontmatter
        └── references/    # Supporting docs (optional)
```

### Available plugins

- **workiq** — Stable 3.0.0, agent-host-neutral Microsoft 365 guidance (read + write). Bundles:
  - `workiq` skill — Source-based `retrieve` and local synthesis, `ask` only for requested Copilot/named-agent answers, and entity tools for exact reads and operations.
  - Hosted MCP server (`workiq`): discover exact names and schemas in the host catalog. Installing the plugin does not enable tenant-dependent retrieval; missing retrieval never silently falls back to `ask`.
  - Progressive loading: read the domain index, owning leaf and its `Required before use` dependencies before the call. Load mutation safeguards before writes, recovery before repair/replay, and result-status safeguards before final claims.
  - File objects and transfer client actions route to `references/workiq-files-cli.md`; Graph drive-content/mail-attachment bytes remain on `fetch_blob`. CLI installation and EULA acceptance are separate, with explicit permission for acceptance.
  - Agent/plugin lifecycle requests route to `references/wiqd.md` and the external, experimental WIQD plugin. Installation requires approval and a restart; WIQD is not bundled.
  - Offline checks: `npm ci --prefix tests/workiq-guidance --ignore-scripts --no-audit --no-fund`, then `npm --prefix tests/workiq-guidance test` and `node --test plugins/workiq/tests/guidance.test.mjs` (Node 22+). No model or live M365 operations.
  - Observed trace validation requires nonblank package-hash provenance; authoritative state claims are compared by property presence, including falsey values.
  - OpenAI directory submission manifests and assets live in `plugins/workiq/openai-submission/`; submission READMEs, packaging scripts and archive regression tests are not included. The submission owner reports a video exemption, so `demo_recording_url` is omitted; live checks remain separate. Included neutral monogram PNGs are draft assets, not approved branding. Preserve portable root `plugin.json` and `mcp.json` so the importer can read the OAuth client, include exactly one WorkIQ server, and reuse the unchanged skill without changing existing Copilot configuration. Upload through With MCP.
  - OpenAI listing names and descriptions use neutral WorkIQ/Microsoft 365 wording; check that those fields do not reference AI assistant/model brands before submission. Preserve factual backend prerequisites and tool documentation outside listing copy rather than hiding service dependencies. Listing theme colors are configured with `brandColor` and `brandColorDark` under `extensions.com.openai.interface` in the submission manifest.
  - OpenAI submission OAuth declares `extensions.com.openai.auth.defaultScopes` using the fully qualified WorkIQ scope advertised in the hosted server's protected-resource metadata and a provided-client ID; verify both survive in packaged root `mcp.json`. OpenAI does not accept `clientSecret` in the manifest; enter real secrets only in connection setup/the submission portal.
  - OpenAI review scenarios follow the unchanged shared skill: ordinary document summaries use `retrieve` with grounding and optional `fetch` metadata verification; exact-subject email summaries use `fetch`, never implicit `ask` delegation. Report unavailable retrieval or missing ownership evidence without inventing an owner.
  - Claude submission assets use the existing Claude manifest and `plugins/workiq/claude-package/icon.png`; no Claude submission README is included. Reuse unchanged skills and use a URL-only HTTP MCP configuration without Copilot OAuth fields. Keep generated submission ZIPs in the Git-ignored `artifacts` directory; root `workiq-*.zip` outputs are also ignored to prevent accidental commits. Live Claude OAuth and tool behavior require separate verification.

  - The Claude manifest (`plugins/workiq/.claude-plugin/plugin.json`) uses `workiq` as its machine identifier and `Work IQ` as its display name, and references the transparent `claude-package/icon.png` at the same path in the Claude ZIP. Listing URLs are configured in the manifest; configure classification in the submission portal, not the manifest.

The public preview package is retired. Do not recreate it or register it.
Existing installations must follow [migration instructions](README.md#migrating-from-workiq-preview)
and restart; removing registry entries alone does not unload installed skills.

- **microsoft-365-agents-toolkit** — Toolkit for building M365 Copilot declarative agents. Bundles:
  - `install-atk` skill — Install or update the M365 Agents Toolkit CLI and VS Code extension
  - `declarative-agent-developer` skill — Entry point that delegates complete Declarative Agent requests to the separately installed WIQD plugin's `wiqd` skill
  - `teams-app-developer` skill — Build, test, and deploy code-based Teams apps: bots, CEA, tabs, message extensions, Agents Playground, Azure provision/deploy, and Slack-to-Teams migration
  - `ui-widget-developer` skill — Build MCP servers with OpenAI Apps SDK widget rendering for Copilot Chat
  - `m365-agent-evaluator` skill — Generate, run, and analyze evaluation suites for M365 Copilot declarative agents

- **workiq-productivity** — Read-only WorkIQ productivity insights. Bundles:
  - `action-item-extractor` skill — Extract action items with owners, deadlines, and priorities
  - `daily-outlook-triage` skill — Quick summary of inbox and calendar for the day
  - `email-analytics` skill — Analyze email patterns (volume, senders, response times)
  - `meeting-cost-calculator` skill — Calculate time and cost spent in meetings
  - `org-chart` skill — Visual ASCII org chart for any person
  - `multi-plan-search` skill — Search tasks across all Planner plans
  - `planner-status-report` skill — Generate a status report for one Planner plan
  - `site-explorer` skill — Browse SharePoint sites, lists, and libraries
  - `channel-audit` skill — Audit channels for inactivity and cleanup
  - `channel-digest` skill — Summarize activity across multiple channels

## Prerequisites

- **Hosted workiq** — No local Node.js runtime required.
- **Local CLI/productivity skills** — Node.js 18+; optional WorkIQ Files CLI transfers require Node.js 20+ and a separate installation.
- **Admin consent** — The WorkIQ MCP server requires tenant admin consent on first use. See the [Tenant Administrator Enablement Guide](./ADMIN-INSTRUCTIONS.md) for details.

## Creating a New Plugin

```bash
mkdir -p plugins/my-plugin/skills/my-skill/references
```

Create the required files:

**`README.md`** — Plugin documentation with installation instructions, skill table, and usage examples.

**`skills/<name>/SKILL.md`** — Skill definition with YAML frontmatter.
**The `description` field must not exceed 1024 characters** — the Copilot CLI runtime silently drops skills that exceed this limit.
```yaml
---
name: my-skill
description: >
  What this skill does.
  Triggers: "trigger phrase 1", "trigger phrase 2"
---

# My Skill

Skill instructions here...
```

**`.mcp.json`** (optional) — MCP server configuration if your plugin exposes tools:
```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "@my-org/my-package", "mcp"],
      "tools": ["*"]
    }
  }
}
```

After creating a plugin:
1. Register it consistently in `marketplace.json` and `.claude-plugin/marketplace.json`
2. Install it with `copilot plugin install ./plugins/my-plugin`

---

## Self-Maintenance Instructions

Follow [CONTRIBUTING.md](CONTRIBUTING.md) for WorkIQ source ownership,
MAJOR.MINOR.PATCH versioning and internal preview-to-stable promotion.
Publish only the stable snapshot after its internal promotion merges. An earlier
publication PR must stay draft until the merge and source recheck. Keep public
marketplace identity `work-iq`; preserve unrelated plugin entries and workflows.
Never copy internal registries or preview into this repository.

> **Important:** When making changes to this repository — adding new plugins or modifying workflows — update this AGENTS.md file to reflect those changes. This file serves as the primary context document for AI agents working in this repo. Keep it accurate and current. Specifically:
>
> - Add new plugins to the "Available plugins" section when they are created
> - Register new plugins consistently in both public marketplace registries
> - Update "Getting Started" if new setup steps are required
> - Update "Repository Structure" if top-level directories change
> - Validate edits offline first. Do not install plugins or access live Microsoft 365 data without authorization. For separately approved runtime validation, reload the affected plugin and restart so the session picks up its content:
>   ```bash
>   copilot plugin uninstall <plugin-name>
>   copilot plugin install ./plugins/<plugin-name>
>   ```
