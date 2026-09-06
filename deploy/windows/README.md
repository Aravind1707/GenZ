# GenZ Windows + Static IP Deployment

This is the production deployment path for a café admin PC/server running Windows. GenZ remains LAN-first; the ISP static IP is only the public network entry point.

## 1. DNS and router

Choose a domain such as `order.yourcafe.in` and create an `A` record pointing to the ISP static IPv4 address.

On the café router/firewall:

- WAN TCP 443 -> the reverse-proxy host only.
- If HTTP 80 is needed for ACME certificate issuance, allow/forward TCP 80 only to the reverse proxy; otherwise use a DNS challenge-capable certificate setup.
- Do not expose 3000, 3306, 3389, 22, router administration, CCTV, MySQL or station-agent ports.
- Disable UPnP and remove unused port forwards.
- If the ISP uses CGNAT, an assigned 'static' LAN address alone is not sufficient; the public IPv4 must actually be routable to the café router.

## 2. Give the GenZ server a stable LAN address

Reserve the admin-PC/server IPv4 in the router DHCP reservation, for example `192.168.10.10`. This is different from the ISP public static IP.

## 3. Install GenZ

Run PowerShell as Administrator:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
irm https://raw.githubusercontent.com/Aravind1707/GenZ/main/deploy/windows/install-genz.ps1 | iex
```

Or clone the repository manually and run the script from `deploy/windows`.

The installer requires **Node.js 24.x and npm 11.x**, matching the versions declared by the project. It installs dependencies, runs the full test suite and creates the production build.

## 4. Configure production secrets

Create `C:\GenZ\.env.local`. Never commit it.

Minimum values:

```env
NODE_ENV=production
GENZ_DB_HOST=127.0.0.1
GENZ_DB_PORT=3306
GENZ_DB_NAME=genz_os
GENZ_DB_USER=genz_app
GENZ_DB_PASSWORD=<long-random-secret>
GENZ_PUBLIC_BASE_URL=https://order.yourcafe.in
GENZ_OWNER_REMOTE_ACCESS_ENABLED=true
GENZ_OWNER_REMOTE_ACCESS_MODE=VPN
GENZ_TRUST_PROXY=false
```

Add the real MSG91/Razorpay/station-agent secrets required by the enabled features. Keep all secrets server-side.

## 5. Database

Ensure MySQL is running locally and verify that `GENZ_DB_NAME`, `GENZ_DB_USER` and `GENZ_DB_PASSWORD` match the database account.

The Windows service wrapper automatically loads `.env.local` and runs `npm run db:migrate` before every application start. You can also run it manually for a first-time check:

```powershell
cd C:\GenZ
npm run db:migrate
```

The migration runner always uses `GENZ_DB_NAME` from the connection. Legacy `USE genz_os` / database-creation statements in migration files are neutralized so a test database cannot accidentally be redirected to the production database name.

## 6. Start GenZ at boot

```powershell
cd C:\GenZ
.\deploy\windows\register-genz-service.ps1
```

The script registers a SYSTEM scheduled task named `GenZOS` and starts the application on port 3000. The wrapper loads the production environment, migrates the database, then starts `next start`.

## 7. HTTPS reverse proxy

Install a supported reverse proxy such as Caddy on the same server. Copy `Caddyfile` to the Caddy configuration directory and replace `{$GENZ_PUBLIC_HOST}` with the exact public DNS hostname, for example `order.yourcafe.in`.

Caddy should terminate TLS and proxy to `127.0.0.1:3000`. It can obtain/renew a public certificate automatically when DNS and router access are correct.

Do not use a self-signed certificate for customer production traffic.

## 8. Windows firewall

Run as Administrator:

```powershell
cd C:\GenZ
.\deploy\windows\configure-firewall.ps1
```

The application port is restricted to Domain/Private profiles; HTTPS 443 is opened for the reverse proxy. Adjust the rule scope to the café LAN/reverse-proxy host if the topology differs.

## 9. Validation checklist

From a café LAN client:

```powershell
Test-NetConnection 192.168.10.10 -Port 3000
```

From an external network (mobile data, not café Wi-Fi), verify:

- `https://order.yourcafe.in` loads over HTTPS.
- Certificate is valid and renews automatically.
- Customer OTP/login works.
- Staff login works.
- Database-backed pages work.
- Food ordering and payments work.
- Session settlement and monthly credit work.
- Station-agent connectivity works only on the private LAN.

If the external test fails, check DNS A record -> ISP public IP -> router WAN firewall/NAT -> reverse proxy 443 -> localhost:3000. Do not solve failures by exposing MySQL or other private services.

## Owner remote access

Use a VPN into the café LAN for router administration, MySQL, RDP, station agents and other private infrastructure. Static IP alone is not authentication. If remote admin is required, protect the VPN with strong credentials/MFA and keep the GenZ admin application itself behind HTTPS and its normal RBAC.

## Static IP limitations

The static public IP belongs to the ISP connection, not to GenZ. If the ISP changes the address, routing/DNS must be updated. A domain name is recommended so customer links do not depend on the raw IP.
