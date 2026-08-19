# Entra ID App Registration — Step 1: Create the App

> **Tell the user:**
> **Creating your app's identity in Entra ID.** Every app that participates in SSO needs an identity — an app registration. This is how Entra ID knows your agent exists and who's allowed to request tokens for it.

> **Scope of this file:** This is **Step 1 — create only**. It does NOT set the Application ID URI, the `access_as_user` scope, or pre-authorization. Those happen in **Step 3** ([entra-app-update.md](entra-app-update.md)) after ATK's `oauth/register` generates the service-issued Application ID URI.

---

## Step 1 — Login to Azure

> **Tell the user FIRST (before running the command):**
> **🔐 If you're not already signed in, a browser window will pop up for Azure login. Please complete the sign-in there — I'll wait up to 2 minutes for it to finish, then continue automatically.** Do not re-run the step; just sign in once.

```powershell
# Probe with `az ad signed-in-user show` (Microsoft Graph call) instead of `az account show`.
# Why: `az account show` requires an ARM subscription context; Entra app registration only needs
# tenant/Graph context. The Graph probe is the correct "am I signed in for app-registration work?" check.
$signedIn = az ad signed-in-user show --only-show-errors 2>$null | ConvertFrom-Json
if (-not $signedIn) {
    Write-Host "Not signed in to Azure CLI — launching browser. Sign in in the popup; this step will resume automatically." -ForegroundColor Yellow
    # --allow-no-subscriptions: lets users without an active ARM subscription still sign in for Entra work.
    # Valid flag on `az login`; NOT valid on `az account show` (that's why we use the Graph probe above).
    az login --allow-no-subscriptions --only-show-errors | Out-Null
    $signedIn = az ad signed-in-user show --only-show-errors 2>$null | ConvertFrom-Json
}
if (-not $signedIn) {
    Write-Host "ERROR: Azure login failed. Please run 'az login' manually in this terminal and re-run the skill." -ForegroundColor Red
    return
}
# Tenant comes from the Microsoft Graph /organization endpoint — no subscription required.
$org = az rest --method GET --uri "https://graph.microsoft.com/v1.0/organization" --only-show-errors 2>$null | ConvertFrom-Json
$TenantId = $org.value[0].id
if (-not $TenantId) {
    Write-Host "ERROR: Could not determine tenant ID from Microsoft Graph. Verify Azure CLI login and Graph access, then re-run the skill." -ForegroundColor Red
    return
}
Write-Host "Logged in as: $($signedIn.userPrincipalName) | Tenant: $TenantId ✅"
```

### Tell the user what this step will do:

> **Creating your app's identity in Entra ID (Azure AD).** In this step, I'll:
> 1. **Register the app** — gives it a unique Client ID
> 2. **Set the Copilot redirect URI** — tells Entra ID where to send the user after authentication
>
> The Application ID URI, `access_as_user` scope, and pre-authorization come **later** (Step 3), once ATK generates the URI.

## Step 2 — Tenant Audience (single-tenant)

This skill's token guard is **single-tenant** — it pins the issuer to your tenant (see the injected `auth.ts` guard). Register the app as single-tenant (`AzureADMyOrg`). **Multi-tenant (`AzureADMultipleOrgs`) is not supported** by this skill, because a cross-tenant token's issuer (`iss = .../<theirTenant>/v2.0`) would be rejected by the single-tenant guard.

```powershell
$SignInAudience = "AzureADMyOrg"   # single-tenant (required by the single-tenant guard)
Write-Host "Sign-in audience: $SignInAudience"
```

## Step 3 — Create App Registration

> ⛔ **CRITICAL**: You MUST run `az ad app create` below. Do NOT search for existing apps. Do NOT reuse any ClientId from a previous conversation.
>
> **Restricted tenants:** some Entra tenants enforce a policy that requires a `--service-management-reference <id>` on `az ad app create`. If the create call fails with such a policy error, add that flag (with the value your tenant requires) and re-run.

```powershell
$appJson = az ad app create --display-name "$AppDisplayName" --sign-in-audience $SignInAudience
$app = $appJson | ConvertFrom-Json
$ClientId = $app.appId
$ObjectId = $app.id
if ([string]::IsNullOrWhiteSpace($ClientId)) {
    Write-Host "ERROR: 'az ad app create' did not return an appId. Review the az output above (permissions / tenant policy) and retry — do NOT continue with an empty ClientId." -ForegroundColor Red
    return
}
Write-Host "App created: $AppDisplayName | Client ID: $ClientId"
```

## Step 4 — Create Service Principal

```powershell
az ad sp create --id $ClientId 2>$null
Write-Host "Service principal created ✅"
```

## Step 5 — Set the Copilot Redirect URI

> The single redirect URI M365 Copilot's SSO flow uses is `oAuthConsentRedirect`. This matches ATK's `oauth/register` default redirect — no other redirect URIs are needed.

```powershell
az ad app update --id $ClientId --web-redirect-uris "https://teams.microsoft.com/api/platform/v1.0/oAuthConsentRedirect"
Write-Host "Redirect URI set ✅"
```

## Step 6 — Co-Owners: NOT required for SSO (note only)

> **No action needed — do NOT prompt the user for a second owner.** Pure SSO (this skill's scope) submits **no** admin consent — M365 Copilot is already pre-authorized for `access_as_user` in Step 3 — so the app does **not** need a second owner. This step is intentionally a **no-op**; skip straight to "Done".
>
> **Reference (only if you later extend to OBO / Microsoft Graph):** granting admin consent may require additional owners on both the App Registration and its Enterprise Application, depending on your tenant's policy. At that point, add a co-owner **manually** — this skill will not ask for one:
> ```powershell
> # Only for a future OBO/admin-consent scenario — not part of SSO setup:
> az ad app owner add --id $ClientId --owner-object-id <ownerObjectId>
> ```

---

## Done — Step 1 complete

You now have: `$ClientId`, `$ObjectId`, `$TenantId`.

Return to the main SKILL.md and continue with **Phase 4 (Dev Tunnel)** then **Phase 5 (ATK OAuth Registration)**. The Application ID URI, scope, and pre-authorization are applied in **Step 3** ([entra-app-update.md](entra-app-update.md)) after ATK generates the URI.
