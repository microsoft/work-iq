// SSO bearer-token validation for the MCP server (minimal-touch, no express).
// Verifies the incoming Authorization: Bearer <token> against Entra JWKS and exposes the
// validated claims per-request via AsyncLocalStorage. No Graph call, no OBO.
//
// SINGLE-TENANT ONLY. The issuer and tenant are pinned to TENANT_ID. Register the app as
// single-tenant (AzureADMyOrg). Multi-tenant would require tid-aware issuer validation and is
// intentionally not supported here (see references/sso-explained.md §3).

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { AsyncLocalStorage } from "node:async_hooks";

export const claimsStore = new AsyncLocalStorage<JWTPayload | null>();

// Read env vars LAZILY (inside ensureConfig), NOT at module top-level. Under ESM this module can
// be imported BEFORE the server loads dotenv, so a top-level process.env.TENANT_ID would capture
// undefined and permanently break JWKS/audience. Resolving on first request avoids that.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let audiences: string[] = [];
let issuers: string[] = [];
let expectedTenantId: string | undefined;

const REQUIRED_SCOPE = "access_as_user";

function ensureConfig(): void {
  if (jwks) return;
  const tenantId = process.env.TENANT_ID;
  const clientId = process.env.CLIENT_ID;
  const appIdUri = process.env.APP_ID_URI;
  if (!tenantId) throw new Error("TENANT_ID not configured");
  expectedTenantId = tenantId;
  jwks = createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`));
  // Accept every audience form Entra may emit: a real Copilot SSO token's `aud` is the BARE
  // client-id GUID (NOT the api:// / App ID URI form), so all three must be accepted — otherwise
  // valid tokens 401 and Copilot enters an endless sign-in/consent loop. This is safe because the
  // issuer is tenant-scoped, and the tenant + scope are additionally enforced below, so audience
  // acceptance is not the only gate. See references/sso-explained.md §3.2.
  audiences = [clientId, `api://${clientId}`, appIdUri].filter(Boolean) as string[];
  // Single-tenant, v2 tokens only (the app sets requestedAccessTokenVersion=2). We intentionally
  // do NOT accept the v1 `sts.windows.net` issuer.
  issuers = [`https://login.microsoftonline.com/${tenantId}/v2.0`];
}

export async function validateBearerToken(authHeader?: string): Promise<JWTPayload> {
  ensureConfig();
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    throw new Error("Missing or malformed Authorization header");
  }
  const token = authHeader.slice(authHeader.indexOf(" ") + 1).trim();
  const { payload } = await jwtVerify(token, jwks!, {
    audience: audiences,
    issuer: issuers,
    algorithms: ["RS256"],
  });

  // Reject app-only / client-credentials tokens and require the delegated user scope.
  // An app-only token has idtyp "app" (and carries `roles`, no `scp`); it would otherwise pass
  // aud/iss verification. The scope check is the gate that proves a *user* is present so tools can
  // safely read claims.oid / claims.preferred_username. See references/sso-explained.md §3.
  const p = payload as JWTPayload & { idtyp?: string; scp?: string };
  if (p.idtyp === "app") {
    throw new Error("App-only tokens are not accepted");
  }
  const scopes = String(p.scp ?? "").split(" ");
  if (!scopes.includes(REQUIRED_SCOPE)) {
    throw new Error(`Token missing required scope ${REQUIRED_SCOPE}`);
  }

  // Defense-in-depth single-tenant check (the issuer is already pinned to this tenant above).
  if (expectedTenantId && payload.tid && payload.tid !== expectedTenantId) {
    throw new Error("Token tenant mismatch");
  }

  return payload;
}
