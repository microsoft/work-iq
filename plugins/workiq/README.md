# Work IQ Plugin

Stable **3.0.0** provides agent-host-neutral guidance for Microsoft 365 mail,
calendar, Teams, files, SharePoint, people, Planner and Business Applications.
It replaces the previous stable ask-first policy with source-based retrieval
and local synthesis. Exact entity reads and operations remain on entity tools;
`ask` is reserved for explicitly requested Copilot or named-agent answers.

## Installation

From GitHub Copilot CLI:

```text
/plugin marketplace add microsoft/work-iq
/plugin install workiq@work-iq
```

Restart the session after installation or updates. If previously installed,
remove the retired `workiq-preview` plugin first; an installed preview skill
otherwise takes precedence over stable for overlapping requests. See the
[migration guide](../../README.md#migrating-from-workiq-preview).

Claude and Codex users should use their host's supported plugin loader and
remote-MCP connector. The package supplies `.github/plugin/plugin.json`,
`.claude-plugin/plugin.json`, `.codex-plugin/plugin.json` and `.mcp.json`.
Connecting MCP tools alone does not load the skill instructions.

The hosted WorkIQ plugin does not require a local Node.js runtime or CLI.
Sign in through the selected host with your Microsoft 365 account.
Tenant consent and appropriate licensing are required; see
[administrator instructions](../../ADMIN-INSTRUCTIONS.md).

## Hosted MCP configuration

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

Use the exact tool names and schemas advertised by the configured server;
logical names are not necessarily directly callable host names. OAuth fields
and configuration wrappers are host-specific.

## Choosing the operation

| Request | Route |
| --- | --- |
| Find and interpret workplace evidence | `retrieve`, then answer locally |
| Ask Copilot or a named agent for its answer | `ask`; discover an unresolved named agent with `list_agents` |
| Read exact entities, bounded lists, library columns or Graph bytes | Entity tools without retrieval or delegation preflight |
| Create, update, delete, send or change read state | The exact entity/action contract and required mutation approval |
| Build, validate or publish an M365 agent/plugin | External WIQD lifecycle handoff, not workplace data operations |

Retrieval strategy is source-based. Use `grounding` for known indexed M365
content; use `copilot` directly for unknown sources, connected enterprise sources,
mixed scope or explicitly requested broader retrieval, within authorized scope.
Send strategy explicitly. The API default is `grounding`, but the API default
does not override the source-based selection rule. Both strategies return
evidence, not a delegated `ask` answer. GraphConnectors requires `copilot`.
Dataverse and Power BI are unsupported roadmap sources; do not claim retrieval
support merely because a capability appears in a schema.

Availability is tenant-dependent. Installing the plugin does not enable
retrieval. Missing required tools/strategies are disclosed limitations, never
automatic `ask` fallback or permission to bypass access/policy denial.
Empty, capped or failed retrieval does not authorize repeated broadening.

## Progressive guidance and safeguards

Read [the skill](skills/workiq/SKILL.md), then the relevant domain index,
operation leaf and its `Required before use` links before the call. Load
mutation safeguards before writes, status safeguards before summaries, and
recovery before retry or reconciliation. Follow-up retrieval requires its
evidence-repair contract. Required missing guidance stops the operation.

Resolve exact source/target identity, preserve material qualifiers and readable
source links, and follow supported continuation links or disclose partial
coverage. Approval is separate from execution and observed completion.
Drafts are not sent, upload sessions are not uploaded bytes, and accepted/pending
is not completed. Never blindly replay an ambiguous write.

Canonical routes include [mail](skills/workiq/references/mail-work-iq.md),
[calendar](skills/workiq/references/calendar-work-iq.md),
[Teams](skills/workiq/references/teams-work-iq.md),
[files](skills/workiq/references/files-work-iq.md),
[people](skills/workiq/references/people-work-iq.md),
[Planner](skills/workiq/references/tasks-work-iq.md), and
[Business Applications](skills/workiq/references/business-applications.md).

### File transfers and content

WorkIQ file objects and file-transfer client actions use the
[Files CLI reference](skills/workiq/references/workiq-files-cli.md).
The CLI requires Node.js 20+ and a separate installation; plugin installation
does not install the CLI or accept its EULA. Acceptance requires explicit user
permission. Existing Graph drive-content and mail-attachment downloads stay on
`fetch_blob`. Downloaded bytes may be a pointer rather than actual content;
available readers must establish requested content and output.
`upload_blob` is unreleased; creating an upload session is not uploading bytes.

### Agent/plugin lifecycle

The [WIQD handoff](skills/workiq/references/wiqd.md) checks availability and
requires explicit approval before installation, followed by a session restart.
WIQD is experimental, not production-ready and not officially supported.
It is not bundled with this package. Ordinary M365 data operations stay here.

## Updates and offline validation

The hosted service updates independently of this plugin. Reinstall/reload the
plugin through the chosen host to update instructions, and restart where needed.
Record the reviewed source commit and version; host loading and live behavior
need separate evidence.

From the repository root, run the focused promoted checks with:

```powershell
node --test plugins\workiq\tests\guidance.test.mjs
```

See [contributing](../../CONTRIBUTING.md) for the full offline contract suite.
Static and synthetic checks do not prove model compliance, host activation,
provider rollout or live Microsoft 365 behavior.

## License

See [LICENSE](../../LICENSE) and [NOTICES.TXT](../../NOTICES.TXT).
