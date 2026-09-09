# Work IQ Plugin

Full WorkIQ tool surface for GitHub Copilot CLI: work-context retrieval via preview `retrieve` when available, Copilot-synthesized answers via `ask`, and direct, structured reads and writes against Microsoft 365 — emails, meetings, calendar, documents, Teams messages, OneDrive/SharePoint files, and people.

## Installation

### Via GitHub Copilot CLI Plugin Marketplace

```bash
/plugin install workiq-preview@work-iq
```

### Via MCP Configuration

Add to your `.mcp.json` or IDE MCP settings:

```json
{
  "mcpServers": {
    "workiq-preview": {
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

### Gather work context (`retrieve`, preview)

Use `retrieve` when the calling agent will reason over work evidence itself, for example to ground an implementation or compose its own answer. It returns retrieval hits and grounding `markdown` with citations and source metadata, rather than delegating the finished answer to Copilot.

| Strategy | When to use |
|----------|-------------|
| `copilot` (default) | Source locations are unknown or may span the M365 index and available federated connectors, external data sources, or MCP tools. |
| `grounding` | The request is fully satisfiable from indexed M365 content: SharePoint, OneDrive, Teams, and Outlook. |

Both strategies return context for the caller. `strategy: "copilot"` is not an `ask` call. `Dataverse` and `GraphConnectors` capabilities cannot be combined with `grounding`.

**Preview availability is tenant-dependent.** Discover the actual tool and schema in the connected server's catalog before calling it. Installing either plugin does not enable the server-side preview. If unavailable, the agent can use `ask` for a synthesized answer when appropriate, but must not present it as raw retrieval evidence or bypass an access/policy denial.

```
"Gather work context and design decisions to ground my Project X implementation"
"Find Project X evidence across our connected enterprise sources"
"Gather Project X rollout context from indexed SharePoint, email, and Teams content"
```

See the [retrieve reference](./skills/workiq-preview/references/retrieve-work-iq.md) for parameters, capability filters, citation handling, and fallbacks.

### Copilot-synthesized answers (`ask`)

Use `ask` to delegate retrieval, reasoning, and answer synthesis to Microsoft 365 Copilot, or continue a conversation using the returned `conversationId`.

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

> ⚠️ `upload_blob` is documented for future reference but is not released in the current WorkIQ MCP surface. For uploads, direct the user to OneDrive / SharePoint until raw byte upload support is released.

## Skills

| Skill | Description |
|-------|-------------|
| [**workiq-preview**](./skills/workiq-preview/SKILL.md) | Routes work-context gathering to preview `retrieve` when available, Copilot-owned synthesis to `ask`, and exact reads/writes/downloads to entity tools |

## Platform Support

Supported on `win_x64`, `win_arm64`, `linux_x64`, `linux_arm64`, `osx_x64`, and `osx_arm64`.

## License

See the root [LICENSE](../../LICENSE) file.
