# ATK CLI and Deployment for M365 Agents

## ATK CLI Overview

The Agents Toolkit (ATK) CLI is the official toolchain for M365 agent project management. It handles the complete agent lifecycle from creation to deployment.

**Golden Rule:**
Check if ATK CLI is available (`atk --version`). If not found, **STOP and tell the user** that the ATK CLI is required but not installed. Do NOT attempt to install it yourself.
Then use `atk` directly for all commands.

🚨 **Never** use shortcuts, .vscode tasks, or abbreviated commands.

## Agent Lifecycle

### 1. Project Creation
```bash
# Create new agent project
atk new \
  -n my-agent \
  -c declarative-agent \
  -with-plugin type-spec \
  -i false

# Navigate into project
cd my-agent
```

**Project structure created:**
```
my-agent/
├── appPackage/
│   ├── manifest.json                   # Teams app manifest
│   ├── declarativeAgent.json           # Declarative agent definition
│   ├── instructions.txt                # Agent instructions
│   └── adaptiveCards/
│       └── card.json                   # Adaptive card template (from template)
├── assets/                             # Asset files directory
├── env/
│   ├── .env.local                      # Local environment (template)
│   └── .env.local.user                 # Local environment (secrets, generated)
├── package.json                        # Node.js dependencies
├── m365agents.yml                      # M365 agents config
├── m365agents.local.yml                # M365 agents local config
└── README.md   
```

### 2. Provisioning
Provisioning generates M365 Title ID on first time and makes the updated agent available to the developer on Microsoft 365 Copilot.

```bash
# Provision for development
atk provision --env dev

# Provision for staging
atk provision --env staging

# Provision for production
atk provision --env prod

# Provision for a custom environment
atk provision --env custom
```

**What provisioning does:**
- Registers agent in Microsoft 365 Copilot
- Generates `M365_TITLE_ID` and adds to env file
- Sets up authentication and permissions

**⚠️ CRITICAL: ALWAYS RENDER THIS AFTER ANY PROVISION OPERATION ⚠️**

After EVERY provisioning command (regardless of environment or whether it's first-time or re-provisioning), you MUST render this output:

```
✅ Provision completed successfully!

🚀 Test Your Agent:
🔗 https://m365.cloud.microsoft/chat/?titleId=T_{M365_TITLE_ID}

Replace {M365_TITLE_ID} with the actual value from env/.env.{environment}
Example: https://m365.cloud.microsoft/chat/?titleId=T_abc123xyz
```

**This is REQUIRED for:**
- ✅ First-time provisioning
- ✅ Re-provisioning after changes
- ✅ Any environment (dev, staging, prod, custom)
- ✅ Every single `atk provision` command

**Do NOT skip this output. The user needs this link to test their agent.**

### 4. Packaging (Optional)
Package agent for distribution or publishing.

```bash
# Package for development
atk package --env dev

# Package for production
atk package --env prod
```

**What packaging does:**
- Creates `.zip` file in `appPackage/build/`
- Validates manifest and package structure
- Prepares for sharing or publishing

### 5. Sharing (Shared Agents Only)
Share agents with users or entire tenant.

**IMPORTANT:** Only for agents with `AGENT_SCOPE=shared`

**Check before sharing:**
```bash
grep "AGENT_SCOPE=shared" env/.env.dev
```

If the developers isn't clear on the sharing scope, ask follow-up questions to clarify.
- Do you want to share the agent with the entire tenant or specific users / groups?
- What is the environment you want to share in (dev, staging, prod)?
- If they schoose specific users or groups, what are the email addresses of those users or groups?

**Share with entire tenant:**
```bash
atk share \
  --scope tenant \
  --env dev \
  -i false
```

**Share with specific users:**
```bash
atk share \
  --scope users \
  --email 'user1@contoso.com,user2@contoso.com' \
  --env dev \
  -i false
```

### 6. Publishing (Optional)
Publish to Microsoft 365 App Store or organizational catalog.

```bash
# Publish to catalog
atk publish --env prod
```

**What publishing does:**
- Submits agent to Microsoft 365 catalog
- Requires admin approval in tenant
- Makes agent discoverable to users

## Environment Management

### Agent Scope
Two deployment models:

**Personal Agents (`AGENT_SCOPE=personal`):**
- Each user gets their own instance
- Agent accesses user's personal data
- No sharing required
- Use for: Personal productivity agents

**Shared Agents (`AGENT_SCOPE=shared`):**
- Single instance shared by multiple users
- Requires explicit sharing via `atk share`
- Use for: Team agents, organizational assistants

### Environment Files Structure
```
env/
├── .env.local      # Local development (not committed)
├── .env.dev        # Development environment
├── .env.staging    # Staging environment
└── .env.prod       # Production environment
```

If there are any secrets or sensitive values, the content will be in a separate file named `.env.{environment}.user` that is not committed to source control.

```
env/
├── .env.local.user      # Local development (not committed)
├── .env.dev.user        # Development environment
├── .env.staging.user    # Staging environment
└── .env.prod.user       # Production environment
```

**Common variables in .env files:**
```bash
# Agent identification
APP_NAME_SHORT=MyAgent
M365_TITLE_ID=U_abc123xyz           # Generated during provision

# Agent configuration
AGENT_SCOPE=shared                  # or 'personal'

# API configuration (if using API plugins)
API_ENDPOINT=https://api.example.com

# Azure resources (generated during provision)
AZURE_RESOURCE_GROUP=rg-myagent-dev
AZURE_APP_SERVICE=app-myagent-dev
```

**Common variables in .env.{environment}.user files:**
```bash
# API configuration (if using API plugins)
API_KEY=your-api-key
```

**Security best practices:**
- Add `env/.env.local` to `.gitignore`
- Never commit secrets to source control
- Use different credentials per environment

## Version Management

### When to Bump Version
Version must be bumped before re-provisioning a shared agent that already has M365_TITLE_ID.

**Check if version bump is required:**
```bash
grep -q "AGENT_SCOPE=shared" env/.env.dev && \
grep -q "M365_TITLE_ID=" env/.env.dev && \
echo "⚠️ VERSION BUMP REQUIRED"
```

If there is no environment variable to handle the APP_VERSION, create one and assign the current value of the version in the manifest.

### How to Bump Version
Edit `appPackage/manifest.json`:
```json
{
  "version": "${{APP_VERSION}}",  // Update this field
  // ... rest of manifest
}
```

Edit `env/.env.{environment}`:
```bash
APP_VERSION=1.0.1  # Bump patch, minor, or major as needed
# ... rest of env variables
```

### Semantic Versioning
Follow semver (major.minor.patch):
- **Patch (1.0.0 → 1.0.1)**: Bug fixes, content updates, minor changes
- **Minor (1.0.0 → 1.1.0)**: New features, capabilities, backward compatible
- **Major (1.0.0 → 2.0.0)**: Breaking changes, incompatible updates

## Complete Workflows

### Initial Deployment Workflow
```bash
# 1. Validate
# Run the validation to ensure everything is correct

# 2. Provision (first time only)
# Run the provsion to register agent in M365 and make it available

# 3. Share (only if AGENT_SCOPE=shared)
# Share with users or tenant as needed

# 4. Test agent
# Open link provided in deploy output
```

### Update Workflows

**For code changes or manifest changes:**
```bash
# 1. Validate
# Run validation to ensure changes are correct

# 2. Provision
# Run provision to update agent in M365
```

**For shared agent re-provisioning:**
```bash
# 1. Bump APP_VERSION in env/.env.{environment}
# Edit version: "1.0.0" → "1.0.1"

# 2. Validate
# Run validation to ensure everything is correct

# 3. Re-provision
# Run provision to update agent in M365

# 4. Share with users (if not already shared)
# Run share command if needed
```

### Multi-Environment Deployment
```bash
# 1. Deploy to dev
# Run provision for dev environment
# Test in dev environment

# 2. Deploy to staging
# Run provision for staging environment
# Validate in staging

# 3. Deploy to production
# Run provision for production environment
# Share with tenant if needed
```

## Authentication

### Microsoft 365 Authentication
Required for sharing and publishing agents.

```bash
# Login to M365
atk auth login m365

# List current authentication
atk auth list

# Logout
atk auth logout m365
```

**Required permissions:**
- Need to have a M365 Copilot license

## Testing Agents

### Testing Deployed Agents
After deployment, ATK provides a test link:
```
🚀 Test Your Agent:
🔗 https://m365.cloud.microsoft/chat/?titleId=T_abc123xyz
```

**Testing checklist:**
- ✅ Agent appears in Copilot
- ✅ Conversation starters display correctly
- ✅ Capabilities work (search, API calls, etc.)
- ✅ Instructions are followed
- ✅ Error scenarios handled gracefully
- ✅ Permissions are appropriate

## Validation

### Validate Before Every Operation
```bash
atk validate --env local
```

**What validation checks:**
- Manifest structure and required fields
- Icon files exist and meet requirements
- Environment configuration completeness
- Capability and action definitions

**Always validate after:**
- Changing manifest files
- Modifying capabilities or actions
- Updating environment files

## Troubleshooting

### Check System Prerequisites
```bash
atk doctor
```

**Checks:**
- Node.js version
- npm version
- Azure CLI installation
- Authentication status
- Network connectivity

### Common Issues

**"Command not found" or slow first run:**
- ATK CLI downloads on first use (10-30 seconds)
- Wait for download to complete
- Ensure internet connectivity

**"Authentication required":**
```bash
# Check auth status
atk auth list

# Login to M365
atk auth login m365
```

**"Environment not provisioned":**
- Check `env/.env.{environment}` exists
- Check `M365_TITLE_ID` is present in env file
- Run provision for the environment

**"Permission denied":**
- Verify Azure Contributor/Owner role
- Verify M365 admin permissions
- Check Azure subscription is active

**"Version conflict" (shared agents):**
- Bump APP_VERSION in env/.env.{environment}
- Re-run provision after version bump

**"Validation failed":**
- Run `atk validate --env local` to see specific errors
- Verify all required manifest fields
- Ensure icons exist in `appPackage/`

## Best Practices

### Environment Strategy
- **Local (.env.local)**: Developer personal testing
- **Dev (.env.dev)**: Shared development environment
- **Staging (.env.staging)**: Pre-production validation
- **Prod (.env.prod)**: Production deployment

### Version Control
- Commit environment templates (without secrets)
- Don't commit `.env.user.local` or files with secrets
- Use `.gitignore` for sensitive files
- Document required environment variables

### Deployment Strategy
1. Develop and test locally
2. Deploy to dev environment
3. Validate in staging
4. Deploy to production
5. Monitor and iterate

### Sharing Strategy
- Start with user-scoped sharing for testing
- Expand to tenant-wide after validation
- Document who has access
- Review sharing permissions regularly