# Contributing to Work IQ Plugins

Thank you for your interest in contributing to the Work IQ plugin collection! This document provides guidelines for adding new plugins and improving existing ones.

## WorkIQ development and publication

This public repository publishes promoted stable `workiq` releases, alongside
the other independently maintained marketplace plugins. The public
`workiq-preview` package is retired; do not re-add its package or registration.

WorkIQ feature changes for capabilities already public in production rings
belong in the Work IQ team's internal `workiq-preview` channel. Unreleased
features stay in team forks until ready to be made public. Public contributors
can submit issues or PRs here; Work IQ maintainers must carry accepted changes
back into the internal preview source before the next promotion, rather than
letting a later export overwrite public-only fixes.

The Work IQ team promotes preview to stable at least every two weeks, sooner
when warranted. Merge the reviewed internal promotion before publishing its stable
snapshot here. Draft publication PRs may be prepared earlier, but must remain
draft until the internal promotion merges and the exported source is rechecked.

Both internal channels use numeric MAJOR.MINOR.PATCH: patch for compatible
fixes, minor for compatible additions, major for breaking routing/behavior
changes. Stable stays pinned between promotions; future promotions preserve
the selected preview version. Stable 3.0.0 is the initial transition from the
older preview version sequence. Record the source commit/version and review
any public README/install-path adaptations separately from the package content.

Update the stable entry in both public registries while preserving marketplace
identity `work-iq` and unrelated plugin entries. Never copy the internal
two-plugin marketplace wholesale, publish internal preview, or overwrite ATK
sync, security/legal files or unrelated packages. Update user-facing migration
instructions for breaking changes and preserve host manifests, MCP identity,
authentication and required reference links.

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

All public plugins must be registered consistently in `marketplace.json` and
`.claude-plugin/marketplace.json`. Keep name, version and description consistent
with the plugin's host manifests. Add your plugin entry:

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
4. **Register** your plugin in `marketplace.json` and `.claude-plugin/marketplace.json`
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

For stable `workiq` guidance changes, use Node 22+:

```bash
npm ci --prefix tests/workiq-guidance --ignore-scripts --no-audit --no-fund
npm --prefix tests/workiq-guidance test
```

The [guidance contract](tests/workiq-guidance/README.md) covers parsed
frontmatter, local links, progressive routing, metadata and synthetic trace
checks. The promoted plugin-local contracts also run directly:

```powershell
node --test plugins\workiq\tests\guidance.test.mjs
```

Guidance is agent-host-neutral; resolve logical tools against the connected
host's catalog. Reinstall/reload through the chosen host for separately approved
runtime checks. Offline checks do not install plugins, access tenants, run
models, prove agent compliance or establish live tool availability.

## 📋 Pull Request Checklist

- [ ] Plugin directory created under `plugins/`
- [ ] `.mcp.json` with valid MCP server configuration
- [ ] `README.md` with installation instructions
- [ ] `SKILL.md` with YAML frontmatter and documentation
- [ ] Plugin registered consistently in `marketplace.json` and `.claude-plugin/marketplace.json`
- [ ] Root `README.md` updated with new plugin entry
- [ ] `PLUGINS.md` updated with new plugin entry, skills, and examples

## Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).

## License

By contributing, you agree that your contributions will be licensed under the project's existing license terms.
