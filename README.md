# GenZ OS

**LAN-first gaming café operating system for gaming, food & beverages, memberships, bookings, billing, payments, staff operations, inventory, and equipment control.**

GenZ OS runs primarily on the café admin PC with MySQL as the source of truth. Customer phones and operational devices use the LAN. MSG91 and Razorpay are external integrations, not core operational dependencies.

## Deploy-ready implementation

The software baseline is deploy-ready. The only remaining acceptance items are environment/provider credentials and physical café verification.

- MySQL source of truth with incremental migrations and CI build validation.
- Customer mobile + OTP authentication with hashed, rate-limited challenges and hashed customer sessions.
- Server-authoritative membership recognition and dynamic member/non-member pricing.
- Gaming price list and food ordering with **Pay Now** / **Pay at Counter** only.
- Razorpay order/signature/webhook foundation and food payment idempotency.
- Food cancellation/refund policy: before preparation, cancellation is allowed and paid orders are eligible for up to **100%** refund; once preparation has started, cancellation is blocked and any approved paid-order refund is limited to **50%**. Food refunds are paid at the **Admin Desk in cash**, not automatically online.
- Transactional food inventory reservation, release and consumption, recipe/material controls, costed receiving, stocktakes, waste workflows, supplier history, FIFO, expiry controls, immutable COGS and valuation/reporting.
- Recipe-aware food availability: unavailable dishes remain visible with **NOT AVAILABLE RIGHT NOW** and ordering disabled.
- Permanent station QR plus short-lived trusted station-agent challenge binding.
- Active/paused/ended sessions, participant billing, rate snapshots and extensions.
- Combined gaming+food settlement with partial/split payments and settlement-before-equipment-release.
- Approved monthly credit accounts and statements; no wallet balance.
- Booking creation, conflicts, check-in/no-show, handoff and deposit lifecycle.
- OWNER + MANAGER RBAC, audit logging, finance ledger, daily close and finance reconciliation.
- Provider reconciliation and refund references/status tracking.
- Persisted realtime replay and reconnect-aware SSE foundation.
- OWNER administration with catalogue, gaming rates, stations, member rules and staff lifecycle controls.
- Production CSP/HSTS hardening and request correlation IDs.
- Production readiness endpoint at `/api/health`.
- Windows station kiosk launcher at `scripts/station-kiosk.ps1`.
- MySQL backup and restore-verification scripts at `scripts/backup-mysql.ps1` and `scripts/restore-mysql.ps1`.
- Docker + Docker Compose deployment with private MySQL, health checks and automatic migrations.

## Database migrations

The canonical migration directory now contains numbered migrations through **048**. Migration `048_food_refund_policy.sql` adds the auditable Admin Desk food-refund ledger. Run `npm run db:migrate`; migrations are idempotently tracked in `schema_migrations` and CI runs the migration process twice to detect upgrade problems.

## Fast deployment

### Docker Compose (recommended)

1. Install Docker Desktop on the Windows admin PC.
2. Copy `.env.example` to `.env` and set strong values for `GENZ_DB_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `GENZ_STAFF_INITIAL_PASSWORD`, OTP credentials and Razorpay credentials.
3. Set `GENZ_PUBLIC_BASE_URL` to the café HTTPS hostname/static-IP URL when the reverse proxy is ready.
4. Run:

```bash
docker compose up -d --build
```

The application starts on port `3000`. MySQL remains private to the Compose network and persists in `genz_mysql`. The app waits for MySQL health and applies migrations automatically. **Do not expose port 3306 to the LAN/Internet.**

Verify readiness:

```text
GET /api/health
```

For logs:

```bash
docker compose logs -f app
```

For updates:

```bash
git pull
docker compose up -d --build
```

### Native Node deployment

```bash
npm install
npm test
npm run build
npm run db:migrate
npm start
```

## Windows PC — native development / local run

You can run GenZ OS directly on Windows without Docker for development, debugging, or a local café-admin installation. The repository currently requires **Node.js 24.x** (`>=24.20.0 <25`) and **npm 11.x** (`>=11.19.0 <12`).

### 1. Install prerequisites

Install these on the Windows PC:

- **Git for Windows**
- **Node.js 24 LTS** with npm 11.x
- **MySQL 8.4** if you are running MySQL natively
- Alternatively, install **Docker Desktop** and use the Docker Compose deployment above for MySQL

Verify from **PowerShell** or **Command Prompt**:

```powershell
node --version
npm --version
git --version
mysql --version
```

The project should report Node `24.x` and npm `11.x`. TypeScript is installed locally by the project, so do **not** install TypeScript globally. The project pins TypeScript `6.0.3` because the current Next.js ESLint toolchain requires the TypeScript 6 compiler API.

### 2. Get the project

```powershell
git clone https://github.com/Aravind1707/GenZ.git
cd GenZ
```

If the repository is already cloned:

```powershell
git pull origin main
```

### 3. Configure environment variables

Create the local environment file from the example:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and configure at minimum the MySQL connection, staff initial password, and any provider credentials required for the features you want to test. Never commit `.env` or real secrets.

### 4. Install dependencies

```powershell
npm install
```

If Windows reports that a package script or executable cannot be found after changing Node versions, close and reopen PowerShell, then run `npm install` again.

### 5. Start MySQL

For native MySQL, make sure the MySQL 8.4 service is running and that the database/user/password in `.env` match the local MySQL configuration.

If you prefer Docker only for MySQL, from the repository root you can start the database service with:

```powershell
docker compose up -d mysql
```

Do not publish MySQL port `3306` to the LAN or Internet.

### 6. Validate the installation

Run the complete test suite:

```powershell
npm test
```

Then run the TypeScript compiler and linter:

```powershell
npx tsc --noEmit
npm run lint
```

Build the production application:

```powershell
npm run build
```

### 7. Apply database migrations

```powershell
npm run db:migrate
```

### 8. Start GenZ OS

For development with hot reload:

```powershell
npm run dev
```

For the production build:

```powershell
npm start
```

Then open the application in a browser at:

```text
http://localhost:3000
```

For a café LAN deployment, bind the reverse proxy/public URL and firewall rules according to the production environment. Do not expose MySQL or the station-agent port to WAN.

### Windows command summary

From a fresh clone, the usual development sequence is:

```powershell
git clone https://github.com/Aravind1707/GenZ.git
cd GenZ
Copy-Item .env.example .env
npm install
npm test
npx tsc --noEmit
npm run lint
npm run build
npm run db:migrate
npm run dev
```

For a production-style local run, replace the final `npm run dev` with:

```powershell
npm start
```

### Windows troubleshooting

**`node` or `npm` is not recognized:** close and reopen the terminal after installing Node.js, then run `node --version` and `npm --version` again.

**Wrong Node/npm version:** install Node.js 24 LTS or use a Windows Node version manager, switch to Node 24, reopen the terminal, and run `npm install` again.

**`npm run lint` reports a TypeScript 7 compatibility error:** make sure the checkout contains the pinned project dependency `typescript: 6.0.3`, remove stale dependencies if necessary, and reinstall:

```powershell
Remove-Item -Recurse -Force node_modules
npm install
npm run lint
```

**PowerShell blocks a `.ps1` script:** use the repository scripts only from a trusted local checkout. If Windows execution policy blocks a script that you explicitly intend to run, review the machine's PowerShell policy with your administrator rather than broadly disabling security controls.

**Port 3000 is already in use:** stop the process using the port or run the application behind the configured reverse proxy/alternate local port as appropriate. Do not expose internal database or station-agent ports just to work around a web-port conflict.

## Backup / restore

Run `scripts/backup-mysql.ps1` on a scheduled Windows task with `MYSQL_ROOT_PASSWORD` available. Store the generated SQL files on a **separate physical/off-host location**. `scripts/restore-mysql.ps1` restores a selected dump into a clean verification database so row counts and application migrations can be checked before disaster-recovery sign-off.

## Station deployment

On each Windows station, configure the station agent with a unique `GENZ_STATION_ID` and a strong 32+ character `GENZ_STATION_AGENT_SECRET`. Start `npm run station:agent`, then use `scripts/station-kiosk.ps1` to launch the local station QR in Edge kiosk mode. The agent enforces the short-lived session lease and locks the Windows workstation when the lease expires or the server issues a lock command.

Do not expose the station-agent port to WAN. Physical station start/unlock, reboot recovery, WOL and vendor-specific console/VR/MOZA adapters require final café-LAN acceptance because exact hardware/vendor behavior must be verified on the installed equipment.

## Security

Staff and customer sessions use hashed tokens with expiry/inactivity limits. Browser-supplied membership, prices, payment states, station ownership and totals are never authoritative. Forwarded client IP headers are trusted only when `GENZ_TRUST_PROXY=true`. Production responses include restrictive CSP and HSTS. Never expose MySQL, payment, messaging or station-agent secrets to browsers.

## Final acceptance — physical/environment only

These are intentionally last-mile checks, not missing application modules:

1. Configure real MSG91 OTP credentials and test delivery.
2. Configure Razorpay test/live credentials and verify payment/webhook/refund behavior.
3. Confirm static public IP/DNS, HTTPS certificate and router firewall/VPN rules.
4. Run MySQL backup to an off-host location and perform a clean restore verification.
5. Install/test the station agent on every PC/console/VR/MOZA station and verify lease expiry physically locks the equipment.
6. Test café LAN failure/reboot recovery and confirm sessions fail closed.
7. Perform the production acceptance flow: customer login → membership pricing → booking/check-in → session → food → payment → receipt → finance → daily close.
8. Keep provider-specific POS/ECR integration disabled until the exact terminal/provider API is supplied and verified.

No application feature should be marked incomplete because of these environment-only checks.
