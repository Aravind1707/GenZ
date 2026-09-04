# GenZ OS

**LAN-first gaming café operating system for gaming, food & beverages, memberships, bookings, billing, payments, staff operations, and equipment control.**

GenZ OS runs primarily on the café admin PC with MySQL as the source of truth. Customer phones and operational devices use the LAN. MSG91 and Razorpay are external integrations, not core operational dependencies.

## Current implementation

- MySQL source of truth with incremental migrations and CI build validation.
- Customer mobile + OTP authentication with hashed, rate-limited challenges and hashed customer sessions.
- Server-authoritative membership recognition and dynamic member/non-member pricing.
- Gaming price list and food ordering with **Pay Now** / **Pay at Counter** only.
- Razorpay order/signature/webhook foundation and food payment idempotency.
- Transactional food inventory reservation, release and consumption.
- Permanent station QR identifies equipment only; active station binding requires a short-lived challenge from a trusted station agent.
- Active/paused/ended sessions, participant-level pause-aware billing, server-side rate snapshots and session extensions.
- Individual session settlement for gaming + unpaid food, plus multi-session group billing with equal/custom/by-session/by-food allocation.
- Booking creation, conflicts, check-in/no-show, booking-to-session handoff and deposit collection/application/refund lifecycle.
- Staff authentication/RBAC, audit logging, finance ledger and LAN SSE realtime foundation.
- Admin screens for sessions, settlements, bookings, food orders, kitchen, finance, members, stations and inventory.

## Accounting invariants

Every payment is recorded transactionally and attributed to its source. Session settlement cannot exceed the server-calculated outstanding balance, cannot be captured against an open billing group, and is idempotent when a client supplies an idempotency key. Booking deposits are tracked separately, can be applied once to a linked session, and any unused remainder must be refunded before a billing group can close.

## Station security

Permanent labels such as `PC-01`, `PS5-01` and `MOZA-01` are identifiers, not credentials. A trusted station agent holds a station-specific secret and requests a 32-byte, 60-second challenge. The customer must authenticate with OTP and submit the current challenge; the server locks and consumes it before creating the participant binding. The agent secret must never be shipped to browser JavaScript.

## Database migrations

The canonical schema is followed by incremental migrations. Current feature migrations include:

- `014_group_settlements.sql`
- `017_inventory.sql`
- `018_remove_wallet.sql`
- `019_membership_transactions.sql`
- `020_booking_deposit_payments.sql`
- `021_security_idempotency.sql`
- `022_idempotency_payload_fingerprint.sql`
- `023_booking_deposit_allocations.sql`
- `024_session_settlements.sql`
- `025_station_challenges.sql`

Run `npm run db:migrate` against the admin-PC MySQL database. The migration runner creates the canonical schema first and then applies only unapplied numbered migrations.

## Security

Staff sessions use hashed 256-bit tokens with a 12-hour absolute lifetime and 45-minute inactivity timeout. Customer sessions use hashed 256-bit tokens with a 30-day absolute lifetime and 12-hour inactivity timeout. Browser-supplied membership, prices, payment states, station ownership and totals are never authoritative. Forwarded client IP headers are trusted only when `GENZ_TRUST_PROXY=true`.

Never expose MySQL credentials, Razorpay secrets, MSG91 credentials or station-agent secrets to the browser.

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

# JSON map of station IDs to high-entropy secrets held only by trusted station agents.
GENZ_STATION_AGENT_SECRETS_JSON={"PC-01":"replace-with-at-least-32-random-characters"}
GENZ_TRUST_PROXY=false
```

## Development

```bash
npm install
npm run dev
npm run build
npm start
npm run db:migrate
npm run station:agent
```

CI runs `npm install` and `npm run build` on pushes and pull requests to `main`.

## Roadmap to production

1. Automated integration/security tests against MySQL.
2. Customer/KDS realtime subscriptions with replay/reconnect semantics.
3. Menu recipes/BOM, stocktake, COGS and receiving costs.
4. Configuration screens for menu, gaming rates, station metadata and images.
5. Customer/member search and management polish.
6. Combined receipts, refunds/reversals and payment reconciliation.
7. Daily close and cash-drawer controls.
8. Station-agent heartbeat and hardware-control abstraction.
9. Operational health monitoring and verified backup/restore.
10. Supported Next.js upgrade and final admin-PC/LAN deployment validation.
