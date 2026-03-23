# WorkIQ Productivity

> **37 skills** (including setup-tenant) — email, meetings, calendar, Teams, SharePoint, projects, people, and reporting — powered by the local WorkIQ CLI and remote WorkIQ MCP servers.

## What It Does

WorkIQ Productivity connects to your Microsoft 365 environment through the local WorkIQ CLI and remote `WorkIQ-*` MCP servers to provide productivity insights across email, calendar, meetings, Teams, SharePoint, projects, people, and reporting.

## Setup

This plugin requires the local WorkIQ CLI and remote WorkIQ MCP servers.

After installing the plugin from the marketplace, run the **setup-tenant** skill to configure your tenant:

> **"Set up WorkIQ"** — the setup-tenant skill will ask for your Microsoft 365 tenant ID and configure all remote MCP servers automatically.

The local WorkIQ CLI works immediately. The 8 remote MCP servers require a one-time tenant ID configuration via the setup-tenant skill.

> **Note:** Your tenant admin must also grant consent for the WorkIQ app. See [Admin Instructions](../../ADMIN-INSTRUCTIONS.md) for details. A copy of the base configuration is available in `.mcp.template.json` to reset if needed.

## Skills

| Skill | Description |
|-------|-------------|
| [**setup-tenant**](./skills/setup-tenant/SKILL.md) | One-time setup — configure your Microsoft 365 tenant ID |
| [**action-item-extractor**](./skills/action-item-extractor/SKILL.md) | Extract action items with owners, deadlines, priorities |
| [**availability-checker**](./skills/availability-checker/SKILL.md) | Check colleague availability and find free slots |
| [**burndown-report**](./skills/burndown-report/SKILL.md) | Sprint burndown chart from Planner task data |
| [**calendar-optimizer**](./skills/calendar-optimizer/SKILL.md) | Analyze calendar for fragmentation and suggest improvements |
| [**channel-audit**](./skills/channel-audit/SKILL.md) | Audit channels for inactivity and cleanup |
| [**channel-digest**](./skills/channel-digest/SKILL.md) | Summarize activity across multiple channels |
| [**daily-outlook-triage**](./skills/daily-outlook-triage/SKILL.md) | Quick summary of inbox and calendar for the day |
| [**document-finder**](./skills/document-finder/SKILL.md) | Search for documents across SharePoint and OneDrive |
| [**email-analytics**](./skills/email-analytics/SKILL.md) | Analyze email patterns — volume, senders, response times |
| [**eod-wrap-up**](./skills/eod-wrap-up/SKILL.md) | End-of-day summary of accomplishments and open items |
| [**focus-time-blocker**](./skills/focus-time-blocker/SKILL.md) | Find and block focus time on your calendar |
| [**inbox-zero**](./skills/inbox-zero/SKILL.md) | Guided inbox triage — archive, reply, delegate, or defer |
| [**knowledge-base-builder**](./skills/knowledge-base-builder/SKILL.md) | Build a knowledge base from SharePoint content |
| [**mail-to-task**](./skills/mail-to-task/SKILL.md) | Convert emails into Planner tasks |
| [**meeting-cost-calculator**](./skills/meeting-cost-calculator/SKILL.md) | Calculate time and cost spent in meetings |
| [**meeting-prep-brief**](./skills/meeting-prep-brief/SKILL.md) | Pre-meeting briefing with attendee context and docs |
| [**meeting-recap**](./skills/meeting-recap/SKILL.md) | Structured recap of a past meeting |
| [**meeting-to-tasks**](./skills/meeting-to-tasks/SKILL.md) | Extract action items from meetings into Planner tasks |
| [**monthly-review**](./skills/monthly-review/SKILL.md) | Comprehensive monthly review document |
| [**morning-brief**](./skills/morning-brief/SKILL.md) | Personalized morning digest — email, Teams, calendar |
| [**multi-plan-search**](./skills/multi-plan-search/SKILL.md) | Search tasks across all Planner plans |
| [**my-tasks**](./skills/my-tasks/SKILL.md) | Personal task dashboard across all Planner plans |
| [**new-hire-onboarding**](./skills/new-hire-onboarding/SKILL.md) | End-to-end onboarding automation for new hires |
| [**org-chart**](./skills/org-chart/SKILL.md) | Visual ASCII org chart for any person |
| [**project-health-report**](./skills/project-health-report/SKILL.md) | Polished project health report with risk analysis |
| [**project-status-snapshot**](./skills/project-status-snapshot/SKILL.md) | Quick-glance Planner project dashboard |
| [**recurring-meeting-audit**](./skills/recurring-meeting-audit/SKILL.md) | Audit recurring meetings for efficiency |
| [**retrospective-runner**](./skills/retrospective-runner/SKILL.md) | Facilitate team retrospectives via Teams |
| [**site-explorer**](./skills/site-explorer/SKILL.md) | Browse SharePoint sites, lists, and libraries |
| [**smart-scheduler**](./skills/smart-scheduler/SKILL.md) | Find mutual availability and book meetings |
| [**stakeholder-update**](./skills/stakeholder-update/SKILL.md) | Compose executive status updates |
| [**team-pulse**](./skills/team-pulse/SKILL.md) | Manager dashboard — direct reports' calendar load and 1:1 cadence |
| [**teams-catch-up**](./skills/teams-catch-up/SKILL.md) | Digest of unread Teams chats, mentions, and reply queue |
| [**thread-summarizer**](./skills/thread-summarizer/SKILL.md) | Summarize email threads or Teams conversations |
| [**weekly-planner**](./skills/weekly-planner/SKILL.md) | Prioritized weekly action plan with focus-time suggestions |
| [**weekly-status-report**](./skills/weekly-status-report/SKILL.md) | Auto-generate weekly status reports |

## MCP Servers

This plugin uses the local WorkIQ CLI and remote WorkIQ MCP servers hosted at `agent365.svc.cloud.microsoft`:

| Server | Type | Capabilities |
|--------|------|-------------|
| **WorkIQ** (local CLI) | Local (`npx @microsoft/workiq mcp`) | Natural language queries across all M365 data |
| **WorkIQ-Me-MCP-Server** | Remote | User profile, directory lookups, manager chain, direct reports |
| **WorkIQ-Mail-MCP-Server** | Remote | Email search, read, draft, reply, forward, flag, delete |
| **WorkIQ-Calendar-MCP-Server** | Remote | Calendar view, event creation, availability, room finder |
| **WorkIQ-Teams-MCP-Server** | Remote | Teams/channels, messages, chat, search, posting |
| **WorkIQ-Planner-MCP-Server** | Remote | Plans, tasks, creation, updates, queries |
| **WorkIQ-SharepointLists-MCP-Server** | Remote | SharePoint site search, lists, list items |
| **WorkIQ-SharepointAndOneDrive-MCP-Server** | Remote | Document libraries, files, folders, file preview |
| **WorkIQ-Word-MCP-Server** | Remote | Word document creation |

All remote servers use OAuth with public client authentication.

## Platform Support

Supported on `win_x64`, `win_arm64`, `linux_x64`, `linux_arm64`, `osx_x64`, and `osx_arm64`.

## License

See the root [LICENSE](../../LICENSE) file.
