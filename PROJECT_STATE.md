# GenZ OS — Shared Project State

> Shared hand-off for parallel AI development. `main` is the source of truth. Fetch latest `main` before changing files, preserve other agents' work, keep commits small, and update this file plus `README.md` after meaningful work.

**State reviewed:** 2026-09-06 IST  
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
- Production Docker migration uses only `GENZ_DB_NAME`; legacy `USE genz_os` and database-creation statements are neutralized so test/prod database names cannot be accidentally overridden by migration SQL.
- Migration startup retries transient MySQL connection failures, covering container startup races such as `ECONNREFUSED`.
- Production Docker MySQL/app healthchecks have a longer startup grace period and retry budget.
- Docker runtime entrypoint permissions are applied after the read-only file permissions pass, and CRLF is normalized during image build so Windows checkouts do not produce `permission denied` or `no such file or directory` entrypoint failures.
- `docker-compose.test.yml` is committed as the isolated staging stack; it uses `genz_cafe_test` on host port 3307 and the app on 3001 and never grants the test user production database privileges.
- The Windows installer now requires Node.js 24.x and npm 11.x, matching `package.json`, and runs the full test suite before the production build.
- The Windows scheduled-task wrapper explicitly loads `.env.local` under SYSTEM, runs database migrations before starting the app, and fails closed if migrations fail.
- `/api/health` reports database readiness and latest migration.
- `scripts/backup-mysql.ps1` produces transactional MySQL dumps with retention.
- `scripts/restore-mysql.ps1` restores a dump into a verification database.
- CI covers unit/build, migration/integration/concurrency, Docker and security contracts.

## Deployment errors found and fixed — 2026-09-05/06

1. **Docker entrypoint permission denied** — runtime `find ... chmod 0444` was changing the entrypoint after its executable bit was set. Fixed by normalizing all file permissions first and applying `chmod 0555 docker-entrypoint.sh` afterward.
2. **Docker entrypoint `no such file or directory`** — Windows CRLF line endings made the Alpine shebang fail. Fixed by stripping CR characters in the runtime image.
3. **Malformed Dockerfile instruction** — an accidental `chmod ... .USER node` line caused `chmod: .USER: No such file or directory`. Fixed and validated by a successful image build.
4. **Test Compose used obsolete DB environment names** — replaced old `DB_*` variables with the application’s `GENZ_DB_*` contract.
5. **Test Compose mounted a directory as a MySQL schema file** — removed the obsolete `./database/schema.sql` mount and let the application migration runner own schema initialization.
6. **Migration attempted to use production database `genz_os` in staging** — `db/mysql-schema.sql` and historical migrations contain legacy `USE genz_os`; the runner now neutralizes database-creation/use statements and always stays on the database selected by `GENZ_DB_NAME`.
7. **Transient MySQL startup race** — app saw `ECONNREFUSED` immediately after Compose dependency readiness. Migration connection now retries transient connection errors before failing.
8. **Windows service did not inherit `.env.local`** — SYSTEM scheduled tasks do not inherit the interactive environment. The wrapper now loads the production env file itself before migration/start.
9. **Windows deployment documentation/installer allowed Node 20 while the project requires Node 24/npm 11** — installer and docs now enforce the actual project engine versions.

## Current validation status

Previously completed locally before these final deployment-hardening changes:

- Migration integrity: **46 migrations validated, versions 2–48**.
- Unit tests: **18 passed, 0 failed**.
- Next.js production build: compiled successfully; TypeScript passed; **62/62** static pages generated.
- Docker image: built successfully after entrypoint permission/CRLF fixes.

Required after pulling the latest `main`: run the isolated staging stack and execute MySQL integration QA against it before any production deployment. Do not use `docker compose down -v` against the production stack.

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

## Development log — 2026-09-05/06

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
- Hardened Docker migration/database selection, startup retries, runtime entrypoint permissions/line endings, staging Compose, and Windows production bootstrap.
