# Work IQ Plugin

> Query Microsoft 365 data with natural language — emails, meetings, documents, Teams messages, and more.

## Installation

### Via GitHub Copilot CLI Plugin Marketplace

```bash
/plugin install workiq@work-iq
```

### Via MCP Configuration

Add to your `.mcp.json` or IDE MCP settings:

```json
{
  "workiq": {
    "command": "npx",
    "args": ["-y", "@microsoft/workiq@latest", "mcp"],
    "tools": ["*"]
  }
}
```

## Updating

If you installed WorkIQ globally with npm, run the following command to update to the latest version:

```bash
npm update -g @microsoft/workiq
```

To verify the installed version after updating:

```bash
workiq version
```

> 💡 **Using npx?** If you run WorkIQ via `npx -y @microsoft/workiq mcp`, npx automatically fetches the latest version each time, so no manual update step is needed.

## Usage

```
# Emails
"What did John say about the proposal?"
"Summarize emails from the leadership team this week"

# Meetings
"What's on my calendar tomorrow?"
"What are my upcoming meetings this week?"

# Documents
"Find my recent PowerPoint presentations"
"Find documents I worked on yesterday"

# Teams
"Summarize today's messages in the Engineering channel"

# People
"Who is working on Project Alpha?"
```

## Skills

| Skill | Description |
|-------|-------------|
| [**workiq**](./skills/workiq/SKILL.md) | Query M365 Copilot for workplace intelligence |

## Platform Support

Supported on `win_x64`, `win_arm64`, `linux_x64`, `linux_arm64`, `osx_x64`, and `osx_arm64`.

## License

See the root [LICENSE](../../LICENSE) file.
