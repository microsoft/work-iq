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
│   ├── microsoft-365-agents-toolkit/
│   └── workiq-productivity/
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

- **workiq** — Query Microsoft 365 data with natural language. Bundles:
  - `workiq` skill — Guides usage of the `ask_work_iq` MCP tool for emails, meetings, documents, Teams messages, and people
  - MCP server (`@microsoft/workiq`) with tools: `ask_work_iq`, `accept_eula`, `get_debug_link`

- **microsoft-365-agents-toolkit** — Toolkit for building M365 Copilot declarative agents. Bundles:
  - `install-atk` skill — Install or update the M365 Agents Toolkit CLI and VS Code extension
  - `declarative-agent-developer` skill — Scaffolding, JSON manifest authoring, capability configuration, deployment
  - `ui-widget-developer` skill — Build MCP servers with OpenAI Apps SDK widget rendering for Copilot Chat

- **workiq-productivity** — Read-only WorkIQ productivity insights. Bundles:
  - `action-item-extractor` skill — Extract action items with owners, deadlines, and priorities
  - `daily-outlook-triage` skill — Quick summary of inbox and calendar for the day
  - `email-analytics` skill — Analyze email patterns (volume, senders, response times)
  - `meeting-cost-calculator` skill — Calculate time and cost spent in meetings
  - `org-chart` skill — Visual ASCII org chart for any person
  - `multi-plan-search` skill — Search tasks across all Planner plans
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
