# JSON Schema Reference for M365 Copilot Agents

This document provides schema version information, compatibility rules, and links to the official documentation for M365 Copilot declarative agent and API plugin manifests. The skill targets declarative agent schema v1.8.

For full property details, examples, and JSON structures, refer to the linked official documentation below.

## Schema Resources

### Declarative Agent Manifest Versions

| Version | JSON Schema | Documentation |
|---------|-------------|---------------|
| **v1.8 (skill baseline)** | [schema.json](https://developer.microsoft.com/json-schemas/copilot/declarative-agent/v1.8/schema.json) | [Declarative agent schema 1.8](https://learn.microsoft.com/microsoft-365/copilot/extensibility/declarative-agent-manifest-1.8) |
| v1.7 | [schema.json](https://developer.microsoft.com/json-schemas/copilot/declarative-agent/v1.7/schema.json) | [Declarative agent schema 1.7](https://learn.microsoft.com/microsoft-365/copilot/extensibility/declarative-agent-manifest-1.7) |
| v1.6 | [schema.json](https://developer.microsoft.com/json-schemas/copilot/declarative-agent/v1.6/schema.json) | [declarative-agent-manifest-1.6.md](https://raw.githubusercontent.com/MicrosoftDocs/m365copilot-docs/main/docs/declarative-agent-manifest-1.6.md) |
| v1.5 | [schema.json](https://developer.microsoft.com/json-schemas/copilot/declarative-agent/v1.5/schema.json) | [declarative-agent-manifest-1.5.md](https://raw.githubusercontent.com/MicrosoftDocs/m365copilot-docs/main/docs/declarative-agent-manifest-1.5.md) |
| v1.4 | [schema.json](https://developer.microsoft.com/json-schemas/copilot/declarative-agent/v1.4/schema.json) | [declarative-agent-manifest-1.4.md](https://raw.githubusercontent.com/MicrosoftDocs/m365copilot-docs/main/docs/declarative-agent-manifest-1.4.md) |
| v1.3 | [schema.json](https://developer.microsoft.com/json-schemas/copilot/declarative-agent/v1.3/schema.json) | [declarative-agent-manifest-1.3.md](https://raw.githubusercontent.com/MicrosoftDocs/m365copilot-docs/main/docs/declarative-agent-manifest-1.3.md) |
| v1.2 | [schema.json](https://developer.microsoft.com/json-schemas/copilot/declarative-agent/v1.2/schema.json) | [declarative-agent-manifest-1.2.md](https://raw.githubusercontent.com/MicrosoftDocs/m365copilot-docs/main/docs/declarative-agent-manifest-1.2.md) |
| v1.0 | [schema.json](https://developer.microsoft.com/json-schemas/copilot/declarative-agent/v1.0/schema.json) | [declarative-agent-manifest-1.0.md](https://raw.githubusercontent.com/MicrosoftDocs/m365copilot-docs/main/docs/declarative-agent-manifest-1.0.md) |

### API Plugin Manifest Versions

| Version | JSON Schema | Documentation |
|---------|-------------|---------------|
| **v2.4** | [schema.json](https://aka.ms/json-schemas/copilot/plugin/v2.4/schema.json) | [plugin-manifest-2.4.md](https://raw.githubusercontent.com/MicrosoftDocs/m365copilot-docs/main/docs/plugin-manifest-2.4.md) |
| v2.3 | [schema.json](https://aka.ms/json-schemas/copilot/plugin/v2.3/schema.json) | [plugin-manifest-2.3.md](https://raw.githubusercontent.com/MicrosoftDocs/m365copilot-docs/main/docs/plugin-manifest-2.3.md) |
| v2.2 | [schema.json](https://aka.ms/json-schemas/copilot/plugin/v2.2/schema.json) | [plugin-manifest-2.2.md](https://raw.githubusercontent.com/MicrosoftDocs/m365copilot-docs/main/docs/plugin-manifest-2.2.md) |
| v2.1 | [schema.json](https://aka.ms/json-schemas/copilot/plugin/v2.1/schema.json) | [plugin-manifest-2.1.md](https://raw.githubusercontent.com/MicrosoftDocs/m365copilot-docs/main/docs/plugin-manifest-2.1.md) |

---

## How to Use These References

When building or editing an agent manifest, **fetch the documentation for the version you are using** from the links above. The linked docs contain:

- Complete property definitions with types, descriptions, and constraints
- JSON examples for every object type (capabilities, actions, runtimes, etc.)
- Capability configuration details (WebSearch sites, OneDriveAndSharePoint items_by_url, Email shared_mailbox, etc.)
- API plugin function and runtime structures
- Response semantics and Adaptive Card templates
- MCP Server (RemoteMCPServer) runtime configuration

## Changes in v1.8

Schema v1.8 adds two optional write-capability objects:

| Capability | Purpose |
|------------|---------|
| `EmailActions` | Performs email write operations, including triage, supervised send, delete, inbox rules, auto-reply, and folder management. |
| `MeetingActions` | Performs meeting and calendar operations, including scheduling events, creating time-finding polls, and surfacing time insights. |

Both capabilities require only the `name` property.

### Email actions

`EmailActions` operates independently of the read-only `Email` capability. Scopes configured on `Email`, such as `folders`, `shared_mailbox`, or `group_mailboxes`, do not restrict `EmailActions`.

```json
{
  "capabilities": [
    {
      "name": "EmailActions"
    }
  ]
}
```

### Meeting actions

```json
{
  "capabilities": [
    {
      "name": "MeetingActions"
    }
  ]
}
```

## Changes in v1.7

Schema v1.7 adds these optional properties:

| Property | Location | Purpose |
|----------|----------|---------|
| `editorial_answers` | Manifest root | Defines up to 300 predefined question-answer pairs inline, or references them with `url`, for semantic matching. |
| `default_response_mode` | `behavior_overrides` | Sets the default model-selector mode to `Auto`, `Quick response`, or `Think deeper`. |
| `depends_on` | `conversation_starters[]` | Shows a starter only when every referenced capability is present in the manifest. |

### Editorial answers

Specify exactly one of `answers` or `url`. Inline answers require non-empty `question` and `answer` values. Optional `similarity_thresholds.min` and `.max` values must both be between 0 and 10.

```json
{
  "editorial_answers": {
    "answers": [
      {
        "question": "How do I contact support?",
        "answer": "Email support@contoso.com.",
        "similarity_thresholds": {
          "min": 7,
          "max": 10
        }
      }
    ]
  }
}
```

### Default response mode

```json
{
  "behavior_overrides": {
    "default_response_mode": "Think deeper"
  }
}
```

### Capability-dependent conversation starters

Each dependency requires `name` set to `capabilities` and an `id` matching a capability identifier such as `Email` or `WebSearch`.

```json
{
  "conversation_starters": [
    {
      "title": "Research an update",
      "text": "Summarize internal email and public web updates for this project.",
      "depends_on": [
        {
          "name": "capabilities",
          "id": "Email"
        },
        {
          "name": "capabilities",
          "id": "WebSearch"
        }
      ]
    }
  ]
}
```
