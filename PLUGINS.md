# 🔌 Work IQ — Plugin Catalog

> Browse, install, and discover skills from the Work IQ plugin marketplace for GitHub Copilot CLI.

This page is the central reference for every plugin published in the **Work IQ** marketplace. Each plugin bundles one or more **skills** (AI-guided workflows) and may include an **MCP server** that exposes tools to your Copilot session.

---

## 📋 Prerequisites

| Requirement | Details |
|-------------|---------|
| **GitHub Copilot CLI** | [Getting started guide](https://docs.github.com/en/copilot/how-tos/copilot-cli) |
| **Local runtime, when needed** | Hosted `workiq` needs no Node.js. The separate WorkIQ CLI/productivity skills need Node.js 18+; optional WorkIQ Files CLI transfers need Node.js 20+. |
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
| 1 | [**workiq**](#workiq) | 1 | Stable 3.0.0: source-based retrieval, local synthesis, explicit delegation and exact M365 operations |
| 2 | [**microsoft-365-agents-toolkit**](#microsoft-365-agents-toolkit) | 4 | Toolkit for building M365 Copilot declarative agents |
| 3 | [**workiq-productivity**](#workiq-productivity) | 10 | Read-only productivity insights across M365 |

The public preview package is retired. Existing users should follow
[migration from workiq-preview](README.md#migrating-from-workiq-preview)
before loading stable.

---

## workiq

> Stable **3.0.0** provides agent-host-neutral, source-based `retrieve` guidance
> with local synthesis. Use `ask` only for requested Copilot/named-agent answers;
> use entity tools for exact Microsoft 365 reads, writes and downloads.

**Install:** `/plugin install workiq@work-iq`
**Source:** [`plugins/workiq/`](./plugins/workiq/)

### MCP Servers

| Server | Tools |
|--------|-------|
| `workiq` (hosted) | Discover exact names and schemas in the connected host catalog. Logical operations include available `retrieve`, `ask`, `list_agents`, entity tools, actions, functions and downloads. |

### Skills

| Skill | Description |
|-------|-------------|
| [**workiq**](./plugins/workiq/skills/workiq/SKILL.md) | Load before tool use: progressive guidance, source-based retrieval and local synthesis, intentional delegation, exact operations and mutation safeguards |

Use the chosen host's supported plugin/skill loader and MCP connector. Copilot,
Claude and Codex manifests are bundled. MCP connection alone does not load skill
instructions, and plugin installation does not enable tenant-gated retrieval.
Missing required retrieval must be disclosed, never silently replaced by `ask`.
See the [plugin guide](plugins/workiq/README.md) for Files CLI transfers, WIQD
handoff, safety contracts and update instructions.

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

## microsoft-365-agents-toolkit

> Toolkit for building and evaluating Microsoft 365 Copilot declarative agents — scaffolding, JSON manifest authoring, capability configuration, deployment, and eval workflows.

**Install:** `/plugin install microsoft-365-agents-toolkit@work-iq`
**Source:** [`plugins/microsoft-365-agents-toolkit/`](./plugins/microsoft-365-agents-toolkit/)

### Skills

| Skill | Description |
|-------|-------------|
| [**install-atk**](./plugins/microsoft-365-agents-toolkit/skills/install-atk/SKILL.md) | Install or update the M365 Agents Toolkit CLI and VS Code extension |
| [**declarative-agent-developer**](./plugins/microsoft-365-agents-toolkit/skills/declarative-agent-developer/SKILL.md) | Entry point that delegates Declarative Agent requests to the WIQD plugin |
| [**ui-widget-developer**](./plugins/microsoft-365-agents-toolkit/skills/ui-widget-developer/SKILL.md) | Build MCP servers with OpenAI Apps SDK widget rendering for Copilot Chat |
| [**m365-agent-evaluator**](./plugins/microsoft-365-agents-toolkit/skills/m365-agent-evaluator/SKILL.md) | Generate, run, and analyze evaluation suites for M365 Copilot declarative agents |

### Example prompts

```
"Scaffold a new declarative agent for HR FAQ"
"Add web search to my agent"
"Deploy my declarative agent"
"Create eval prompts for my agent"
"Run my evals and explain the failures"
"Improve my agent instructions based on the latest eval results"
```

---

## workiq-productivity

> **10 read-only skills** — email, meetings, Teams, SharePoint, projects, and people.

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
| [**planner-status-report**](./plugins/workiq-productivity/skills/planner-status-report/SKILL.md) | Generate a status report for one Planner plan |
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
"Generate a status report for the Contoso launch plan"
"Browse the Marketing SharePoint site"
"Audit inactive channels in the Engineering team"
"Summarize activity across my Teams channels"
```

---

## 🤝 Contributing a Plugin

Want to add your own plugin? See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide. The short version:

1. Create your plugin under `plugins/{your-plugin}/`
2. Add `.mcp.json`, `README.md`, and `skills/{name}/SKILL.md`
3. Register it consistently in [`marketplace.json`](./marketplace.json) and [`.claude-plugin/marketplace.json`](./.claude-plugin/marketplace.json)
4. Update this file (`PLUGINS.md`) with your plugin entry
5. Submit a pull request
