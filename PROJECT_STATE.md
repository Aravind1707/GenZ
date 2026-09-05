# GenZ OS — Shared Project State

> Shared hand-off for parallel AI development. `main` is the source of truth. Fetch latest `main` before changing files, preserve other agents' work, keep commits small, and update this file plus `README.md` after meaningful work.

**State reviewed:** 2026-09-05 IST  
**Repository:** `GenZ`  
**Branch:** `main`

## Product rules

GenZ OS is a LAN-first gaming-café OS for ~20 PCs, 5 PS5, 2 PS4, 2 PSVR and 2 MOZA stations, plus food, memberships, bookings, gaming sessions, participant billing, groups, payments, staff, finance and equipment control.

- Customer identity = mobile + OTP.
- Never trust client membership, prices, totals, payment state, station ownership or staff role.
- Active member UI shows only member price; non-members see normal and member pricing.
- Food payment choices are Pay Now or Pay at Counter; wallet balance remains deferred.
- Gaming/session bills settle at counter unless explicitly posted to approved monthly credit.
- Equipment remains unavailable until settlement is paid or legitimately moved to approved credit.
- Every rupee needs an auditable ledger origin.
- Inventory reservation is atomic; stock is consumed only when a paid order is delivered.
- Food cancellation/refund policy: before preparation, cancellation is allowed and paid orders are eligible up to 100%; once preparation has started, cancellation is blocked and any approved paid-order refund is limited to 50%; food refunds are paid at the Admin Desk in cash.

## Deploy-ready software baseline

The application code, database migrations, operational APIs/UI, CI, Docker deployment, station agent foundation, backup/restore tooling and production health endpoint are implemented. Migration `048_food_refund_policy.sql` contains the auditable food refund policy ledger.

Completed software areas include customer OTP/security, membership/pricing, food ordering, booking/check-in/no-show, gaming sessions/billing, station challenge attribution, station lease/lock controls, settlement/partial payments/idempotency, monthly credit, OWNER/MANAGER RBAC, inventory reservation/FIFO/expiry/COGS/stocktakes/suppliers/waste/valuation, finance ledger/daily close/reconciliation/provider reconciliation, receipts/refunds, OWNER administration, persisted realtime replay/SSE, CSP/HSTS/request IDs, Windows station kiosk launch, MySQL backup/restore scripts and `/api/health` readiness.

## Food refund implementation

- Customer cancellation endpoint verifies ownership and only permits `NEW` or `ACCEPTED`.
- Paid pre-preparation cancellation creates an auditable refund eligibility of up to 100%.
- Once `PREPARING` begins, cancellation is rejected server-side.
- Staff Admin Desk refund processing enforces 100% maximum before preparation and 50% maximum after preparation.
- Refund method is explicitly `ADMIN_DESK_CASH`; no automatic online refund is performed by the cancellation flow.
- Refunds create finance expense and audit records and are idempotently limited to one paid food-refund record per order.

## Inventory

Recipe-backed FIFO batch consumption excludes expired batches and creates immutable COGS. Receiving creates costed batches and supplier history. Stocktakes require staged editing followed by explicit authorization/finalization. Wastage requires available unreserved stock and a valid non-expired batch. Valuation excludes expired stock. Customer availability is server-authoritative and unavailable food cannot be ordered.

## Admin

OWNER administration now provides create/edit/status controls for menu catalogue, gaming rates, stations, member pricing rules and staff lifecycle. The backend remains owner-only and audited.

## Station / hardware

The station agent is provider-neutral and fail-closed: it has heartbeat, durable commands, session leases, Windows workstation lock and graceful shutdown hooks. `scripts/station-kiosk.ps1` launches the station QR in Edge kiosk mode. Exact WOL, console, VR and MOZA vendor integrations remain deliberately gated until the installed hardware/API is known.

## Reliability / deployment

- Docker Compose keeps MySQL private and applies migrations automatically.
- `/api/health` reports database readiness and latest migration.
- `scripts/backup-mysql.ps1` produces transactional MySQL dumps with retention.
- `scripts/restore-mysql.ps1` restores a dump into a verification database.
- CI covers unit/build, migration/integration/concurrency, Docker and security contracts.
- Production physical acceptance still requires off-host backup/restore test, real OTP/payment credentials, HTTPS/static-IP/router verification, station reboot/lease-lock testing and café LAN outage testing.

## Final physical/environment acceptance only

1. Real MSG91 OTP delivery.
2. Real Razorpay test/live payment, webhook and provider reconciliation.
3. Static public IP/DNS/HTTPS/reverse proxy/firewall/VPN.
4. Off-host backup and clean restore drill.
5. Station-by-station Windows lease expiry/lock/reboot test.
6. Installed console/VR/MOZA hardware behavior and any exact vendor adapter.
7. Full café LAN acceptance of the booking → session → food → payment → receipt → finance → daily-close flow.

These are deployment-environment gates, not unfinished application modules.

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

Plus reliable bootstrap/upgrades, authorization, payments, inventory, realtime operation, equipment state, backups/restores and automated tests.

## Development log — 2026-09-05

- Restricted intended staff model to OWNER and MANAGER.
- Added trusted monthly billing and final session settlement with station locking.
- Added provider-neutral POS/ECR boundary and Windows/static-IP deployment foundation.
- Added station-agent protocol, lease, heartbeat, durable command queue and Windows lock/shutdown hooks.
- Added combined session receipts and immutable partial session-payment refunds with finance reversal/audit records.
- Added daily-close tender/refund/expense reporting and persisted physical cash variance.
- Added daily-close events, OWNER reopen workflow, exception blocking and finance report/export APIs.
- Added manager cash-count permission while keeping approval/reopen OWNER-only.
- Added external finance reconciliation records/API/UI and provider reconciliation.
- Added inventory material/BOM, fractional stock, receiving batches, expiry controls, stocktakes, wastage, suppliers, purchase history, FIFO consumption, COGS, valuation and audit/history APIs/UI.
- Added OWNER administration and staff lifecycle API/UI.
- Added persisted realtime event replay and reconnect-aware SSE.
- Hardened production CSP/HSTS and request correlation IDs.
- Added food cancellation/refund policy migration 048, customer cancellation flow and Admin Desk refund workflow.
- Added production readiness health endpoint, Windows station kiosk launcher and MySQL backup/restore verification scripts.
