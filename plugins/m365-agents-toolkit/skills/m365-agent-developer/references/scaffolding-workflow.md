# Scaffolding Workflow

Step-by-step instructions for scaffolding a new M365 Copilot agent project.

## ⛔ STOP — READ THIS FIRST

### ATK CLI Setup

Check if ATK CLI is available by running `atk --version`. If the command is not found, **STOP and tell the user** that the ATK CLI is required but not installed. Do NOT attempt to install it yourself — the user must install ATK separately before you can proceed.

### The Only Valid Command

Copy this command EXACTLY. Replace `<project-name>` with the user's project name:

```bash
atk new -n <project-name> -c declarative-agent -with-plugin no -i false
```

### Forbidden Commands — These Do Not Exist

| ❌ Invalid Command | Why It Fails |
|-------------------|--------------|
| `atk init` | DOES NOT EXIST — there is no init command |
| `atk init --template` | DOES NOT EXIST — there is no init or --template flag |
| `atk create` | DOES NOT EXIST — there is no create command |
| `atk scaffold` | DOES NOT EXIST — there is no scaffold command |
| `--template anything` | DOES NOT EXIST — there is no --template flag |

---

## Workflow

### Step 1: Understand the Request

**Action:** Verify the user wants to create a NEW M365 Copilot agent project.

**Check for:**
- Keywords: "new project", "create agent", "scaffold", "start from scratch", "M365 Copilot", "M365 agent", "declarative agent"
- Confirmation this is NOT an existing project

**If existing project:** Stop and use the editing workflow instead.

### Step 2: Verify Empty Directory and Collect Project Name

**Action:** Check if the current directory is empty, then ask for the project name.

**Directory check (CRITICAL):**
- Use `ls -A` to check if the current directory is empty
- **Ignore hidden folders** (starting with `.`) — these are meta-configuration folders (`.claude`, `.copilot`, `.github`) and should not block scaffolding
- If ONLY hidden folders exist, treat the directory as empty and proceed
- If directory has non-hidden files/folders, **ERROR OUT immediately**:
  ```
  ❌ Error: Current directory is not empty!

  This skill requires an empty directory to scaffold a new M365 Copilot agent project.
  Please navigate to an empty directory or create a new one first.
  ```
- Do NOT ask for a project name until the directory check passes

**Project naming rules:**
- Use **kebab-case** (lowercase with hyphens): `customer-support-agent`, `expense-tracker`
- Keep it concise: 2–4 words maximum
- No spaces, underscores, or special characters
- ✅ Good: `sales-dashboard`, `document-finder`, `hr-faq-agent`
- ❌ Bad: `agent1`, `test`, `ExpenseTrackerAgent`, `my project`

### Step 3: Run ATK CLI Command and Move Files

**Action:** Execute the scaffolding command, then move files from the ATK-created subfolder to the current directory.

Always use `-i false` (non-interactive mode) to prevent unexpected prompts.

**Commands to execute sequentially:**

1. **Create the project:**
```bash
atk new -n <project-name> -c declarative-agent -with-plugin no -i false
```

2. **Move all files from the subfolder to current directory:**
```bash
mv <project-name>/* <project-name>/.* . 2>/dev/null || true
```

3. **Delete the now-empty subfolder:**
```bash
rmdir <project-name>
```

4. **Verify success:**
- Check that key files exist in the current directory (`package.json`, `m365agents.yml`)
- Confirm the ATK-created subfolder was removed
- If the command fails, report the error and stop — do NOT retry automatically

### Step 4: Confirm and Continue

**Action:** Provide a brief confirmation and immediately continue to the editing workflow.

```
✅ Project created in current directory: <absolute-current-directory-path>

Your empty M365 Copilot agent project structure is ready (JSON-based).

�� Continuing to help you design and implement your agent...
```

Then invoke the editing workflow — do NOT wait for user input.

---

## Scope Boundaries

This workflow **only** handles project creation. After scaffolding:

- ✅ Confirm creation and hand off to the editing workflow automatically
- ❌ Do NOT discuss architecture, capability selection, or API plugin design
- ❌ Do NOT write JSON manifests, instructions, or configuration
- ❌ Do NOT create TODO files, open VS Code workspaces, or run extra commands
- ❌ Do NOT provide implementation guidance — that's for the editing workflow

---

## Error Handling

| Error | Action |
|-------|--------|
| ATK CLI not installed | Stop. Tell the user to install ATK first. |
| Directory not empty | Stop. Show error message. Do not proceed. |
| Invalid project name | Warn and suggest a corrected name. |
| `atk new` command fails | Report the error with full output. Do not retry. |
| File move fails | Report the error. Files may still be in the subfolder. |
