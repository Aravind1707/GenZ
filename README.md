# GenZ OS

**LAN-first gaming café operating system for gaming, food & beverages, memberships, bookings, billing, payments, staff operations, and equipment control.**

GenZ OS runs primarily on the café admin PC with MySQL as the source of truth. Customer phones and operational devices use the LAN. MSG91 and Razorpay are external integrations, not core operational dependencies.

## Current implementation

- MySQL source of truth with incremental migrations and CI build validation.
- Customer mobile + OTP authentication with hashed, rate-limited challenges and hashed customer sessions.
- Customer session-management screen with current-device sign-out and sign-out-other-devices controls.
- Server-authoritative membership recognition and dynamic member/non-member pricing.
- Gaming price list and food ordering with **Pay Now** / **Pay at Counter** only.
- Razorpay order/signature/webhook foundation and food payment idempotency.
- Transactional food inventory reservation, release and consumption.
- Permanent station QR identifies equipment only; active station binding requires a short-lived challenge from a trusted station agent, with member pricing rates snapshotted at participant creation.
- Active/paused/ended sessions, participant-level pause-aware billing, server-side rate snapshots and session extensions.
- Individual session final billing with gaming + unpaid food, counter settlement, partial/split Cash/UPI/Card payments and settlement-before-equipment-release.
- Manager can add food manually to an active session as a counter-payable order.
- Approved regular customers can use a controlled monthly credit account with a configurable limit, session charges, partial repayments and statements.
- Multi-session group billing with equal/custom/by-session/by-food allocation.
- Booking creation, conflicts, check-in/no-show, booking-to-session handoff and deposit collection/application/refund lifecycle.
- Booking deposits are treated as advances in finance reporting rather than earned revenue.
- Staff authentication/RBAC, audit logging, finance ledger and LAN SSE realtime foundation.
- Staff model is OWNER + MANAGER; legacy specialist roles are migrated to MANAGER.
- Optional provider-neutral POS/ECR boundary for future dynamic UPI QR/card terminal integration; disabled until the exact POS provider/model is verified.
- Static-IP/public-origin configuration and owner remote-access/VPN deployment guidance.
- Admin screens for sessions, settlements, **combined session receipts**, bookings, food orders, kitchen, finance, members, stations and inventory.

## Accounting invariants

Every payment is recorded transactionally and attributed to its source. Session settlement cannot exceed the server-calculated outstanding balance, cannot be captured against an open billing group, and is idempotent when a client supplies an idempotency key. Partial/split counter payments are recorded as separate entries. An ended session keeps its equipment unavailable until its bill is fully settled or an approved monthly-credit posting succeeds. Monthly credit is an audited customer receivable, not a wallet. Booking deposits are tracked separately, can be applied against the combined final session tab, and any unused remainder must be refunded before a billing group can close.

The staff receipt view combines server-calculated gaming charges, itemized food orders, deposit/group allocations, billing adjustments, monthly credit and session settlement history. Receipt data is read-only and does not create or mutate financial records.

## Station security

Permanent labels such as `PC-01`, `PS5-01` and `MOZA-01` are identifiers, not credentials. A trusted station agent holds a station-specific secret and requests a 32-byte, 60-second challenge. The customer must authenticate with OTP and submit the current challenge; the server locks and consumes it before creating the participant binding. The participant receives a server-side snapshot of the applicable regular/member rates at join time. The agent secret must never be shipped to browser JavaScript.

## Static IP and remote owner access

The ISP static IP should be used as a stable public endpoint behind a firewall/reverse proxy. Point the café domain DNS at the static IP and expose only HTTPS to the public application. For owner-only access to private café infrastructure, use a VPN rather than exposing MySQL, RDP, SSH, router administration or CCTV ports. See `docs/STATIC_IP_AND_POS.md` for the deployment model and optional POS flow.

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
- `026_finance_booking_deposit_cleanup.sql`
- `027_staff_owner_manager_roles.sql`
- `028_session_billing_credit_accounts.sql`
- `031_station_agent_heartbeats.sql`
- `032_station_agent_commands.sql`

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

GENZ_PUBLIC_BASE_URL=https://order.example.com
GENZ_OWNER_REMOTE_ACCESS_ENABLED=false
GENZ_OWNER_REMOTE_ACCESS_MODE=VPN

GENZ_RAZORPAY_KEY_ID=...
GENZ_RAZORPAY_KEY_SECRET=...
GENZ_RAZORPAY_WEBHOOK_SECRET=...

GENZ_POS_PROVIDER=NONE
GENZ_POS_INTEGRATION_ENABLED=false
GENZ_POS_DYNAMIC_UPI_QR_ENABLED=false
GENZ_POS_CARD_ENABLED=false
GENZ_POS_AUTO_CONFIRM_ENABLED=false

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
5. Customer/member search and management polish, including monthly credit UI.
6. ~~Combined receipts foundation~~ — staff combined session receipt is implemented; continue with refunds/reversals and transactional payment reconciliation.
7. Daily close and cash-drawer controls.
8. Station-agent heartbeat and hardware-control abstraction.
9. Implement and verify the exact POS provider adapter for dynamic UPI QR/card terminal payments.
10. Operational health monitoring and verified backup/restore.
11. Final admin-PC/LAN deployment validation.
