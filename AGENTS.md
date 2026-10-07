# Work IQ

Work IQ is a **Copilot CLI plugin marketplace** for managing AI agent plugins for GitHub Copilot CLI. It provides MCP servers, skills, and tools that connect AI assistants to Microsoft 365 data.

## Repository Structure

```
work-iq/
├── .github/
│   └── plugin/
│       └── marketplace.json  # Plugin marketplace registry
├── plugins/                  # Plugin packages (skills + MCP servers)
│   ├── workiq/
│   ├── workiq-preview/
│   ├── microsoft-365-agents-toolkit/
│   └── workiq-productivity/
├── tests/workiq-guidance/     # Both-package static checks and preview trace contracts
├── server.json               # MCP server manifest
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
copilot plugin install ./plugins/workiq-preview
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
copilot plugin uninstall workiq-preview
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

- **workiq** — Full WorkIQ tool surface for Microsoft 365 (read + write). Bundles:
  - `workiq` skill — Ask-first semantic synthesis/discovery when used without preview; entity tools for exact M365 and Business Applications reads/writes. When both plugins are installed, load `workiq-preview` and follow its guidance for overlapping requests. Exposed `retrieve` alone does not change the standalone public default.
  - Hosted MCP server (`workiq`): resolve exact tool names and schemas from its connected catalog, not guessed prefixes. Current `search_paths.query` is a string; legacy `filter` applies only when advertised.
  - Compact entry dispatches to mail, Teams, calendar, files, SharePoint and workflow references. Exact-source verification, read/write intent, complete paging versus budgets, diagnostic-driven recovery and denial stops apply to both packages. Public and preview versions are independent.
  - Both package-local routers select bounded operation leaves. Markdown `Routes` tables and `Required before use` lists define the static loading graph; mutation guidance loads before writes and recovery before retry/reconciliation. Do not load all references or treat a summary as available verbatim guidance.
  - SharePoint library-metadata requests dispatch to `references/sharepoint-library-metadata.md`; read it before the workflow. Detailed procedures and safeguards live there rather than being duplicated in `SKILL.md`.

- **workiq-preview** — Preview build with agent-host-neutral, retrieve-first guidance (read + write). Bundles:
  - Takes precedence over public `workiq` when both plugins are installed, including their routing and configured tools for overlapping requests. Missing preview retrieval does not authorize public ask-first fallback; skill guidance does not claim host-enforced activation.
  - `workiq-preview` skill — Retrieve caller-owned context with explicit Grounding when available; use `ask` only for intentional delegation, and entity tools for exact reads, writes, and downloads. Load the skill before using WorkIQ tools.
  - Hosted MCP server (`workiq-preview`): discover exact tool names and schemas in the connected host catalog. Preview retrieval is tenant-dependent; installation does not enable it, and missing `retrieve` never silently falls back to `ask`.
  - Offline checks: `npm ci --prefix tests/workiq-guidance --ignore-scripts --no-audit --no-fund` then `npm --prefix tests/workiq-guidance test` (Node 22+). Static alignment checks cover both packages; observed-trace provenance stays preview-only. CI runs no models or live M365 operations. Current `retrieve.query` is a single nonblank string, not an array.
  - Teams parity includes exact directory/topic/member identity, marker/supplied URL reads, supported paging, hide/read state, literal reactions, edits/replies and preferred presence. Creating/reusing a oneOnOne chat is a confirmed mutation, never a read-only lookup.
  - Observed trace validation requires nonblank package-hash provenance, including direct validator calls; authoritative state claims are compared by property presence, including falsey values.
  - Trace claim checks retain records from capped reads without treating them as complete coverage; calendar, mail-thread, marker and exact-source regressions also verify failed-read records remain excluded.
  - `npm --prefix tests/workiq-guidance run context` reports Markdown-derived unique full-file byte costs. Loading checks cover both packages; observed traces remain preview-only. Entry budgets include metadata and retain universal URL/ID/safety gates. First-call retrieval retains stop/broadening limits; any same-objective follow-up loads the repair contract, even after successful gaps/caps. These checks do not prove host/model lazy loading.

- **microsoft-365-agents-toolkit** — Toolkit for building M365 Copilot declarative agents. Bundles:
  - `install-atk` skill — Install or update the M365 Agents Toolkit CLI and VS Code extension
  - `declarative-agent-developer` skill — DA schema and capability guidance, with project lifecycle operations executed through the wiqd CLI
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

- **Node.js 18+** — Required for the workiq MCP server (`npx`)
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
1. Register it in `.github/plugin/marketplace.json` by adding an entry to the `plugins` array
2. Install it with `copilot plugin install ./plugins/my-plugin`

---

## Self-Maintenance Instructions

> **Important:** When making changes to this repository — adding new plugins or modifying workflows — update this AGENTS.md file to reflect those changes. This file serves as the primary context document for AI agents working in this repo. Keep it accurate and current. Specifically:
>
> - Add new plugins to the "Available plugins" section when they are created
> - Register new plugins in `.github/plugin/marketplace.json`
> - Update "Getting Started" if new setup steps are required
> - Update "Repository Structure" if top-level directories change
> - **After editing any skill or plugin content**, reinstall the affected plugin so the running session picks up the changes:
>   ```bash
>   copilot plugin uninstall <plugin-name>
>   copilot plugin install ./plugins/<plugin-name>
>   ```
