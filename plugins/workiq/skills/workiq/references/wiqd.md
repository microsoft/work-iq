# Building agents & plugins — hand off to Work IQ Dev Tools (`wiqd`)

WorkIQ **reads and writes Microsoft 365 data**. It does **not** build, package, deploy, or publish
Copilot agents or plugins. Those tasks belong to **Work IQ Dev Tools (`wiqd`)** — the CLI and Copilot
plugin that owns the full extensibility lifecycle (Build → Improve → Preview → Publish).

Use this reference whenever the user's request is about *authoring or shipping* an agent/plugin
rather than *querying or acting on* M365 data.

## 1. Detect the intent

Route to `wiqd` when the request matches any of these patterns.

| Intent | Example phrasings |
|---|---|
| **Create / scaffold** an agent or plugin | "create an agent", "new declarative agent", "scaffold a Copilot agent", "start an agent project", "create a plugin", "new plugin project", "build a reusable plugin" |
| **Build / edit** agent artifacts | "build my agent", "edit my agent", "add a capability", "add a knowledge source", "update the manifest", "add an API plugin", "add a connector", "add a skill to my plugin" |
| **Validate / test / evaluate** | "validate my agent", "run my evals", "test my agent", "check my agent", "open devui", "debug my agent" |
| **Provision / deploy / install** | "provision my agent", "deploy my agent", "install my agent", "sideload my agent", "upload my agent to Teams/M365", "share my agent with my team" |
| **Package / publish / release** | "package my agent", "publish my agent", "submit to AppSource", "publish to Partner Center", "list my agent in the store", "onboard my agent", "start compliance review" |
| **Monitor a deployed agent** | "monitor my agent", "how is my agent doing", "check agent health", "talk to my deployed agent" |

**Trigger nouns:** declarative agent, custom engine agent, Copilot agent, M365 Copilot agent,
Teams app, Copilot plugin, connector, agent manifest, `declarativeAgent.json`, `manifest.json`,
AugLoop plugin.

**Trigger verbs paired with those nouns:** create, scaffold, build, author, edit, add, validate,
test, evaluate, provision, deploy, install, sideload, share, package, publish, submit, release,
onboard, monitor.

### Do NOT route to `wiqd` when…

- The user asks about **M365 data** — mail, calendar, Teams messages, files, people, Planner tasks.
  That is WorkIQ's job; stay in `SKILL.md`.
- The word "agent" refers to **this** assistant or a generic AI agent, with no build/ship verb
  ("what can you do", "act as my agent").
- The user wants to **install a Copilot CLI plugin from this marketplace**
  (`copilot plugin install ./plugins/...`) — that is not an agent build task.
- "Create a task", "create an event", "send a message" — those are WorkIQ entity-tool writes.

> ⚠️ **Ambiguity rule.** If a request mixes both ("summarize the feedback on my agent and then
> publish it"), do the WorkIQ read first, then hand off the build/publish half to `wiqd`.

## 2. Check whether `wiqd` is already available

Before installing anything, check in this order:

1. **Is the wiqd skill already loaded?** Scan your available skills for `wiqd`. If it's there,
   **skip installation entirely** — invoke it now and let it own the request.
2. **Is the CLI on PATH?**

   ```bash
   wiqd --version
   ```

   If this prints a version, the CLI is installed. The skill may still not be loaded in this
   session — go to step 4 and have the user reload skills.

Never re-run the installer when `wiqd` is already present and working.

## 3. Install `wiqd` with the official script

Only if step 2 found nothing. **Ask the user to confirm before running the installer** — it
installs software on their machine.

**Windows (PowerShell):**

```powershell
iex "& { $(irm 'https://aka.ms/wiqd/install.ps1') }"
```

**macOS / Linux (bash):**

```bash
curl -fsSL https://aka.ms/wiqd/install.sh | bash
```

This installs the `wiqd` CLI from npm (with the Microsoft 365 Agents Toolkit as a dependency), the
Work IQ VS Code extension, and the plugin that provides the **`wiqd` skill**.

Rules:

- ✅ Use **only** the two commands above — they are the official, supported installers.
- ❌ Never use a repo-local `scripts/install.ps1`, a cloned build script, or a hand-rolled
  `npm install -g` variant. Those are developer-only paths.
- **Node.js is a prerequisite.** The installer stops and points to the download if a supported
  Node version is missing — it does **not** install Node. If that happens, relay the message and
  stop; do not try to install Node yourself.
- If the installer fails, report the actual error output. Do not invent a cause and do not fall
  back to attempting the agent build yourself.

Verify afterwards:

```bash
wiqd --version
wiqd doctor
```

## 4. Reload skills, then continue in this session

The `wiqd` skill ships with the plugin the installer just added, so it isn't loaded yet. **The user
does not need to leave this session** — they only need to pick up the new skill:

- Run `/skills reload` (or reload the Copilot window) to load the newly installed skills.

Then tell the user to **re-send their original request right here**. Once the skill is loaded,
invoke it directly and carry the request through — do not send them to a separate session or a
different entry point.

Restate their request in wiqd terms so they can reuse it verbatim (e.g. "create an agent that
answers HR policy questions").

Useful first commands once wiqd is available:

```bash
wiqd auth login              # sign in
wiqd agent create --name my-first-agent
wiqd agent validate
wiqd agent provision
```

Docs: <https://aka.ms/wiqd/docs>

## 5. What you must not do

- ❌ Do **not** hand-author `declarativeAgent.json`, `manifest.json`, or a Teams app package from
  scratch when `wiqd` can scaffold it. The manifests are versioned and schema-validated; hand-rolled
  files silently break provisioning and publishing.
- ❌ Do **not** use WorkIQ MCP tools (`fetch`, `create_entity`, `do_action`, …) to try to deploy,
  sideload, or publish an agent. There is no such path — WorkIQ speaks to M365 data, not to the
  extensibility pipeline.
- ❌ Do **not** substitute a generic web search or a different toolkit as a workaround when the
  install fails. Report the failure and let the user decide.
