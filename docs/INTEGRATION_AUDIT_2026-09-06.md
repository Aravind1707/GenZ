# GenZ OS — Integration Audit 2026-09-06

## Scope

This audit targets failures that appear only when individually-correct modules communicate with MySQL or with each other: storage formats, API contracts, membership state, transaction boundaries, datetime serialization, migrations and test contracts.

## Fixed in this audit

### 1. MySQL DATETIME boundary

The session start flow was producing JavaScript ISO strings such as `2026-09-06T17:22:16.547Z` and binding them as plain SQL parameters for `DATETIME(3)`. MySQL expects a compatible datetime representation; MySQL2 supports Date values for this boundary. The DB layer now normalizes ISO timestamp strings to `Date` values before `query`/`execute`, including transactional connections, and the pool uses `timezone: 'Z'` for deterministic UTC serialization. This protects existing callers as well as the session-start path.

### 2. Non-expiring membership compatibility

The session-start API still required `expires_at >= CURDATE()`, which rejected the new nullable/non-expiring membership model. It now accepts active memberships where `expires_at` is NULL or still valid. Legacy expiring memberships continue to work.

### 3. QA migration contract

The contract suite still asserted migration 048 as the latest version. The suite now expects migration 051 and verifies the membership/rates, non-expiring membership, and station-seed migrations exist.

### 4. New DB-boundary unit coverage

Added `tests/unit/mysql.test.ts` covering ISO timestamp conversion, preservation of ordinary/MySQL datetime strings, and recursive array/object normalization.

### 5. Cross-module QA contracts

Added static checks for the DB datetime boundary, active-membership semantics, absence of application membership-tier pricing contracts, and migration 051 assumptions.

## Verified from repository

- Staging Compose explicitly sets `GENZ_DEPLOYMENT_MODE=staging` and uses development OTP mode; the OTP implementation gates development OTP on staging mode rather than NODE_ENV alone.
- Station heartbeat persists observed timestamps through MySQL-side conversion rather than sending ISO strings directly into DATETIME columns.
- New membership creation stores nullable expiry consistently with the non-expiring membership model.
- Historical migrations may still contain `member_tier` definitions because migrations are immutable history; migration 049 removes those obsolete application columns/tables. Historical references are not treated as active application contracts.

## Validation status

All audit changes are committed directly to `main`. The first unit-test commit (`246b4052...`) triggered GenZ CI and CodeQL; at the time checked, CI was pending and CodeQL was in progress. Subsequent audit commits changed the DB boundary, session membership query and QA contracts, so the earlier run cannot be treated as validation of the final audited state. The latest commit will trigger a fresh workflow run. This audit therefore does **not** claim that the final CI or Docker/MySQL staging run has completed successfully yet.

## Remaining acceptance gate

After the final CI run completes, perform a fresh staging verification with a clean test database and exercise the complete cross-module flow:

`customer OTP -> membership recognition -> booking/check-in -> session start -> session extension/pause/end -> gaming billing -> food order -> kitchen -> payment -> receipt -> finance -> daily close`

Also test duplicate requests, invalid station state, expired legacy membership, nullable new membership, stock reservation failure, payment idempotency, rollback behavior and station-agent lease/lock failure.
