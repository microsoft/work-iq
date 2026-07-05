---
name: multi-plan-search
description: Search for tasks across all your Planner plans by keyword, assignee, status, or priority — unified cross‑plan task discovery in one view.
---

# Multi-Plan Search

Search for tasks across every Planner plan you have access to. Filter by keyword, assignee, status, priority, or due date to find specific tasks regardless of which plan they live in. Get a unified cross-plan view that brings together work scattered across multiple plans into a single result set.

## When to Use

- "Find all my urgent tasks across all plans"
- "Search for tasks about 'API' in any plan"
- "What's overdue across all my plans?"
- "Find everything assigned to Firstname1 across all plans"
- "Show all tasks due this week regardless of plan"

## Instructions

### Step 1: Identify the User

```
workiq-ask (
  question: "What is my profile information including display name, email address, and time zone?"
)
```

Extract **displayName**, **email**, and **timeZone**.

### Step 2: Get All Plans

```
workiq-ask (
  question: "List all Planner plans I have access to, including each plan's name."
)
```

Collect all plans the user has access to. Note each plan name for subsequent queries.

### Step 3: Resolve Search Targets

If the user searches by person name, resolve the person:

```
workiq-ask (
  question: "Look up the person named <person name or email> in the directory. Return their display name and email."
)
```

### Step 4: Search Tasks Across Plans

Query tasks across plans based on the user's search criteria. Consolidate related filters into a single question where possible:

**Search by assignee:**
```
workiq-ask (
  question: "Find all Planner tasks assigned to <person name> across all my plans. For each task include the task title, plan name, assignee, due date, status, and priority."
)
```

**Search by status:**
```
workiq-ask (
  question: "Find all Planner tasks with status 'in progress' across all my plans. For each task include the task title, plan name, assignee, due date, and priority."
)
```

**Search by priority:**
```
workiq-ask (
  question: "Find all urgent priority Planner tasks across all my plans. For each task include the task title, plan name, assignee, due date, and status."
)
```

**Search by due date:**
```
workiq-ask (
  question: "Find all Planner tasks due on or before <date> across all my plans. For each task include the task title, plan name, assignee, due date, status, and priority."
)
```

**Search by keyword:**
```
workiq-ask (
  question: "Find all Planner tasks containing '<keyword>' in the title across all my plans. For each task include the task title, plan name, assignee, due date, status, and priority."
)
```

**Combined filters (overdue tasks for a person):**
```
workiq-ask (
  question: "Find all overdue Planner tasks assigned to <person name> across all my plans. For each task include the task title, plan name, due date, status, and priority."
)
```

### Step 5: Aggregate and Sort Results

Combine results from all plans into a unified list. Apply any remaining client-side filters:

- **Keyword match** — filter task titles containing the search term (case-insensitive)
- **Overdue filter** — dueDateTime < today AND status ≠ completed
- **Date range** — tasks due within a specific window

Sort results by:
1. Priority (urgent first)
2. Due date (soonest first)
3. Plan name (alphabetical)

### Step 6: Present Unified Results

## Output Format

```
🔍 MULTI-PLAN TASK SEARCH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔎 Query: {search description, e.g., "urgent tasks assigned to me"}
📁 Plans Searched: {N}
📊 Results: {N} tasks found

📊 RESULTS BY PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📁 Sprint 42:              {N} matches
  📁 Product Launch:         {N} matches
  📁 Q1 Marketing Campaign:  {N} matches
  📁 Onboarding:             {N} matches

🔴 URGENT / IMPORTANT ({count})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 #   Task                       Plan              Assignee        Due         Status
 1   Fix payment gateway        Sprint 42         Firstname1 Lastname1  Mar 5       🔄 In Progress  ⏰
 2   Security vulnerability     Sprint 42         Firstname2 Lastname2  Mar 8       ⬜ Not Started
 3   Launch prep checklist      Product Launch    You                   Mar 10      🔄 In Progress
 4   API rate limiting          Sprint 42         Firstname3 Lastname3  Mar 12      ⬜ Not Started

🟡 MEDIUM / LOW ({count})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 #   Task                       Plan              Assignee        Due         Status
 5   Update API documentation   Sprint 42         You             Mar 15      ⬜ Not Started
 6   Design email template      Q1 Marketing      Firstname1 Lastname1  Mar 18      🔄 In Progress
 7   Review onboarding flow     Onboarding        You             Mar 20      ⬜ Not Started
 8   Social media calendar      Q1 Marketing      Firstname3 Lastname3  Mar 22      ⬜ Not Started

📊 SEARCH SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊 Total matches: {N}
  ⏰ Overdue: {N}
  🔴 Urgent/Important: {N}
  ⬜ Not Started: {N}
  🔄 In Progress: {N}
  📅 Due this week: {N}

👤 BY ASSIGNEE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  You:           {N} tasks across {N} plans
  Firstname1 Lastname1:  {N} tasks across {N} plans
  Firstname2 Lastname2:  {N} tasks across {N} plans
  Firstname3 Lastname3:  {N} tasks across {N} plans

🛠️ ACTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "mark #1 complete"           — complete a task
  "assign #2 to Firstname3"    — reassign
  "show only overdue"          — refine results
  "search for 'design'"        — new keyword search
  "drill into Sprint 42"       — view plan details
```

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| Keyword | No* | — | Search term to match in task titles |
| Assignee | No* | — | Person name, email, or "me" |
| Status | No* | — | "notstarted", "inprogress", "completed", "overdue" |
| Priority | No* | — | "urgent", "important", "medium", "low" |
| Due Date | No* | — | "this week", "overdue", or specific date |
| Plans | No | All | Limit to specific plan names |

*At least one filter should be specified for meaningful results.

## Required MCP Tools

| MCP Server | Tool | Purpose |
|---|---|---|
| workiq (Local WorkIQ CLI) | `ask` | User identity, person lookup, plan discovery, and cross-plan task search with filters |

## Tips

- Say "my urgent tasks across all plans" for a quick personal priority check.
- Use keyword search to find tasks by topic: "search for 'migration' across all plans."
- Say "show overdue across all plans" for a cross-plan overdue audit.
- Results are sorted by priority then due date — most critical items surface first.
- After finding tasks, you can ask to drill into a specific plan for more detail.
- For a curated personal view, ask "show my tasks" instead of searching broadly.

## Examples

**Find all urgent tasks assigned to you across every plan:**
> "Show me all my urgent tasks across all plans"

The skill retrieves your user ID, queries every accessible plan filtered by `assignedToUserId` + `priority: urgent`, and returns a unified prioritized list sorted by due date.

---

**Search for tasks by keyword across all plans:**
> "Search for tasks containing 'API' in any plan"

The skill fetches all tasks from every plan and applies a case-insensitive client-side title filter for the term "API", grouping matches by plan in the results view.

---

**Find everything overdue assigned to a teammate:**
> "What tasks is Firstname1 overdue on across all plans?"

The skill resolves "Firstname1" via `ask`, queries each plan filtered by assignee, then applies a client-side overdue filter (dueDateTime < today AND status ≠ completed), presenting all overdue items grouped by plan with an assignee summary.

## Error Handling

**No plans found**
If `ask` returns no plans, the user may not have access to any Planner plans or the WorkIQ CLI connection may have failed. Inform the user and suggest verifying their Microsoft 365 permissions or checking the WorkIQ CLI configuration.

**Person name cannot be resolved**
If `ask` returns no match for a person name or email, prompt the user to provide the full display name or email address. Avoid proceeding with an unresolved assignee filter, as it will return no results.

**Task query returns an error or incomplete data**
If `ask` returns an error for a task search, retry with a narrower scope (e.g., search one plan at a time). Note any plans that could not be searched in the output (e.g., "⚠️ Sprint 42: could not retrieve tasks") and continue with available results.

**Large number of plans causes slow response**
If the user has many plans, a single cross-plan query may return incomplete results. Break the search into multiple `ask` calls scoped to individual plans and aggregate the results.

**No results match the filter**
If `ask` returns zero matching tasks, confirm the filter criteria with the user (e.g., check spelling of a keyword, verify the assignee name, or widen the date range) rather than returning a silent empty result.
