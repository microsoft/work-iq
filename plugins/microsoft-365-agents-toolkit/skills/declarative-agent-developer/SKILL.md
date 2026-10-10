---
name: declarative-agent-developer
description: >
  Entry point for Microsoft 365 Copilot declarative-agent authoring and lifecycle requests.
  Use for scaffolding, manifest edits, capabilities, API or MCP actions, authentication,
  localization, instruction design and review, validation, packaging, provisioning, sharing,
  publishing, and troubleshooting. Delegate the complete request to the WIQD plugin's `wiqd`
  skill before inspecting a project, answering implementation questions, running commands, or
  editing files. Triggers: "create agent", "declarative agent", "edit my agent",
  "add a capability", "add an API plugin", "add an MCP plugin", "deploy my agent",
  "validate my agent", "localize my agent", "review instructions", "publish my agent"
---

# Declarative Agent Developer

The WIQD plugin owns all declarative-agent guidance and execution. This skill is the
Microsoft 365 Agents Toolkit plugin entry point for those requests.

## Required Delegation

Immediately invoke the WIQD plugin's `wiqd` skill with:

- the user's complete original request;
- relevant context already provided by the user; and
- any explicit constraints or desired outcomes.

Do this before inspecting the workspace, answering implementation questions, running commands,
or editing files. After delegation, let the `wiqd` skill own workflow selection, prerequisite
checks, project discovery, clarification, execution, validation, and the final response.

## Boundaries

- Do not invoke the WIQD CLI or ATK CLI directly.
- Do not inspect or modify declarative-agent project files.
- Do not reproduce schema, capability, authentication, localization, or lifecycle guidance.
- Do not fall back to manual implementation when the `wiqd` skill is unavailable. Report that
  the WIQD plugin is a required dependency and stop.
- Keep code-based Teams apps, Custom Engine Agents, bots, tabs, and message extensions in
  `teams-app-developer`.
- Keep MCP server and widget implementation in `ui-widget-developer`; delegate only the
  declarative-agent portion through this skill.
