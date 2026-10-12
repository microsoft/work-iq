# Work IQ Plugin

Full WorkIQ tool surface for GitHub Copilot CLI: agentic semantic queries via `ask` **plus** direct, structured reads and writes against Microsoft 365 — emails, meetings, calendar, documents, Teams messages, OneDrive/SharePoint files, and people.

## Installation

### Via GitHub Copilot CLI Plugin Marketplace

```bash
/plugin install workiq@work-iq
```

### Via MCP Configuration

Add to your `.mcp.json` or IDE MCP settings:

```json
{
  "mcpServers": {
    "workiq": {
      "type": "http",
      "url": "https://workiq.svc.cloud.microsoft/mcp",
      "oauthClientId": "ba081686-5d24-4bc6-a0d6-d034ecffed87",
      "oauthPublicClient": true,
      "auth": {
        "redirectPort": 12798
      }
    }
  }
}
```

The plugin connects to the hosted WorkIQ **production** endpoint. It does
**not** launch a local MCP server. Installing a skill and connecting an MCP
server are separate: the skill supplies instructions, and the connection
supplies tools. A host can override the bundled connection, so its name alone
does not establish the effective destination. Follow the
[local test runbook](TEAMS-BOTDOC-TDF.md) for explicit TDF overrides, connection
verification, automatic-routing tests, and rollback. Never publish test routing.

## Updating

The MCP tool surface is served by the hosted WorkIQ endpoint above, so updating a local package is not required for MCP tool calls.

## Usage

The plugin exposes the WorkIQ MCP tool surface — read **and** write — from the
hosted endpoint configured in `.mcp.json`.

### Specific Teams chat content (`fetch` with BotDoc)

For an existing named 1:1, group, or meeting chat, the skill resolves the chat
read-only, supplies its returned ID as `threadId` to `/m365-grounding/fetch`,
and translates the requested dates into `start`/`end` UTC instants. Summaries
are generated locally from the returned content, with line-based paging.
The route activates only after support is positively confirmed on the selected
connection, before any chat lookup. Installing this plugin does not deploy or
enable the provider; production availability depends on the service and tenant.
Users do not need to name the API:

```text
"Get my conversation with Alex from the last 3 days"
"Summarize my chat with alex@example.com yesterday"
"What decisions did we make in the Release planning group chat this week?"
```

Chat inventory/membership, exact message reads, channels, mutations, binary
attachments, and broad cross-workload questions keep their existing routes.
Unconfirmed support, explicit unavailability, and authorization errors are
reported separately, not silently hidden by a Graph/`ask` fallback. A discovery
search miss alone is not proof of unavailability.

### Semantic queries (`ask`)

```
"Across email and Teams, what did John say about the proposal?"
"Summarize emails from the leadership team this week"
"What's top of mind for Sarah?"
"Find the design doc for the authentication system"
"Who is working on Project Alpha?"
```

### Structured reads (`fetch`, `search_paths`, `get_schema`, `fetch_blob`)

```
"List my unread emails from Sarah this week"
"What meetings do I have Monday?"
"Show me the channels in the DevX team"
"List files in my OneDrive 'Specs' folder"
"Who are Rob's direct reports?"
```

### Writes (`create_entity`, `update_entity`, `delete_entity`, `do_action`)

> ⚠️ Writes execute immediately and are visible to other people or unrecoverable. The skill is instructed to confirm with you before sending mail, forwarding, accepting/declining meetings, or permanently deleting.

```
"Send the draft email to the engineering distribution list"
"Create a calendar event Friday at 3pm with the design team"
"Accept the 2pm meeting from Rob"
"Decline the Monday standup — I'll catch up on the recording"
"Mark Sarah's last three emails as read"
"Reply to the deadline thread with 'on track for Friday'"
"Move the design review thread to the Archive folder"
```

`fetch_blob` downloads binary content up to 4 MB and returns it base64-encoded with metadata.

> ⚠️ `upload_blob` is documented for future reference but is not released in the current WorkIQ MCP surface. For uploads, direct the user to OneDrive / SharePoint until raw byte upload support is released.

## Skills

| Skill | Description |
|-------|-------------|
| [**workiq**](./skills/workiq/SKILL.md) | BotDoc fetch for specific Teams chat content; `ask` for broader semantic questions; entity tools for exact M365 reads and writes |

## Platform Support

Supported on `win_x64`, `win_arm64`, `linux_x64`, `linux_arm64`, `osx_x64`, and `osx_arm64`.

## License

See the root [LICENSE](../../LICENSE) file.
