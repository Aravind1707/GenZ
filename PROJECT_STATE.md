# GenZ OS — Shared Project State

> Shared hand-off for parallel AI development. `main` is the source of truth. Fetch latest `main` before changing files, preserve other agents' work, keep commits small, and update this file plus `README.md` after meaningful work.

**State reviewed:** 2026-09-03 13:22 UTC  
**Repository:** `Aravind1707/GenZ`  
**Branch:** `main`  
**Latest commit at this review:** `a898a311e353db06fb60f4c94381d496bc4714a3`

## 1. Product

GenZ OS is a LAN-first gaming-café operating system for approximately 20 PCs, 5 PS5, 2 PS4, 2 PSVR and 2 MOZA stations, plus food ordering, memberships, bookings, billing, payments, staff operations, finance and future equipment control.

The admin PC hosts GenZ OS + MySQL. Customer phones and operational screens use the LAN. MSG91 and Razorpay are external integrations only.

## 2. Non-negotiable business rules

- Customer identity: mobile number + OTP.
- OTP is generated/validated server-side, hashed, short-lived, attempt/rate limited.
- Customer session tokens are hashed and stored in HttpOnly cookies.
- Membership is participant-level and server-authoritative.
- Active membership requires `active=TRUE` and `expires_at >= CURDATE()`.
- Never trust client `isMember`, member IDs, prices, totals, payment state, station ownership, or staff roles.
- Active member UI shows **only member price**; regular price is hidden.
- Non-member UI shows regular price and member savings where appropriate.
- Food can only be ordered through the customer site for an eligible active gaming session/tab.
- Customer food payment options are ONLY `PAY_NOW` and `COUNTER`.
- Wallet / GenZ Pay balance / food wallet / add-food-to-gaming-bill are not active product features.
- Permanent station QR identifies equipment only; it is not authorization.
- Attribution must remain `customer -> participant -> session -> station -> order -> payment`.
- Every rupee must have an auditable transaction/ledger origin.

## 3. Architecture

- Next.js 14.2.15 currently in repo; supported upgrade remains outstanding.
- React 18, TypeScript, MySQL, mysql2.
- Server API routes and PWA-oriented customer/admin/kitchen UI.
- LAN-first operational model.
- GitHub Actions runs `npm install` and `npm run build`.

### Database pool CI fix

`lib/mysql.ts` now lazy-initializes the MySQL pool through a Proxy. Importing API routes during `next build` no longer requires DB environment variables or a live database. Runtime DB use still enforces `GENZ_DB_HOST`, `GENZ_DB_PORT`, `GENZ_DB_USER`, `GENZ_DB_PASSWORD`, `GENZ_DB_NAME`.

## 4. CI status

The CI run for commit `1ceccbc04031d8244115b44232b916afa2922e31` completed successfully: both `npm install` and `npm run build` passed.

The latest README commit `a898a311e353db06fb60f4c94381d496bc4714a3` triggered run `33760746538`; it was still in progress at the time of this state write. Re-check the latest run before calling the newest commit green.

The supplied Claude patch `0001-fix-ci-build-errors.patch` was reviewed and applied logically:

- lazy MySQL pool
- `Pool | PoolConnection` typing for group totals
- staff update DB parameter typing
- nullable `scheduledEndAt` DB value

## 5. Database state

`db/mysql-schema.sql` is the current fresh-install baseline and includes:

- stations
- sessions
- session pause periods
- menu items
- orders/order items
- payment transactions
- members/customers
- OTP/customer sessions
- session participants
- bookings
- gaming rates
- member price rules
- session groups/group members
- staff users/sessions
- finance transactions
- audit log

Recent migration sequence includes 008 gaming billing, 009 payment-mode cleanup, 010 finance ledger, 011 integrity updates, 012 session pause periods and 013 booking check-in.

`scripts/migrate.mjs` treats an empty migration history as a fresh current baseline and stamps the latest migration version instead of replaying historical migrations. Existing databases apply only unapplied migration files.

`db/migrations/013_booking_checkin.sql` adds `bookings.checked_in_at`; the canonical schema contains the same field so fresh installations do not drift.

## 6. Module status

### Application shell — PARTIAL

Black + vibrant-yellow high-contrast theme and customer/admin shell are implemented. Accessibility, responsive/tablet/kitchen optimization and complete UI state coverage remain.

### Customer authentication — GREEN FOUNDATION

Mobile OTP, hashing, expiry, attempts, cooldown/rate limiting, customer lookup/create, hashed customer sessions, HttpOnly cookie and membership lookup are implemented. Review expired/inactive membership representation semantics throughout read APIs.

### Membership/pricing — PARTIAL

Server-authoritative membership eligibility, member/non-member gaming pricing, food member pricing, participant rate snapshots and member-only display are implemented. Full admin CRUD, renewal, expiry workflow, membership payment/finance and history remain.

### Customer gaming — PARTIAL

Normal PC, Premium PC, PS5, PS4, PSVR and MOZA price list, configurable-rate model, station QR, live billing and +15/+30/+60 extension are implemented. Admin rate editor, actual café rates/images/specs and exact next-booking extension cap remain.

### Food — PARTIAL

Catalog/cart, server-side pricing, active membership checks, participant attribution, Pay Now, Pay at Counter, order creation and no-wallet flow are implemented. Remaining: customer order history/status, payment failure/retry UX, Razorpay script readiness, stock-aware ordering and cancellation policy.

### Razorpay — PARTIAL

Server order creation, amount/INR validation foundation, checkout, signature/webhook verification and paid-state idempotency are implemented. Remaining: full gateway status/currency checks, payment-event idempotency, refunds, reconciliation, failed-payment retry and realtime admin updates.

### Gaming billing — STRONG FOUNDATION / PARTIAL

Elapsed-time, per-minute rounding, persisted pause periods, pause/resume, participant-level billing, join/leave timestamps, rate snapshots, finalization and live billing API are implemented. Remaining: use authoritative live calculations everywhere, configurable rounding, edge-case tests, settlement and receipts.

### Sessions — PARTIAL

Live floor, station-specific start, active/paused/ended state, participant search/add/leave, live participant charges, pause/resume and grouping are implemented. Remaining: live authoritative totals in all screens, booking conflict indicators, automatic booked-session handoff, hardware state and settlement controls.

### Station QR — PARTIAL

Permanent station identifiers, resolver, active-session binding, customer URL, QR generation and print foundation are implemented. Remaining: production label/export, end-to-end QR/login/session testing and station configuration CRUD.

### Group billing — FOUNDATION

2–20 active sessions, group ID/name, open/close lifecycle, retained session attribution and group total foundation are implemented.

Remaining — HIGH PRIORITY:

- settlement records
- one group payment
- equal split
- by PC/session
- by item
- percentage/custom
- mixed gaming + individual food
- partial settlement
- overpayment protection
- payment allocation ledger
- receipt
- close validation

### Bookings — PARTIAL, CHECK-IN/NO-SHOW ADDED

Create, future validation, station conflicts, cancellation, live refresh, check-in timestamp, check-in UI/API and post-end no-show UI/API are implemented with audit events.

Remaining — HIGH PRIORITY:

- customer/member lookup
- edit booking
- automatic session creation/handoff
- arrival grace policy
- deposit payment/reconciliation
- cancellation/refund policy
- calendar/timeline polish

No-show deliberately rejects future/unended bookings and checked-in bookings.

### Orders/KDS — PARTIAL

Live admin order queue, status progression, paid food sales and counter payment authorization are implemented. Full KDS, realtime events, queue assignment, customer order status, modifiers, stock reservation/decrement and cancellation/void audit remain.

### Inventory — NOT COMPLETE

Need stock units/opening stock, receiving, adjustments, order decrement, out-of-stock, low-stock alerts, wastage, COGS, audit and menu availability.

### Menu administration — NOT COMPLETE

Need CRUD, categories/order, regular/member prices, images/descriptions, availability, stock linkage and modifiers/add-ons.

### Gaming pricing administration — NOT COMPLETE

Need rate CRUD, PC tiers, station overrides, member tiers, effective dates/snapshots and audit.

### Membership management — BACKEND FOUNDATION

Find/list/create/update and tier/expiry domain logic exists. Full UI, renewal, payment, history and receipts remain.

### Customer management — NOT COMPLETE

Need customer search, membership status, sessions, participants, orders, payments, bookings and history.

### Staff/RBAC — PARTIAL

Roles OWNER/MANAGER/CASHIER/KITCHEN/FLOOR, password hashing, server sessions, permissions, owner bootstrap, audit foundation and major admin route protection exist. Need staff CRUD UI, disable/revoke sessions, password reset, exhaustive API permission audit and complete sensitive-action auditing.

### Finance — PARTIAL

`finance_transactions`, revenue/expense model, source attribution, payment methods, expense entry/dashboard and food revenue recording foundation exist. The canonical schema was repaired because an earlier schema rewrite accidentally omitted the finance table.

Need ledger-vs-derived reconciliation without double counting, membership/deposit/refund entries, cash drawer, payment-method close, daily close/discrepancies and reports.

### Receipts — NOT COMPLETE

Need food, gaming, group and combined receipts with transaction/payment details, printing, reprint and refund documents.

### Refunds/reconciliation — NOT COMPLETE

Need Razorpay refunds, webhook reconciliation, counter/partial refunds, ledger reversal, role authorization and audit.

### Realtime — NOT COMPLETE

Polling currently exists. Target LAN event bus/SSE/WebSocket events include session, participant, billing, order, payment, booking, station and inventory changes.

### Hardware/agent — NOT COMPLETE

Target architecture: GenZ server -> LAN controller/agent -> commercial PDU/relay/contactor -> equipment. PC WOL/agent/graceful shutdown; model-specific console/VR/MOZA control; controller failure must never silently mark a station playable.

### Health/backup — NOT COMPLETE

Need DB health, LAN service health, agent heartbeat, payment provider status, automated backups and tested restore.

## 7. Security contract

Server authority is mandatory for identity, membership, prices, totals, station/session ownership, payment state, group totals, staff permissions and inventory availability.

Final hardening still needs complete admin API RBAC review, CSRF strategy, rate limits, body limits, secure cookie flags, CSP/security headers, audit completeness and SQL/schema review.

## 8. Wallet status

Wallet concepts are removed from the active customer/payment flow. Do not add wallet UI/API/business logic unless requirements explicitly change. If legacy wallet columns remain in an installed database, remove/deprecate only through a safe migration after confirming no active code depends on them.

## 9. Immediate development order

1. Re-check newest CI and fix any regression.
2. Integrate authoritative live billing into every admin/dashboard surface.
3. Build group settlement and payment allocation ledger.
4. Complete booking -> check-in -> session handoff and deposits.
5. Implement LAN realtime event bus.
6. Build full KDS.
7. Build inventory and stock accounting.
8. Build menu/gaming/station configuration admin.
9. Complete membership/customer/staff lifecycle UI.
10. Build receipts, refunds, reconciliation and daily close.
11. Build station agents/state machine.
12. Add health/backup/restore tooling.
13. Add automated unit/integration/E2E tests.
14. Complete security audit.
15. Upgrade Next.js to a supported release after compatibility testing.
16. Perform final admin-PC/LAN deployment validation.

## 10. Definition of 100% complete

GenZ OS is complete only when the real café lifecycle is reliable:

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

And fresh bootstrap, upgrades, CI, authorization, payments, inventory, receipts, realtime LAN operations, equipment state, backups/restores and automated tests all work reliably.

## 11. Development log — 2026-09-03

- Reviewed uploaded Claude patch `0001-fix-ci-build-errors.patch`.
- Applied lazy MySQL pool and remaining TypeScript fixes.
- Verified CI run `33760526620` for commit `1ceccbc...` passed `npm install` and `npm run build`.
- Audited canonical MySQL schema and restored missing `finance_transactions`.
- Added migration `013_booking_checkin.sql`.
- Added booking check-in and post-end no-show API/UI flows with audit events.
- Updated canonical schema for `checked_in_at`.
- Updated `README.md` and this shared state file.
