# Work IQ - Tenant Administrator Enablement Guide

This guide provides step-by-step instructions for Microsoft 365 tenant administrators to enable Work IQ for their organization.

---

## Quick Start (For Admins with Copilot Licenses)

If your organization already has Microsoft 365 Copilot licenses, you can enable Work IQ in minutes:

1. Open this URL in your browser (replace `{your-tenant-id}` with your tenant ID or domain):

```text
https://login.microsoftonline.com/{your-tenant-id}/adminconsent?client_id=ba081686-5d24-4bc6-a0d6-d034ecffed87
```

2. Sign in with your admin account
3. Click **Accept** to grant consent for your entire organization

That's it! Users with Copilot licenses can now install and use Work IQ. See the [Work IQ README](https://github.com/microsoft/work-iq-mcp/blob/main/README.md) for end-user installation instructions.

> **⚠️ Known Issue – "Access Denied" on Quick Start URL**
>
> The Quick Start URL above may fail with an **Access Denied** or **AADSTS650052** error in some tenants. This happens because the Work IQ CLI app registration includes permissions that target the Work IQ Tools MCP Server resource, and the service principal for that resource is not automatically provisioned in your tenant.
>
> **Diagnose (optional):** You can run the read-only verification script to see what's missing before making changes:
>
> ```powershell
> .\scripts\Verify-WorkIQTenant.ps1
> ```
>
> **Fix:** Run the [`Enable-WorkIQToolsForTenant.ps1`](scripts/Enable-WorkIQToolsForTenant.ps1) script to provision the missing service principals and grant admin consent in one step:
>
> ```powershell
> # Prerequisites: Install-Module Microsoft.Graph -Scope CurrentUser
> .\scripts\Enable-WorkIQToolsForTenant.ps1
> ```
>
> The script requires the `Microsoft.Graph` PowerShell modules (auto-installed if missing) and one of: Global Admin, Cloud Application Admin, or Application Admin role. It will:
> 1. Create all MCP Server service principals in your tenant (Work IQ Tools, Mail, Calendar, Teams, OneDrive, SharePoint, Word, Admin, Me, M365 Copilot)
> 2. Create or verify the Work IQ CLI service principal
> 3. Grant admin consent for all required Microsoft Graph permissions
> 4. Grant admin consent for all MCP Server permissions

---

## Table of Contents

1. [Quick Start](#quick-start-for-admins-with-copilot-licenses)
2. [Overview](#overview)
3. [Prerequisites](#prerequisites)
4. [Step 1: Verify Microsoft 365 Copilot Licensing](#step-1-verify-microsoft-365-copilot-licensing)
5. [Step 2: Configure Microsoft 365 Copilot in Your Tenant](#step-2-configure-microsoft-365-copilot-in-your-tenant)
6. [Step 3: Grant Admin Consent (Alternative Methods)](#step-3-grant-admin-consent-alternative-methods)
7. [Step 4: Configure User Access](#step-4-configure-user-access)
8. [Troubleshooting](#troubleshooting)
9. [Security Considerations](#security-considerations)

---

## Overview

Work IQ uses the Microsoft 365 Copilot Chat API as its backend. This API requires specific delegated permissions that need administrative consent before users in your organization can use Work IQ.

### Required API Permissions

Work IQ requires the following delegated permissions (all are required):

| Permission                           | Description                                  |
|--------------------------------------|----------------------------------------------|
| `Sites.Read.All`                     | Read items in all site collections           |
| `Mail.Read`                          | Read user mail                               |
| `People.Read.All`                    | Read all users' relevant people lists        |
| `OnlineMeetingTranscript.Read.All`   | Read all transcripts of online meetings      |
| `Chat.Read`                          | Read user chat messages                      |
| `ChannelMessage.Read.All`            | Read all channel messages                    |
| `ExternalItem.Read.All`              | Read external items                          |

---

## Prerequisites

Before enabling Work IQ, ensure you have:

### Required Admin Roles

You need **one of the following roles** in Microsoft Entra ID:

| Role                                 | Capabilities                                                          |
|--------------------------------------|-----------------------------------------------------------------------|
| **Global Administrator**             | Full tenant administration                                            |
| **Privileged Role Administrator**    | Can grant consent for apps requesting any permission                  |
| **Cloud Application Administrator**  | Can grant consent for permissions (except Microsoft Graph app roles)  |
| **Application Administrator**        | Can grant consent for permissions (except Microsoft Graph app roles)  |

### Required Licenses

- **Microsoft 365 Copilot license** for each user who will use Work IQ
- Appropriate Microsoft 365 base license (E3, E5, Business Premium, etc.)

### Technical Requirements

- Access to Microsoft Entra admin center (https://entra.microsoft.com)
- Access to Microsoft 365 admin center (https://admin.microsoft.com)

---

## Step 1: Verify Microsoft 365 Copilot Licensing

Work IQ relies on the Microsoft 365 Copilot Chat API, which requires Microsoft 365 Copilot licenses.

### 1.1 Check Current License Availability

1. Sign in to the **Microsoft 365 admin center** at https://admin.microsoft.com
2. Navigate to **Billing** > **Licenses**
3. Look for **Microsoft 365 Copilot** in the license list
4. Verify you have sufficient licenses for your intended users

### 1.2 Purchase Licenses (If Needed)

If you don't have Microsoft 365 Copilot licenses:

1. Go to **Billing** > **Purchase services** or visit the [Microsoft 365 Admin Center Marketplace](https://admin.microsoft.com/adminportal/home#/catalog)
2. Search for **Microsoft 365 Copilot**
3. Complete the purchase process

> **Note:** For Education tenants, look for licenses under **Microsoft 365 A3 Extra Features for faculty** or **Microsoft 365 A5 Extra Features for faculty**.

### 1.3 Assign Licenses to Users

1. Navigate to **Users** > **Active users**
2. Select the users who will use Work IQ
3. Click **Manage product licenses**
4. Assign the **Microsoft 365 Copilot** license
5. Click **Save changes**

> **Note:** Copilot features may take up to 24 hours to appear after license assignment.

---

## Step 2: Configure Microsoft 365 Copilot in Your Tenant

Before users can use Work IQ, ensure Microsoft 365 Copilot is properly configured in your tenant.

### 2.1 Enable Required Security Measures

1. **Enable Multifactor Authentication (MFA)**
   - Go to **Microsoft Entra admin center** > **Protection** > **Conditional Access**
   - Ensure MFA is enabled for all users

2. **Enable Audit Logging**
   - Go to **Microsoft Purview portal** (https://purview.microsoft.com)
   - Enable unified audit logging
   - Configure appropriate retention policies

### 2.2 Configure Update Channels

1. In the Microsoft 365 admin center, go to **Settings** > **Org settings**
2. Navigate to **Services** > **Office installation options**
3. Ensure your organization uses a supported update channel:
   - **Current Channel** (Recommended)
   - **Monthly Enterprise Channel**
   - **Current Channel (Preview)**

> **Important:** Semi-Annual Enterprise Channel is NOT supported for Copilot.

### 2.3 Configure Copilot Settings

1. In the Microsoft 365 admin center, navigate to **Copilot**
2. Review and configure:
   - Data security and compliance controls
   - Plugin and extension permissions
   - Web data grounding settings (if applicable)

---

## Step 3: Grant Admin Consent (Alternative Methods)

If you haven't used the [Quick Start](#quick-start-for-admins-with-copilot-licenses) method, here are alternative ways to grant admin consent.

### 3.1 Grant Consent via Microsoft Entra Admin Center

#### Option A: Grant Consent After User Sign-in Attempt

When a user first tries to use Work IQ:

1. They will see a consent prompt indicating admin approval is required
2. The application will automatically be registered in your tenant
3. Follow these steps to grant consent:
   - Go to **Microsoft Entra admin center** at https://entra.microsoft.com
   - Navigate to **Identity** > **Applications** > **Enterprise applications**
   - Find the **Work IQ CLI** application in the list
   - Select **Permissions** under **Security**
   - Review all requested permissions
   - Click **Grant admin consent for [Your Organization]**
   - Click **Accept**

#### Option B: Pre-authorize via Admin Consent Request (If Configured)

If your tenant has admin consent workflow enabled:

1. Sign in to the **Microsoft Entra admin center** at https://entra.microsoft.com
2. Navigate to **Identity** > **Applications** > **Admin consent requests**
3. Look for pending requests related to Work IQ
4. Review the requested permissions
5. Click **Review permissions and consent**
6. Click **Accept** to grant tenant-wide consent

### 3.2 Grant Consent via PowerShell

For administrators who prefer scripted deployment.

**Prerequisites:** Install the Microsoft Graph PowerShell SDK if not already installed:

```powershell
# Install Microsoft Graph PowerShell module (run as Administrator)
Install-Module Microsoft.Graph -Scope CurrentUser

# Or update if already installed
Update-Module Microsoft.Graph
```

**Grant admin consent:**

```powershell
# Connect to Microsoft Graph with required scopes
Connect-MgGraph -Scopes "Application.ReadWrite.All", "DelegatedPermissionGrant.ReadWrite.All"

# Get the Work IQ service principal (after a user has attempted sign-in)
$workIqApp = Get-MgServicePrincipal -Filter "displayName eq 'Work IQ CLI'"

# Get Microsoft Graph service principal
$graphSp = Get-MgServicePrincipal -Filter "displayName eq 'Microsoft Graph'"

# Define the required permissions scope
$requiredScopes = "Sites.Read.All Mail.Read People.Read.All OnlineMeetingTranscript.Read.All Chat.Read ChannelMessage.Read.All ExternalItem.Read.All"

# Create the permission grant
$params = @{
    ClientId = $workIqApp.Id
    ConsentType = "AllPrincipals"
    ResourceId = $graphSp.Id
    Scope = $requiredScopes
}

New-MgOauth2PermissionGrant -BodyParameter $params

# Verify the grant was successful
Get-MgOauth2PermissionGrant -Filter "clientId eq '$($workIqApp.Id)'"
```

---

## Step 4: Configure User Access

### 4.1 Verify Application Access

After granting admin consent:

1. Go to **Microsoft Entra admin center** > **Enterprise applications**
2. Find and select the Work IQ CLI application
3. Go to **Users and groups**
4. By default, all users with Copilot licenses can access the application

### 4.2 Restrict Access (Optional)

If you want to limit which users can use Work IQ:

1. In the Work IQ CLI enterprise application, go to **Properties**
2. Set **Assignment required?** to **Yes**
3. Go to **Users and groups**
4. Click **+ Add user/group**
5. Select the users or groups that should have access
6. Click **Assign**

### 4.3 Configure Conditional Access (Recommended)

For additional security, create a Conditional Access policy:

1. Go to **Microsoft Entra admin center** > **Protection** > **Conditional Access**
2. Create a new policy
3. Configure:
   - **Users:** All users or specific groups
   - **Target resources:** Select Work IQ application
   - **Conditions:** Configure as needed (location, device, etc.)
   - **Grant:** Require MFA, compliant device, or other controls

---

## Troubleshooting

### Common Issues and Solutions

| Issue                                        | Cause                                                         | Solution                                                                 |
|----------------------------------------------|---------------------------------------------------------------|--------------------------------------------------------------------------|
| "Access denied" / AADSTS error on consent URL | Work IQ Tools service principal not provisioned in tenant | Run [`Enable-WorkIQToolsForTenant.ps1`](scripts/Enable-WorkIQToolsForTenant.ps1) — see [Known Issue](#known-issue--access-denied-on-quick-start-url) |
| Work IQ not visible in Enterprise Applications | Service principal not yet provisioned                         | Run [`Enable-WorkIQToolsForTenant.ps1`](scripts/Enable-WorkIQToolsForTenant.ps1) to provision it |
| "Admin approval required" prompt             | Admin consent not granted                                     | Use the Quick Start URL or Step 3 methods                                |
| "Insufficient permissions" error             | Missing API permissions                                       | Verify all 7 required permissions are consented                          |
| Users can't sign in                          | Conditional Access blocking                                   | Review Conditional Access policies                                       |
| "License required" error                     | User lacks Copilot license                                    | Assign Microsoft 365 Copilot license to user                             |
| Features not appearing                       | License propagation delay                                     | Wait up to 24 hours after license assignment                             |

### Verify Admin Consent Status

Run the verification script to check all service principals and permission grants:

```powershell
.\scripts\Verify-WorkIQTenant.ps1
```

Or verify manually:

1. Go to **Microsoft Entra admin center** > **Enterprise applications**
2. Find the Work IQ CLI application
3. Select **Permissions**
4. Verify all permissions show "Granted for [Your Organization]"

### Check User License Assignment

1. Go to **Microsoft 365 admin center** > **Users** > **Active users**
2. Select the user
3. Verify **Microsoft 365 Copilot** is listed under assigned licenses

---

## Security Considerations

### Data Access

Work IQ provides access to sensitive organizational data including:
- Email content
- Meeting transcripts
- Teams messages
- SharePoint/OneDrive documents
- Contact information

### Recommendations

1. **Principle of Least Privilege**
   - Only enable Work IQ for users who need it
   - Use assignment-required settings to control access

2. **Monitor Usage**
   - Review audit logs for Work IQ activity
   - Use Microsoft Defender for Cloud Apps for additional monitoring

3. **Data Loss Prevention**
   - Ensure DLP policies are in place
   - Configure sensitivity labels for classified content

4. **Regular Review**
   - Periodically audit who has access to Work IQ
   - Review consent grants in Enterprise applications

### Compliance Notes

- Work IQ respects your organization's access controls during conversations
- Data accessed through Work IQ is subject to your existing compliance policies
- The Chat API is currently in beta; review Microsoft's terms for production use limitations

---

## Additional Resources

- [Work IQ README & Installation Guide](https://github.com/microsoft/work-iq-mcp/blob/main/README.md)
- [Microsoft 365 Copilot Documentation](https://learn.microsoft.com/microsoft-365-copilot/)
- [Microsoft Entra Admin Consent Documentation](https://learn.microsoft.com/entra/identity/enterprise-apps/grant-admin-consent)
- [Microsoft Graph Permissions Reference](https://learn.microsoft.com/graph/permissions-reference)

---

**Document Version:** 1.4
**Last Updated:** March 2026
