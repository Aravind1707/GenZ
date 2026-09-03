# GenZ OS — Shared Project State

> Shared hand-off for parallel AI development. `main` is the source of truth. Fetch latest `main` before changing files, preserve other agents' work, keep commits small, and update this file plus `README.md` after meaningful work.

**State reviewed:** 2026-09-03 18:55 IST  
**Repository:** `Aravind1707/GenZ`  
**Branch:** `main`  
**Latest commit at this review:** `b615a09c5599e423578ba241c3bc357dc45fb720`

## 1. Product and non-negotiable rules

GenZ OS is a LAN-first gaming-café operating system for approximately 20 PCs, 5 PS5, 2 PS4, 2 PSVR and 2 MOZA stations, plus food ordering, memberships, bookings, billing, payments, staff operations, finance and equipment control.

The admin PC hosts GenZ OS + MySQL. Customer phones and operational screens use the LAN. MSG91 and Razorpay are external integrations only.

Rules:

- Customer identity = mobile number + OTP.
- OTP is server-generated, hashed, short-lived, attempt/rate limited.
- Customer session tokens are hashed and stored in HttpOnly cookies.
- Membership is participant-level and server-authoritative.
- Active membership requires `active=TRUE` and `expires_at >= CURDATE()`.
- Never trust client membership flags, prices, totals, payment state, station ownership or staff roles.
- Active member UI shows only member price; regular price is hidden.
- Non-member UI shows regular price and member savings.
- Food is available only for eligible active gaming sessions.
- Food payment choices are ONLY Pay Now and Pay at Counter.
- Wallet/GenZ Pay/food wallet/add-food-to-gaming-bill are not active features.
- Station QR identifies equipment only; it is not authorization.
- Attribution must remain customer -> participant -> session -> station -> order -> payment.
- Every rupee must have an auditable transaction/ledger origin.

## 2. Current architecture

- Next.js 14.2.15, React 18, TypeScript, MySQL, mysql2.
- Server API routes and PWA-oriented customer/admin/kitchen UI.
- Lazy MySQL pool prevents build-time DB dependency.
- GitHub Actions CI runs `npm install` and `npm run build`.
- LAN is the operational network; internet is required only for integrations such as OTP and online payments.

## 3. CI/build status

- CI run `33760526620` for the earlier stable implementation passed `npm install` and `npm run build`.
- Subsequent README/state/feature commits have triggered fresh CI runs; always verify the newest run before declaring the newest commit green.
- A previous Claude patch was reviewed and its MySQL/TypeScript fixes were incorporated.

## 4. Database/migration state

Canonical baseline: `db/mysql-schema.sql` includes the core current schema through booking check-in and finance ledger.

Migrations now include:

- 008 gaming billing
- 009 payment-mode cleanup
- 010 finance ledger
- 011 integrity updates
- 012 persisted session pause periods
- 013 booking check-in
- 014 group settlements

Migration 014 creates:

- `group_settlements`
- `group_settlement_payers`
- `group_settlement_allocations`

Important fresh-install behavior: the canonical schema is treated as the baseline through 013. `scripts/migrate.mjs` stamps a fresh DB at `latestMigration - 1` and applies the newest incremental migration, preventing historical ALTER migrations from replaying against the already-complete baseline.

If future migrations are added, keep the canonical schema current through `latestMigration - 1` before relying on the fresh-install rule.

## 5. Implemented module status

### Customer authentication — GREEN FOUNDATION

Mobile OTP, hashing, expiry, attempts, cooldown/rate limiting, customer lookup/create, hashed customer sessions, HttpOnly cookie and membership lookup are implemented.

### Membership/pricing — PARTIAL

Server-authoritative eligibility, member/non-member gaming pricing, food member pricing, participant rate snapshots and member-only display are implemented. Full membership admin lifecycle/payment/history UI remains.

### Food — PARTIAL

Catalog/cart, server pricing, active-member validation, participant attribution, Pay Now, Pay at Counter and payment foundation are implemented. Remaining: customer order history/status, payment failure/retry UX, script readiness, inventory-aware ordering and cancellation policy.

### Razorpay — PARTIAL

Order creation, amount validation, checkout, signature/webhook verification and paid-state idempotency foundation exist. Remaining: complete gateway event idempotency, status/currency verification in every path, refunds, reconciliation and realtime admin updates.

### Gaming billing — STRONG FOUNDATION

Elapsed-time billing, per-minute rounding, persisted pause periods, pause/resume, participant-level billing, join/leave, rate snapshots, finalization and live billing API are implemented.

### Admin sessions — PARTIAL

Live floor, station-specific start, participant management, pause/resume, grouping and live billing are implemented. The sessions API and dashboard now replace stale active gaming balances with server-computed live gaming charges plus food balance.

### Session extension — PARTIAL

+15/+30/+60, locking, exact-station booking protection and customer polling exist. Exact earliest-safe extension cap and race-condition tests remain.

### Station QR — PARTIAL

Station resolver, station-aware customer URL, active-session binding, QR generation and print foundation exist. Production labels/export and complete QR/login/session testing remain.

### Group billing/settlement — MAJOR NEW FEATURE, PARTIAL

Group creation remains 2–20 active sessions with individual attribution.

Settlement engine now supports:

- one payer
- equal split
- custom payer amounts
- by PC/session source
- by food-item source
- mixed gaming + food
- partial settlement
- overpayment protection
- transaction-safe allocation
- settlement/payer/allocation records
- finance revenue ledger entry
- group close blocked while outstanding balance remains

Live group totals subtract previous settlement allocations from current gaming and unpaid/failed food balances.

Staff group settlement intentionally accepts only captured methods: CASH, UPI, CARD and OTHER. Razorpay group checkout is not falsely represented as captured and remains a future dedicated integration.

### Bookings — PARTIAL

Create, station assignment, validation, conflicts, cancellation, check-in and no-show with audit events exist. Automatic booking -> session handoff, deposits and customer/member lookup remain.

### Orders/KDS — PARTIAL

Live admin queue, status progression and counter payment authorization exist. Full KDS, realtime events, customer status, stock decrement, modifiers and cancellation/void remain.

### Finance — PARTIAL

Finance ledger, expenses, payment methods, food revenue and group settlement revenue entries exist. Ledger-vs-derived reconciliation, membership/deposit/refund revenue, cash drawer and daily close remain.

### Inventory — NOT COMPLETE

Stock units, receiving, adjustments, consumption, out-of-stock, low-stock, wastage, COGS and audit remain.

### Menu/gaming/station administration — NOT COMPLETE

CRUD/configuration, pricing, member rules, images/specs, station overrides and effective-date management remain.

### Membership/customer/staff management — PARTIAL/NOT COMPLETE

Backend membership logic and staff RBAC foundation exist. Full lifecycle/customer/staff administration UI, session revocation and password reset remain.

### Receipts/refunds — NOT COMPLETE

Need food, gaming, group and combined receipts plus Razorpay/counter refunds, partial refunds, reversals and reconciliation.

### Realtime — NOT COMPLETE

Polling remains. Target LAN event bus/SSE/WebSocket events cover sessions, participants, billing, orders, payments, bookings, stations and inventory.

### Hardware/health/backups — NOT COMPLETE

Station agent/state machine, WOL/graceful shutdown, console/VR/MOZA adapters, heartbeat, DB/service health and tested backups/restores remain.

## 6. Important correctness notes

- `session_participants` rate snapshots must not be rewritten when membership changes later.
- Active billing must exclude persisted pause-period overlap.
- Settlement allocations must never exceed current outstanding source value.
- Food orders should become PAID only when all order-item value is settled.
- Group close must be rejected while any gaming/food balance remains.
- Do not allow a group Razorpay payment to be marked captured without a real verified Razorpay flow.
- Active admin session totals must come from live billing, not stale stored gaming balance.
- Finance corrections should use explicit ledger transactions, not dashboard-only edits.

## 7. Immediate development order

1. Verify CI for the latest commit and fix any build/type regression.
2. Add automated tests for billing and group settlement, especially partial/custom/equal/by-item allocation.
3. Finish booking automatic session handoff and deposit reconciliation.
4. Implement LAN realtime event bus/SSE/WebSocket.
5. Build full KDS.
6. Build inventory and stock accounting.
7. Build menu/gaming/station configuration admin.
8. Complete membership/customer/staff lifecycle UI.
9. Build receipts, refunds, reconciliation and daily close.
10. Build station agents and hardware state machine.
11. Add health and backup/restore verification.
12. Complete security audit and API authorization coverage.
13. Upgrade Next.js to a supported release after compatibility testing.
14. Perform final admin-PC/LAN production validation.

## 8. Supported Next.js requirement

The repository remains on Next.js 14.2.15 for compatibility. Before production, upgrade deliberately to a supported release, currently 16.x Active LTS or 15.x Maintenance LTS, and run the complete compatibility/build/test pass.

## 9. Definition of 100% complete

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

Fresh bootstrap, migrations, CI, authorization, payments, inventory, receipts, realtime LAN operations, equipment state, backups/restores and automated tests must also work reliably.

## 10. Development log — 2026-09-03

- Reviewed and applied the Claude-generated CI/build patch.
- Restored finance ledger to canonical schema after detecting an earlier omission.
- Added booking check-in/no-show workflow and migration 013.
- Added persisted pause-period billing migration 012 and participant billing workflow.
- Integrated live authoritative billing into admin sessions/dashboard.
- Added group settlement migration 014 and transaction-safe settlement/allocation engine.
- Added one-payer, equal, custom, by-PC/session and by-food-item settlement UI.
- Added partial settlement, overpayment protection and group-close outstanding-balance protection.
- Restricted staff group settlement to actually captured payment methods; group Razorpay checkout remains future work.
- Updated README and this state document after the changes.
