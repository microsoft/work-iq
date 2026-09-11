# Work IQ Plugin

Full WorkIQ tool surface for GitHub Copilot CLI: caller-owned work context via available `retrieve` with explicit Grounding by default, intentional agent delegation via `ask`, and direct, structured Microsoft 365 reads and writes.

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

### Gather work context (`retrieve`, preview)

Use `retrieve` first for workplace questions, summaries, comparisons, and implementation context the calling agent will answer itself. It returns hits and grounding `markdown` with citations and source metadata. Question wording or a request to summarize does not imply delegation.

| Strategy | When to use |
|----------|-------------|
| `grounding` (skill default) | Ordinary workplace evidence, including unspecified or unknown locations; supported indexed M365 sources such as SharePoint, OneDrive, Teams, and Outlook. |
| `copilot` | Concrete required external/federated/MCP sources, mixed indexed/external scope, or an explicit broader-retrieval request. Start here directly when required. |

Always send `strategy` explicitly: the API default when omitted remains `copilot`. Both strategies return evidence, not an `ask` answer. Required `Dataverse` or `GraphConnectors` capabilities use Copilot; never drop a required capability or broaden an explicitly Grounding-only scope. Conflicting source requirements need clarification.

**Availability is tenant-dependent.** Discover the actual tool and schema; installing either plugin does not enable preview retrieval. If absent or unable to select a required strategy, disclose the limitation. No automatic `ask` fallback: the user must select delegated answering as an alternative. Exact entity operations remain on entity tools. Never bypass an access/policy denial.

Synthesize sufficient evidence locally. Empty results, caps, errors, and timeouts do not automatically justify broader retrieval. At most one targeted broader escalation per objective is allowed for a concrete missing source within the user's scope; no repeated strategy switching or final `ask` resynthesis.

```
"Gather work context and design decisions to ground my Project X implementation"
"Find Project X evidence across our connected enterprise sources"
"Gather Project X rollout context from indexed SharePoint, email, and Teams content"
```

See the [retrieve reference](./skills/workiq/references/retrieve-work-iq.md) for parameters, capability filters, citations, and bounded recovery.

### Intentional agent delegation (`ask`, `list_agents`)

Use `ask` when the user explicitly requests Copilot's or a specific agent's answer. Default Copilot needs no retrieval or discovery preflight. For a named agent, reuse its known ID or discover it with `list_agents`; resolve ambiguity without silently substituting Copilot. Attribute the answer and reuse the returned `conversationId` only for an appropriate continuation with the same agent.

```
"Ask Microsoft 365 Copilot what is blocking Project Aurora"
"Ask the release-readiness agent whether Aurora is ready to ship"
"Ask that same agent which of those blockers is most urgent"
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

> ⚠️ Mutations require specific confirmation, including persisted drafts and read-state changes. A read-only action such as free/busy is not a mutation merely because it uses `do_action`. The skill preserves the intended action, executes once, and reports completed, accepted/pending, blocked, awaiting confirmation, or unknown outcomes from actual evidence.

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

> ⚠️ `upload_blob` is not released. Creating an upload session is supported separately from sending bytes: “session created; no bytes uploaded” is not “file replaced.” Business Applications record-file operations are distinct and do not add raw OneDrive/SharePoint upload support.

## Skills

The skill opens with a compact dispatcher. Read the applicable canonical contract:
[files](./skills/workiq/references/files-work-iq.md),
[calendar](./skills/workiq/references/calendar-work-iq.md),
[mail](./skills/workiq/references/mail-work-iq.md),
[Teams](./skills/workiq/references/teams-work-iq.md), or
[agents](./skills/workiq/references/agents-work-iq.md).
[Detailed workflows](./skills/workiq/references/workflows-work-iq.md) owns the index,
setup, and cross-domain sequencing; [troubleshooting](./skills/workiq/references/troubleshooting.md)
owns operation-aware recovery. Exact library metadata and Business Applications
retain their dedicated public-package references.

| Skill | Description |
|-------|-------------|
| [**workiq**](./skills/workiq/SKILL.md) | Retrieve-first context with explicit Grounding; intentional agent delegation; exact reads/writes/downloads on entity tools |

## Platform Support

Supported on `win_x64`, `win_arm64`, `linux_x64`, `linux_arm64`, `osx_x64`, and `osx_arm64`.

## License

See the root [LICENSE](../../LICENSE) file.
