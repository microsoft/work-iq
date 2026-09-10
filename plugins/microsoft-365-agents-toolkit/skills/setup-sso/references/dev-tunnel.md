# Dev Tunnel Setup

> **Applies to local backends only.** Run this when `$BackendIsLocal` is `$true` (always for MCP during dev; for API plugins only when the user chose "Local"). If the backend is hosted remotely, skip this file — `$BaseUrl` and `$TunnelHost` were already captured in Phase 2.

> **Tell the user:**
> **Setting up a dev tunnel.** M365 Copilot runs in Microsoft's cloud, but your backend runs on `localhost` — they can't talk to each other directly. A dev tunnel creates a secure public HTTPS URL (like `https://your-tunnel.devtunnels.ms`) that forwards traffic to your local machine, bridging the gap between the cloud and your laptop.
>
> Without this, Copilot's requests would have nowhere to go — your agent would be invisible to the outside world. In production, you'd deploy to Azure App Service instead and wouldn't need a tunnel.

---

## Login to Dev Tunnel

```powershell
$devtunnelStatus = devtunnel user show 2>&1
if ($devtunnelStatus -match "not logged in" -or $LASTEXITCODE -ne 0) {
    devtunnel user login
} else {
    Write-Host "Dev tunnel already logged in ✅"
}
```

## Create Tunnel

> **CRITICAL**: Dev tunnel names must be **all lowercase**, 1-60 chars, matching `[a-z0-9][a-z0-9-]{1,58}[a-z0-9]`. Convert your app name to lowercase and remove any invalid characters.

```powershell
$TunnelName = "$($AppDisplayName -replace '[^a-z0-9-]', '')-tunnel".ToLower()
if ($TunnelName.Length -gt 60) { $TunnelName = $TunnelName.Substring(0, 60) }
# Tunnel names must match [a-z0-9][a-z0-9-]{1,58}[a-z0-9] — trim any leading/trailing
# hyphen left by sanitizing or truncation so the name stays valid.
$TunnelName = $TunnelName.Trim('-')

devtunnel create $TunnelName --allow-anonymous --host-header unchanged
devtunnel port create $TunnelName -p $Port
```

## Get Tunnel URL

```powershell
$tunnelOutput = devtunnel show $TunnelName
# Parse the Connect via browser URL — extract the hostname
$tunnelLine = $tunnelOutput | Where-Object { $_ -match "Connect via browser" -or $_ -match "https://" } | Select-Object -First 1
$TunnelHost = ($tunnelLine -replace '.*https://', '' -replace '/.*', '').Trim()
$BaseUrl = "https://$TunnelHost"
Write-Host "Tunnel URL: $BaseUrl"
```

> **Dev tunnel hostnames**: Each tunnel has TWO valid hostnames:
> - **Named**: `<tunnel-name>-<port>.<region>.devtunnels.ms` (stable, based on tunnel name)
> - **Random short ID**: `<random>-<port>.<region>.devtunnels.ms` (from `devtunnel host` output)
>
> Both route to the same tunnel. **Always use the named hostname** for config files because it stays consistent across restarts.

---

## For Remote / Azure Deployment (skip tunnel)

If the backend is already hosted (Azure App Service, Functions, etc.), you don't need a tunnel — set the URL directly (this is normally captured in Phase 2 when the user chooses "Remote"):
```powershell
$BaseUrl = "https://<host>.azurewebsites.net"
$TunnelHost = "<host>.azurewebsites.net"
```

---

## Done

Return to the main SKILL.md and continue with **Phase 5 (ATK OAuth Registration)**.

You now have: `$TunnelName`, `$BaseUrl`, `$TunnelHost`.
