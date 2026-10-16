# Teams chat BotDoc: implementation plan and local TDF test

## Goal and acceptance

The public `workiq` plugin should automatically choose the new chat grounding
provider for natural-language requests to read or summarize an existing Teams
chat. The user should not need to say "BotDoc" or supply an API path. An explicit
timeframe becomes `start`/`end`, and a verified existing chat `id` becomes
`threadId`. Broad discovery and unrelated Graph operations keep their routes.

The bundled plugin retains **production** routing. TDF is an explicit local
test override, not a published default. No ecosystem provider configuration is
changed here. The provider must already be deployed and enabled for the selected
environment and signed-in tenant; installation alone does not enable it.

## Implementation plan

1. **Add the routing override to the public skill.** Its description advertises
   specific chat/history requests; its decision table and workflow order select
   BotDoc before generic `ask` synthesis or Graph chat-message listing. Update
   the Teams, `fetch`, and `ask` references so they do not contradict the override.
2. **Own the chat-content procedure in one reference.**
   [Teams chat BotDoc grounding](skills/workiq/references/teams-grounding-work-iq.md)
   covers availability, read-only existing-chat lookup, exact member/topic
   matching, query-derived dates, URL encoding, UTC/DST boundaries, optional
   Windows rendering timezone, line paging, empty/error handling, and local
   synthesis. No executable platform code or new MCP tool is needed.
3. **Opt into WorkIQ TDF locally only.** Temporarily edit `.mcp.json` to the
   URL/header below, preserving OAuth configuration and the `workiq` server
   name. Reinstall that local package to test it. Restore the production URL
   and remove the test header before committing or publishing; these are
   connection changes, not a behavioral rollback of the modified skill.
4. **Check documentation/configuration offline, then test model behavior in a
   clean session.** Focused public-chat checks reuse the existing guidance-test
   parsers without adopting the preview package's routing policy or changing
   its version. Static checks do not prove that a model chose the path; the
   observed natural-language tool trace is the acceptance test.

### TDF configuration

```json
{
  "mcpServers": {
    "workiq": {
      "type": "http",
      "url": "https://test.workiq.svc.cloud.dev.microsoft/mcp",
      "headers": {
        "X-EndpointId": "2"
      },
      "oauthClientId": "ba081686-5d24-4bc6-a0d6-d034ecffed87",
      "oauthPublicClient": true,
      "auth": {
        "redirectPort": 12798
      }
    }
  }
}
```

The header is **`X-EndpointId: 2`**, not the transcript's ambiguous
"X endpoint 2". **WorkIQ TDF is not Substrate TDF.** This selects WorkIQ's
test-in-production environment. TenantSearch's downstream destination is
determined by the deployed provider's base URL/configuration; this client
header does not establish that TenantSearch is using a TDF or SDF ring.

## Test steps, in order

1. **Use the local feature branch and preserve a baseline.** Work from your
   WorkIQ checkout, inspect `git status`, and retain your local changes.
   Before replacing the installed package, record its source/revision and keep
   an accessible known-good package from an approved revision. Do not assume
   the unchanged package version identifies this local content. Do not install
   the marketplace version for the positive test; it lacks the local changes.
2. **Verify the test prerequisites.** The provider/path must be deployed and
   enabled, and the correct work account must have normal OAuth sign-in and
   required tenant consent. TDF routing does not bypass those requirements.
   Verify `.mcp.json` matches the configuration above; do not add tokens or
   backend mailbox/auth/scenario headers.
3. **Use standalone Copilot, not a host-injected connection.** Launch plain
   `copilot` for this isolated test. In an Agency session, the host can replace
   the plugin's `workiq` connection with a localhost proxy while a separately
   configured `workiq-tdf` connection retains the TDF URL/header. Do **not**
   disable that manual connection merely because the names appear duplicative.
   Localhost proves only the local transport, not its upstream destination.
   Verify an upstream trace before calling a proxy-backed result TDF evidence.
   In standalone Copilot, inspect `/plugin list`, `/mcp`, and `/skills list`;
   retain the intended bundled connection and isolate only integrations verified
   to compete with it, recording what to restore. A manual MCP server alone does
   not install a skill, but an installed skill can use a separately selected
   connection. Never mix discovery and fetch tools from different connections.
   Do not alter unrelated plugins, permissions, trust, or sandbox controls.
4. **Install the modified local plugin.** From PowerShell:

   ```powershell
   # Substitute your local WorkIQ checkout:
   Set-Location C:\src\work-iq
   # Only if an older workiq plugin is currently installed:
   copilot plugin uninstall workiq
   copilot plugin install .\plugins\workiq
   copilot plugin list
   ```

   The uninstall line is conditional; omit it if no old copy exists. Confirm
   `workiq` is installed. Copilot caches local plugins: after every source
   change, reinstall the local folder before the next test.
5. **Start a fresh Copilot CLI session.** Exit the old session and launch
   `copilot` from the local repo without resuming this conversation. Existing
   messages in this conversation explicitly name the route and would bias
   the routing test.
6. **Verify the skill, connection, and capability separately.** `/skills list`
   must include the modified `workiq` skill. `/mcp` must show the intended
   connection's effective TDF URL/header, not merely the saved plugin file.
   Complete normal WorkIQ authentication if prompted. Tool prefixes may differ;
   use the catalog's names on that one connection. If a proxy is involved and
   its upstream cannot be established, stop and report unverified routing.
   The fresh request must positively confirm the exact grounding fetch schema
   before directory or chat reads. A path-search miss alone is inconclusive.
7. **Run a natural-language positive test, without endpoint instructions:**

   ```text
   Get my 1:1 Teams conversation with alex@example.com from the last 3 days.
   ```

   Also test:

   ```text
   Summarize my Teams chat with Alex Example yesterday.
   ```

   These identities are synthetic: substitute an authorized test participant
   with an existing chat locally. If the name is ambiguous, provide the exact
   email when asked. Test a group
   or meeting chat only when a real, uniquely identifiable chat is available.
8. **Inspect the actual tool trace, not just the final answer.** Expected:
   load the skill; confirm grounding capability on the selected connection
   once if needed; only then perform read-only, bounded chat/directory
   resolution; call `fetch` on
   `/m365-grounding/fetch` with the actual returned chat ID and requested
   start/end instants; continue line pages when needed; answer from that content.
   A previously known verified chat ID can skip lookup. `create_entity /chats`,
   `ask`, or `/chats/{id}/messages` fetching the requested conversation content
   means this positive test did not select the intended route.
9. **Exercise date, boundary, and negative cases below.** Ask to see exact tool
   inputs/results locally after each run if needed. Inspect the frozen request
   time, timezone, selected chat, URL parameters, per-page statuses/counters,
   and final coverage. Keep raw traces only in authorized local storage; shared
   reports and committed fixtures must use synthetic identities and omit actual
   chat IDs, participant identifiers, message content, and authentication data.
   Do not treat an empty window as a routing failure if the
   intended endpoint succeeded. Stop on authentication/policy denial rather
   than testing a bypass.
10. **Iterate, restore production routing, or roll back the package.** Reinstall
    after each source change and start a fresh session. Restore the integrations
    you isolated. Before committing or publishing, restore
    `https://workiq.svc.cloud.microsoft/mcp`, remove `X-EndpointId`, inspect the
    diff, and reinstall the production-configured package. Validate production
    capability separately; a TDF result is not proof of production availability.
    To undo experimental **behavior**, uninstall the modified cached plugin,
    reinstall the known-good package recorded in step 1, and start a fresh
    session. Verify its baseline routing and intended endpoint. Merely restoring
    the URL/header does not roll back the skill. Package rollback is deliberate
    operator configuration, never an automatic fallback after an authorization
    failure. Do not commit TDF routing or raw test traces.

### Routing and date test matrix

| Prompt / condition | Expected behavior |
| --- | --- |
| Named 1:1 chat, last 3 days | Existing `oneOnOne` chat matching both users; rolling 72-hour `start`/`end` ending at the request instant |
| Named chat yesterday in Los Angeles | Previous local midnight to today's local midnight, converted independently to UTC |
| Named chat November 1 through November 2, 2026 in Los Angeles | `start=2026-11-01T07:00:00Z`, `end=2026-11-03T08:00:00Z` (49 hours across DST) |
| Named chat, no dates | Omit `start`/`end`; disclose returned coverage, not invented all-time completeness |
| Ambiguous person/chat name | Disambiguation; no guessed ID, new chat, or content from the wrong conversation |
| Multiple content pages / split message | Next offset from returned `lineIndex + lineCount`; unchanged thread/window; join text before attributing |
| Search returns unrelated paths, but exact grounding schema succeeds | Search was inconclusive; capability is confirmed; continue on that same connection |
| Exact schema is null/unrelated without explicit unsupported diagnostics | Availability unconfirmed; stop before chat lookup; do not cache absence |
| Grounding explicitly unavailable / 401 / 403 | Actual limitation/error; no silent fallback or authorization workaround |
| Bounded chat lookup has more pages and no exact match | Follow at most three supported lookup pages, then disclose partial lookup and request an exact chat link |
| "Show my Teams chats" | Existing single chat-inventory read; no BotDoc call |
| "List members of General in DevX" | Existing team/channel/member reads; no BotDoc call |
| Supplied exact message URLs | Existing exact batched message reads; no surrounding-content substitution |
| Send, edit, react, mark read, or hide | Existing confirmation/mutation workflows; BotDoc is not an entity-ID resolver |
| Meeting transcript or channel posts | Existing transcript/channel workflow; no invented chat/channel mapping |
| Broad status across mail/files/Teams | Existing cross-workload `ask` route; no scan of every chat |

## Offline checks

From the repo root:

```powershell
npm --prefix tests\workiq-guidance run test:static
```

If the test-only parser dependencies are not yet installed, restore them with
`npm ci --prefix tests\workiq-guidance --ignore-scripts --no-audit --no-fund`,
then rerun. These checks cover the new public chat guidance and the existing
preview documentation contracts, not live tenant permissions or model behavior.

## Authoritative CLI installation reference

[Creating a plugin for GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-creating)
documents local-folder installation, listing loaded components, and reinstalling
cached local plugins after editing. The same workflow can be accessed with
`/plugin` in an interactive session.
