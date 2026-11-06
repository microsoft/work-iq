# Tasks (Planner)

Use the WorkIQ **entity tools** for task/follow-up requests whose data lives in
Microsoft 365 — **not** the agent host's local task files, an internal task database, or any
other on-disk task tracker. If the user says "add a task", "remind me to…", "follow up
with…", "mark … done", or "list my tasks", that is M365 data: route it to WorkIQ.

> **⚠️ Do not fall back to local/builtin task storage.** Creating a markdown file or
> inserting into a local database does **not** satisfy an M365 task request and is not
> recoverable by the user in Planner. If a WorkIQ task call fails, report the
> failure — do not silently substitute local storage.

Exact plan/task requests stay structured. Ordinary caller-owned work context uses
`retrieve` with source-based strategy selection under
[retrieval policy](retrieve-work-iq.md); [ask](ask-work-iq.md) requires intentional
delegation and never supplies authoritative mutation IDs. Apply
[confirmation and recovery](troubleshooting.md) to every Planner mutation.

## Planner — canonical paths

| Operation | Tool | Path |
|-----------|------|------|
| List my plans | `fetch` | `/me/planner/plans` |
| List tasks in a plan | `fetch` | `/planner/plans/{planId}/tasks` |
| Create a task | `create_entity` | parentUrl `/planner/tasks` (body includes `planId`) |
| Update / complete a task | `update_entity` | `/planner/tasks/{taskId}` |
| Delete a task | `delete_entity` | `/planner/tasks/{taskId}` |

Planner task body fields: `planId`, `title`, `bucketId`, `assignments`, `dueDateTime`,
`percentComplete` (`0` = not started, `50` = in progress, `100` = complete).

- **Resolve named plans structurally:**
  1. Fetch owned plans with `/me/planner/plans?$select=id,title,owner`.
  2. Search that full result locally for the requested title or keywords. Do not stop after the
     first page if the response includes `@odata.nextLink`.
  3. If the plan is not in `/me/planner/plans`, resolve a relevant backing group.
    Fetch `/me/joinedTeams?$select=id,displayName,description` to get group IDs for Teams the
    user has joined, match the requested team/group from returned names, then fetch
    `/groups/{group-id}/planner/plans?$select=id,title,owner` to get the plan ID. Do not pass
    `$top` to `/me/joinedTeams`, even in a batched `fetch`.
  4. If that `/me/joinedTeams` lookup (no `$top`) misses, use a trusted supplied group ID or an already
    returned assigned task's `planId`; do not guess groups or enumerate unrelated groups.
  5. If you have an owner/group ID but not the group-plans path, use
    `/planner/plans?$filter=owner eq '{Group or UserId}'&$select=id,title,owner`.
  6. These are alternatives chosen from available identity evidence, not a mandatory
    exhaustive sweep. If focused structured resolution misses, report the searched
    scope; no automatic semantic resolver. Explicit access/policy denial stops
    the affected workflow immediately, without another path, tool, or agent.
- **Private tasks and "Assigned to me" tasks:** use `/me/planner/tasks`.
- **Enforce filtering on Planner collection GETs:**
  - `GET /planner/plans` requires `$filter=owner eq '{Group or UserId}'`.
  - `GET /planner/tasks` requires a `$filter` containing `planId`.
- **Forbidden create plans/tasks paths** Do not use `create_entity`, `update_entity`, `delete_entity` for the following paths
  - /me/planner/plans
  - /me/planner/tasks
  - /users/{user-id}/planner/plans
  - /users/{user-id}/planner/tasks
  - /groups/{group-id}/planner/plans

- **Mark a Planner task done:** `update_entity` with `{"percentComplete":100}`.
- **Planner gotcha:** `update_entity` / `delete_entity` on Planner resources
  require the current `@odata.etag` (an `If-Match` precondition). Fetch the task first to
  read its etag and supply it through the live tool's supported headers. If a write
  returns `412`, reread and reconcile concurrent state rather than blindly refreshing
  the etag and overwriting. Obtain renewed confirmation when the change differs.
  If the required header cannot be supplied, report the limitation rather than omitting it.


## Resolve-then-act (do not loop)

1. Resolve a task within the exact plan; a matching title alone may be ambiguous.
   Preserve the returned task, plan, bucket, and assignee identity types.
2. Before writing, load the [Planner action prerequisites](tasks-actions-work-iq.md).
   Use [get_schema](get-schema-work-iq.md) for an unfamiliar create/update body.
   Examples are parameterized request shapes; task titles are not defaults.

## Examples

### Create a Planner task
```json
{ "parentUrl": "/planner/tasks",
  "jsonBody": {"planId":"{planId}","title":"{confirmedTitle}"} }
```

### Mark a Planner task complete
```json
{ "entityUrl": "/planner/tasks/{taskId}",
  "headers": {"If-Match":"{currentTaskEtag}"},
  "jsonBody": {"percentComplete":100} }
```
