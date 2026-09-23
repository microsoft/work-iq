# Contributing to Work IQ Plugins

Thank you for your interest in contributing to the Work IQ plugin collection! This document provides guidelines for adding new plugins and improving existing ones.

## 🔌 Plugin Structure

Each plugin lives in `plugins/{plugin-name}/` and follows this structure:

```
plugins/{plugin-name}/
├── .mcp.json                       # MCP server configuration
├── README.md                       # Plugin overview and installation
└── skills/
    └── {skill-name}/
        ├── SKILL.md                # Skill metadata and documentation
        └── references/             # Optional: supporting docs, guides, patterns
```

### Required Files

| File | Purpose |
|------|---------|
| `.mcp.json` | Defines the MCP server(s) the plugin exposes |
| `README.md` | Human-readable plugin documentation |
| `skills/{name}/SKILL.md` | Skill definition with YAML frontmatter (`name`, `description`) |

### Marketplace Registry

All plugins must be registered in `.github/plugin/marketplace.json`. Add your plugin entry:

```json
{
  "name": "your-plugin",
  "source": "./plugins/your-plugin",
  "version": "1.0.0",
  "description": "What your plugin does",
  "skills": ["./plugins/your-plugin/skills/your-skill"]
}
```

## 🚀 Adding a New Plugin

1. **Fork** the repository and create a feature branch
2. **Create** your plugin directory under `plugins/`
3. **Add** the required files (`.mcp.json`, `README.md`, `skills/*/SKILL.md`)
4. **Register** your plugin in `.github/plugin/marketplace.json`
5. **Update** the root `README.md` plugin table
6. **Submit** a pull request

## 📝 Writing a Good SKILL.md

Your `SKILL.md` should include:

- **YAML frontmatter** with `name` and `description`
- **When to use** section with concrete examples
- **MCP tool documentation** with parameters and examples
- **Prerequisites** if any

```markdown
---
name: your-skill
description: One-line description of what this skill does.
---

# Your Skill Name

Description of the skill and its purpose.

## When to Use

Use this skill when the user asks about...

## MCP Tool

### `tool_name`

Description and parameters...
```

## 🧪 Testing

- Verify your `.mcp.json` is valid JSON
- Test your MCP server starts correctly
- Ensure your skill documentation is accurate

For `workiq-preview` guidance changes, use Node 22+:

```bash
npm ci --prefix tests/workiq-guidance --ignore-scripts --no-audit --no-fund
npm --prefix tests/workiq-guidance test
```

The [preview guidance contract](tests/workiq-guidance/README.md) covers parsed
frontmatter, local links, routing, metadata, and synthetic trace checks. It does
not apply the preview policy to the public `workiq` package or require their
versions to match. Keep preview metadata consistent across its host manifests,
`marketplace.json`, and `.claude-plugin/marketplace.json`.

Preview guidance is agent-host-neutral; resolve logical tools against the current
host's catalog. After editing it, reinstall/reload `workiq-preview` using that
host's supported mechanism. Offline checks do not prove agent compliance, live
endpoint behavior, or support across hosts; any loading evidence applies only to
the host and version actually exercised.

## 📋 Pull Request Checklist

- [ ] Plugin directory created under `plugins/`
- [ ] `.mcp.json` with valid MCP server configuration
- [ ] `README.md` with installation instructions
- [ ] `SKILL.md` with YAML frontmatter and documentation
- [ ] Plugin registered in `.github/plugin/marketplace.json`
- [ ] Root `README.md` updated with new plugin entry
- [ ] `PLUGINS.md` updated with new plugin entry, skills, and examples

## Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).

## License

By contributing, you agree that your contributions will be licensed under the project's existing license terms.
