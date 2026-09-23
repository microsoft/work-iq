# call_function

Invoke a documented, side-effect-free GET function. Function names need not
contain parentheses: supported delta paths also belong here. Operations with
a request body, such as `getSchedule`, use [do_action](do-action-work-iq.md);
classify their effects separately rather than assuming every action is a write.

## Parameters and routing

| Parameter | Contract |
|---|---|
| `functionUrl` | Required server-relative path, starting with `/`, without scheme, authority, or API-version prefix; include supported inline parameters and query |

No `jsonBody` is needed for these GET functions. Resolve the exact tool and
schema from the connected catalog. For an unknown function use
[get_schema](get-schema-work-iq.md) with its supported read operation; do not
probe alternative tool names or infer support from Graph documentation.

| Intent | Canonical owner |
|---|---|
| Exact named drive-item search | [Files](files-work-iq.md): exact facets, drive IDs, OData escaping and URL encoding |
| Reminders with a resolved time window and explicit coverage | [Calendar](calendar-work-iq.md): verify live reminder syntax |
| Explicit structured synchronization/change tracking | Delta contract below and domain owners |
| Ordinary calendar window or exact entity/collection | [fetch](fetch-work-iq.md), not delta |
| Open-ended "what's new?" or project catch-up | Caller-owned [retrieval](retrieve-work-iq.md), not keyword-triggered delta |

## Explicit delta and checkpoints

**Intent/prerequisites:** use delta only for an explicit structured delta/change
tracking request. Resolve the collection, authorized scope, and any required
calendar window. Establish whether a compatible saved checkpoint exists.
These paths are inherited guidance examples, not newly live-validated contracts:

- [Mail](mail-work-iq.md): `/me/mailFolders/{folderId}/messages/delta`.
- [Calendar](calendar-work-iq.md): `/me/calendarView/delta` with its required
  resolved initial window.
- Contacts: `/me/contacts/delta`, only when the connected surface exposes it.
- [Teams](teams-work-iq.md): supported channel-message delta for the resolved
  team/channel; preserve that domain's identity and query restrictions.

**Operation/query:** invoke the supported delta path with `call_function`.
Never call it through `fetch`, or approximate it with `lastModifiedDateTime`
filtering that misses removals.

1. **Initial sync:** no prior checkpoint means an initial synchronization.
   Page through every returned `@odata.nextLink` until `@odata.deltaLink`
   establishes the checkpoint for that scope. Initial results do not prove
   what changed "since yesterday" or another past time.
2. **Resume:** use the saved link for the same collection, identity, scope, and
   original calendar window. Preserve its path and query exactly; do not append
   new filters, change dates, invent `$deltatoken`/`$skiptoken`, or restart under
   the guise of a historical resume.
3. **Continuations:** follow the returned `@odata.nextLink` with this same tool;
   when a final `@odata.deltaLink` is reached, retain it as the next checkpoint.
   If interrupted, retain the continuation and report the sync incomplete, not
   a complete change set.

**Safe link conversion:** accept only links belonging to the expected supported
WorkIQ/Graph service and collection. If the link is absolute and the tool
requires a relative path, remove only the verified scheme/authority and known
API-version prefix. Preserve the remainder byte-for-byte, including query order,
encoding, and opaque tokens. Never decode/re-encode cursors, follow an unexpected
host, or send a token to another service. If safe conversion is not established,
report the limitation rather than guessing. Treat checkpoint links as sensitive.

**Effects/completion:** read-only synchronization. Preserve returned removals
(`@removed`) and their reason/identity alongside other changes. A removal from
the tracked collection is not automatically permanent deletion everywhere.
Distinguish additions from updates only when saved state and documented
response semantics support that distinction; initial items are not automatically
new additions. Do not invent counts, missing values, or item history.

**Failures:** follow [operation-aware recovery](troubleshooting.md). Denials
stop without alternate paths/strategies. Invalid/expired checkpoints cannot
establish historical continuity: disclose the gap and establish an authorized
new baseline if needed. A bounded transient retry must retain the exact cursor
and successful prior pages, not start a new sweep.
