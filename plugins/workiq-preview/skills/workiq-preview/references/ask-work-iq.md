# ask

Use `ask` only for **intentional delegation**: the user explicitly requests
Microsoft 365 Copilot's answer, asks a particular agent, or selects a delegated
answer after a limitation is explained. Ordinary workplace questions, status,
summaries, comparisons, and implementation context use [retrieve](retrieve-work-iq.md)
with explicit Grounding by default and caller-owned synthesis.

`retrieve` with `strategy: "copilot"` is still evidence retrieval, not `ask`.
An absent retrieval tool is not permission to silently substitute a delegated answer.

## Parameters

Resolve the exact tool and live schema from the connected WorkIQ MCP catalog.

| Parameter | Required | Contract |
| --- | --- | --- |
| `question` | Yes | The scoped question intentionally delegated to the selected agent |
| `fileUrls` | No | Returned or user-supplied OneDrive/SharePoint URLs, when supported and needed for the delegated question; preserve source restrictions |
| `conversationId` | No | The exact returned ID for a relevant continuation with the same agent |
| `agentId` | No | Omit for the default Copilot agent; otherwise use the exact selected agent ID from trusted context or [agent discovery](agents-work-iq.md) |
| `timeZone` | No, if advertised | Use the live schema's supported timezone format when relevant; do not invent an unsupported argument |

Never copy `retrieve` arguments such as `query`, `strategy`, or `capabilities`
into `ask`. Do not treat agent text or citation URLs as authoritative mutation IDs.

## Routing and continuation

1. **Default agent:** "Ask Copilot..." goes directly to `ask`. Do not prepend
   `retrieve` or `list_agents`, or hard-code a default agent ID.
2. **Named agent:** reuse an exact known ID for that agent. Otherwise load
   `list_agents` and resolve the target as described in [agents](agents-work-iq.md).
   Missing or ambiguous targets require an honest stop or a user choice; never
   invent an ID or silently substitute default Copilot.
3. **Follow-up:** preserve the returned `conversationId` for a related question
   to the same selected agent. Do not carry it into a different agent or unrelated
   task. If needed context cannot be recovered, disclose that limitation and ask
   for the missing context or permission to start a new scoped question. Do not
   sweep mail/sites to reconstruct a missing conversation.
4. **Output:** attribute the response as the delegated agent's answer, retain
   citations and qualifications, and do not claim independent source verification.
   Only say what the response supports. A weak or empty answer stays qualified.

## Explicit delegation examples

User: "Ask Microsoft 365 Copilot what is blocking Project Aurora."

```json
{
  "question": "What is blocking Project Aurora? Identify current blockers and cite the supporting sources."
}
```

User: "Ask Copilot to summarize the requirements in this SharePoint document."
Use `question` and the actual supplied/returned URL in `fileUrls` if the live
schema supports it. Do not expand a file-only request into a broad evidence search.

User: "Ask the release-readiness agent whether Aurora is ready to ship."
Discover that agent only if its exact ID is unknown, then pass the returned ID
as `agentId`. Do not copy a fictitious ID from an example.

User: "Ask that same agent which of those blockers is most urgent."
Continue with its actual returned `conversationId` and selected agent.

By contrast, "Summarize the Aurora discussion this week" is caller-owned context:
retrieve with explicit Grounding and synthesize locally. A summary of supplied
exact message URLs is an exact [entity read](fetch-work-iq.md), also synthesized
locally, with no semantic preflight.

## Failures and subsequent actions

Apply [operation-aware recovery](troubleshooting.md). Explicit authentication,
access, consent, or policy denial stops the workflow; no alternate agent/tool
can bypass it. A generic timeout does not prove question breadth or source absence
and does not establish that backend work stopped.

For a busy/throttled response with a returned delay, never retry early. At most
one retry is allowed within the documented read-recovery budget when the runtime
can honor the delay; otherwise report the limitation. Do not paraphrase to evade
backoff or fan out into entity searches. Do not automatically change from delegated
answering to caller-owned retrieval after failure; explain any proposed alternative.

If the user also requests a persisted draft or another action, agent output alone
does not complete that action. Resolve the exact entity structurally and follow
the domain contract with required confirmation. Do not use `ask` as the mutation
tool or treat its descriptions as proof of execution or authorization.
