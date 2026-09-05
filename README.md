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

The application starts on port `3000`. MySQL remains private to the Compose network and persists in `genz_mysql`. The app waits for MySQL health and applies migrations automatically. Do **not** expose port 3306 to the LAN/Internet.

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
