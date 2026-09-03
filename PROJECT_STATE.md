# GenZ OS — Shared Project State

> Shared hand-off for parallel AI development. `main` is the source of truth. Fetch latest `main` before changing files, preserve other agents' work, keep commits small, and update this file plus `README.md` after meaningful work.

**State reviewed:** 2026-09-03 22:20 IST  
**Repository:** `Aravind1707/GenZ`  
**Branch:** `main`

## Product rules

GenZ OS is a LAN-first gaming-café OS for ~20 PCs, 5 PS5, 2 PS4, 2 PSVR and 2 MOZA stations, plus food, memberships, bookings, gaming sessions, participant billing, groups, payments, staff, finance and future hardware control.

- Customer identity = mobile + OTP.
- OTP is server-generated, hashed, short-lived, attempt/rate limited.
- Customer sessions use hashed tokens/HttpOnly cookies.
- Membership is participant-level and active only when `active=TRUE` and `expires_at >= CURDATE()`.
- Never trust client membership, prices, totals, payment state, station ownership or staff role.
- Active member UI shows only member price; regular price is hidden.
- Non-member UI shows regular price and member savings.
- Food payment choices are ONLY Pay Now and Pay at Counter.
- Wallet/GenZ Pay/food wallet/add-food-to-gaming-bill are not active features.
- QR identifies a station only and never grants authorization.
- Preserve customer -> participant -> session -> station -> order -> payment attribution.
- Every rupee needs an auditable transaction/ledger origin.
- Inventory reservations are created atomically with food orders; stock is consumed only when a paid order is delivered.

## Architecture/CI

- Next.js 14.2.15, React 18, TypeScript, MySQL, mysql2.
- Lazy MySQL pool keeps builds independent of a live database.
- GitHub Actions runs `npm install` and `npm run build`.
- Core café operation is LAN-first; MSG91/Razorpay are integrations.

Earlier stable CI run `33760526620` passed. Verify the newest head's build before declaring current changes green.

## Database/migrations

`db/mysql-schema.sql` is the canonical baseline through booking check-in and finance ledger.

Current migrations:

- 008 gaming billing
- 009 payment-mode cleanup
- 010 finance ledger
- 011 integrity updates
- 012 persisted pause periods
- 013 booking check-in
- 014 group settlements
- 015 booking-session handoff linkage
- 016 booking-customer linkage
- 017 inventory reservations/movement ledger

Fresh-install behavior: `scripts/migrate.mjs` applies the canonical baseline at version 13, then all migrations >13.

## Implemented status

### Customer auth — GREEN FOUNDATION
Mobile OTP, hashing, expiry, attempts, cooldown/rate limiting, customer lookup/create, hashed sessions, HttpOnly cookie and membership lookup exist.

### Membership/pricing — PARTIAL
Server-authoritative active membership, member/non-member gaming pricing, food member pricing, participant rate snapshots and member-only display exist. Full admin lifecycle/payment/history UI remains.

### Food — PARTIAL / IMPROVED
Catalog/cart, server pricing, active membership, participant attribution, Pay Now/Counter and payment foundation exist. Food orders now atomically reserve inventory; cancelled unpaid orders release reservations; paid READY orders consume stock on delivery. Customer history/status, payment retry UX, inventory-aware catalog UX and refund policy remain.

### Gaming billing — STRONG FOUNDATION
Elapsed time, per-minute rounding, persisted pause periods, pause/resume, participant billing, join/leave, rate snapshots, finalization and live billing API exist.

### Admin sessions — PARTIAL / IMPROVED
Live floor, station start, participant management, pause/resume and grouping exist. Sessions API/dashboard use server-computed live gaming charges plus food balance for active/paused sessions.

### Station QR — PARTIAL
Resolver, station-aware customer URL, active-session binding, QR generation and print foundation exist. Production labels/export and complete QR/login/session tests remain.

### Group billing/settlement — STRONG FOUNDATION / PARTIAL
2–20 active sessions, attribution and lifecycle exist. Settlement supports one payer, equal split, custom amounts, by PC/session, by food item, mixed gaming + food, partial settlement, overpayment protection, transaction-safe allocation, finance entry and live totals reduced by previous allocations.

Group close requires all sessions to be ENDED and outstanding to be zero. Staff settlement accepts only CASH/UPI/CARD/OTHER; group Razorpay checkout is future work.

### Bookings — STRONGER PARTIAL
Create, station assignment, validation, conflicts, cancellation, check-in and no-show exist. Checked-in bookings can hand off to sessions with optional customer linkage and participant creation.

Remaining: customer/member lookup UI, deposit payment/reconciliation, cancellation/refund policy and richer calendar/timeline.

### Orders/KDS — PARTIAL
Live admin queue, status progression and counter payment authorization exist. Inventory reservation/consumption and staff cancellation/delivery paths are now wired. Full KDS, customer order status, modifiers, refund/void policy and richer kitchen workflow remain.

### Finance — PARTIAL
Finance ledger, expenses, food revenue and group settlement revenue exist. Need final ledger-vs-derived reconciliation, membership/deposit/refund entries, cash drawer and daily close.

### Realtime — FOUNDATION / PARTIAL
Authenticated LAN SSE and in-process event bus exist for sessions, participants, billing, groups, orders and bookings, with sessions polling fallback. Remaining: customer/KDS subscriptions, replay/reconnect semantics, consistent mutation coverage and multi-process guarantees.

### Inventory — PARTIAL / FUNCTIONAL FOUNDATION
Migration 017 adds `inventory_items`, `inventory_reservations` and `inventory_movements`. Admin `/inventory` supports receive, positive adjustment, waste, reorder level and unit settings with role checks/audit/events. Food orders reserve available stock transactionally; cancellation releases it; paid delivery consumes it. Remaining: richer menu-to-stock configuration, recipe/BOM quantities, COGS, receiving batches/cost, stocktake, wastage reasons and customer out-of-stock UX.

### Menu/gaming/station admin — NOT COMPLETE
Need production CRUD/configuration, pricing, member rules, images/specs, station overrides and effective-date management.

### Membership/customer/staff admin — PARTIAL/NOT COMPLETE
Backend foundations exist. Full lifecycle/history/search UI, staff CRUD, password reset and session revocation remain.

### Receipts/refunds/reconciliation — NOT COMPLETE
Need food/gaming/group/combined receipts, Razorpay/counter refunds, partial refunds, reversals and reconciliation.

### Hardware/health/backups — NOT COMPLETE
Need station agents/state machine, WOL/graceful shutdown, console/VR/MOZA adapters, heartbeat, DB/service health and tested backups/restores.

## Correctness invariants

- Active gaming totals are server-computed; stored gaming balance is not trusted for live UI.
- Pause overlap is excluded from participant billing.
- Participant rate snapshots are historical.
- Settlement allocations cannot exceed current source outstanding value.
- Food orders become PAID only when all item value is settled.
- Food stock cannot be oversold: reservation occurs under row locks against `on_hand - reserved`.
- Reserved stock is released on unpaid cancellation and consumed on paid delivery.
- Group close requires every session to be ENDED and outstanding balance to be zero.
- Group Razorpay is not marked captured without a verified gateway flow.
- Finance corrections use explicit ledger transactions.
- SSE is an acceleration layer, not a replacement for MySQL source-of-truth reads.

## Immediate next work

1. Verify CI for newest head and fix any regression.
2. Add automated billing/group-settlement/inventory tests.
3. Finish booking customer/member lookup and deposit reconciliation.
4. Complete realtime customer/KDS subscriptions and replay/reconnect semantics.
5. Build full KDS.
6. Expand inventory with recipe/BOM, COGS, stocktake and receiving cost.
7. Build menu/gaming/station configuration admin.
8. Complete membership/customer/staff lifecycle UI.
9. Build receipts/refunds/reconciliation/daily close.
10. Build hardware agents and station state machine.
11. Add health and backup/restore verification.
12. Complete security audit and API RBAC/CSRF/rate/body/CSP hardening.
13. Upgrade Next.js to a supported release after compatibility testing.
14. Final admin-PC/LAN production validation.

## Supported Next.js

The repository remains on 14.2.15 temporarily. Before production it must move to a supported release and pass compatibility/build/test validation.

## Definition of 100%

```text
BOOKING
 -> CHECK-IN / NO-SHOW
 -> SESSION
 -> PARTICIPANTS
 -> GAMING BILLING
 -> FOOD ORDERS
 -> PAYMENTS
 -> GROUP SETTLEMENT
 -> RECEIPT
 -> FINANCE
 -> DAILY CLOSE
 -> AUDIT
```

Plus reliable fresh bootstrap/upgrades, CI, authorization, payments, inventory, realtime LAN operation, equipment state, backups/restores and automated tests.

## Development log — 2026-09-03

- Reviewed and applied CI/build patch.
- Restored finance ledger to canonical schema after detecting an omission.
- Added persisted pause periods and pause-aware participant billing.
- Added station QR generation/printing foundation.
- Added booking check-in/no-show and checked-in booking -> session handoff.
- Added group settlement migration and transaction-safe settlement/allocation engine.
- Added LAN in-process realtime event bus and authenticated SSE endpoint.
- Added inventory migration 017, reservation/movement service and admin inventory screen.
- Wired food-order stock reservation, cancellation release and paid-delivery consumption.
- Added inventory RBAC permissions and realtime inventory change events.
