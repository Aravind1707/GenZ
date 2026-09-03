# GenZ OS

**LAN-first gaming café operating system for gaming, food & beverages, memberships, bookings, billing, payments, staff operations, and equipment control.**

GenZ OS runs primarily on the café admin PC with MySQL as the source of truth. Customer phones and operational devices use the LAN. MSG91 and Razorpay are external integrations, not core operational dependencies.

## Café model

- ~20 gaming PCs
- 5 PS5
- 2 PS4
- 2 PSVR
- 2 MOZA racing simulators
- Food & beverage ordering
- Membership pricing
- Bookings
- Participant-level gaming billing
- Group billing and settlement
- Staff/RBAC
- Finance/audit
- Kitchen/KDS and inventory roadmap
- Station hardware/agent roadmap

## Non-negotiable rules

- Customers authenticate with mobile number + OTP; OTP is server-generated, hashed, short-lived, attempt-limited and rate-limited.
- Customer session tokens are hashed and stored server-side in HttpOnly cookies.
- Membership is server-authoritative and active only when `active=TRUE` and `expires_at >= CURDATE()`.
- Never trust browser membership, member IDs, prices, totals, payment state, station ownership or staff roles.
- Active member UI shows **only member price**; regular price is hidden.
- Non-member UI shows regular price and member savings.
- Food payment choices are ONLY **Pay Now** and **Pay at Counter**.
- Wallet/GenZ Pay/food wallet/add-food-to-gaming-bill are not active features.
- Permanent station QR identifies equipment only and never grants authorization.
- Preserve `customer -> participant -> session -> station -> order -> payment` attribution.
- Every rupee needs an auditable transaction/ledger origin.

## Architecture

```text
                    INTERNET
                  /           \
              MSG91          Razorpay
                |                |
                +-------+--------+
                        |
                 ADMIN PC / SERVER
                 GenZ OS + MySQL
                        |
          +-------------+-------------+
          |             |             |
       Gaming PCs    Consoles       Kitchen
          |             |             |
     Station Agent   Station UI      KDS
          |
     Customer phones
```

Stack: Next.js / React / TypeScript, MySQL + `mysql2`, server API routes, PWA-oriented interfaces and GitHub Actions CI.

The MySQL pool is lazy-initialized, so builds do not require a live database.

## Customer experience

### Gaming

Price-list categories: Normal PC, Premium PC, PS5, PS4, PSVR and MOZA. Customer flow supports station-aware QR, live participant billing and +15/+30/+60 minute extension.

### Station QR

Permanent QR codes such as `PC-01`, `PS5-01` and `MOZA-01` identify equipment only.

```text
QR station -> active session -> authenticated customer -> participant -> food order
```

### Food

Catalog, cart, server-side pricing, active-member eligibility, participant attribution, Pay Now and Pay at Counter are implemented. Customer history, stock-aware ordering and realtime customer status remain.

## Admin operations

### Sessions and billing

Implemented: live floor, station start, active/paused/ended sessions, pause/resume, participant search/add/leave, rate snapshots, grouping, live billing and authoritative live gaming totals in sessions/dashboard.

### Group settlement

Open groups support 2–20 active sessions with individual attribution. Settlement supports one payer, equal split, custom amounts, by PC/session, by food item, mixed gaming + food, partial settlement, overpayment protection and transaction-safe allocation.

Settlement records are stored in `group_settlements`, `group_settlement_payers` and `group_settlement_allocations`. Group close requires every group session to be ended and all outstanding money to be settled.

Only captured staff-recorded methods (cash, UPI, card, other) are accepted by the group settlement UI. Group Razorpay checkout remains future work.

### Bookings

Implemented: creation, station assignment, time validation, conflicts, cancellation, check-in, no-show, booking/session linkage and checked-in booking -> session handoff.

A checked-in booking starts only during its booked window, only when its station is available, and only once. The created session inherits the booking end time. Optional `customer_id` linkage lets the handoff create an initial participant with a server-side rate/membership snapshot.

Remaining: customer/member lookup UI, deposits/reconciliation, cancellation/refund policy and richer calendar/timeline.

### Orders / kitchen

Live admin queue, status progression and counter payment authorization are implemented. Full KDS, inventory and customer order status remain.

### Finance

`finance_transactions` supports revenue/expense entries, source attribution and payment methods. Food and group settlement revenue foundations exist; full reconciliation and daily close remain.

## LAN realtime

A server-side in-process event bus and authenticated SSE endpoint are now implemented:

- `GET /api/events`
- staff authentication required
- heartbeat frames every 15 seconds
- event types for sessions, participants, billing, orders, payments, bookings, stations and inventory
- sessions UI subscribes to SSE and retains a 30-second polling fallback

This is the first realtime layer. The remaining work is publishing all state changes consistently, customer/KDS subscriptions, reconnect/replay semantics and multi-process deployment guarantees.

## Database and migrations

`db/mysql-schema.sql` is the canonical baseline through booking check-in and finance ledger. Newer features are incremental migrations.

Current migrations:

- `008_gaming_billing.sql`
- `009_payment_mode_cleanup.sql`
- `010_finance_ledger.sql`
- `011_*` integrity updates
- `012_session_pause_periods.sql`
- `013_booking_checkin.sql`
- `014_group_settlements.sql`
- `015_booking_session_handoff.sql`
- `016_booking_customer_link.sql`

For a fresh database, `scripts/migrate.mjs` applies the canonical baseline at version 13 and then migrations 014 onward. Existing databases apply only unapplied versions.

## Security

Staff roles: OWNER, MANAGER, CASHIER, KITCHEN, FLOOR.

Staff authentication uses hashed passwords and server-side sessions. Sensitive operations use server-side permission checks and audit logging.

Remaining hardening: exhaustive API RBAC audit, CSRF strategy, request/body limits, rate limits, CSP/security headers, complete audit coverage, payment-event idempotency and refunds.

## Environment

```env
GENZ_DB_HOST=127.0.0.1
GENZ_DB_PORT=3306
GENZ_DB_USER=genz
GENZ_DB_PASSWORD=change-this
GENZ_DB_NAME=genz_os

GENZ_RAZORPAY_KEY_ID=...
GENZ_RAZORPAY_KEY_SECRET=...
GENZ_RAZORPAY_WEBHOOK_SECRET=...
```

Never expose server secrets to browsers.

## Development

```bash
npm install
npm run dev
npm run build
npm start
npm run db:migrate
```

CI runs `npm install` and `npm run build` on pushes and pull requests to `main`.

## Current implementation status

### Implemented / strong foundations

- MySQL source-of-truth architecture
- lazy DB pool
- customer mobile/OTP authentication
- membership recognition and authoritative pricing
- member-only price display
- customer gaming price list
- food ordering with Pay Now / Pay at Counter
- Razorpay order/signature/webhook foundation
- food payment idempotency
- station QR resolution and print foundation
- session extension protection
- participant-level pause-aware gaming billing
- authoritative live session/dashboard totals
- staff auth/RBAC foundation and audit logging
- live sessions/orders/bookings UI
- booking check-in/no-show
- checked-in booking -> session handoff
- group billing and settlement/allocation engine
- partial/equal/custom/by-PC/by-food settlement
- finance ledger foundation
- LAN SSE realtime foundation
- migration runner with fresh baseline + incremental migrations

### Remaining to reach production-complete

1. Complete realtime event publication, customer/KDS subscriptions and replay/reconnect semantics.
2. Booking customer/member lookup and deposit payment/reconciliation.
3. Full KDS.
4. Inventory, stock accounting and COGS.
5. Admin menu, gaming-rate, station and image configuration.
6. Membership lifecycle/payment/history UI.
7. Customer management/history UI.
8. Staff CRUD, password reset and session revocation.
9. Gaming/food/group/combined receipts.
10. Razorpay/counter refunds and reconciliation.
11. Daily close/cash drawer/payment-method reconciliation.
12. Station agents, heartbeat and hardware-control abstraction.
13. Operational health monitoring.
14. Backup and restore verification.
15. Comprehensive unit/integration/E2E tests.
16. Complete security audit.
17. Upgrade from Next.js 14.2.15 to a supported release and validate compatibility.
18. Final admin-PC/LAN deployment validation.

## Development order

```text
CI/build correctness
 -> authoritative live billing
 -> group settlement
 -> booking/session handoff
 -> LAN realtime
 -> KDS + inventory
 -> configuration/admin lifecycle
 -> receipts/refunds/daily close
 -> hardware agents
 -> health/backups
 -> security/tests
 -> supported Next.js upgrade
 -> production validation
```

## Operational lifecycle

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

The database remains authoritative, the server enforces business rules, attribution is preserved, and core LAN operations must remain usable when the internet is unavailable.
