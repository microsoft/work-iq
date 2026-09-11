# Work IQ

Work IQ is an **agent-host-neutral plugin collection**. Its MCP servers, skills,
and tools connect compatible AI agents to Microsoft 365 data; it is not specific
to GitHub Copilot CLI. This repository includes plugin metadata for GitHub Copilot,
Claude, and Codex. Shared routing and safety policy applies in every host; packaging,
authentication, tool discovery, and skill loading follow each host's capabilities.

## Repository Structure

```
work-iq/
├── .github/workflows/       # Automation and guidance contract checks
├── marketplace.json        # Copilot plugin marketplace registry
├── .claude-plugin/marketplace.json # Mirrored Claude marketplace registry
├── plugins/                  # Plugin packages (skills + MCP servers)
│   ├── workiq/
│   ├── workiq-preview/
│   ├── microsoft-365-agents-toolkit/
│   └── workiq-productivity/
├── tests/workiq-guidance/    # Synthetic contracts, documentation checks, trace oracle
├── server.json               # MCP server manifest
├── ADMIN-INSTRUCTIONS.md     # Tenant admin consent guide
├── CONTRIBUTING.md           # Guide for adding new plugins
├── PLUGINS.md                # Plugin catalog — skills, agents, and commands
└── AGENTS.md                 # This file
```

## Installing Plugins

Use the selected agent host's plugin installer and reload mechanism. Each package
contains `.github/plugin/plugin.json`, `.claude-plugin/plugin.json`, and
`.codex-plugin/plugin.json`; root marketplace manifests serve the corresponding
hosts. These are distribution adapters, not different Work IQ policies.
See [installation by host](PLUGINS.md#installation-by-host).

### GitHub Copilot CLI example

The following commands are specific to
[Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-marketplace),
not prerequisites for other agents:

```bash
copilot plugin install ./plugins/workiq
copilot plugin install ./plugins/workiq-preview
copilot plugin install ./plugins/microsoft-365-agents-toolkit
copilot plugin install ./plugins/workiq-productivity
```

> **Important:** Reload skills or restart the selected host after installation.
> An MCP-only connection does not automatically load the bundled skill policy.

### Check what's installed in Copilot CLI

```bash
copilot plugin list
```

### Removing a plugin in Copilot CLI

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
  - `workiq` skill — Retrieve-first caller-owned context with explicit Grounding when available; intentional Copilot/known-agent delegation with `ask`; exact M365/Business Applications reads, writes, library metadata, and downloads on entity tools
  - Hosted MCP server (`workiq`); logical tool names include `ask`, `list_agents`, `fetch`, `fetch_blob`, `get_schema`, `search_paths`, `create_entity`, `update_entity`, `delete_entity`, `do_action`, `call_function`, and tenant-dependent preview `retrieve`. Resolve exact names and schemas from the host's connected catalog.

- **workiq-preview** — Preview build with the full WorkIQ tool surface (read + write). Bundles:
  - `workiq-preview` skill — Same retrieve/ask/entity routing, with its own bundled `references/retrieve-work-iq.md`
  - Hosted MCP server (`workiq-preview`); discover its actual tool catalog. Installing this plugin does not enable server-side preview tools for a tenant.

For both skills, explicitly send `strategy: "grounding"` for ordinary caller-owned
context, including unspecified or unknown locations. The API's omitted-parameter
default remains `copilot`; this skill intentionally chooses a different default.
Use Copilot retrieval directly for required broader sources or `Dataverse`/
`GraphConnectors`; preserve source restrictions. `ask` requires intentional
delegation, with exact IDs from `list_agents` when a named agent is unresolved.
No automatic retrieval-to-ask fallback, no broader retry for an empty result or
cap alone, and at most one justified targeted broader escalation per objective.

Keep shared routing and safety aligned across both packages. Public-only
SharePoint/library-metadata and Business Applications references and dispatch links
are intentional exceptions, not permission for shared-policy drift. Each workflow
has one canonical owner: `files-work-iq.md`, `calendar-work-iq.md`, `mail-work-iq.md`,
`teams-work-iq.md`, or `tasks-work-iq.md`; `agents-work-iq.md` owns agent discovery.
`workflows-work-iq.md` is the index, setup, people, and cross-domain guide.
`troubleshooting.md` owns operation-aware recovery. Read only the relevant contract.
`workiq` and `workiq-preview` may version independently. For each package, use
its own entry in root `marketplace.json` as the version reference and synchronize
its mirrored marketplace entry and GitHub/Claude/Codex manifests. Matching
versions for a particular release do not establish a permanent lockstep policy.
The guidance gate checks consistency within each package, not between packages.
Plugin descriptions must lead with discoverable workloads and actions, not only
retrieval policy. Keep email, calendar/meetings, Teams, SharePoint/OneDrive files,
people/contacts, Planner, and supported operations explicit; retain public-only
Business Applications coverage. Hosts may use plugin metadata, skill frontmatter,
or tool descriptions differently, so none of these layers replaces the others.

Confirmation and denial stops override happy-path call budgets. Classify effects
by operation, not tool name: `do_action` can be read-only. Never replay ambiguous
mutations; report accepted/pending or unknown outcomes honestly. Preserve mainline
library-column source truth, completeness, Business Applications paths, and privilege
boundaries. Ordinary calendar windows use `fetch`; explicit delta uses `call_function`
and needs a checkpoint for historical change claims. Persisted reply drafts use
`do_action` without sending; exchanged-mail reconstruction excludes unsent drafts.

- **microsoft-365-agents-toolkit** — Toolkit for building M365 Copilot declarative agents. Bundles:
  - `install-atk` skill — Install or update the M365 Agents Toolkit CLI and VS Code extension
  - `declarative-agent-developer` skill — Scaffolding, JSON manifest authoring, capability configuration, deployment
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

## Guidance validation

The shared synthetic contract and regression suite live in
[`tests/workiq-guidance/`](tests/workiq-guidance/README.md). With Node 22+, run:

```bash
npm ci --prefix tests/workiq-guidance --ignore-scripts --no-audit --no-fund
npm --prefix tests/workiq-guidance test
```

The path-filtered `workiq-guidance.yml` CI workflow runs documentation checks and
trace-oracle tests separately. Parsed skill descriptions must stay within 1,024
characters; local links, retrieval examples, and shared-package policy are checked.
Static checks and synthetic oracle inputs are not observed agent behavior. Host/mock
traces, captured endpoint schemas/responses, and matched live coverage evaluation
remain separate evidence gates; do not claim gains or launch large live evaluations
from an offline pass. Keep private evidence out of public fixtures.
Record the host and adapter version for every behavioral/loading result. A Copilot
CLI loading check is evidence for that host only, not validation of Claude, Codex,
or another agent. Use the same logical contracts with each host's actual catalog.

## Prerequisites

- **Compatible agent host** — Skill/plugin loading and the selected MCP connection/authentication mechanism.
- **Node.js 18+** — Required only for the local WorkIQ CLI/stdio server (`npx`), not hosted MCP calls; guidance tests use Node 22+.
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
1. Register it in `marketplace.json` and mirror the entry in `.claude-plugin/marketplace.json`
2. Install it with the selected host's plugin installer; for Copilot CLI, `copilot plugin install ./plugins/my-plugin`

---

## Self-Maintenance Instructions

> **Important:** When making changes to this repository — adding new plugins or modifying workflows — update this AGENTS.md file to reflect those changes. This file serves as the primary context document for AI agents working in this repo. Keep it accurate and current. Specifically:
>
> - Add new plugins to the "Available plugins" section when they are created
> - Register new plugins in `marketplace.json` and `.claude-plugin/marketplace.json`; keep host plugin descriptions aligned
> - Update "Getting Started" if new setup steps are required
> - Update "Repository Structure" if top-level directories change
> - **After editing any skill or plugin content**, reinstall/reload the affected plugin using the selected host's supported mechanism. Confirm the new skill/reference content is loaded in a fresh session. For Copilot CLI:
>   ```bash
>   copilot plugin uninstall <plugin-name>
>   copilot plugin install ./plugins/<plugin-name>
>   ```
