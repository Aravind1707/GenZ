# GenZ OS — Shared Project State

> Shared hand-off for parallel AI development. `main` is the source of truth. Fetch latest `main` before changing files, preserve other agents' work, keep commits small, and update this file plus `README.md` after meaningful work.

**State reviewed:** 2026-09-07 IST  
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

## Latest additions — 2026-09-07

### Developer Console / feature control
- Added migration `052_developer_features_and_audit.sql`.
- Added persisted `feature_flags` table with 17 named feature switches covering Dashboard, Sessions, Bookings, Food Orders, Kitchen, Inventory, Finance, Payments, Members, Stations, Receipts, Staff Management, Admin Configuration, Customer Portal, Station Agent, OTP and Audit Logs.
- Added `lib/features.ts` for feature reads, writes and audit attribution.
- Added `/developer` Developer Console with simple enable/disable buttons and latest 500 audit events.
- Added `/api/developer/features` for owner/developer feature control and audit-log viewing.
- Added `/api/features` for safe UI feature-state discovery.
- Staff navigation now hides disabled operational modules and direct staff navigation shows a clear Feature Disabled state instead of loading the disabled module UI.
- Added a Developer staff role to the database migration and owner staff-management workflow. Developer accounts are intended for engineering/maintenance access and are not Owner accounts.
- Added `docs/OWNERS_MANUAL.md` with detailed operating procedures for the complete current system, including developer controls, audit logs, sessions, bookings, food, inventory, payments, finance, staff, stations, deployment and troubleshooting.

### Important implementation boundary
The Developer Console is now the central persisted control plane and the staff UI is feature-aware. Individual backend business APIs should continue to be wired to `requireFeature()` during the ongoing A-to-Z integration audit so a disabled capability is also fail-closed at the server transaction boundary. Do not treat UI hiding alone as sufficient production enforcement.

## Deploy-ready software baseline

The application code, database migrations, operational APIs/UI, CI, Docker deployment, station agent foundation, backup/restore tooling and production health endpoint are implemented. Migration 048 contains the auditable food refund policy ledger; migrations 049–052 add the current single-membership, equipment, developer-control and audit-control changes.

Completed software areas include customer OTP/security, membership/pricing, food ordering, booking/check-in/no-show, gaming sessions/billing, station challenge attribution, station lease/lock controls, settlement/partial payments/idempotency, monthly credit, OWNER/MANAGER RBAC plus DEVELOPER engineering access, inventory reservation/FIFO/expiry/COGS/stocktakes/suppliers/waste/valuation, finance ledger/daily close/reconciliation/provider reconciliation, receipts/refunds, OWNER administration, persisted realtime replay/SSE, CSP/HSTS/request IDs, Windows station kiosk launch, MySQL backup/restore scripts and `/api/health` readiness.

## Current validation status

Do not call the project 100% production-accepted yet. The previous CI run had substantive jobs cancelled before validation; CodeQL completed successfully. After the latest feature-control changes, fresh isolated staging, TypeScript/build, unit, integration, Docker and full end-to-end acceptance must be rerun.

Required staging sequence:
1. `docker compose -f docker-compose.test.yml down -v --remove-orphans`
2. `docker compose -f docker-compose.test.yml build --no-cache`
3. `docker compose -f docker-compose.test.yml up -d`
4. verify app health at `http://localhost:3001/api/health`
5. verify latest migration = 52
6. run integration/concurrency QA
7. exercise customer → gaming → food → payment → receipt → finance → close
8. exercise Developer Console and audit attribution

## Remaining A-to-Z audit gate

Continue auditing and fixing, not merely documenting:
- server-side enforcement of every feature flag;
- stale membership-tier/expiry application references;
- all MySQL datetime/date writes;
- decimal/money calculations and rounding;
- enum/status compatibility with schema;
- API response/frontend contracts;
- foreign keys and transaction ordering;
- booking/session/station race conditions;
- food/inventory/payment/refund consistency;
- customer ownership and RBAC across every API;
- migration idempotency and backup/restore;
- station-agent lease/lock failure modes;
- duplicate requests and idempotency;
- full fresh CI and isolated staging validation.

## Golden end-to-end definition

```text
CUSTOMER OTP
 -> MEMBERSHIP RECOGNITION
 -> PRICING
 -> BOOKING / CHECK-IN
 -> SESSION START
 -> EXTEND / PAUSE / END
 -> GAMING BILLING
 -> FOOD ORDER
 -> KITCHEN
 -> PAYMENT
 -> RECEIPT
 -> FINANCE
 -> DAILY CLOSE
 -> AUDIT
```

Plus reliable bootstrap/upgrades, authorization, payments, inventory, realtime operation, equipment state, backups/restores and automated tests.

## Key historical notes

Historical migrations/schema files may still contain obsolete tier structures because they are immutable migration history. Do not delete historical references merely to make a global text search clean. Current application paths must not depend on the old membership-tier model.

The centralized MySQL boundary normalizes ISO timestamp strings before parameter binding and has a compatibility normalization for the old non-expiring membership predicate. This protects legacy callers but direct stale SQL should still be corrected where practical.
