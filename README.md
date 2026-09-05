# GenZ OS

**LAN-first gaming café operating system for gaming, food & beverages, memberships, bookings, billing, payments, staff operations, and equipment control.**

GenZ OS runs primarily on the café admin PC with MySQL as the source of truth. Customer phones and operational devices use the LAN. MSG91 and Razorpay are external integrations, not core operational dependencies.

## Current implementation

- MySQL source of truth with incremental migrations and CI build validation.
- Customer mobile + OTP authentication with hashed, rate-limited challenges and hashed customer sessions.
- Server-authoritative membership recognition and dynamic member/non-member pricing.
- Gaming price list and food ordering with **Pay Now** / **Pay at Counter** only.
- Razorpay order/signature/webhook foundation and food payment idempotency.
- Transactional food inventory reservation, release and consumption, plus recipe/material, costed receiving, stocktake and waste foundations.
- Permanent station QR identifies equipment only; active station binding requires a short-lived challenge from a trusted station agent.
- Active/paused/ended sessions, participant billing, rate snapshots and extensions.
- Combined gaming+food settlement with partial/split payments and settlement-before-equipment-release.
- Approved monthly credit accounts and statements; no wallet balance.
- Booking creation, conflicts, check-in/no-show, handoff and deposit lifecycle.
- Staff authentication/RBAC, audit logging, finance ledger and LAN SSE realtime.
- OWNER + MANAGER staff model.
- Provider-neutral POS/ECR boundary disabled until the exact provider is verified.
- Static-IP/Windows deployment foundation with HTTPS/firewall/VPN guidance.
- Combined staff receipts and immutable transactional session-payment refunds.
- Daily-close tender/refund/expense reporting, physical cash variance and persistent OWNER approval.
- OWNER administration for catalogue, rates, stations, member rules and staff lifecycle.
- External finance reconciliation matching for incoming and outgoing ledger records with amount exceptions.
- Provider-aware session refund references/status fields.
- Persisted realtime event replay/reconnect cursor foundation.
- Production CSP/HSTS hardening and migration-integrity tests in CI.

## Database migrations

Current feature migrations include `014`, `017`–`028`, `031`–`042`; see `db/migrations/` for the canonical numbered SQL. Run `npm run db:migrate` against the admin-PC MySQL database. `npm test` validates migration numbering/version markers.

## Security

Staff and customer sessions use hashed tokens with expiry/inactivity limits. Browser-supplied membership, prices, payment states, station ownership and totals are never authoritative. Forwarded client IP headers are trusted only when `GENZ_TRUST_PROXY=true`. Production responses include restrictive CSP and HSTS. Never expose MySQL, payment, messaging or station-agent secrets to browsers.

## Development

```bash
npm install
npm test
npm run build
npm start
npm run db:migrate
npm run station:agent
```

## Remaining build order

1. **Payment/finance:** core ledger reconciliation and daily-close approval are implemented; remaining work is official provider API import/webhook matching and exception-resolution tooling.
2. **Inventory:** FIFO batch consumption, order-level COGS ledger/reporting, customer out-of-stock UX and richer stocktake/supplier/expiry UI.
3. **Admin:** complete CRUD/effective-date pricing/station overrides/customer lifecycle and richer staff UX.
4. **Station hardware:** verified Windows kiosk/session launch, safe unlock/start, WOL/shutdown and console/VR/MOZA adapters only after exact hardware APIs are verified.
5. **Bookings/KDS:** calendar/timeline, modifiers, lookup, deposit/refund polish, retry and out-of-stock UX.
6. **Realtime:** retention/pruning and shared broker for multi-process deployment.
7. **Final QA/deployment:** MySQL integration/concurrency/security tests, request-ID/error hardening, distributed rate limiting, off-host backups, clean restore and actual café LAN/static-IP/HTTPS acceptance.

POS hardware and physical station behavior remain intentionally provider-specific gates rather than simulated implementations.
