---
name: workiq
description: Query Microsoft 365 Copilot for workplace intelligence - emails, meetings, documents, Teams messages, and people information. USE THIS SKILL for ANY workplace-related question where the answer likely exists in Microsoft 365 data. This includes questions about what someone said, shared, or communicated; meetings, emails, messages, or documents; priorities, decisions, or context from colleagues; organizational knowledge; project status; team activities; or any information that would be in Outlook, Teams, SharePoint, OneDrive, or Calendar. When in doubt about workplace context, try WorkIQ first. Trigger phrases include "what did [person] say", "what are [person]'s priorities", "top of mind from [person]", "what was discussed", "find emails about", "what meetings", "what documents", "who is working on", "what's the status of", "any updates on", etc.
---

# WorkIQ

WorkIQ connects AI agents to Microsoft 365 Copilot, providing access to workplace intelligence grounded in organizational data, connected through Microsoft Graph, and personalized through memory and context.

## CRITICAL: When to Use This Skill

**USE WorkIQ for ANY workplace-related question.** If the answer might exist in Microsoft 365 data, try WorkIQ first.

**ALWAYS use WorkIQ when the user asks about:**

| User Question Pattern | Example | Action |
|-----------------------|---------|--------|
| What someone said/shared/communicated | "What did Rob say about X?" | `ask_work_iq` |
| Someone's priorities/concerns/focus | "What's top of mind for Sarah?" | `ask_work_iq` |
| Meeting content/decisions/action items | "What was decided in yesterday's meeting?" | `ask_work_iq` |
| Email content or conversations | "Any emails from John about the deadline?" | `ask_work_iq` |
| Teams messages or chats | "What did the team discuss about the release?" | `ask_work_iq` |
| Document locations or content | "Where is the design doc?" | `ask_work_iq` |
| Colleague expertise or ownership | "Who owns the billing system?" | `ask_work_iq` |
| Calendar/schedule information | "What meetings do I have today?" | `ask_work_iq` |
| Organizational context | "What are the team's Q1 goals?" | `ask_work_iq` |
| Project status or updates | "What's the status of Project X?" | `ask_work_iq` |
| Team activities or work | "What is the team working on?" | `ask_work_iq` |
| Any workplace/work-related context | "Any updates I should know about?" | `ask_work_iq` |

**DO NOT say "I don't have access to emails/meetings/messages"** - use WorkIQ instead!

**When in doubt, use WorkIQ.** It's better to query and get no results than to miss workplace context.

## Configuration

Authentication is automatic with the connected user's credentials.

## MCP Tool

Use the `ask_work_iq` MCP tool to query Microsoft 365 Copilot. The tool accepts a single `question` parameter.

| Tool | Parameters |
|------|------------|
| `ask_work_iq` | `{ "question": "<your question>" }` |

## Quick Start

Query M365 Copilot using the MCP tool:

| Tool | Parameters |
|------|------------|
| `ask_work_iq` | `{ "question": "Who is the expert on TypeSpec?" }` |

## Common Use Cases

### What Someone Is Thinking/Sharing

| Tool | Parameters |
|------|------------|
| `ask_work_iq` | `{ "question": "What are the latest top of mind from Rob I should be aware of?" }` |
| `ask_work_iq` | `{ "question": "What has Sarah been focused on lately?" }` |
| `ask_work_iq` | `{ "question": "What did John share about the project?" }` |
| `ask_work_iq` | `{ "question": "What concerns has my manager raised recently?" }` |

### Find Experts and People

| Tool | Parameters |
|------|------------|
| `ask_work_iq` | `{ "question": "Who is the expert on authentication in our team?" }` |
| `ask_work_iq` | `{ "question": "Who should I talk to about the billing system?" }` |
| `ask_work_iq` | `{ "question": "Who worked on the checkout feature?" }` |

### Retrieve Meeting Context

| Tool | Parameters |
|------|------------|
| `ask_work_iq` | `{ "question": "What decisions were made in my meeting last week about the new feature?" }` |
| `ask_work_iq` | `{ "question": "Summarize the architecture discussion from yesterday's standup" }` |
| `ask_work_iq` | `{ "question": "What action items came out of the sprint planning?" }` |

### Find Emails and Messages

| Tool | Parameters |
|------|------------|
| `ask_work_iq` | `{ "question": "Any recent emails from Rob about the deadline?" }` |
| `ask_work_iq` | `{ "question": "What did the team discuss in Teams about the release?" }` |
| `ask_work_iq` | `{ "question": "Summarize my unread messages from today" }` |

### Locate Documents and Specs

| Tool | Parameters |
|------|------------|
| `ask_work_iq` | `{ "question": "Find the design doc for the authentication system" }` |
| `ask_work_iq` | `{ "question": "What's the latest spec for Project X?" }` |
| `ask_work_iq` | `{ "question": "Where is the API documentation for the payments service?" }` |

### Understand Priorities

| Tool | Parameters |
|------|------------|
| `ask_work_iq` | `{ "question": "Based on discussions with my manager, what are my top priorities?" }` |
| `ask_work_iq` | `{ "question": "What are the team's goals for this quarter?" }` |
| `ask_work_iq` | `{ "question": "What's blocking the release?" }` |

### Ground Implementation in Context

When implementing features, use WorkIQ to ground your work in organizational knowledge:

| Tool | Parameters |
|------|------------|
| `ask_work_iq` | `{ "question": "Based on the latest spec for Project X, what are the backend requirements?" }` |

Then implement based on the response.

## MCP Tool Reference

### ask_work_iq

Query Microsoft 365 Copilot for workplace intelligence.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `question` | string | Yes | The natural language question to ask M365 Copilot |

**Example:**

| Tool | Parameters |
|------|------------|
| `ask_work_iq` | `{ "question": "Who is my manager?" }` |
