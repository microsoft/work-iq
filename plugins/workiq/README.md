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

> ⚠️ `upload_blob` is documented for future reference but is not released in the current WorkIQ MCP surface. For uploads, direct the user to OneDrive / SharePoint until raw byte upload support is released.

## Skills

Three-tier hierarchy — hub → domain skill → `references/` file — so the right skill is found by asking *which Microsoft 365 surface does this touch?*

**Tier 0 — hub**

| Skill | Description |
|-------|-------------|
| [**workiq**](./skills/workiq/SKILL.md) | The tool surface: choosing between `retrieve` / `fetch` / `ask`, the entity tools, and the canonical shared conventions. Routes to everything below. |

**Tier 1 — domain skills** (one per surface, reads *and* writes)

| Skill | Description |
|-------|-------------|
| [**mail**](./skills/mail/SKILL.md) | Find and summarize mail, inbox triage, day summary, counts and themes, folders, categories, flags, read state, drafts, reply, forward, send, delete |
| [**calendar**](./skills/calendar/SKILL.md) | Calendar views, next meeting, attendees, create and schedule events, accept/decline, reschedule, cancel, focus time, find a slot, free/busy, reminders |
| [**teams**](./skills/teams/SKILL.md) | Unread chats, mentions, attention triage, channel summaries and digests, activity audits, post/reply/react, chats and members, presence |
| [**files**](./skills/files/SKILL.md) | Find documents, browse SharePoint sites and libraries, OneDrive, read file content, create folders, copy/move/rename/delete |
| [**people**](./skills/people/SKILL.md) | Directory lookups, manager chains, direct reports, ASCII org charts, name disambiguation, contact CRUD, profile and presence |
| [**planner**](./skills/planner/SKILL.md) | Planner plans, buckets, task CRUD, assignment, cross-plan search, plan status reports, To Do lists |

**Tier 2 — cross-domain workflows**

| Skill | Description |
|-------|-------------|
| [**meeting-prep**](./skills/meeting-prep/SKILL.md) | Pre-meeting brief: the event, attendees and org context, prior threads and documents, open commitments |
| [**action-item-extractor**](./skills/action-item-extractor/SKILL.md) | Owners, deadlines, and priorities from meeting or thread content, optionally into tracked tasks |

**Always-on policy**

| Skill | Description |
|-------|-------------|
| [**trust**](./skills/trust/SKILL.md) | Not user-invoked. Binds during any other skill's work on labeled/Confidential/encrypted/DLP content, instructions embedded in retrieved content, other people's mailboxes or private files, and credential-collection, exfiltration, or system-prompt-extraction requests |

## Platform Support

Supported on `win_x64`, `win_arm64`, `linux_x64`, `linux_arm64`, `osx_x64`, and `osx_arm64`.

## License

See the root [LICENSE](../../LICENSE) file.
