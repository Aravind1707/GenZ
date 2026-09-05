# GenZ OS — Shared Project State

> Shared hand-off for parallel AI development. `main` is the source of truth. Fetch latest `main` before changing files, preserve other agents' work, keep commits small, and update this file plus `README.md` after meaningful work.

**State reviewed:** 2026-09-05 IST  
**Repository:** `Aravind1707/GenZ`  
**Branch:** `main`

## Product rules

GenZ OS is a LAN-first gaming-café OS for ~20 PCs, 5 PS5, 2 PS4, 2 PSVR and 2 MOZA stations, plus food, memberships, bookings, gaming sessions, participant billing, groups, payments, staff, finance and future hardware control.

- Customer identity = mobile + OTP.
- OTP is server-generated, hashed, short-lived, attempt/rate limited.
- Customer sessions use hashed tokens/HttpOnly cookies and a 30-day absolute/idle window.
- Membership is participant-level and active only when `active=TRUE` and `expires_at >= CURDATE()`.
- Never trust client membership, prices, totals, payment state, station ownership or staff role.
- Active member UI shows only member price; regular price is hidden.
- Non-member UI shows regular price and member savings.
- Food payment choices are Pay Now or Pay at Counter.
- Wallet/GenZ Pay stored balance is intentionally removed/deferred.
- Manager may add food manually to an active session as a counter-payable order.
- Gaming/session bills are settled at the counter unless an approved customer is explicitly posted to monthly credit.
- A bill can contain multiple payment entries and supports partial/split Cash, UPI and Card/POS settlement.
- A failed payment never closes a bill.
- An equipment session is not fully released for reuse until its settlement is paid or an approved monthly-credit posting succeeds.
- Trusted monthly billing is an approved credit account, not a wallet. It has a configurable credit limit and separate charge/payment ledger.
- QR identifies a station only and never grants authorization; live station challenges bind a verified customer to an active session.
- Preserve customer -> participant -> session -> station -> order -> payment/credit attribution.
- Every rupee needs an auditable transaction/ledger origin.
- Inventory reservations are created atomically with food orders; stock is consumed only when a paid order is delivered.

## Architecture/CI

- Next.js 15.5.24, React 19.2.0, TypeScript, MySQL, mysql2.
- Lazy MySQL pool keeps builds independent of a live database.
- GitHub Actions runs `npm install` and `npm run build`.
- Core café operation is LAN-first; MSG91/Razorpay are integrations.
- Static IP is treated as a stable public network entry point, not as authentication. Recommended owner remote access is HTTPS for the admin app plus VPN for private café infrastructure.
- Optional POS/ECR integration is provider-neutral and disabled by default until the exact terminal/provider API is verified.

## Staff roles

- `OWNER`: full access.
- `MANAGER`: operational access including sessions, orders, customers, members, inventory, finance, payments and credit accounts.
- Legacy `CASHIER`, `KITCHEN` and `FLOOR` roles are migrated to `MANAGER` by migration 027 and the database enum is restricted to OWNER/MANAGER.

## Customer system — foundation complete

- Mobile OTP login with hashed challenge, five-attempt limit, request cooldown/rate limits, server-side member recognition and secure HttpOnly customer session.
- Customer session persists for 30 days with absolute expiry and 30-day inactivity window; current/other-device sign-out is available.
- Customer pricing is server-authoritative and separates gaming and Food & Beverages.
- Member view hides regular prices; non-member view shows regular + member prices and savings.
- Food checkout is restricted to Pay Now / Pay at Counter and requires an active participant session.
- Food orders are attributed through participant/session/station and customer history is available.
- Customer sees live server-computed gaming billing, participant charges and session end time.
- Customer can extend active sessions by 15/30/60 minutes; extension is participant/station/session validated and checked against the next booking.
- Station QR uses a short-lived, single-use, station-specific live challenge and creates participant attribution atomically.
- Customer security page and authenticated SSE customer events are implemented.

## Session and payment work completed in this milestone

- Manager can create counter-payable food orders against an active session through `POST /api/session-orders`.
- Session final-bill API supports counter Cash, UPI, Card/POS and Other payments through repeatable settlement entries.
- Partial payments are supported; the remaining balance is calculated server-side.
- Split payments are supported by adding multiple settlement entries, e.g. Cash ₹250 + UPI ₹250.
- Payment idempotency is preserved for settlement retries.
- Ending a session now produces a settlement-pending state instead of immediately releasing the equipment.
- A station is released only when the final outstanding amount reaches zero.
- Approved monthly-credit posting also releases the station and records the amount as a customer credit charge.
- Session settlement responses expose gaming total, food total, paid amount, credit applied, outstanding amount and settlement status.
- Customer linking can be attached to a session for accurate monthly-credit attribution.

## Trusted monthly customer billing

- `customer_credit_accounts` stores approval status, credit limit, billing cycle and approving staff member.
- `customer_credit_entries` records session charges with a unique source identity to prevent duplicate posting.
- `customer_credit_payments` records Cash/UPI/Card/Other repayments separately.
- Credit balance and available credit are calculated server-side.
- Credit account API supports enable, suspend, statement, payment, attach-session and charge-session operations.
- Credit limits prevent new charges from exceeding the approved limit.
- Membership remains independent from credit status.

## POS/static-IP foundation

- `.env.example` now contains static-IP/public-origin and optional POS/ECR feature flags.
- `lib/payment-terminal.ts` provides a provider-neutral boundary for dynamic UPI QR and card terminal requests.
- POS integration, dynamic UPI QR, card integration and automatic confirmation are disabled by default until a real provider adapter is installed.
- `docs/STATIC_IP_AND_POS.md` documents the recommended HTTPS/VPN network layout, public exposure rules and intended integrated POS flow.

## Remaining project modules

### Bookings
Create, station assignment, validation, conflicts, cancellation, check-in/no-show and session handoff exist. Remaining: customer/member lookup UI, deposit lifecycle/reconciliation polish, cancellation/refund policy and richer calendar/timeline.

### Orders/KDS
Live admin queue, status progression, counter payment authorization, inventory reservation/consumption, customer history and realtime customer order refresh exist. Remaining: richer KDS workflow, modifiers, payment retry, refund/void policy and out-of-stock UX.

### Inventory
Reservation/movement foundation and admin receive/adjust/waste/reorder/unit settings exist. Remaining: menu-to-stock mapping, recipe/BOM, COGS, receiving batches/cost, stocktake, wastage reasons and customer out-of-stock UX.

### Finance
Ledger, food/group/gaming settlement revenue and booking deposit advance classification exist. New counter settlement entries and monthly credit payments are now persisted. Remaining: canonical reconciliation, deposit application/refund representation, refunds/reversals, cash drawer and daily close.

### Receipts/refunds/reconciliation
Need unified food/gaming/group/combined receipts, payment IDs/methods, partial refunds, reversals and reconciliation.

### Realtime
Authenticated SSE and customer/KDS subscription foundations exist. Remaining: replay/reconnect cursor semantics, complete mutation coverage and multi-process guarantees.

### Menu/gaming/station admin
Need production CRUD/configuration, pricing, member rules, images/specs, station overrides and effective-date management.

### Membership/customer/staff admin
Customer security is complete; membership and staff backend foundations exist. Remaining: full lifecycle/search/history UI, staff CRUD/password reset/session revocation polish, monthly credit management UI.

### Hardware/health/backups
Need station agents/state machine, WOL/graceful shutdown, console/VR/MOZA adapters, heartbeat, DB/service health and tested backups/restores. POS provider adapter remains hardware/vendor dependent.

### Testing/security/deployment
Need automated MySQL concurrency/security tests, final error/request-ID hardening, bounded shared rate limiting, CSP/HSTS production policy, migration duplicate-version checks, and final Windows admin-PC/LAN deployment validation.

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

Plus reliable fresh bootstrap/upgrades, authorization, payments, inventory, realtime LAN operation, equipment state, backups/restores and automated tests.

## Development log — 2026-09-05

- Restricted the intended staff model to OWNER and MANAGER; migration 027 converts legacy staff roles and restricts the database enum.
- Added session customer linkage for trusted monthly billing.
- Added manager manual food-to-session API using the existing server-authoritative menu pricing engine and counter payment mode.
- Added final session settlement API for Cash/UPI/Card/Other with partial/split settlement support.
- Added station lock-until-settlement lifecycle so an unpaid ended session cannot immediately make equipment available.
- Added trusted monthly customer credit accounts, credit limits, session posting, repayment ledger and statements.
- Added optional provider-neutral POS/ECR integration boundary and static-IP/owner-remote-access configuration documentation; live terminal adapter remains disabled until the exact POS model/provider is verified.
- Previous CI build failure in `staff-auth.ts` was fixed in commit `f1ad4f1`; CI #266 passed. New changes are awaiting their own CI verification.
