# Instruction Review & Quality Audit

This reference defines how to evaluate, diagnose, and improve existing agent instructions. Use it whenever you touch instructions — whether auditing an existing agent, adding a capability, or responding to a user who says their agent "doesn't work well."

> **When to use this guide:**
> - User asks to "review", "improve", "audit", or "fix" their agent's instructions
> - User reports the agent "doesn't use the right tool", "gives generic answers", or "doesn't follow the process"
> - You are adding a capability or plugin and need to update instructions (mandatory per the editing workflow)
> - You are reviewing an agent before deployment

---

## The Core Problem: Output-Focused vs Process-Focused Instructions

Most instruction failures share a single root cause: **the instructions describe what the response should look like, not how the agent should produce it.**

### Output-focused (❌ anti-pattern)

Tells the model the *shape* of the answer — tone, format, length, style — but gives it no strategy for *finding* the answer.

```md
You are a helpful HR assistant. Provide accurate answers about company policies.
Include policy numbers when available. Be concise and professional. Use bullet points.
Format responses with headers when appropriate.
```

**Why this fails:**
- The model has no idea WHERE to look (SharePoint? Email? Web search?)
- It doesn't know WHEN to use which capability
- It will hallucinate policy numbers because you told it to "include" them but didn't tell it where to find them
- Every response will have the same shape regardless of the question

### Process-focused (✅ correct pattern)

Tells the model the *steps* to follow, *which tools* to use, and *what decisions* to make at each point.

```md
# OBJECTIVE
Help employees find answers to HR policy questions using the company's official policy documents.

# CAPABILITIES
- **SharePoint knowledge** — Search the HR Policies document library for official policy documents. This is the PRIMARY source of truth. Always search here first.
- **People knowledge** — Look up employee information (manager, department, location) when the question requires org context.
- **Email** — Search the user's email for HR communications only when the policy documents don't have the answer and the user mentions a specific email or announcement.

# WORKFLOW

## Step 1: Classify the question
- **Goal:** Determine if this is a policy lookup, a process question, or an org question.
- **Action:** Read the user's message. Identify the topic (benefits, time off, expenses, etc.).
- **Transition:** If policy → Step 2. If org/people → use People knowledge directly. If unclear → ask one clarifying question.

## Step 2: Search policy documents
- **Goal:** Find the authoritative answer in SharePoint.
- **Action:** Search the HR Policies library for documents matching the topic. Read the relevant sections.
- **Transition:** If found → Step 3. If not found → tell the user: "I couldn't find a policy on [topic]. Contact hr@company.com for help."

## Step 3: Respond with citation
- **Goal:** Give a clear, traceable answer.
- **Action:** Summarize the policy in 2-4 bullets. Include the document name and section. If the policy references a form or process, link to it.
- **Constraint:** Never paraphrase in a way that changes the policy's meaning. If the policy is ambiguous, quote it directly and note the ambiguity.

# RESPONSE RULES
- Cite the source document for every factual claim.
- If you cannot find the answer, say so. Do not guess.
- One clarifying question at a time, only when needed.
```

**Why this works:**
- Every capability has a named role and a WHEN clause
- The model has a decision tree, not just a personality description
- Failure cases are handled ("if not found → tell the user")
- The response rules are minimal and complementary to the process, not a substitute for it

---

## Diagnostic Checklist

Run this checklist against any set of instructions. Each failed check is a specific, fixable problem.

### A. Capability Coverage

| # | Check | How to verify | Failure signal |
|---|-------|---------------|----------------|
| A1 | Every capability in the manifest has a matching section in instructions | Compare `capabilities[]` array in `declarativeAgent.json` against instruction text | Capability is configured but never mentioned → model won't know when to use it |
| A2 | Every action/plugin has a matching section in instructions | Compare `actions[]` array against instruction text | Plugin exists but instructions don't reference it → model may never invoke it |
| A3 | Each capability section has a WHEN clause | Look for conditional language: "when the user asks about...", "use X for Y" | Capability is mentioned but model has no trigger for using it |
| A4 | Each capability section has a HOW clause | Look for specific actions: "search for...", "query by...", "filter using..." | Capability is named but model doesn't know how to use it effectively |

### B. Process Structure

| # | Check | How to verify | Failure signal |
|---|-------|---------------|----------------|
| B1 | Instructions contain at least one workflow or decision tree | Look for steps, numbered sequences, or if/then rules | Instructions are a flat list of personality traits — model has no strategy |
| B2 | Workflows have Goal → Action → Transition per step | Each step names what it achieves, what to do, and when to move on | Steps are vague or lack transitions → model gets stuck or skips ahead |
| B3 | Decision points have explicit if/then rules | Ambiguous situations have defined behavior | Model guesses instead of following a prescribed path |
| B4 | Failure cases are handled | "If not found", "if unclear", "if error" have defined responses | Model hallucinates or goes silent when things don't go as expected |

### C. Anti-Pattern Detection

| # | Anti-pattern | What it looks like | Fix |
|---|---|---|---|
| C1 | **Output-only instructions** | 80%+ of text is about tone, format, length, style | Add a CAPABILITIES section and at least one WORKFLOW |
| C2 | **Personality-first instructions** | Opens with "You are a friendly, helpful..." and stays there | Move personality to a short RESPONSE RULES section at the end; lead with OBJECTIVE and CAPABILITIES |
| C3 | **Capability gap** | `declarativeAgent.json` has 3 capabilities and 2 plugins; instructions mention 1 | Add a section per missing capability with WHEN and HOW |
| C4 | **Orphaned starters** | Conversation starter references a capability not mentioned in instructions | Either add the capability to instructions or remove the starter |
| C5 | **Tool ambiguity** | Instructions say "search for documents" without specifying which capability | Name the capability: "Search the **HR Policies** SharePoint library" |
| C6 | **Hallucination invitation** | "Include [specific data] in your response" without specifying where to find it | Add: "Retrieve [data] from [capability]. If not found, do not include it." |
| C7 | **Compound tasks** | "Extract metrics and summarize findings and create a report" | Break into separate steps with transitions |
| C8 | **Over-restriction** | Long list of "do NOT" rules with few "DO" rules | Rewrite as positive directives; keep restrictions to genuine guardrails only |
| C9 | **Missing reasoning calibration** | No indication of how deep the model should think | Add a reasoning header: "Short answer only" or "Break the problem into steps" depending on task complexity |
| C10 | **No self-evaluation** | Instructions end without a verification step | Add: "Before responding, confirm: [checklist]" |

---

## Review Workflow

When reviewing instructions, follow this sequence:

### Phase 1: Inventory

1. Read `declarativeAgent.json` — list all capabilities, actions, conversation starters, and the schema version
2. Read `instructions.txt` (or inline instructions) — note the structure (or lack of it)
3. If API plugins exist, read the `ai-plugin.json` to understand what functions are available
4. If MCP plugins exist, read the plugin manifest to understand what tools are available

### Phase 2: Diagnose

Run the **Diagnostic Checklist** (sections A, B, C above). Record every failed check.

### Phase 3: Report

Present findings to the user in this format:

```
## Instruction Review

### What's working
- [List things that are correctly structured]

### Issues found
| # | Issue | Severity | Description |
|---|-------|----------|-------------|
| 1 | C1 — Output-only | High | Instructions describe response format but have no workflow for finding answers |
| 2 | A1 — Capability gap | High | Email capability is configured but never referenced in instructions |
| 3 | C6 — Hallucination risk | Medium | "Include policy numbers" but no instruction on where to find them |

### Recommended structure
[Show the proposed skeleton with sections mapped to their capabilities]
```

### Phase 4: Rewrite (only after user confirms)

Follow **Detect → Inform → Ask** — the same protocol used for JSON errors. Present the diagnosis, propose the fix, wait for approval before rewriting.

When rewriting:
- Preserve any existing content that passes the checklist
- Do NOT invent domain-specific content (policy names, SharePoint URLs, process details) — ask the user
- Structure using the process-focused template from this guide
- Ensure every configured capability appears in the instructions with WHEN and HOW clauses

---

## Before/After Examples

### Example 1: Knowledge Base Agent

**Capabilities configured:** `OneDriveAndSharePoint` (scoped to `/sites/IT-KB/Documents`), `WebSearch` (scoped to `docs.contoso.com`)

**❌ Before (output-focused):**
```md
You are an IT knowledge base assistant. Help users find answers to technical questions.
Be thorough but concise. Use bullet points when listing steps. Always be professional
and patient. If you don't know the answer, say so politely.
```

**Issues:** C1 (output-only), A1 (two capabilities configured, zero referenced), C5 (tool ambiguity — "find answers" doesn't say where), C6 (no sourcing strategy)

**✅ After (process-focused):**
```md
# OBJECTIVE
Help employees resolve IT questions by searching internal documentation and company-approved external resources.

# CAPABILITIES
- **SharePoint IT Knowledge Base** — Search the IT-KB document library for internal troubleshooting guides, SOPs, and configuration docs. This is the PRIMARY source. Always search here first.
- **Web Search (docs.contoso.com)** — Search the public-facing documentation site for product guides and release notes. Use this ONLY when the internal KB doesn't have the answer.

# WORKFLOW

## Step 1: Understand the question
- **Goal:** Identify what the user needs help with.
- **Action:** If the question is clear, proceed. If vague (e.g., "it's not working"), ask ONE clarifying question: what system, what error, what they were trying to do.
- **Transition:** Once clear → Step 2.

## Step 2: Search internal KB
- **Goal:** Find the answer in the IT Knowledge Base.
- **Action:** Search SharePoint IT-KB for documents matching the topic. Read the most relevant document.
- **Transition:** If found → Step 3. If not found → Step 2b.

## Step 2b: Search external docs
- **Goal:** Check company-approved external documentation.
- **Action:** Search docs.contoso.com for the topic.
- **Transition:** If found → Step 3. If not found → Step 4.

## Step 3: Respond
- **Action:** Summarize the solution in numbered steps. Cite the source document name. If the solution involves a tool or system, name it explicitly.
- **Constraint:** Do not combine information from multiple documents without noting that the answer draws from multiple sources.

## Step 4: Escalation
- **Action:** Tell the user: "I couldn't find documentation on this topic. Please submit a ticket to the IT help desk at helpdesk@contoso.com or via the ServiceNow portal."

# RESPONSE RULES
- Cite the source for every answer.
- One clarifying question at a time.
- If multiple solutions exist, present the simplest first.
```

---

### Example 2: Agent with API Plugin

**Capabilities configured:** `Email`, API plugin (Repairs API with GET/POST/PATCH/DELETE)

**❌ Before (output-focused):**
```md
You help manage repair tickets and can access email. Be helpful and professional.
When showing repairs, display them in a clear format with the ticket ID, title,
status, and assignee. For new tickets, confirm the details before creating them.
```

**Issues:** C1 (output-only), A2 (Repairs API not explained), C5 ("can access email" — when? for what?), B3 (no decision rules for CREATE vs SEARCH vs UPDATE)

**✅ After (process-focused):**
```md
# OBJECTIVE
Help users search, create, and manage repair tickets. Use email context when relevant to a repair.

# CAPABILITIES
- **Repairs API** — Use this for all repair operations:
  - `getRepairs` — search/list tickets. Use when the user asks to find, list, or check repairs.
  - `getRepairById` — get ticket details. Use when the user references a specific ticket ID.
  - `createRepair` — create a new ticket. Use when the user reports a new issue.
  - `updateRepair` — modify a ticket. Use when the user asks to reassign, change status, or edit a repair.
  - `deleteRepair` — remove a ticket. Use when the user explicitly asks to delete. Always confirm first.
- **Email** — Search the user's email for repair-related correspondence. Use ONLY when: (a) the user mentions an email about a repair, or (b) you need to find a reference number or prior communication mentioned by the user.

# WORKFLOW

## When user asks to find a repair
1. If they provide a ticket ID → call `getRepairById`.
2. If they describe a repair ("the broken printer thing") → call `getRepairs` and filter by keyword in the response.
3. If no results → tell the user no matching repairs were found and ask if they'd like to create one.

## When user asks to create a repair
1. Gather: title, description, assignee (ask if not provided).
2. Confirm the details with the user before calling `createRepair`.
3. After creation, show the new ticket ID.

## When user asks to update a repair
1. Identify the ticket (by ID or search).
2. Confirm what to change.
3. Call `updateRepair`. Show the updated ticket.

## When user asks to delete a repair
1. Identify the ticket.
2. **Always confirm:** "Are you sure you want to delete repair #[id] — [title]?"
3. Only call `deleteRepair` after explicit confirmation.

# RESPONSE RULES
- Always show the ticket ID when referencing a repair.
- Confirm before any destructive operation (create, update, delete).
- If the user's intent is ambiguous (search vs create), ask: "Would you like me to search for an existing repair or create a new one?"
```

---

### Example 3: MCP Server Agent

**Capabilities configured:** MCP plugin (Microsoft Docs with `docs_search` tool)

**❌ Before (output-focused):**
```md
You are a documentation search assistant. Help users find relevant Microsoft
documentation. Provide clear, well-organized responses. Include links when available.
Summarize key points from the documentation you find.
```

**Issues:** C1 (output-only), A2 (MCP tool not referenced), C6 ("include links when available" — where do they come from?), C9 (no reasoning calibration)

**✅ After (process-focused):**
```md
# OBJECTIVE
Help users find and understand official Microsoft documentation by searching the Microsoft Learn catalog.

# CAPABILITIES
- **Microsoft Docs Search** (`docs_search`) — Search official Microsoft and Azure documentation. This is your ONLY data source. Do not answer from general knowledge — always search first.

# WORKFLOW

## For factual questions ("How do I configure X?", "What are the requirements for Y?")
1. Call `docs_search` with the user's question as the query.
2. If results are returned → summarize the most relevant document. Include the document title and link.
3. If no results → rephrase the query (broader terms) and search again.
4. If still no results → tell the user: "I couldn't find official documentation on this topic. Try browsing https://learn.microsoft.com directly."

## For comparison questions ("What's the difference between X and Y?")
1. Call `docs_search` for X. Note key attributes.
2. Call `docs_search` for Y. Note key attributes.
3. Present a side-by-side comparison citing both documents.

## For troubleshooting ("I'm getting error Z")
1. Call `docs_search` with the error message or code.
2. If a troubleshooting guide is found → walk through the steps.
3. If not → search for the product/service name + "known issues."

# RESPONSE RULES
- Short answer only for simple lookups. Break the problem into steps for troubleshooting.
- Always link to the source document.
- Never answer without searching first. Your general knowledge may be outdated.
```

---

## Minimum Quality Bar

Instructions pass the quality bar when ALL of these are true:

1. **Every capability in the manifest is named in the instructions** with a WHEN clause
2. **At least one workflow exists** with Goal → Action → Transition (or equivalent decision rules)
3. **Failure cases are handled** — the instructions say what to do when a search returns nothing, a tool fails, or the user's question is ambiguous
4. **Output-focused content is ≤20% of the total** — tone, format, and style rules exist but don't dominate
5. **No hallucination invitations** — every "include X" statement has a corresponding "retrieve X from Y" instruction

If any of these fail, the instructions need improvement before deployment.
