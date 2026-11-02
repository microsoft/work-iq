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

The plugin connects to the hosted WorkIQ MCP prod endpoint. It does **not** launch a local MCP server for tool calls.

## Updating

The MCP tool surface is served by the hosted WorkIQ endpoint above, so updating a local package is not required for MCP tool calls.

## Usage

The plugin exposes the WorkIQ MCP tool surface — read **and** write — from `https://workiq.svc.cloud.microsoft/mcp`.

SharePoint IQ provider operations are exposed through the same endpoint and
appear in `search_paths` under `/sharepoint/*`. The skill discovers the exact
provider operation and reads its schema: advertised actions use `do_action`,
functions use `call_function`. No separate SharePoint MCP endpoint is configured.

### Semantic queries (`ask`)

```
"What did John say about the proposal?"
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

> ⚠️ `upload_blob` is documented for future reference but is not released as a
> direct WorkIQ MCP tool. A provider-backed SharePoint/OneDrive upload requires
> an available supported byte-transfer client and a converted WorkIQ ticket from
> `getUploadFileDetails`; preparation alone does not upload bytes. See the
> [file-transfer boundary](./skills/workiq/references/sharepoint-work-iq.md#file-transfer-boundary).
> If that workflow is unavailable, use the OneDrive / SharePoint web UI.

## Skills

| Skill | Description |
|-------|-------------|
| [**workiq**](./skills/workiq/SKILL.md) | Guides usage of the full WorkIQ tool surface — `ask` for semantic questions plus entity tools for fast, structured M365 reads and writes |

## Platform Support

Supported on `win_x64`, `win_arm64`, `linux_x64`, `linux_arm64`, `osx_x64`, and `osx_arm64`.

## License

See the root [LICENSE](../../LICENSE) file.
