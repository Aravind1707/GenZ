# GenZ OS — Shared Project State

> Shared hand-off for parallel AI development. `main` is the source of truth. Fetch latest `main` before changing files, preserve other agents' work, keep commits small, and update this file plus `README.md` after meaningful work.

**State reviewed:** 2026-09-05 IST  
**Repository:** `Aravind1707/GenZ`  
**Branch:** `main`

## Product rules

GenZ OS is a LAN-first gaming-café OS for ~20 PCs, 5 PS5, 2 PS4, 2 PSVR and 2 MOZA stations, plus food, memberships, bookings, gaming sessions, participant billing, groups, payments, staff, finance and future hardware control.

- Customer identity = mobile + OTP.
- Never trust client membership, prices, totals, payment state, station ownership or staff role.
- Active member UI shows only member price; non-members see normal and member pricing.
- Food payment choices are Pay Now or Pay at Counter; wallet balance remains deferred.
- Gaming/session bills settle at counter unless explicitly posted to approved monthly credit.
- Equipment remains unavailable until settlement is paid or legitimately moved to approved credit.
- Every rupee needs an auditable ledger origin.
- Inventory reservation is atomic; stock is consumed only when a paid order is delivered.

## Architecture/CI

- Next.js 15.5.24, React 19.2.0, TypeScript, MySQL, mysql2.
- Lazy MySQL pool keeps builds independent of a live database.
- GitHub Actions runs migration-integrity tests and `npm run build`.
- Static IP is a public endpoint behind HTTPS/firewall, not authentication.
- Private infrastructure uses VPN; MySQL/RDP/SSH/router/CCTV/station-agent ports are not public.
- POS/ECR remains provider-neutral and disabled until the exact terminal/provider API is verified.

## Completed foundations

Customer OTP/security, membership/pricing, food ordering, bookings/check-in/no-show, gaming sessions and billing, station QR/challenge attribution, authenticated realtime foundation, session settlement/partial payments/idempotency, station lock-until-settlement, monthly credit, OWNER/MANAGER RBAC, inventory reservation/movement, finance ledger, static-IP/Windows deployment foundation, combined receipts, transactional refunds, daily-close cash/tender reporting, external reconciliation, OWNER administration and persisted realtime replay foundation.

## Current build additions

- `db/migrations/036_inventory_recipes_batches_stocktakes.sql` and `037_inventory_reservation_decimal_qty.sql` add inventory materials, BOM/recipes, fractional stock, costed receiving, stocktakes, wastage reasons and material movement history.
- `lib/inventory-materials.ts` implements material lifecycle, recipe management, receiving, valuation, stocktakes and reason-coded waste.
- `lib/inventory.ts` uses configured recipes for reservation/consumption/release while retaining legacy direct-menu compatibility.
- `db/migrations/038_finance_reconciliation.sql` adds auditable external transaction matching; reconciliation now covers both incoming revenue and outgoing refund/expense ledger records.
- Provider-aware refund fields now capture provider, external reference and provider status without editing the original payment/refund ledger record.
- `db/migrations/040_finance_reconciliation_scope.sql` records the expanded reconciliation scope.
- `db/migrations/041_session_refund_provider.sql` adds provider-aware refund references/status.
- `db/migrations/042_daily_close_approval.sql` adds persistent daily-close approval state and approving staff attribution.
- `/reconciliation` now exposes incoming/outgoing records and separate unreconciled revenue/expense totals.
- `/api/daily-close` and `/daily-close` support persistent cash count plus OWNER-only approval; approved closes cannot be overwritten.
- `/admin` plus `/api/admin/catalog` and `/api/admin/staff` provide OWNER-only catalogue, gaming-rate, station, member-rule and staff lifecycle controls.
- `db/migrations/039_realtime_event_log.sql`, `lib/realtime.ts` and `/api/events` provide persisted replay/reconnect-aware SSE.
- Production CSP removes `unsafe-eval` and production HSTS is enabled.
- `scripts/validate-migrations.mjs` and `npm test` validate numbered migration/version integrity before build.

## Remaining project modules — build order

### 1. Payment/reconciliation completion
Core reconciliation and close approval foundations are implemented. Remaining: provider-specific automated import/matching only where official APIs/credentials are available, provider webhook reconciliation, and operational exception resolution workflow.

### 2. Inventory completion
Complete order-level FIFO batch consumption/COGS accounting, customer-facing out-of-stock behavior, full stocktake editing UI and richer supplier/expiry workflows.

### 3. Admin completion
Finish full CRUD forms for every gaming/menu/station/member rule field, effective-date pricing, station overrides, customer/member lifecycle search, and richer staff management UX.

### 4. Station/hardware enforcement
Complete verified Windows kiosk/session-launch behavior, safe unlock/start, WOL/graceful shutdown and adapters for consoles/VR/MOZA. Exact vendor APIs must be verified before implementation.

### 5. Bookings/KDS
Polish customer/member lookup, calendar/timeline, modifiers, deposits, cancellation/refund policy, payment retry and out-of-stock UX.

### 6. Realtime completion
Add event retention/pruning and shared broker delivery if deployment uses more than one Next.js process.

### 7. Testing/security/deployment
Add MySQL integration/concurrency/security tests, request-ID/error hardening, distributed rate limiting, scheduled off-host backups, clean restore verification and actual café LAN/static-IP/router/HTTPS acceptance.

## Definition of 100%

```text
BOOKING
 -> CHECK-IN / NO-SHOW
 -> SESSION
 -> PARTICIPANTS
 -> GAMING BILLING
 -> FOOD ORDERS
 -> PAYMENTS
 -> RECEIPT
 -> FINANCE
 -> DAILY CLOSE
 -> AUDIT
```

Plus reliable fresh bootstrap/upgrades, authorization, payments, inventory, realtime LAN operation, equipment state, backups/restores and automated tests.

## Development log — 2026-09-05

- Restricted intended staff model to OWNER and MANAGER.
- Added trusted monthly billing and final session settlement with station locking.
- Added provider-neutral POS/ECR boundary and Windows/static-IP deployment foundation.
- Added station-agent protocol, lease, heartbeat, durable command queue and Windows lock/shutdown hooks.
- Added combined session receipts and immutable partial session-payment refunds with finance reversal/audit records.
- Added daily close tender/refund/expense reporting and persisted physical cash variance.
- Added inventory recipe/material, fractional reservation, receiving-batch, cost, stocktake and waste foundations.
- Added external finance reconciliation records/API/UI.
- Added OWNER administration and staff lifecycle API/UI.
- Added persisted realtime event replay and reconnect-aware SSE.
- Hardened production CSP/HSTS and added migration integrity tests to CI.
- Expanded reconciliation to expense/refund records and added provider-aware refund references.
- Added persistent OWNER daily-close approval workflow.
