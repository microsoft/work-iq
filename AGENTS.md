# Work IQ

Work IQ is a **Copilot CLI plugin marketplace** for managing AI agent plugins for GitHub Copilot CLI. It provides MCP servers, skills, and tools that connect AI assistants to Microsoft 365 data.

## Repository Structure

```
work-iq/
├── .claude-plugin/
│   └── marketplace.json      # Plugin marketplace registry (Claude discovery path)
├── marketplace.json          # Plugin marketplace registry
├── plugins/                  # Plugin packages (skills + MCP servers)
│   ├── workiq/
│   ├── workiq-preview/
│   └── microsoft-365-agents-toolkit/
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

- **workiq** — Full WorkIQ tool surface for Microsoft 365 (read + write), plus prepackaged workflow skills. Bundles:
  - **Tier 0 — hub.** `workiq` — the tool surface: `retrieve` / `fetch` / `ask` selection, the entity tools, and the canonical reference for shared conventions (Core Truths, scope gating, date anchoring, output format, write confirmation). Routes down the hierarchy via its Related Skills table.
  - **Tier 1 — domain skills**, one per M365 surface, each owning reads *and* writes and routing onward to its own `references/` files:
    - `mail` — find/summarize mail, inbox triage, day summary, counts and themes, folders, categories, flags, read state, drafts, reply, forward, send, delete
    - `calendar` — calendar views, next meeting, attendees, create/schedule events, accept/decline, reschedule, cancel, focus time, find a slot, free/busy, reminders
    - `teams` — unread chats, mentions, attention triage, channel summaries and digests, activity audits, post/reply/react, chats and members, presence
    - `files` — find documents, browse SharePoint sites and libraries, OneDrive, read file content, create folders, copy/move/rename/delete
    - `people` — directory lookups, manager chains, direct reports, ASCII org charts, name disambiguation, contact CRUD, profile and presence
    - `planner` — Planner plans, buckets, task CRUD, assignment, cross-plan search, plan status reports, To Do lists
  - **Tier 2 — cross-domain workflows** for requests spanning several surfaces:
    - `meeting-prep` — pre-meeting brief: the event, attendees and org context, prior threads and documents, open commitments
    - `action-item-extractor` — owners, deadlines, and priorities from meeting or thread content, optionally into tracked tasks
  - **Always-on policy** (not user-invoked):
    - `trust` — binds during any other skill's work when sensitivity-labeled, Confidential, encrypted, or DLP-protected content appears; when instructions are embedded in retrieved content; when another person's mailbox or private files are touched; or on credential-collection, exfiltration, or system-prompt-extraction requests
  - Skills load independently — each restates the conventions that apply to it rather than inheriting them at runtime. The hub is authoritative if a skill and the hub ever disagree.
  - Hosted MCP server (`workiq`) with tools exposed to the host as `workiq-ask`, `workiq-retrieve`, `workiq-fetch`, `workiq-fetch_blob`, `workiq-get_schema`, `workiq-search_paths`, `workiq-create_entity`, `workiq-update_entity`, `workiq-delete_entity`, `workiq-do_action`, `workiq-call_function`, plus `accept_eula` and `get_debug_link`. Tool names are prefixed with the MCP server name — the older `*_work_iq` suffix form is stale.

- **workiq-preview** — Preview build with the full WorkIQ tool surface (read + write). Bundles:
  - `workiq-preview` skill — Guides usage of `ask_work_iq` for semantic questions plus the entity tools for fast, structured M365 reads and writes
  - Hosted MCP server (`workiq-preview`) with tools: `ask_work_iq`, `fetch_work_iq`, `fetch_blob_work_iq`, `get_schema_work_iq`, `search_paths_work_iq`, `create_entity_work_iq`, `update_entity_work_iq`, `delete_entity_work_iq`, `do_action_work_iq`, `call_function_work_iq`, `accept_eula`, `get_debug_link`

- **microsoft-365-agents-toolkit** — Toolkit for building M365 Copilot declarative agents. Bundles:
  - `install-atk` skill — Install or update the M365 Agents Toolkit CLI and VS Code extension
  - `declarative-agent-developer` skill — Scaffolding, JSON manifest authoring, capability configuration, deployment
  - `teams-app-developer` skill — Build, test, and deploy code-based Teams apps: bots, CEA, tabs, message extensions, Agents Playground, Azure provision/deploy, and Slack-to-Teams migration
  - `ui-widget-developer` skill — Build MCP servers with OpenAI Apps SDK widget rendering for Copilot Chat
  - `m365-agent-evaluator` skill — Generate, run, and analyze evaluation suites for M365 Copilot declarative agents

> **Note:** `workiq-productivity` was merged into `workiq` in v3.0.0 and no longer exists as a separate plugin. It never shipped an MCP server of its own — every one of its skills called the `workiq` server's tools, so it could not function unless `workiq` was also installed. All of its skills now live in `plugins/workiq/skills/`.

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
