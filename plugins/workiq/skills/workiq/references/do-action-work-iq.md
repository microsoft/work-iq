# do_action

Classify the requested effect first: read-only getSchedule and structured search
are not mutations. For mutations read [mutation prerequisites](mutation-work-iq.md)
and the selected domain action recipe before acting. Suggested wording, a draft
and sending differ; ambiguous intent remains read-only.

| Parameter | Type | Contract |
| --- | --- | --- |
| actionUrl | string | Exact server-relative action path; preserve IDs and encode query values |
| jsonBody | object or string | Advertised object or encoded JSON body; preserve field casing/wrappers |

An unfamiliar action body requires get_schema with operationType action.
An action request schema does not establish response fields.
Use create_entity for a new stored resource; GET functions use call_function.
Known domain bodies need no redundant preflight. Before recovery load
[troubleshooting](troubleshooting.md); no ambiguous replay or denial bypass.

## Routes

| Route | Intent | Read |
| --- | --- | --- |
| action-mail | Mail actions | [mail-actions](mail-actions-work-iq.md) |
| action-calendar | Meeting actions | [calendar-actions](calendar-actions-work-iq.md) |
| action-availability | Read free/busy | [availability](calendar-availability-work-iq.md) |
| action-files | File actions | [files-actions](files-actions-work-iq.md) |
| action-teams | Send/edit/reply/react | [teams-actions](teams-actions-work-iq.md) |
| action-state | Hide/read state | [teams-state](teams-state-work-iq.md) |
| action-presence | Presence | [presence](teams-presence-work-iq.md) |
| action-search | SharePoint search | [SharePoint](sharepoint-work-iq.md) |
