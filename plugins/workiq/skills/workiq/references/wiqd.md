# Building agents and plugins: hand off to the WIQD plugin

WorkIQ reads and writes Microsoft 365 data. It does not scaffold, validate, package,
deploy, or publish M365 Copilot agents or plugins. Route those lifecycle requests to
the **Work IQ Dev Tools (WIQD) Copilot plugin**, whose `wiqd` skill owns the guided
development experience.

**Preview:** WIQD is experimental, not production-ready, and not officially supported.
Expect breaking changes. Tell the user this before asking to install the plugin.

## 1. Detect the intent

Apply these routes to **M365 Copilot agents and plugins**, not arbitrary software:

| Intent | Example requests |
|---|---|
| Create / scaffold | "Create a declarative agent", "Start an M365 Copilot agent project", "Build a reusable M365 plugin" |
| Build / edit | "Add a capability to my agent", "Update the agent manifest", "Add a skill or connector to my M365 plugin" |
| Validate / test / evaluate | "Validate my agent", "Run my agent evals", "Debug my agent in DevUI" |
| Provision / deploy / share | "Deploy my agent", "Sideload my agent", "Share my agent with my team" |
| Package / publish | "Package my M365 plugin", "Publish my agent", "Submit my agent to AppSource or Partner Center" |
| Monitor | "Monitor my deployed agent", "Check my agent's health", "Talk to my deployed agent" |

Do **not** route ordinary mail, calendar, Teams, files, people, or Planner requests
to WIQD. "Create a task", "create an event", and "send a message" remain WorkIQ data
operations. References to this assistant ("act as my agent") are not lifecycle intents.
Installing an existing Copilot CLI marketplace plugin is not an M365 agent-authoring
task; neither is building an unrelated web app or generic Copilot CLI plugin.

If the request is ambiguous, clarify which artifact the user means before routing.
For mixed requests such as "summarize feedback on my agent, then publish it", complete
the WorkIQ data read first and pass the grounded summary and publishing request to WIQD.

## 2. Check whether the plugin is available

Check in this order, before installing anything:

1. **Loaded skill:** If `wiqd` is in the current host's available skills, invoke it
   and hand off the request. Do not install again.
2. **Installed plugin:** If the skill is not loaded, inspect:

   ```bash
   copilot plugin list
   ```

   If `wiqd` is installed but not loaded, do not reinstall it. If disabled, ask the
   user to enable it through their host's plugin manager. Otherwise, ask them to
   restart their Copilot CLI session and re-send the request.
3. **Missing plugin:** Only a successful plugin-list result showing no `wiqd`
   establishes that it is missing. If the command fails or Copilot CLI is unavailable,
   report the actual failure and stop; do not assume absence or switch to a CLI installer.
   In another host, use its supported plugin-manager availability and installation
   instructions; do not run Copilot CLI commands as if they installed into that host.

**Do not use `wiqd --version` or `wiqd doctor` as a plugin availability check.**
The CLI can exist without the plugin, and the plugin can be installed without its
runtime dependencies. This handoff is about loading the plugin's skill, not proving
that the CLI is ready.

## 3. Confirm and install the plugin, not the CLI

Never treat a build/deploy request as consent to install software. Ask for explicit
confirmation and wait for a clear affirmative answer. The prompt, in the user's
language, must state:

- The WIQD plugin is missing and provides the guided agent/plugin lifecycle.
- WIQD is a preview experience with the limitations stated above.
- This command installs the Copilot plugin from Microsoft's `microsoft/wiqd`
  repository, including its skill and agent. It is not the WIQD CLI installer
  and does not install the VS Code extension or guarantee runtime prerequisites.
- The exact command you will execute:

  ```bash
  copilot plugin install microsoft/wiqd:plugins/wiqd
  ```

This official repository subdirectory is the plugin source; no marketplace registration
is required for this direct install. Do not register it as a plugin in the Work IQ
marketplace or claim it is bundled with WorkIQ.

After confirmation, execute the command through your shell tool. If the user declines,
respect the decision and stop the lifecycle portion of the request. Silence, ambiguity,
or a question is not consent.

If installation fails, report the actual error and stop. Do not retry through global npm
installation, the WIQD CLI installer scripts, repo-local build scripts, or a different
toolkit. Do not install Node.js, a CLI, or an editor extension as an implicit dependency
of this handoff.

After a successful installation, run `copilot plugin list` and confirm that `wiqd` is
listed. If it is absent or verification fails, report that plugin availability could
not be confirmed; do not claim the handoff is ready.

## 4. Load the skill and hand off the original request

Ask the user to **restart their Copilot CLI session** so the new plugin's skill and agent
are loaded, then re-send their original request. Preserve the user's intent and relevant
grounded context in a short reusable prompt, for example:

```text
Create an M365 Copilot declarative agent that answers HR policy questions.
```

Once `wiqd` appears in the available skills, invoke it and let it own the request.
Do not attempt to call an unloaded skill or claim that installation hot-loaded it into
the current session.

Plugin installation is not runtime setup. The WIQD skill owns any further prerequisite
checks, CLI setup, authentication, and lifecycle execution under its own instructions
and confirmation gates. WorkIQ should not preempt those by running raw lifecycle commands.

Official plugin: <https://github.com/microsoft/wiqd/tree/main/plugins/wiqd>

WIQD documentation: <https://aka.ms/wiqd/docs>

## 5. Guardrails

- Do not hand-author agent manifests or app packages as a workaround for a missing
  WIQD plugin or failed installation.
- Do not use WorkIQ MCP entity tools to deploy, sideload, share, or publish an agent.
- Do not run `https://aka.ms/wiqd/install.ps1`, `https://aka.ms/wiqd/install.sh`,
  or `npm install -g` as the WorkIQ-to-WIQD handoff.
- Do not equate plugin installation with CLI availability or successful deployment.
- Do not broaden this routing to unrelated development requests or change the
  existing WorkIQ M365 data routing.
