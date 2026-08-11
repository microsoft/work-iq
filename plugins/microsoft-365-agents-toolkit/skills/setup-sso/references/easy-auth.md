# Easy Auth — Azure App Service authentication for the deployed MCP server

> **Local vs cloud.** The `auth.ts` JWKS guard this skill injects is for **local dev/testing**. When you **deploy** the MCP server to **Azure App Service**, prefer the platform's built-in authentication (**"Easy Auth"**) over the custom guard — it validates the Copilot SSO token at the platform edge, before your code runs, and offloads key/issuer handling. Configure it in **App Service → Authentication → Microsoft Entra identity provider**. This reference is the field-by-field companion to that blade; use it *instead of* relying on `auth.ts` once hosted.

## How this skill's values map to the blade

The tables below use generic placeholders. Fill them from your project:

| Placeholder | Use this value |
|---|---|
| `<api-app-client-id>` | the `CLIENT_ID` this skill registered (your MCP server's Entra app) — read it from `env/.env.local` |
| `<tenant-id>` | `TENANT_ID` (single-tenant) |
| `<host-client-app-id>` | **`ab3be6b7-f5df-413d-ac2d-abf1e3fd9c0b`** — the **M365 Copilot** host client that presents the user token. This is the **same client this skill pre-authorizes in Phase 5**, so if Phase 5 succeeded you already know it. |

---

Here's the SSO-token + Easy Auth config, generalized to placeholders and mapped field-by-field to the Azure blade you configured (App Service → Authentication → Microsoft Entra identity provider).

## Easy Auth — Microsoft Entra identity provider (token validation)

| Blade field | What to set | Why |
|-------------|-------------|-----|
| **App registration** | Point at the existing Entra app that represents the API (pick an existing registration, don't create a new one) | The API and the token audience must be the same app |
| **Supported account types** | Single tenant | Locks validation to your directory |
| **Application (client) ID** | `<api-app-client-id>` | Identifies the protected API |
| **Client secret setting name** | *(leave unset for pure bearer validation)* | A secret is only needed if App Service itself performs a login/redirect flow; for API token validation it isn't required |
| **Issuer URL** | `https://login.microsoftonline.com/<tenant-id>/v2.0` | Must match the token's issuer (drop `/v2.0` only for v1 tokens) |
| **Allowed token audiences** | `<api-app-client-id>` (the bare client-id form) | Must equal the `aud` claim Entra stamps into the SSO token — here it's the client id, **not** the `api://…` URI |

## Additional checks (the part that actually gates Copilot)

| Blade field | What to set | Why |
|-------------|-------------|-----|
| **Client application requirement** | **Allow requests from specific client applications** | Restricts *which app* may call the API — the key hardening step |
| **Allowed client applications** | `<api-app-client-id>` **and** `<host-client-app-id>` | List the API's own client id **plus** the Microsoft 365 / Copilot host client id that presents the user token. Missing the host id → `403` even with a valid token |
| **Identity requirement** | Allow requests from any identity | Any signed-in user in the tenant may call (tighten to specific identities only if needed) |
| **Tenant requirement** | Use default restrictions based on issuer | Single-tenant issuer already constrains this |
| **Unauthenticated action** | Return HTTP 401 Unauthorized | Reject anonymous callers instead of redirecting to a login page (correct for an API) |

## The two gotchas worth calling out in the skill

1. **Audience = client id, not the `api://` URI.** The `aud` in the token here is the bare application (client) id, so "Allowed token audiences" must use that exact form. Mismatch → `401`.
2. **The caller must be allow-listed.** With "specific client applications" selected, both the API's own client id **and** the host/Copilot client app id must appear in *Allowed client applications*, otherwise validated tokens are still rejected (`403`).

## Local vs cloud

Easy Auth runs only on Azure App Service — the local host doesn't enforce it, so "works locally" never proves the audience/issuer/client-allowlist is correct. Validate against a deployed instance.

---

## Reference

- [Authentication and authorization in Azure App Service](https://learn.microsoft.com/azure/app-service/overview-authentication-authorization)
- [Configure MCP server authorization in Azure App Service](https://learn.microsoft.com/azure/app-service/configure-authentication-mcp)
