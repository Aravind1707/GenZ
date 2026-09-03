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

### Identity and membership

- Customers authenticate with **mobile number + OTP**.
- OTPs are server-generated, hashed, short-lived, attempt-limited and rate-limited.
- Customer session tokens are hashed and stored server-side in HttpOnly cookies.
- Membership is evaluated server-side using active status and expiry.
- Never trust browser `isMember`, member IDs, prices, totals, payment state, or staff roles.

### Customer pricing

**Active member:** show **only the member price**; never display the regular price.

**Non-member:** show the regular price and member savings where appropriate.

The server recalculates all final prices.

### Food ordering

Food can only be ordered from the customer site when tied to an eligible active gaming session/tab.

Customer payment choices are exactly:

1. **Pay Now** — Razorpay
2. **Pay at Counter** — authorized staff marks the order paid

There is no active wallet, GenZ Pay balance, food wallet, or “add food to gaming bill” flow.

### Attribution

```text
CUSTOMER -> MEMBERSHIP
CUSTOMER/GROUP -> BOOKING -> SESSION -> STATION
SESSION -> PARTICIPANTS -> GAMING CHARGES
SESSION -> FOOD ORDERS -> PAYMENTS
PAYMENTS -> FINANCE / AUDIT
```

Every rupee must have an auditable transaction/ledger origin.

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

Stack:

- Next.js / React / TypeScript
- MySQL + `mysql2`
- Server-side API routes
- PWA-oriented customer/admin/kitchen interfaces
- GitHub Actions CI

The MySQL pool is **lazy-initialized**, so `npm run build` does not require a live database or production DB environment variables. Runtime database calls still require configured MySQL variables.

## Customer experience

### Authentication

```text
Mobile -> OTP -> server verification -> customer lookup/create
       -> active membership check -> correct pricing
```

### Gaming

Customer gaming is a price-list experience with:

- Normal PC
- Premium PC
- PS5
- PS4
- PSVR
- MOZA
- station-aware QR flow
- live participant billing
- +15/+30/+60 minute extension

### Station QR

Permanent station QR codes identify equipment only, e.g. `PC-01`, `PS5-01`, `MOZA-01`.

```text
QR station -> active session -> authenticated customer -> participant -> food order
```

The QR itself grants no authorization.

### Food

Food catalog, cart, server-side pricing, active-member eligibility, participant attribution, Pay Now and Pay at Counter are implemented. Customer order history, stock-aware ordering and realtime status remain production work.

## Admin operations

### Sessions and live billing

Implemented foundation:

- live floor
- station-specific start
- active/paused/ended sessions
- pause/resume billing
- participant search/add/leave
- participant rate snapshots
- grouping
- live billing endpoint
- **authoritative live gaming total in the sessions API and dashboard**
- session extension protection

The admin session total combines server-computed live gaming charges with food balance instead of relying on stale stored gaming balance while a session is active.

### Gaming billing

Server-authoritative billing supports elapsed time, per-minute rounding, persisted pause periods, participant-specific join/leave intervals, member/non-member rate snapshots and finalization.

### Groups and settlement

Open groups support 2–20 active sessions while retaining individual attribution.

The settlement engine supports:

- one payer
- equal split
- custom payer amounts
- by PC/session source
- by food item source
- mixed gaming + food settlement
- partial settlement
- overpayment protection
- transaction-safe source allocation
- settlement/payer/allocation records
- finance ledger entry
- close protection until all sessions are ended and all money is settled

Group totals are calculated from live gaming billing plus unpaid/failed food, less previous settlement allocations.

Settlement tables:

- `group_settlements`
- `group_settlement_payers`
- `group_settlement_allocations`

Group settlement UI currently records only captured staff payment methods: cash, UPI, card and other. A dedicated verified Razorpay group checkout remains future work.

### Bookings

Implemented:

- create
- station assignment
- time range validation
- conflict detection
- cancellation
- check-in tracking
- no-show action after booking end
- **checked-in booking -> session handoff**
- booking/session linkage
- customer linkage foundation
- audit events for booking lifecycle actions

A checked-in booking can be started only inside its booked time window, only if the station is actually available, and only once. The created session inherits the booked end time so the booking window remains authoritative.

Automatic deposit payment/reconciliation, customer/member lookup UI and richer calendar/timeline workflows remain.

### Orders / kitchen

Implemented admin order queue with status progression and counter payment authorization. Full KDS, realtime events, stock reservation/decrement and customer order status remain.

### Finance

`finance_transactions` supports revenue/expense ledger entries, source attribution and payment methods. Group settlements create explicit finance revenue entries. The next finance stage is reconciliation across gaming, food, memberships, deposits and refunds without double-counting.

## Database and migrations

`db/mysql-schema.sql` is the canonical baseline through booking check-in and finance ledger. Newer production features are delivered as incremental migrations.

Current migration sequence includes:

- `008_gaming_billing.sql`
- `009_payment_mode_cleanup.sql`
- `010_finance_ledger.sql`
- `011_*` integrity updates
- `012_session_pause_periods.sql`
- `013_booking_checkin.sql`
- `014_group_settlements.sql`
- `015_booking_session_handoff.sql`
- `016_booking_customer_link.sql`

For a fresh database, `scripts/migrate.mjs` applies the canonical baseline at version 13 and then applies incremental migrations 014 onward. This avoids replaying historical ALTER migrations against the complete baseline while still installing newer feature tables/columns.

Existing databases apply only unapplied migration versions.

## Security

Staff roles:

- OWNER
- MANAGER
- CASHIER
- KITCHEN
- FLOOR

Staff authentication uses hashed passwords and server-side sessions. Sensitive operations use server-side permission checks and audit logging.

Production hardening still required:

- verify every admin API has correct RBAC
- CSRF strategy
- request/body limits
- rate limits
- CSP/security headers
- complete audit coverage
- payment event idempotency/reconciliation
- refund authorization

## Environment

MySQL runtime variables:

```env
GENZ_DB_HOST=127.0.0.1
GENZ_DB_PORT=3306
GENZ_DB_USER=genz
GENZ_DB_PASSWORD=change-this
GENZ_DB_NAME=genz_os
```

Razorpay server-only secrets:

```env
GENZ_RAZORPAY_KEY_ID=...
GENZ_RAZORPAY_KEY_SECRET=...
GENZ_RAZORPAY_WEBHOOK_SECRET=...
```

Never expose secrets to customer/admin browsers.

## Development

```bash
npm install
npm run dev
npm run build
npm start
npm run db:migrate
```

CI currently runs `npm install` followed by `npm run build` on pushes and pull requests to `main`.

## Current implementation status

### Green / implemented foundations

- MySQL source-of-truth architecture
- lazy DB pool for CI-safe builds
- customer mobile/OTP authentication
- membership recognition and server-authoritative pricing
- member-only price display
- customer gaming price list
- food ordering with Pay Now / Pay at Counter
- Razorpay order/signature/webhook foundation
- food payment idempotency
- session QR resolution
- station QR administration/print foundation
- session extension protection
- participant-level gaming billing
- persisted pause periods
- participant join/leave
- authoritative live session/dashboard gaming totals
- staff auth/RBAC foundation
- audit logging foundation
- live sessions/orders/bookings UI
- booking check-in/no-show
- checked-in booking to session handoff
- session-to-booking linkage
- session groups foundation
- group settlement engine and allocation ledger
- finance ledger foundation
- migration runner with fresh baseline + incremental migrations

### Remaining to reach production-complete

1. Booking deposit payment/reconciliation and customer/member lookup UI.
2. LAN realtime event bus/SSE/WebSocket.
3. Full KDS.
4. Inventory, stock accounting and COGS.
5. Admin menu, gaming-rate, station and image configuration.
6. Membership lifecycle/payment/history UI.
7. Customer management/history UI.
8. Staff CRUD, password reset and session revocation UI.
9. Gaming/food/group/combined receipts.
10. Razorpay/counter refunds and reconciliation.
11. Daily close/cash drawer/payment-method reconciliation.
12. Station agents, heartbeat and hardware-control abstraction.
13. Operational health monitoring.
14. Backup and restore verification.
15. Comprehensive unit/integration/E2E tests.
16. Complete security audit.
17. Supported Next.js upgrade and compatibility validation.
18. Final admin-PC/LAN deployment and bootstrap validation.

Next.js 14.2.15 remains temporarily for compatibility; it must be upgraded to a supported release before production.

## Development order

```text
CI/build correctness
 -> authoritative live billing
 -> group settlement
 -> booking/session handoff
 -> realtime
 -> KDS + inventory
 -> configuration/admin lifecycle
 -> receipts/refunds/daily close
 -> hardware agents
 -> health/backups
 -> security/tests
 -> supported Next.js upgrade
 -> production validation
```

## Operational principle

GenZ OS should behave as one café operating system, not disconnected pages. The complete lifecycle is:

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
