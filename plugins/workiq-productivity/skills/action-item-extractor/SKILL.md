---
name: action-item-extractor
description: "Extract action items with owners, deadlines, and priorities from meeting content"
---

# Action Item Extractor

## Description
Parses Teams meeting chat messages for action-oriented language — commitments, assignments, and deadlines. Cross-references owners against the attendee list and assigns priority levels. Outputs a structured table ready for downstream recipes.

## Prerequisites
| Requirement | Details |
|-------------|---------|
| WorkIQ CLI | User profile, meeting details, chat messages (read queries via `ask`) |

## Required Inputs
| Input | Type | Description |
|-------|------|-------------|
| meeting_identifier | string | Meeting title, keyword, or "latest" |
| date | string (optional) | Target date (defaults to today) |

---

## Execution Steps

### Step 1: Retrieve User Profile, Meeting Details, and Attendees
```
workiq-ask (
  question: "What is my profile including display name and time zone? Also find the meeting matching '<meeting_identifier>' on <date> and list all attendees with their names and email addresses."
)
```
Extract: `displayName`, time zone, attendee list with names and emails.

### Step 2: Pull Teams Meeting Chat Messages
```
workiq-ask (
  question: "Get all chat messages from the Teams meeting '<meeting subject>' held on <date>, including sender names and timestamps."
)
```

### Step 3: Parse for Action-Oriented Language
Scan messages for:
- Explicit assignments: "[name] will...", "AI: [person] to..."
- Commitments: "I'll handle...", "Let me take care of..."
- Deadlines: "by Friday", "end of sprint", "before next meeting"
- Urgency markers: "ASAP", "urgent", "blocker", "critical"

### Step 4: Cross-Reference Owners Against Attendee List
Match extracted owner names to `attendees[]` from Step 1. Flag any unresolved names.

### Step 5: Assign Priority
- **P1 (High)**: Contains urgency markers, blocker language, or executive requests
- **P2 (Medium)**: Standard commitments with deadlines
- **P3 (Low)**: Nice-to-haves, "when you get a chance" items

### Step 6: Format Action Items Table
| # | Description | Owner | Due Date | Priority |
|---|-------------|-------|----------|----------|
| 1 | ... | ... | ... | P1/P2/P3 |

### Step 7: Output Structured Data
Return action items as structured data, plus inline display for the user.

---

## Error Handling
| Error | Solution |
|-------|----------|
| No chat messages | Report "No meeting content found" |
| Unresolved owner names | List as "[Unresolved: partial name]" for user clarification |
| No deadlines mentioned | Mark all due dates as "TBD" |

## Output
Returns: structured action item list with owners, due dates, and priorities. Usable as input for downstream recipes.

## Instructions

This skill is invoked by recipes or orchestration agents — not directly by end users. To invoke it, supply the required inputs and ensure authentication is configured.

1. **Set the meeting identifier**: Pass a meeting title keyword (e.g., `"sprint planning"`), a partial title, or `"latest"` to target the most recent meeting.
2. **Optionally specify a date**: Provide an ISO date string (e.g., `"2026-03-03"`) to scope the calendar lookup. Omit to default to today.
3. **Invoke the skill**: Pass `meeting_identifier` (and optionally `date`) as inputs. The skill will execute Steps 1–7 automatically.
4. **Consume the output**: The structured action item table is returned as data and is also rendered inline for the user.

## Examples

### Example 1: Extract items from today's sprint planning meeting
```json
{
  "meeting_identifier": "sprint planning",
  "date": "2026-03-03"
}
```
**Output (sample)**:
| # | Description | Owner | Due Date | Priority |
|---|-------------|-------|----------|----------|
| 1 | Update API docs with new endpoint schema | Firstname1 Lastname1 | 2026-03-07 | P2 |
| 2 | Fix login blocker bug before release | Firstname2 Lastname2 | 2026-03-04 | P1 |
| 3 | Review UX mocks when you get a chance | [Unresolved: Firstname3] | TBD | P3 |

---

### Example 2: Extract items from the latest meeting (no date specified)
```json
{
  "meeting_identifier": "latest"
}
```
The skill resolves today's date from the user profile time zone, finds the most recently concluded meeting, and parses its chat transcript for action items.

---

### Example 3: Target a specific meeting by keyword on a past date
```json
{
  "meeting_identifier": "Q1 budget review",
  "date": "2026-02-28"
}
```
The skill searches calendar events on February 28 for a meeting matching "Q1 budget review", fetches its Teams chat, and returns all commitments made — including any flagged with "ASAP" or "before end of quarter" language as P1 items.
