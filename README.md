# Microsoft Work IQ — Plugin Marketplace

> The official Microsoft Work IQ plugin collection for GitHub Copilot ✨

Extend the power of GitHub Copilot with Work IQ plugins — MCP servers, skills, and tools that connect AI assistants to your Microsoft 365 data.

> ⚠️ **Public Preview:** Features and APIs may change.

To access Microsoft 365 tenant data, the WorkIQ CLI and MCP Server need to be consented to permissions that require administrative rights on the tenant. On first access, a consent dialog appears. If you are not an administrator, contact your tenant administrator to grant access.

**For Tenant Administrators:** See the [Tenant Administrator Enablement Guide](./ADMIN-INSTRUCTIONS.md) for detailed instructions on granting admin consent, including a quick one-click consent URL.

For more information, see Microsoft's [User and Admin Consent Overview](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/user-admin-consent-overview).

## 📋 Prerequisites

Before getting started, ensure you have **Node.js** (which includes NPM and NPX) installed:

- **Node.js 18+** — [Download from nodejs.org](https://nodejs.org/)

You can verify your installation by running:

```bash
node --version
npm --version
```

> 💡 **Why Node.js?** WorkIQ uses NPX to run the MCP server. NPX is included automatically with NPM, which comes bundled with Node.js.

---

## 🚀 Quick Start with GitHub Copilot CLI

```bash
# 1. Open GitHub Copilot CLI
copilot

# 2. Add this plugin marketplace (one-time setup)
/plugin marketplace add microsoft/work-iq

# 3. Install any plugin
/plugin install workiq@work-iq
/plugin install microsoft-365-agents-toolkit@work-iq
```

**That's it!** Restart Copilot CLI and start using the plugin:

```
You: What are my upcoming meetings this week?
You: Summarize emails from Sarah about the budget
You: Find documents I worked on yesterday
```

---

## 📦 Alternative: Standalone MCP Installation

[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://vscode.dev/redirect/mcp/install?name=workiq&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40microsoft%2Fworkiq%22%2C%22mcp%22%5D%7D)
[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install_Server-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=workiq&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40microsoft%2Fworkiq%22%2C%22mcp%22%5D%7D&quality=insiders)

If you prefer to run WorkIQ as a standalone MCP server:

```bash
# Install globally
npm install -g @microsoft/workiq

# Run the MCP server
workiq mcp
```

Or use npx without installing:

```bash
npx -y @microsoft/workiq mcp
```

Or add it as an MCP server in your coding agent or IDE:

```json
{
  "workiq": {
    "command": "npx",
    "args": ["-y", "@microsoft/workiq@latest", "mcp"],
    "tools": ["*"]
  }
}
```

> Note: please refer to [use MCP servers in VS Code](https://code.visualstudio.com/docs/copilot/customization/mcp-servers) for the configuration instructions relative to Visual Studio Code.

### Updating

If you installed WorkIQ globally with npm, run the following command to update to the latest version:

```bash
npm update -g @microsoft/workiq
```

To verify the installed version after updating:

```bash
workiq version
```

> 💡 **Using npx?** If you run WorkIQ via `npx -y @microsoft/workiq mcp`, npx automatically fetches the latest version each time, so no manual update step is needed.

---

## 🎯 What You Can Query

| Data Type | Example Questions |
|-----------|-------------------|
| **Emails** | "What did John say about the proposal?" |
| **Meetings** | "What's on my calendar tomorrow?" |
| **Documents** | "Find my recent PowerPoint presentations" |
| **Teams** | "Summarize today's messages in the Engineering channel" |
| **People** | "Who is working on Project Alpha?" |

---

## 📖 CLI Reference

### Commands

| Command | Description |
|---------|-------------|
| `workiq accept-eula` | Accept the End User License Agreement (EULA) |
| `workiq ask` | Ask a question to a specific agent or run in interactive mode |
| `workiq mcp` | Start MCP stdio server for agent communication |
| `workiq version` | Show version information |

### Global Options

| Option | Description | Default |
|--------|-------------|---------|
| `-t, --tenant-id <tenant-id>` | The Entra tenant ID to use for authentication | `common` |
| `--version` | Show version information | |
| `-?, -h, --help` | Show help and usage information | |

### `workiq ask` Options

| Option | Description |
|--------|-------------|
| `-q, --question <question>` | The question to ask the agent |

### Examples

```bash
# Accept the EULA (required on first use)
workiq accept-eula

# Interactive mode
workiq ask

# Ask a specific question
workiq ask -q "What meetings do I have tomorrow?"

# Use a specific tenant
workiq ask -t "your-tenant-id" -q "Show my emails"

# Start MCP server
workiq mcp
```

---

## 🔌 Available Plugins

| Plugin | Description |
|--------|-------------|
| [**workiq**](./plugins/workiq/) | Query Microsoft 365 data with natural language — emails, meetings, documents, Teams messages, and more. |
| [**microsoft-365-agents-toolkit**](./plugins/microsoft-365-agents-toolkit/) | Toolkit for building M365 Copilot declarative agents — scaffolding, manifest authoring, and capability configuration. |

---

## Platform Support

The WorkIQ CLI and MCP Server are supported on `win_x64`, `win_arm64`, `linux_x64`, `linux_arm64`, `osx_x64` and `osx_arm64`.

---

## 🤝 Contributing

We welcome new plugins! See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide. In short:

1. Create your plugin under `plugins/{your-plugin}/`
2. Add `.mcp.json`, `README.md`, and `skills/{name}/SKILL.md`
3. Register it in `.github/plugin/marketplace.json`
4. Submit a pull request

---

## 📄 License

By using this package, you accept the license agreement. See [NOTICES.TXT](./NOTICES.TXT) and EULA within the package for legal terms.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft trademarks or logos is subject to and must follow [Microsoft’s Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general). Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship. Any use of third-party trademarks or logos is subject to those third-party's policies.
