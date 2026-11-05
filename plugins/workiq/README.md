# Work IQ Plugin

Full WorkIQ tool surface for GitHub Copilot CLI: agentic semantic queries via `ask` **plus** direct, structured reads and writes against Microsoft 365 — emails, meetings, calendar, documents, Teams messages, OneDrive/SharePoint files, and people.

For SharePoint, the skill prefers native `/sharepoint/` operations: discover files,
search semantic passages, and read structured document text before considering
original-file access. Other Microsoft 365 workflows retain their existing routing.

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

The MCP tool surface is served by the hosted WorkIQ endpoint above; hosted tool
updates do not require a local server-package update. Skill and reference
instructions are bundled locally, however. Update/reinstall the plugin and
start a fresh session to load changed guidance. Connecting the MCP endpoint
alone does not load the skill.

## Usage

The plugin exposes the WorkIQ MCP tool surface — read **and** write — from `https://workiq.svc.cloud.microsoft/mcp`.

### SharePoint-native search and document text

The skill resolves site, library and file identities, then invokes supported
native paths through the connected `call_function` / `do_action` wrappers.
`find_items` discovers files; `semantic_search` searches passages in resolved
files; `get_structured_text` reads document content, including multi-file batches.
Library columns use authoritative schema and list-item reads, not document text.

```
"Find the release-readiness documents in this SharePoint library"
"What do these SharePoint files say about rollback approval?"
"Summarize this SharePoint document without downloading the original"
"Compare the recovery windows in these two SharePoint documents"
"Count this library's documents by review status"
```

Original-file downloads remain available when explicitly requested. They are
not the fallback for ordinary SharePoint reading, summaries or search; native
errors and capability gaps are reported without claiming completion.
See the [measured routing results](../../tests/workiq-sharepoint/RESULTS.md)
for the model/mock evidence, remaining catalog gaps and live-service limits.

### Semantic queries (`ask`)

For general semantic questions outside a resolved SharePoint workflow:

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

For explicitly requested original bytes, `fetch_blob` downloads binary content
up to 4 MB and returns it base64-encoded with metadata. It is not the preferred
way to answer SharePoint document-text questions.

> ⚠️ `upload_blob` is documented for future reference but is not released in the current WorkIQ MCP surface. For uploads, direct the user to OneDrive / SharePoint until raw byte upload support is released.

## Skills

| Skill | Description |
|-------|-------------|
| [**workiq**](./skills/workiq/SKILL.md) | Native-first SharePoint discovery, semantic passages, structured document text and library metadata; `ask` and entity tools for other M365 reads and writes |

## Platform Support

Supported on `win_x64`, `win_arm64`, `linux_x64`, `linux_arm64`, `osx_x64`, and `osx_arm64`.

## License

See the root [LICENSE](../../LICENSE) file.
