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
copilot plugin uninstall microsoft-365-agents-toolkit
copilot plugin uninstall workiq-productivity
```

---

## 📦 Plugin Directory

| # | Plugin | Skills | Description |
|---|--------|--------|-------------|
| 1 | [**workiq**](#workiq) | 1 | Query Microsoft 365 data with natural language |
| 2 | [**microsoft-365-agents-toolkit**](#microsoft-365-agents-toolkit) | 3 | Toolkit for building M365 Copilot declarative agents |
| 3 | [**workiq-productivity**](#workiq-productivity) | 9 | Read-only productivity insights across M365 |

---

## workiq

> Query Microsoft 365 data with natural language — emails, meetings, documents, Teams messages, and more.

**Install:** `/plugin install workiq@work-iq`
**Source:** [`plugins/workiq/`](./plugins/workiq/)

### MCP Servers

[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://vscode.dev/redirect/mcp/install?name=workiq&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40microsoft%2Fworkiq%22%2C%22mcp%22%5D%7D)
[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install_Server-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=workiq&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40microsoft%2Fworkiq%22%2C%22mcp%22%5D%7D&quality=insiders)

| Server | Tools |
|--------|-------|
| `@microsoft/workiq` | `ask_work_iq`, `accept_eula`, `get_debug_link` |

### Skills

| Skill | Description |
|-------|-------------|
| [**workiq**](./plugins/workiq/skills/workiq/SKILL.md) | Guides usage of the `ask_work_iq` MCP tool for emails, meetings, documents, Teams messages, and people |

### Example prompts

```
"What did John say about the proposal?"
"What's on my calendar tomorrow?"
"Find my recent PowerPoint presentations"
"Summarize today's messages in the Engineering channel"
"Who is working on Project Alpha?"
```

### CLI commands

| Command | Description |
|---------|-------------|
| `workiq accept-eula` | Accept the End User License Agreement |
| `workiq ask` | Ask a question or enter interactive mode |
| `workiq mcp` | Start MCP stdio server |
| `workiq version` | Show version information |

---

## microsoft-365-agents-toolkit

> Toolkit for building Microsoft 365 Copilot declarative agents — scaffolding, JSON manifest authoring, capability configuration, and deployment.

**Install:** `/plugin install microsoft-365-agents-toolkit@work-iq`
**Source:** [`plugins/microsoft-365-agents-toolkit/`](./plugins/microsoft-365-agents-toolkit/)

### Skills

| Skill | Description |
|-------|-------------|
| [**install-atk**](./plugins/microsoft-365-agents-toolkit/skills/install-atk/SKILL.md) | Install or update the M365 Agents Toolkit CLI and VS Code extension |
| [**declarative-agent-developer**](./plugins/microsoft-365-agents-toolkit/skills/declarative-agent-developer/SKILL.md) | Scaffolding, JSON manifest authoring, capability configuration, deployment |
| [**ui-widget-developer**](./plugins/microsoft-365-agents-toolkit/skills/ui-widget-developer/SKILL.md) | Build MCP servers with OpenAI Apps SDK widget rendering for Copilot Chat |

### Example prompts

```
"Scaffold a new declarative agent for HR FAQ"
"Add web search to my agent"
"Deploy my agent with ATK"
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
