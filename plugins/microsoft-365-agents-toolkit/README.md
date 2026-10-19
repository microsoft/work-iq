# M365 Agents Toolkit

Toolkit for Declarative Agent development and evaluation through WIQD, code-based
Teams apps, and existing widget/SSO workflows.

## Installation

### Via GitHub Copilot CLI Plugin Marketplace

```bash
/plugin install microsoft-365-agents-toolkit@work-iq
```

## Declarative Agent prerequisite

The Work IQ Dev Tools (WIQD) Copilot plugin must be installed and enabled before using the
`declarative-agent-developer` skill, including evaluation. Install the plugin from the Awesome Copilot marketplace,
then restart Copilot CLI so its `wiqd` skill is loaded:

```bash
copilot plugin install wiqd@awesome-copilot
```

The entry skill does not invoke the WIQD or ATK CLI directly and has no fallback when the WIQD
plugin is unavailable. Other ATK workflows continue to use the ATK CLI and do not require WIQD.

## Usage

```
# Develop an agent
"Scaffold a new declarative agent for HR FAQ"

# Configure capabilities
"Add web search to my agent"

# Deploy
"Deploy my declarative agent"

# Create evals
"Create an eval suite for my  agent based on it's capabilities."

# Run evals
"Run my evals for the agent"

# Analyze and improve
"Analyze the evaluation failures by root cause, and recommend targeted agent instruction changes"

# Regression check after agent changes
"I changed my agent instructions. Re-run the evals with stable concurrency and compare the new results to .evals\baseline.json"
```

Evaluation requests go through `declarative-agent-developer` to WIQD's eval workflow,
which owns CLI setup, dataset generation, execution, analysis, and regression comparison.

## Skills

| Skill | What It Does |
|-------|-------------|
| [**install-atk**](./skills/install-atk/SKILL.md) | Install or update the ATK CLI and VS Code extension |
| [**declarative-agent-developer**](./skills/declarative-agent-developer/SKILL.md) | Delegate complete Declarative Agent requests, including evaluation, to WIQD |
| [**teams-app-developer**](./skills/teams-app-developer/SKILL.md) | Build, test, and deploy code-based Teams apps |
| [**ui-widget-developer**](./skills/ui-widget-developer/SKILL.md) | Build MCP servers with OpenAI Apps SDK widget rendering for Copilot Chat |
| [**setup-sso-ui-widget**](./skills/setup-sso-ui-widget/SKILL.md) | Add SSO to an existing widget MCP server; existing workflow retained |

## Scope of this change

- The independent evaluator and its legacy assets are removed; WIQD owns evaluation.
- Installation, Teams, widget, and SSO skills retain their original directories, references,
  scripts, and execution flows. No local widget/SSO routing is added to the
  Declarative Agent entry point.

Restart the host session after updating the plugin.

## License

See the root [LICENSE](../../LICENSE) file.
