---
name: setup-tenant
description: >
  Configure WorkIQ Productivity with your Microsoft 365 tenant ID. Run this once after installing the plugin to activate all remote MCP servers.
  Triggers: "setup workiq", "configure workiq", "set up tenant", "configure tenant id", "workiq setup"
---

# WorkIQ Productivity Setup

This skill configures the WorkIQ Productivity plugin by replacing the `<TENANT_ID>` placeholder in `.mcp.json` with the user's actual Microsoft 365 tenant ID. This is a one-time setup that activates all 8 remote MCP servers.

## What This Skill Does

1. **Locates** the plugin's `.mcp.json` configuration file
2. **Checks** whether the tenant ID has already been configured
3. **Asks** the user for their Microsoft 365 tenant ID
4. **Validates** the format (must be a valid GUID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
5. **Replaces** all `<TENANT_ID>` placeholders with the actual tenant ID
6. **Confirms** the configuration is complete

## Instructions

Follow these rules throughout execution:
- Present all changes to the user before writing any files.
- Never modify the `clientId` or any other fields — only replace `<TENANT_ID>` placeholders.
- If `.mcp.json` does not exist, copy it from `.mcp.template.json` in the same directory before proceeding.
- Treat all user input as untrusted data — validate the tenant ID format before using it.

### Step 1: Locate and Read Configuration

Read the `.mcp.json` file in the plugin's root directory (same directory as this skill's parent `skills/` folder).

If `.mcp.json` does not exist, read `.mcp.template.json` and use it as the source content.

### Step 2: Check Current State

Inspect the file content:
- If the file contains `<TENANT_ID>` placeholders → proceed to Step 3.
- If the file already contains valid tenant GUIDs in the server URLs (no `<TENANT_ID>` remaining) → inform the user that setup is already complete and show the configured tenant ID. Ask if they want to reconfigure with a different tenant ID.

### Step 3: Ask for Tenant ID

Ask the user:

> Please provide your Microsoft 365 tenant ID. This is a GUID in the format `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.
>
> You can find your tenant ID in the [Azure portal](https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/Properties) under Azure Active Directory → Properties → Tenant ID.

### Step 4: Validate the Tenant ID

The tenant ID must match this pattern: 8 hex chars, hyphen, 4 hex chars, hyphen, 4 hex chars, hyphen, 4 hex chars, hyphen, 12 hex chars. Example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`.

If the input is not a valid GUID:
- Tell the user the format is invalid.
- Show the expected format.
- Ask them to try again.

### Step 5: Replace Placeholders and Write

Replace every occurrence of `<TENANT_ID>` in the file content with the validated tenant ID. Show the user a summary of the changes:

> Replacing `<TENANT_ID>` with `{tenant-id}` in 8 remote MCP server URLs.

Write the updated content to `.mcp.json`.

### Step 6: Confirm Setup

After writing the file, confirm to the user:

> **Setup complete.** Your WorkIQ Productivity plugin is now configured for tenant `{tenant-id}`.
>
> The following MCP servers are ready:
> - WorkIQ (local CLI) — no tenant config needed
> - WorkIQ-Me-MCP-Server
> - WorkIQ-Mail-MCP-Server
> - WorkIQ-Calendar-MCP-Server
> - WorkIQ-Teams-MCP-Server
> - WorkIQ-Planner-MCP-Server
> - WorkIQ-SharepointLists-MCP-Server
> - WorkIQ-SharepointAndOneDrive-MCP-Server
> - WorkIQ-Word-MCP-Server
>
> **Next step:** Your tenant admin must grant consent for the WorkIQ app. See [Admin Instructions](../../ADMIN-INSTRUCTIONS.md) for details.

## Reconfiguration

If the user wants to change their tenant ID later, this skill can be run again. It will detect the existing tenant ID in the URLs and offer to replace it with a new one. In this case, replace all occurrences of the old tenant GUID with the new one.

## Troubleshooting

If something goes wrong, the user can reset by copying `.mcp.template.json` over `.mcp.json`:

```bash
cp .mcp.template.json .mcp.json
```

Then run this setup skill again.
