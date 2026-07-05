# 🔌 Work IQ — Plugin Catalog

> Browse, install, and discover skills from the Work IQ plugin marketplace for GitHub Copilot CLI.

This page is the central reference for every plugin published in the **Work IQ** marketplace. Each plugin bundles one or more **skills** (AI-guided workflows) and may include an **MCP server** that exposes tools to your Copilot session.

---

## 📋 Prerequisites

| Requirement | Details |
|-------------|---------|
| **GitHub Copilot CLI** | [Getting started guide](https://docs.github.com/en/copilot/how-tos/copilot-cli) |
| **Node.js 18+** | [Download from nodejs.org](https://nodejs.org/) — includes NPM and NPX |
| **Admin consent** | The WorkIQ MCP server requires tenant admin consent on first use. See the [Tenant Administrator Enablement Guide](./ADMIN-INSTRUCTIONS.md). |

---

## 🏪 Installing the Marketplace

Before installing any plugin you need to register the **work-iq** marketplace in your Copilot CLI session (one-time setup):

```bash
# Open GitHub Copilot CLI
copilot

# Add the marketplace
/plugin marketplace add microsoft/work-iq
```

### Check registered marketplaces

```bash
/plugin marketplace list
```

### Remove the marketplace

```bash
/plugin marketplace remove work-iq
```

---

## 🚀 Installing Plugins

Once the marketplace is registered, install any plugin with a single command:

```bash
# Install a single plugin
/plugin install workiq@work-iq
/plugin install workiq-preview@work-iq
/plugin install microsoft-365-agents-toolkit@work-iq
/plugin install workiq-productivity@work-iq
```

> **Tip:** Restart your Copilot CLI session after installing a plugin for the new skills to become available.

### Check installed plugins

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

---

## 📦 Plugin Directory

| # | Plugin | Skills | Description |
|---|--------|--------|-------------|
| 1 | [**workiq**](#workiq) | 1 | Full WorkIQ tool surface — agentic queries plus direct M365 reads and writes |
| 2 | [**workiq-preview**](#workiq-preview) | 1 | Preview build with the full entity tool surface (read + write) |
| 3 | [**microsoft-365-agents-toolkit**](#microsoft-365-agents-toolkit) | 4 | Toolkit for building M365 Copilot declarative agents |
| 4 | [**workiq-productivity**](#workiq-productivity) | 9 | Read-only productivity insights across M365 |

---

## workiq

> Full WorkIQ tool surface for GitHub Copilot CLI: agentic semantic queries via `ask` **plus** direct, structured reads and writes against Microsoft 365 — emails, meetings, calendar, documents, Teams messages, OneDrive/SharePoint files, and people.

**Install:** `/plugin install workiq@work-iq`
**Source:** [`plugins/workiq/`](./plugins/workiq/)

### MCP Servers

| Server | Tools |
|--------|-------|
| `workiq` (hosted) | `ask_work_iq`, `fetch_work_iq`, `fetch_blob_work_iq`, `get_schema_work_iq`, `search_paths_work_iq`, `create_entity_work_iq`, `update_entity_work_iq`, `delete_entity_work_iq`, `do_action_work_iq`, `call_function_work_iq`, `upload_blob_work_iq`, `accept_eula`, `get_debug_link` |

### Skills

| Skill | Description |
|-------|-------------|
| [**workiq**](./plugins/workiq/skills/workiq/SKILL.md) | Guides usage of the full WorkIQ tool surface — `ask` for semantic questions plus entity tools for fast, structured M365 reads and writes |

### Example prompts

```
"What did John say about the proposal?"
"List my unread emails from Sarah this week"
"Create a calendar event Friday at 3pm with the design team"
"Accept the 2pm meeting from Rob"
"Send the draft email to the engineering distribution list"
"Show me the channels in the DevX team"
```

---

## workiq-preview

> **Preview build.** Same natural-language access as `workiq`, plus a broader set of entity tools for direct, structured M365 reads and writes — fetch, create, update, delete, do-action, call-function, schema discovery, and blob upload/download.

**Install:** `/plugin install workiq-preview@work-iq`
**Source:** [`plugins/workiq-preview/`](./plugins/workiq-preview/)

### MCP Servers

| Server | Tools |
|--------|-------|
| `@microsoft/workiq@preview` | `ask_work_iq`, `fetch_work_iq`, `fetch_blob_work_iq`, `get_schema_work_iq`, `search_paths_work_iq`, `create_entity_work_iq`, `update_entity_work_iq`, `delete_entity_work_iq`, `do_action_work_iq`, `call_function_work_iq`, `upload_blob_work_iq`, `accept_eula`, `get_debug_link` |

### Skills

| Skill | Description |
|-------|-------------|
| [**workiq-preview**](./plugins/workiq-preview/skills/workiq-preview/SKILL.md) | Guides usage of the full WorkIQ tool surface — `ask_work_iq` for semantic questions plus entity tools for fast, structured reads and writes |

### Example prompts

```
"What did John say about the proposal?"
"List my unread emails from Sarah this week"
"Create a calendar event Friday at 3pm with the design team"
"Accept the 2pm meeting from Rob"
"Send the draft email to the engineering distribution list"
"Download the latest PowerPoint from my OneDrive 'Specs' folder"
```

---

## microsoft-365-agents-toolkit

> Toolkit for building and evaluating Microsoft 365 Copilot declarative agents — scaffolding, JSON manifest authoring, capability configuration, deployment, and eval workflows.

**Install:** `/plugin install microsoft-365-agents-toolkit@work-iq`
**Source:** [`plugins/microsoft-365-agents-toolkit/`](./plugins/microsoft-365-agents-toolkit/)

### Skills

| Skill | Description |
|-------|-------------|
| [**install-atk**](./plugins/microsoft-365-agents-toolkit/skills/install-atk/SKILL.md) | Install or update the M365 Agents Toolkit CLI and VS Code extension |
| [**declarative-agent-developer**](./plugins/microsoft-365-agents-toolkit/skills/declarative-agent-developer/SKILL.md) | Scaffolding, JSON manifest authoring, capability configuration, deployment |
| [**ui-widget-developer**](./plugins/microsoft-365-agents-toolkit/skills/ui-widget-developer/SKILL.md) | Build MCP servers with OpenAI Apps SDK widget rendering for Copilot Chat |
| [**m365-agent-evaluator**](./plugins/microsoft-365-agents-toolkit/skills/m365-agent-evaluator/SKILL.md) | Generate, run, and analyze evaluation suites for M365 Copilot declarative agents |

### Example prompts

```
"Scaffold a new declarative agent for HR FAQ"
"Add web search to my agent"
"Deploy my agent with ATK"
"Create eval prompts for my agent"
"Run my evals and explain the failures"
"Improve my agent instructions based on the latest eval results"
```

---

## workiq-productivity

> **9 read-only skills** — email, meetings, Teams, SharePoint, projects, and people.

**Install:** `/plugin install workiq-productivity@work-iq`
**Source:** [`plugins/workiq-productivity/`](./plugins/workiq-productivity/)

### Skills

| Skill | Description |
|-------|-------------|
| [**action-item-extractor**](./plugins/workiq-productivity/skills/action-item-extractor/SKILL.md) | Extract action items with owners, deadlines, and priorities |
| [**daily-outlook-triage**](./plugins/workiq-productivity/skills/daily-outlook-triage/SKILL.md) | Quick summary of inbox and calendar for the day |
| [**email-analytics**](./plugins/workiq-productivity/skills/email-analytics/SKILL.md) | Analyze email patterns — volume, senders, response times |
| [**meeting-cost-calculator**](./plugins/workiq-productivity/skills/meeting-cost-calculator/SKILL.md) | Calculate time and cost spent in meetings |
| [**org-chart**](./plugins/workiq-productivity/skills/org-chart/SKILL.md) | Visual ASCII org chart for any person |
| [**multi-plan-search**](./plugins/workiq-productivity/skills/multi-plan-search/SKILL.md) | Search tasks across all Planner plans |
| [**site-explorer**](./plugins/workiq-productivity/skills/site-explorer/SKILL.md) | Browse SharePoint sites, lists, and libraries |
| [**channel-audit**](./plugins/workiq-productivity/skills/channel-audit/SKILL.md) | Audit channels for inactivity and cleanup |
| [**channel-digest**](./plugins/workiq-productivity/skills/channel-digest/SKILL.md) | Summarize activity across multiple channels |

### Example prompts

```
"Extract action items from today's meetings"
"Show me my inbox and calendar for today"
"Analyze my email patterns for the past month"
"How much time did I spend in meetings this week?"
"Show the org chart for Sarah Johnson"
"Search all my Planner tasks for 'budget review'"
"Browse the Marketing SharePoint site"
"Audit inactive channels in the Engineering team"
"Summarize activity across my Teams channels"
```

---

## 🤝 Contributing a Plugin

Want to add your own plugin? See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide. The short version:

1. Create your plugin under `plugins/{your-plugin}/`
2. Add `.mcp.json`, `README.md`, and `skills/{name}/SKILL.md`
3. Register it in [`.github/plugin/marketplace.json`](./.github/plugin/marketplace.json)
4. Update this file (`PLUGINS.md`) with your plugin entry
5. Submit a pull request
