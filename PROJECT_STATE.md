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

## Completed foundations

Customer OTP/security, membership recognition and server-authoritative pricing; food ordering and counter-payable orders; bookings/check-in/no-show backend; gaming sessions, participants and server-computed billing; session extension and station QR attribution; authenticated realtime customer/KDS foundations; session settlement with Cash/UPI/Card/Other, partial/split payments and idempotency; station lock-until-settlement lifecycle; approved monthly credit accounts, limits, statements and repayments; OWNER/MANAGER roles; inventory reservation/movement foundation; finance ledger foundation; static-IP/Windows deployment foundation with HTTPS reverse proxy and firewall guidance; combined staff session receipt foundation; transactional session-payment refunds.

## New hardening/build foundations

- `lib/station-agent-protocol.ts` defines the provider-neutral station-agent state machine, heartbeat and command contract.
- `lib/station-agent-lease.ts` provides fail-closed lease validation and remaining-lease calculation.
- `lib/station-agent-heartbeat.ts` persists authenticated station-agent heartbeat telemetry; migration 031 and `/api/station-agent/heartbeat` provide the server path.
- `db/migrations/032_station_agent_commands.sql` and `lib/station-agent-commands.ts` provide an idempotent durable command queue with claim/acknowledge/expiry semantics.
- `/api/station-agent/commands` authenticates agents with per-station secrets and staff command requests using the existing staff authorization model.
- `scripts/station-agent.mjs` polls commands, acknowledges them, enforces session lease expiry locally, and supports Windows workstation lock/shutdown commands. Vendor-specific launch/unlock adapters remain intentionally unimplemented until hardware requirements are verified.
- `lib/billing-reconciliation.ts` provides server-side bill/payment/credit reconciliation invariants and is ES-target compatible.
- `lib/refund-policy.ts` provides a pure refund eligibility/remaining-balance policy boundary.
- `lib/daily-close.ts` provides tender-net and ledger-vs-tender balancing invariants.
- `db/migrations/033_session_payment_refunds.sql` and `034_session_payment_refund_idempotency.sql` add immutable session-payment refund records with idempotency keys.
- `lib/session-refunds.ts` executes partial session-payment refunds transactionally, caps refunds at each captured settlement's remaining balance, creates finance reversal entries, and reopens/block the session when a refund creates an outstanding balance.
- `/api/session-refunds` provides staff-only refund listing and execution with `payments:read`/`payments:write` authorization and audit logging.
- `lib/receipt.ts`, `/api/sessions/receipt` and `/receipts` now expose gaming participants, food orders/items, deposits/group allocations, billing adjustments, monthly credit, session payment history and payment refunds. The receipt page can initiate a partial refund for a captured session payment.
- `app/layout.tsx` exposes the receipts screen in staff navigation.
- `docs/STATION_AGENT_PROTOCOL.md`, `docs/REFUND_RECONCILIATION.md`, `docs/BACKUP_RESTORE.md`, `docs/PRODUCTION_CHECKLIST.md` and `docs/BUILD_ROADMAP.md` document the operational contracts and remaining build order.

## Remaining project modules

### Station/hardware
Complete physical PC enforcement around the authenticated command path: a verified Windows kiosk/session-launch implementation, safe unlock/start semantics, WOL/graceful shutdown, and adapters for console/VR/MOZA hardware. Exact vendor APIs must be verified before implementation.

### Receipts/refunds/reconciliation
Receipt and transactional session-payment refund foundations are implemented. Continue with cross-source payment reconciliation, provider-aware external refund references and refund/void policy expansion where required.

### Finance/daily close
Build canonical reconciliation against all captured tenders and reversals, deposit application/refund representation, cash drawer and daily close report.

### Inventory
Complete menu-to-stock mapping, recipe/BOM, COGS, receiving batches/cost, stocktake, wastage reasons and customer out-of-stock UX.

### Admin
Complete menu/gaming/station CRUD, pricing/member rules, images/specs, station overrides, effective dates, membership/customer lifecycle and staff CRUD/password reset/session revocation.

### Bookings/KDS
Polish customer/member lookup, deposits, cancellation/refund policy, calendar/timeline, modifiers, payment retry, refund/void policy and out-of-stock UX.

### Realtime
Add replay/reconnect cursor semantics, complete mutation coverage and multi-process guarantees.

### Testing/security/deployment
Add automated MySQL concurrency/security tests, final request-ID/error hardening, bounded shared rate limiting, CSP/HSTS production policy, migration duplicate-version checks, scheduled/off-host backups and a verified clean restore. Static-IP/DNS/router/HTTPS acceptance must be run at the actual café.

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

- Restricted intended staff model to OWNER and MANAGER.
- Added session customer linkage and trusted monthly billing.
- Added manager manual food-to-session ordering.
- Added final session settlement with partial/split settlement and station locking.
- Added trusted monthly credit accounts and repayments.
- Added provider-neutral POS/ECR boundary and static-IP deployment foundation.
- Added Windows production installer, boot-start runner, HTTPS reverse proxy, firewall setup and deployment instructions.
- Added station-agent protocol/lease contracts, billing/refund/daily-close invariants, production checklist, backup/restore runbook and prioritized build roadmap.
- Added persistent authenticated station heartbeat telemetry and durable station command queue.
- Added station-agent command polling, acknowledgement, lease-expiry fail-closed locking, and safe Windows lock/shutdown hooks.
- Fixed CI build failure caused by ES-target-incompatible BigInt literals in billing reconciliation and corrected mysql2 command acknowledgement result typing.
- Added combined session receipt service, staff API and receipt screen.
- Added immutable partial session-payment refunds, refund idempotency, finance reversal entries, settlement-balance integration, receipt refund visibility and staff refund controls.
