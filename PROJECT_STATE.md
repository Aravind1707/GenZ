# GenZ OS — Shared Project State

> Shared hand-off for parallel AI development. `main` is the source of truth. Fetch latest `main` before changing files, preserve other agents' work, keep commits small, and update this file plus `README.md` after meaningful work.

**State reviewed:** 2026-09-04 19:52 IST  
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
- Food payment choices are ONLY Pay Now and Pay at Counter.
- Wallet/GenZ Pay/food wallet/add-food-to-gaming-bill are not active features.
- QR identifies a station only and never grants authorization; live station challenges bind a verified customer to an active session.
- Preserve customer -> participant -> session -> station -> order -> payment attribution.
- Every rupee needs an auditable transaction/ledger origin.
- Inventory reservations are created atomically with food orders; stock is consumed only when a paid order is delivered.

## Architecture/CI

- Next.js 15.5.24, React 19.2.0, TypeScript, MySQL, mysql2.
- Lazy MySQL pool keeps builds independent of a live database.
- GitHub Actions runs `npm install` and `npm run build`.
- Core café operation is LAN-first; MSG91/Razorpay are integrations.

## Customer system — 100% foundation complete

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
- Customer APIs return generic server errors rather than raw internal exception messages on billing/station/session paths.
- Customer OTP rate limiter has bounded stale-key cleanup.

## Remaining project modules

### Bookings
Create, station assignment, validation, conflicts, cancellation, check-in/no-show and session handoff exist. Remaining: customer/member lookup UI, deposit lifecycle/reconciliation polish, cancellation/refund policy and richer calendar/timeline.

### Orders/KDS
Live admin queue, status progression, counter payment authorization, inventory reservation/consumption, customer history and realtime customer order refresh exist. Remaining: richer KDS workflow, modifiers, payment retry, refund/void policy and out-of-stock UX.

### Inventory
Reservation/movement foundation and admin receive/adjust/waste/reorder/unit settings exist. Remaining: menu-to-stock mapping, recipe/BOM, COGS, receiving batches/cost, stocktake, wastage reasons and customer out-of-stock UX.

### Finance
Ledger, food/group/gaming settlement revenue and booking deposit advance classification exist. Remaining: canonical reconciliation, deposit application/refund representation, refunds/reversals, cash drawer and daily close.

### Receipts/refunds/reconciliation
Need unified food/gaming/group/combined receipts, payment IDs/methods, partial refunds, reversals and reconciliation.

### Realtime
Authenticated SSE and customer/KDS subscription foundations exist. Remaining: replay/reconnect cursor semantics, complete mutation coverage and multi-process guarantees.

### Menu/gaming/station admin
Need production CRUD/configuration, pricing, member rules, images/specs, station overrides and effective-date management.

### Membership/customer/staff admin
Customer security is complete; membership and staff backend foundations exist. Remaining: full lifecycle/search/history UI, staff CRUD/password reset/session revocation polish.

### Hardware/health/backups
Need station agents/state machine, WOL/graceful shutdown, console/VR/MOZA adapters, heartbeat, DB/service health and tested backups/restores.

### Testing/security/deployment
Need automated MySQL concurrency/security tests, final error/request-ID hardening, bounded shared rate limiting, CSP/HSTS production policy, migration duplicate-version checks, supported Next.js compatibility validation and final Windows admin-PC/LAN deployment validation.

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

## Development log — 2026-09-04

- Completed customer home/session/account flow.
- Added customer session discovery for the current participant instead of trusting query-string session ownership.
- Validated customer session extension to only 15/30/60 minutes and verified participant/station ownership server-side.
- Hardened customer billing and station resolver API error responses.
- Added bounded cleanup to customer OTP in-memory rate limiter.
- Verified the repository is on Next.js 15.5.24 / React 19.2.0.
