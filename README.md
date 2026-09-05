# GenZ OS

**LAN-first gaming café operating system for gaming, food & beverages, memberships, bookings, billing, payments, staff operations, inventory, and equipment control.**

GenZ OS runs primarily on the café admin PC with MySQL as the source of truth. Customer phones and operational devices use the LAN. MSG91 and Razorpay are external integrations, not core operational dependencies.

## Current implementation

- MySQL source of truth with incremental migrations and CI build validation.
- Customer mobile + OTP authentication with hashed, rate-limited challenges and hashed customer sessions.
- Server-authoritative membership recognition and dynamic member/non-member pricing.
- Gaming price list and food ordering with **Pay Now** / **Pay at Counter** only.
- Razorpay order/signature/webhook foundation and food payment idempotency.
- Transactional food inventory reservation, release and consumption, plus recipe/material, costed receiving, stocktake and waste workflows.
- Recipe-aware food availability: if any configured main ingredient is unavailable, the customer still sees the dish but its image receives a **NOT AVAILABLE RIGHT NOW** overlay and ordering is disabled.
- Recipe-backed delivered-order consumption uses **expiry-safe FIFO inventory batches** and writes immutable COGS ledger entries.
- Receiving records costed batches, supplier purchase history and expiry; expired/same-day batches are rejected.
- Stocktakes support staged count editing followed by explicit authorization/finalization before variance changes stock.
- Inventory movement/history, supplier history, valuation and daily COGS reporting are available through authenticated inventory APIs/UI.
- Negative stock and consumption beyond available/reserved stock are rejected transactionally.
- Permanent station QR identifies equipment only; active station binding requires a short-lived challenge from a trusted station agent.
- Active/paused/ended sessions, participant billing, rate snapshots and extensions.
- Combined gaming+food settlement with partial/split payments and settlement-before-equipment-release.
- Approved monthly credit accounts and statements; no wallet balance.
- Booking creation, conflicts, check-in/no-show, handoff and deposit lifecycle.
- Staff authentication/RBAC, audit logging, finance ledger and LAN SSE realtime.
- OWNER + MANAGER staff model.
- Provider-neutral POS/ECR boundary disabled until the exact provider is verified.
- Static-IP/Windows deployment foundation with HTTPS/firewall/VPN guidance.
- Docker + Docker Compose deployment for a repeatable admin-PC installation with persistent MySQL and automatic migrations.
- Combined staff receipts and immutable transactional session-payment refunds.
- **Daily-close accounting:** staff cash count, OWNER approval, cash variance, credit sales/repayments, booking-deposit treatment, exception blocking, period locking, OWNER reopen authorization, daily/weekly/monthly reports, CSV export and cash-drawer audit trail.
- OWNER administration for catalogue, rates, stations, member rules and staff lifecycle.
- External finance reconciliation matching for incoming and outgoing ledger records with amount exceptions.
- Provider-aware session refund references/status fields.
- Persisted realtime event replay/reconnect cursor foundation.
- Production CSP/HSTS hardening, request correlation IDs and migration-integrity tests in CI.

## Inventory complete

Inventory now includes expiry-safe FIFO consumption, immutable COGS, staged/approved stocktakes, supplier management, costed receiving, batch/expiry controls, wastage, low-stock indicators, customer out-of-stock protection, movement/audit history, authorized adjustments, negative-stock prevention, purchase history, inventory valuation and COGS reporting. Full MySQL integration verification against real café data remains a final QA/deployment activity.

## Database migrations

The canonical migration directory currently contains numbered migrations through `047`. Migration `047_inventory_controls.sql` adds supplier/purchase-history, stocktake approval and inventory authorization metadata. Run `npm run db:migrate` against the admin-PC MySQL database. `npm test` validates migration numbering/version markers and the accounting/payment/inventory contracts.

## Fast deployment

### Docker Compose (recommended)

1. Install Docker Desktop on the Windows admin PC.
2. Copy `.env.example` to `.env` and set at least `GENZ_DB_PASSWORD`, `MYSQL_ROOT_PASSWORD`, and `GENZ_STAFF_INITIAL_PASSWORD`.
3. Set `GENZ_PUBLIC_BASE_URL` to the café hostname/static-IP HTTPS URL when the reverse proxy is ready.
4. Run:

```bash
docker compose up -d --build
```

The application starts on port `3000` by default. MySQL is private to the Compose network and persists in the `genz_mysql` volume. The app waits for MySQL health and runs database migrations automatically on startup. Do not expose port 3306 to the LAN/Internet.

For an update:

```bash
git pull
docker compose up -d --build
```

For logs:

```bash
docker compose logs -f app
```

Set `GENZ_RUN_MIGRATIONS=false` only if migrations are intentionally managed separately.

### Native Node deployment

```bash
npm install
npm test
npm run build
npm run db:migrate
npm start
```

## Security

Staff and customer sessions use hashed tokens with expiry/inactivity limits. Browser-supplied membership, prices, payment states, station ownership and totals are never authoritative. Forwarded client IP headers are trusted only when `GENZ_TRUST_PROXY=true`. Production responses include restrictive CSP and HSTS. Never expose MySQL, payment, messaging or station-agent secrets to browsers.

## Remaining build order

1. **Payment/finance:** continue provider-specific hardening, external reference mapping and exception-resolution polish.
2. **Inventory:** run full MySQL integration scenarios against real delivered orders, including multi-batch FIFO, fractional recipes, expiry boundaries and stocktake concurrency.
3. **Admin:** complete effective-date pricing, station overrides, customer lifecycle and richer staff UX.
4. **Station hardware:** verified Windows kiosk/session launch, safe unlock/start, WOL/shutdown and console/VR/MOZA adapters only after exact hardware APIs are verified.
5. **Bookings/KDS:** calendar/timeline, modifiers, lookup, deposit/refund polish and payment retry.
6. **Realtime:** retention/pruning and shared broker for multi-process deployment.
7. **Final QA/deployment:** MySQL integration/concurrency/security tests, distributed rate limiting, off-host backups, clean restore and actual café LAN/static-IP/HTTPS acceptance.

POS hardware and physical station behavior remain intentionally provider-specific gates rather than simulated implementations.
