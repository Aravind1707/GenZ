# GenZ OS — Shared Project State

> Shared hand-off for parallel AI development. `main` is the source of truth. Fetch latest `main` before changing files, preserve other agents' work, keep commits small, and update this file plus `README.md` after meaningful work.

**State reviewed:** 2026-09-03 19:00 IST  
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

## Architecture/CI

- Next.js 14.2.15, React 18, TypeScript, MySQL, mysql2.
- Lazy MySQL pool keeps builds independent of a live database.
- GitHub Actions runs `npm install` and `npm run build`.
- Core café operation is LAN-first; MSG91/Razorpay are integrations.

Earlier stable CI run `33760526620` passed. New feature commits trigger fresh builds; verify the newest run before declaring the current head green.

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

Fresh-install behavior: `scripts/migrate.mjs` applies the canonical baseline at version 13, then all migrations >13. This prevents historical ALTER migrations from replaying against the baseline while installing newer feature tables/columns.

## Implemented status

### Customer auth — GREEN FOUNDATION

Mobile OTP, hashing, expiry, attempts, cooldown/rate limiting, customer lookup/create, hashed sessions, HttpOnly cookie and membership lookup exist.

### Membership/pricing — PARTIAL

Server-authoritative active membership, member/non-member gaming pricing, food member pricing, participant rate snapshots and member-only display exist. Full admin lifecycle/payment/history UI remains.

### Food — PARTIAL

Catalog/cart, server pricing, active membership, participant attribution, Pay Now/Counter and payment foundation exist. Remaining customer history/status, payment retry UX, script readiness, inventory-aware ordering and cancellation policy.

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

Create, station assignment, validation, conflicts, cancellation, check-in and no-show exist.

Handoff lifecycle:

```text
BOOKING -> CHECK-IN -> START SESSION -> BOOKING.session_id
```

Migrations 015/016 add booking/session and optional customer linkage. A checked-in booking can start only inside its booked window, only when its station is available, and only once. The created session inherits the booking end time. If `customer_id` exists, an initial participant is created with server-side rate/membership snapshot.

Remaining: customer/member lookup UI, deposit payment/reconciliation, cancellation/refund policy and richer calendar/timeline.

### Orders/KDS — PARTIAL

Live admin queue, status progression and counter payment authorization exist. Full KDS, inventory, customer order status, modifiers and cancellation/void remain.

### Finance — PARTIAL

Finance ledger, expenses, food revenue and group settlement revenue exist. Need final ledger-vs-derived reconciliation, membership/deposit/refund entries, cash drawer and daily close.

### Realtime — FOUNDATION / PARTIAL

New LAN realtime foundation:

- `lib/realtime.ts` in-process event bus
- authenticated `GET /api/events` SSE endpoint
- 15-second heartbeat
- session lifecycle events
- participant join/leave events
- billing events
- group settlement/payment events
- order creation/status/payment events
- booking lifecycle events
- sessions UI subscribes to SSE with 30-second polling fallback

Remaining: publish all mutations consistently, customer/KDS subscriptions, reconnect/replay semantics and multi-process deployment guarantees.

### Inventory — NOT COMPLETE

Need stock units, receiving, adjustments, order consumption, out-of-stock, low-stock, wastage, COGS and audit.

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
- Group close requires every session to be ENDED and outstanding balance to be zero.
- Group Razorpay is not marked captured without a verified gateway flow.
- Finance corrections use explicit ledger transactions.
- SSE is an acceleration layer, not a replacement for MySQL source-of-truth reads.

## Immediate next work

1. Verify CI for newest head and fix any regression.
2. Add automated billing/group-settlement tests.
3. Finish booking customer/member lookup and deposit reconciliation.
4. Complete realtime publication/subscriptions/reconnect semantics.
5. Build full KDS.
6. Build inventory/COGS.
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

- Reviewed and applied Claude-generated CI/build patch.
- Restored finance ledger to canonical schema after detecting an omission.
- Added persisted pause periods and pause-aware participant billing.
- Added station QR generation/printing foundation.
- Added booking check-in/no-show.
- Integrated authoritative live billing into sessions/dashboard.
- Added group settlement migration 014 and transaction-safe settlement/allocation engine.
- Added one/equal/custom/by-PC/by-food settlement UI.
- Added partial settlement, overpayment protection and group-close validation.
- Restricted group settlement to captured staff-recorded methods.
- Added booking -> checked-in -> session handoff with migrations 015/016 and optional customer linkage.
- Added LAN in-process realtime event bus and authenticated SSE endpoint.
- Published session, participant, group, order and booking events.
- Added SSE refresh to the admin sessions page with polling fallback.
- Updated README and this state document after the changes.
