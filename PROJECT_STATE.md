# GenZ OS — Shared Project State

> Shared hand-off for parallel AI development. `main` is the source of truth. Fetch latest `main` before changing files, preserve other agents' work, keep commits small, and update this file plus `README.md` after meaningful work.

**State reviewed:** 2026-09-05 IST  
**Repository:** `GenZ`  
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
- GitHub Actions runs migration-integrity tests, unit/build, MySQL integration/concurrency, Docker/Compose and security jobs.
- Static IP is a public endpoint behind HTTPS/firewall, not authentication.
- Private infrastructure uses VPN; MySQL/RDP/SSH/router/CCTV/station-agent ports are not public.
- POS/ECR remains provider-neutral and disabled until the exact terminal/provider API is verified.

## Completed foundations

Customer OTP/security, membership/pricing, food ordering, bookings/check-in/no-show, gaming sessions and billing, station QR/challenge attribution, authenticated realtime foundation, session settlement/partial payments/idempotency, station lock-until-settlement, monthly credit, OWNER/MANAGER RBAC, inventory reservation/movement, finance ledger, static-IP/Windows deployment foundation, combined receipts, transactional refunds, external provider reconciliation, OWNER administration, persisted realtime replay, daily-close/accounting controls, and inventory controls/reporting.

## Inventory — implemented

- Recipe-backed FIFO batch consumption now excludes expired batches and creates immutable batch-level COGS entries.
- Delivered-order inventory consumption is transactional and rejects insufficient batch/recipe stock; legacy stock paths also reject negative stock.
- Receiving creates costed batches, records supplier-linked purchase history, updates stock and movement history, and rejects expired/same-day expiry dates.
- Stocktakes are staged for editing, then require explicit authorization/finalization before variance is applied; all material counts/variances are audited.
- Supplier records and supplier purchase history are persisted.
- Wastage requires available unreserved stock, uses a valid non-expired batch, records a reason and immutable movement/audit information.
- Inventory valuation excludes expired stock; COGS reporting is exposed by business date.
- Inventory movement/history API exposes receive/reserve/release/consume/adjust/waste/stocktake activity and authorization metadata.
- Materials UI now exposes suppliers, receiving, stocktake workflow, inventory history, purchase history, valuation and daily COGS reporting.
- Customer food availability remains server-authoritative from recipe stock; unavailable dishes are displayed but ordering is disabled.

## Remaining project modules — build order

### 1. Payment/reconciliation completion
Provider-specific automated import/matching only where official APIs/credentials are available, webhook reconciliation hardening, external reference mapping and operational exception resolution.

### 2. Inventory verification
Run real MySQL integration scenarios with multiple batches, fractional recipes, delivery consumption, expiry boundaries, stocktake concurrency and supplier receipts; add richer batch-level expiry UI and automated low-stock notification delivery if required operationally.

### 3. Admin completion
Finish full CRUD forms for every gaming/menu/station/member rule field, effective-date pricing, station overrides, customer/member lifecycle search, and richer staff management UX.

### 4. Station/hardware enforcement
Complete verified Windows kiosk/session launch, safe unlock/start, WOL/graceful shutdown and adapters for consoles/VR/MOZA. Exact vendor APIs must be verified before implementation.

### 5. Bookings/KDS
Polish customer/member lookup, calendar/timeline, modifiers, deposits, cancellation/refund policy, payment retry and out-of-stock UX.

### 6. Realtime completion
Add event retention/pruning and shared broker delivery if deployment uses more than one Next.js process.

### 7. Testing/security/deployment
Add MySQL integration/concurrency/security tests for the new inventory controls, distributed rate limiting, scheduled off-host backups, clean restore verification and actual café LAN/static-IP/router/HTTPS acceptance.

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
- Corrected daily-close reconciliation to explicitly account for credit sales, credit repayments and booking-deposit advances.
- Added `daily_close_events` audit trail, OWNER reopen workflow, unresolved-exception close blocking and daily/weekly/monthly finance report/export APIs.
- Added manager cash-count permission while keeping approval/reopen OWNER-only and accounting-period lock guard for manual finance expenses.
- Added external finance reconciliation records/API/UI.
- Added inventory material/BOM, fractional stock, receiving batches, expiry controls, stocktakes, wastage, suppliers, purchase history, FIFO consumption, COGS, valuation and audit/history APIs/UI.
- Hardened expired-batch exclusion and negative-stock prevention.
- Added inventory migration 047 and expanded inventory QA contracts.
- Added OWNER administration and staff lifecycle API/UI.
- Added persisted realtime event replay and reconnect-aware SSE.
- Hardened production CSP/HSTS and added migration integrity tests to CI.
- Expanded reconciliation to expense/refund records and added provider-aware refund references.
- Corrected duplicate migration numbering and added request correlation IDs.
