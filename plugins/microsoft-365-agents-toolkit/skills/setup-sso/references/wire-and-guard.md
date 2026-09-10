# Wire SSO + Inject Guard + Write Env (Phases 6, 7, 8)

## Phase 6 — Wire the plugin manifest + conversation starters

```powershell
pwsh -NoProfile -File "$SsoScripts/wire-mcpplugin.ps1"
```

Resolves the `runtimes[]` plugin manifest (`mcpPlugin.json` for OAI Apps, `readiness_plugin.json` for MCP Apps — whichever `declarativeAgent.json` `actions[].file` points to), switches its `RemoteMCPServer` runtime auth from `None` → `OAuthPluginVault` (using the provisioned Auth ID), leaves the `${{MCP_SERVER_URL}}/mcp` placeholder intact, and — when `declarativeAgent.json` defines no starters of its own — copies the widget's starters from that manifest's `capabilities.conversation_starters` into it. No synthetic starters are injected: any tool call already performs the SSO token exchange, so the widget's real starters double as the SSO proof.

> **⚠️ Tunnel ↔ OAuth coupling.** The OAuth registration is created with `baseUrl: ${{MCP_SERVER_URL}}` (Phase 4), ATK derives the Application ID URI from that tunnel domain, and Phase 5 writes it into the Entra app's `identifierUris`. So the **dev tunnel domain is baked into the OAuth registration, the App ID URI, and the Entra app**. If the tunnel URL ever changes, authentication breaks until you re-sync — run `pwsh -NoProfile -File "$SsoScripts/resync-tunnel-url.ps1"` (auto-detects the new URL, or pass `-NewUrl https://...`), which re-runs Phases 4 → 5 → 6 → 9 so everything realigns.

## Phase 7 — Inject the minimal JWKS guard

### 7a. Add `jose` + write the guard (script)

```powershell
pwsh -NoProfile -File "$SsoScripts/inject-guard.ps1"
```

Installs `jose` (plus `dotenv` for Express / MCP Apps servers) and copies the hardened guard from [`auth.ts`](auth.ts) into the server **next to its entry file** — `src/` for a raw-http server, the project root (next to `main.ts`) for an Express server. The guard is **single-tenant**: it validates signature/aud/iss/exp via `jose` and additionally enforces `scp = access_as_user` + tenant match, rejecting app-only tokens. See [`sso-explained.md`](sso-explained.md) §3.

### 7b. Insert the guard into the `/mcp` handler (code edit — you do this)

> **Choose the variant matching your server** — Phase 0 wrote `SSO_SERVER_STYLE` (`express` for MCP Apps, `rawhttp` for OAI Apps), and `inject-guard.ps1` printed it. **Both variants reuse the SAME `auth.ts`** (`validateBearerToken` + `claimsStore`) — only *where* you attach the guard differs. This is a model task (not a script): open the server entry file that sits next to the `auth.ts` the script just wrote.

#### Variant A — raw-http server (OAI Apps, `ui-widget-developer`)

Open the entry (`$McpServerDir/src/index.ts` or equivalent) and find the `POST /mcp` branch (`url.pathname === "/mcp"` and `req.method === "POST"`).

Add the import near the top of the file:
```typescript
import { validateBearerToken, claimsStore } from "./auth.js";
```

Then transform the POST `/mcp` branch from:
```typescript
if (req.method === "POST" && url.pathname === "/mcp") {
  let body = "";
  for await (const chunk of req) body += chunk;
  const parsedBody = JSON.parse(body);
  await handleMcpRequest(req, res, parsedBody);
  return;
}
```
into (guard first, then run the original logic inside the claims scope):
```typescript
if (req.method === "POST" && url.pathname === "/mcp") {
  let claims;
  try {
    claims = await validateBearerToken(req.headers.authorization);
  } catch (err) {
    // Return a GENERIC message to the caller; log the detailed reason server-side only.
    console.error("[auth] token rejected:", (err as Error).message);
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Authentication required" },
      id: null,
    }));
    return;
  }
  // Gate the per-request identity log behind a debug flag so it doesn't run in production.
  if (process.env.SSO_DEBUG === "1") {
    console.log("[auth] Valid SSO token accepted:", { sid: claims.sid, aud: claims.aud, tid: claims.tid, iss: claims.iss });
  }
  await claimsStore.run(claims, async () => {
    let body = "";
    for await (const chunk of req) body += chunk;
    const parsedBody = JSON.parse(body);
    await handleMcpRequest(req, res, parsedBody);
  });
  return;
}
```

#### Variant B — Express server (MCP Apps, `create-mcp-app`)

Open the entry (`main.ts` — it wires `app.all("/mcp", …)` via `createMcpExpressApp`).

1. Ensure the server loads the **ATK local env** so `auth.ts` sees the SSO vars — add at the **very top** of the file (Express MCP Apps servers usually lack dotenv; `inject-guard.ps1` already installed the package). Load `env/.env.local` explicitly — that's where `write-sso-env.ps1` writes `TENANT_ID` / `CLIENT_ID` / `APP_ID_URI`; a bare `import "dotenv/config"` would only read a root `.env`:
```typescript
import dotenv from "dotenv";
dotenv.config({ path: "env/.env.local" }); // adjust if the server's working dir isn't the project root
```
2. Add the guard import near the other imports:
```typescript
import { validateBearerToken, claimsStore } from "./auth.js";
```
3. Wrap the existing `/mcp` handler body in the guard + claims scope — transform:
```typescript
app.all("/mcp", async (req: Request, res: Response) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => { transport.close().catch(() => {}); server.close().catch(() => {}); });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP error:", error);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
    }
  }
});
```
into:
```typescript
app.all("/mcp", async (req: Request, res: Response) => {
  let claims;
  try {
    claims = await validateBearerToken(req.headers.authorization);
  } catch (err) {
    console.error("[auth] token rejected:", (err as Error).message);
    res.status(401).json({ jsonrpc: "2.0", error: { code: -32001, message: "Authentication required" }, id: null });
    return;
  }
  if (process.env.SSO_DEBUG === "1") {
    console.log("[auth] Valid SSO token accepted:", { sid: claims.sid, aud: claims.aud, tid: claims.tid, iss: claims.iss });
  }
  await claimsStore.run(claims, async () => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => { transport.close().catch(() => {}); server.close().catch(() => {}); });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("MCP error:", error);
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
      }
    }
  });
});
```

> Tools can read the signed-in user's claims anywhere via `claimsStore.getStore()` (`name`, `preferred_username`, `oid`, `tid`).

### 7c. Allow the `Authorization` header through CORS

> **raw-http (Variant A):** add `Authorization` to `Access-Control-Allow-Headers` for `/mcp` (preflight + responses), e.g. `"Content-Type, mcp-session-id, Last-Event-ID, mcp-protocol-version, Authorization"`. Without this, browser preflights drop the token.
>
> **Express (Variant B):** the server uses `app.use(cors())` — bare `cors()` reflects the request's `Access-Control-Request-Headers`, so `Authorization` already passes. Only if `cors()` is configured with an explicit `allowedHeaders` list, add `"Authorization"` to it.

## Phase 8 — Write the server's SSO env

```powershell
pwsh -NoProfile -File "$SsoScripts/write-sso-env.ps1"
```

Writes `TENANT_ID` / `CLIENT_ID` / `APP_ID_URI` into `env/.env.local` (the server's dotenv audience). If your MCP server loads a different env file (check its `dotenv.config({ path: ... })`), write those three keys there instead.

> **☁️ Azure deployment note.** The copied `auth.ts` custom token validation is meant for **local dev/testing**. When you deploy to **Azure App Service** (or a similar host), the recommended practice is the platform's **built-in authentication ("Easy Auth" / App Service Authentication)** rather than custom token-validation code — it validates tokens at the platform edge, reduces the attack surface, and offloads key/issuer handling. Keep `auth.ts` for local runs; switch to Easy Auth for the hosted deployment.
>
> - **Field-by-field blade config:** [`easy-auth.md`](easy-auth.md) — the exact **App Service → Authentication → Microsoft Entra** settings, including the two gotchas: the audience must be the **bare client-id** form (else `401`), and *Allowed client applications* must include the **M365 Copilot host client id** `ab3be6b7-f5df-413d-ac2d-abf1e3fd9c0b` (else `403`).
> - Overview: [Authentication and authorization in Azure App Service](https://learn.microsoft.com/azure/app-service/overview-authentication-authorization)
> - MCP-specific (matches this scenario): [Configure MCP server authorization in Azure App Service](https://learn.microsoft.com/azure/app-service/configure-authentication-mcp) — App Service Authentication validates the MCP client's token for you; you pre-authorize the client (e.g. M365 Copilot) instead of hand-rolling a guard.
