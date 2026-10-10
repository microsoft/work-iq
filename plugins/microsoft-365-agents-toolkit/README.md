# M365 Agents Toolkit

Toolkit for building Microsoft 365 Copilot declarative agents.

## Installation

### Via GitHub Copilot CLI Plugin Marketplace

```bash
/plugin install microsoft-365-agents-toolkit@work-iq
```

## Declarative Agent prerequisite

The `declarative-agent-developer` skill delegates every Declarative Agent request to the Work IQ
Dev Tools (WIQD) Copilot plugin. Install WIQD separately, then restart Copilot CLI so its `wiqd`
skill is loaded:

```bash
copilot plugin install microsoft/wiqd:plugins/wiqd
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

The evaluator skill uses the public preview M365 Copilot eval CLI through package-scoped `npx`. Learn more about the preview, docs, issues, and feedback channels in the public [m365-copilot-eval repository](https://github.com/microsoft/m365-copilot-eval).

```powershell
npx -y --package @microsoft/m365-copilot-eval@latest runevals --prompts-file evals\evals.json --output .evals\latest.json
```

## Skills

| Skill | What It Does |
|-------|-------------|
| [**install-atk**](./skills/install-atk/SKILL.md) | Install or update the ATK CLI and VS Code extension |
| [**declarative-agent-developer**](./skills/declarative-agent-developer/SKILL.md) | Entry point that delegates Declarative Agent requests to the WIQD plugin |
| [**ui-widget-developer**](./skills/ui-widget-developer/SKILL.md) | Build MCP servers with OpenAI Apps SDK widget rendering for Copilot Chat |
| [**m365-agent-evaluator**](./skills/m365-agent-evaluator/SKILL.md) | Generate, run, and analyze evaluation suites for M365 Copilot declarative agents |

## License

See the root [LICENSE](../../LICENSE) file.
