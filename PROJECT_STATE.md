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
- An equipment session is not fully released for reuse until its settlement is paid or legitimately moved to approved monthly credit.
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
- Static IP is a stable public network entry point, not authentication.
- Production target is Windows admin-PC/server + local MySQL + Next.js on localhost + HTTPS reverse proxy + router firewall/NAT.
- Owner-only access to private café infrastructure is via VPN; MySQL/RDP/SSH/router/CCTV/station-agent ports are not public.
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

## Session, payment and credit work completed

- Manager can create counter-payable food orders against an active session.
- Session final-bill API supports Cash, UPI, Card/POS and Other settlement methods.
- Partial/split payments are supported and server-calculated.
- Payment idempotency is preserved for settlement retries.
- Ending a session produces a settlement-pending state; equipment is released only after full settlement or approved credit posting.
- Approved monthly-credit posting releases the station and records the amount as a customer credit charge.
- Monthly credit accounts support manager approval, configurable limits, monthly/manual cycles, suspension, statements, session charges and repayments.
- Credit repayments support Cash/UPI/Card/Other, optional references and idempotency.
- Credit balances/available credit are calculated server-side and credit limits are enforced transactionally.
- `/credit` provides manager-facing account search, activation/control, repayment and statement management.

## Static IP / production deployment — foundation complete

- `.env.example` contains public-origin/static-IP and owner VPN settings.
- `docs/STATIC_IP_AND_POS.md` documents the network/security model.
- `deploy/windows/install-genz.ps1` installs/updates the app and verifies the production build.
- `deploy/windows/register-genz-service.ps1` registers GenZ to start at Windows boot on port 3000.
- `deploy/windows/run-genz.ps1` runs `next start` in production mode.
- `deploy/windows/Caddyfile` provides the HTTPS reverse-proxy/security-header configuration.
- `deploy/windows/configure-firewall.ps1` creates Windows firewall rules for the app/reverse proxy.
- `deploy/windows/README.md` contains DNS, router/NAT, LAN IP, secrets, migration, HTTPS, firewall and external-validation procedures.
- The ISP static IP itself cannot be configured from software; the final DNS A record, router NAT/firewall policy, certificate issuance and ISP routing must be applied at the café.

## Remaining project modules

### Bookings
Create, station assignment, validation, conflicts, cancellation, check-in/no-show and session handoff exist. Remaining: customer/member lookup UI, deposit lifecycle/reconciliation polish, cancellation/refund policy and richer calendar/timeline.

### Orders/KDS
Live admin queue, status progression, counter payment authorization, inventory reservation/consumption, customer history and realtime customer order refresh exist. Remaining: richer KDS workflow, modifiers, payment retry, refund/void policy and out-of-stock UX.

### Inventory
Reservation/movement foundation and admin receive/adjust/waste/reorder/unit settings exist. Remaining: menu-to-stock mapping, recipe/BOM, COGS, receiving batches/cost, stocktake, wastage reasons and customer out-of-stock UX.

### Finance
Ledger, food/group/gaming settlement revenue and booking deposit advance classification exist. Counter settlement entries and monthly credit payments are persisted. Remaining: canonical reconciliation, deposit application/refund representation, refunds/reversals, cash drawer and daily close.

### Receipts/refunds/reconciliation
Need unified food/gaming/group/combined receipts, payment IDs/methods, partial refunds, reversals and reconciliation.

### Realtime
Authenticated SSE and customer/KDS subscription foundations exist. Remaining: replay/reconnect cursor semantics, complete mutation coverage and multi-process guarantees.

### Menu/gaming/station admin
Need production CRUD/configuration, pricing, member rules, images/specs, station overrides and effective-date management.

### Membership/customer/staff admin
Customer security is complete; membership and staff backend foundations exist. Remaining: full lifecycle/search/history UI, staff CRUD/password reset/session revocation polish.

### Hardware/health/backups
Need station agents/state machine, WOL/graceful shutdown, console/VR/MOZA adapters, heartbeat, DB/service health and tested backups/restores. POS provider adapter remains hardware/vendor dependent.

### Testing/security/deployment
Static-IP deployment foundation is now scripted/documented. Remaining: run the final validation at the actual café network, automated MySQL concurrency/security tests, final error/request-ID hardening, bounded shared rate limiting, CSP/HSTS production policy, migration duplicate-version checks, and verified backup/restore.

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

- Restricted the intended staff model to OWNER and MANAGER; migration 027 converts legacy staff roles and restricts the database enum.
- Added session customer linkage for trusted monthly billing.
- Added manager manual food-to-session API using the existing server-authoritative menu pricing engine and counter payment mode.
- Added final session settlement API for Cash/UPI/Card/Other with partial/split settlement support.
- Added station lock-until-settlement lifecycle so an unpaid ended session cannot immediately make equipment available.
- Added trusted monthly customer credit accounts, credit limits, session posting, repayment ledger and statements.
- Added optional provider-neutral POS/ECR integration boundary and static-IP/owner-remote-access configuration documentation.
- Added Windows production installer, boot-start runner, HTTPS reverse-proxy configuration, firewall setup and end-to-end static-IP deployment instructions.
- Latest completed CI before this deployment work: run 33945755185 passed `npm run build` on the monthly-credit UI commit.
