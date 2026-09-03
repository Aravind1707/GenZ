# GenZ OS — Complete Project State

> **Purpose:** This file is the shared hand-off/state document for multiple AI developers working on the same repository in parallel. Read this file before changing the project. Update it after meaningful changes. The GitHub `main` branch is the shared source of truth.
>
> **Last state review:** 2026-09-03
> **Repository:** `Aravind1707/GenZ`
> **Branch:** `main`
> **Current latest known commit:** `a594d454005f84b009489e3d32921e0485b5a14b`
>
> **IMPORTANT PARALLEL-WORK RULE:** Do not assume another agent's work is absent because it is not in your local context. Always fetch the latest `main` before modifying files. Avoid rewriting large files unnecessarily. If another agent has changed the same file, re-fetch it and merge your change logically instead of overwriting it. Keep commits small and descriptive. Never force-push or reset `main`.

---

# 1. PROJECT PURPOSE

GenZ OS is a **LAN-first gaming café operating system** for:

- ~20 gaming PCs
- 5 PS5 stations
- 2 PS4 stations
- 2 PSVR stations
- 2 MOZA racing simulator stations
- Food & beverage ordering
- Customer membership recognition
- Gaming session management
- Participant-level billing
- Group billing
- Bookings
- Staff/RBAC
- Finance
- Kitchen operations
- Station/equipment control

The application is intended to run primarily on the café's admin PC with **MySQL as the permanent source of truth**. Customer phones and café operational devices communicate through the LAN.

External internet services are integrations only:

- MSG91 for OTP delivery
- Razorpay for online payments
- Optional remote monitoring later

The core café operation must not depend on internet availability.

---

# 2. NON-NEGOTIABLE BUSINESS RULES

## Customer identity

- Customer identity is **mobile number + OTP**.
- OTP is generated server-side.
- OTP is hashed before storage.
- OTP expires quickly and has attempt/rate limits.
- Customer sessions use hashed server tokens and HttpOnly cookies.
- Browser state is never trusted as identity proof.

## Membership

Membership belongs to an **individual participant**, not a whole gaming session or group.

Membership eligibility must be evaluated server-side using active status and expiry.

Never trust:

- `isMember` supplied by browser
- member ID supplied without server lookup
- client-calculated member price

## Customer pricing UX

### Member

If the authenticated customer is an active member:

- show **ONLY the member price**
- hide the regular price completely

### Non-member

If the authenticated customer is not an active member:

- show regular price
- show member price/savings where appropriate

Server pricing remains authoritative regardless of UI.

## Gaming

Gaming categories:

- Normal PC
- Premium PC
- PS5
- PS4
- PSVR
- MOZA

Gaming page is primarily a **price-list** experience, not a customer-controlled billing editor.

## Food

Food and beverages can be ordered through the customer site only when associated with an eligible active gaming session/tab.

Customer food payment choices are **ONLY**:

1. `PAY_NOW` — Razorpay
2. `COUNTER` / Pay at Counter — authorized staff later marks it paid

Explicitly removed from active product flow:

- Wallet
- Wallet balance
- Food wallet
- Add food to gaming bill

Do not reintroduce these unless explicitly requested.

## Source-of-truth relationship

```text
CUSTOMER -> MEMBERSHIP
CUSTOMER/GROUP -> BOOKING -> SESSION -> STATION
SESSION -> PARTICIPANTS
SESSION -> GAMING CHARGES
SESSION -> FOOD ORDERS
PAYMENTS -> FINANCE / AUDIT
```

Every rupee entering/leaving the café must have an auditable transaction/ledger origin.

## Station QR

Permanent QR belongs to a station, for example:

```text
PC-01
PS5-01
PS4-01
PSVR-01
MOZA-01
```

QR identifies equipment only. It is **not authentication or authorization**.

Required binding:

```text
station QR
  -> active station session
  -> authenticated customer
  -> participant
  -> food order
```

---

# 3. CURRENT ARCHITECTURE

```text
                    INTERNET
                  /           \
              MSG91          Razorpay
                |                |
                +-------+--------+
                        |
                 ADMIN PC / SERVER
                 GenZ OS + MySQL
                        |
          +-------------+-------------+
          |             |             |
       Gaming PCs    Consoles       Kitchen
          |             |             |
     Station Agent   Station UI      KDS
          |
     Customer phones
          |
      Customer PWA
```

Technology currently used:

- Next.js 14.2.15 currently in repository
- React
- TypeScript
- MySQL
- `mysql2`
- Next.js API routes/server code
- PWA-oriented customer/admin/kitchen UI
- GitHub Actions CI

**WARNING:** Next.js 14.2.15 is known to have security issues. A supported Next.js upgrade is still outstanding and must be done deliberately after baseline CI is stable.

---

# 4. WHAT IS BUILT — DETAILED STATUS

Status legend:

- ✅ Implemented/foundation working
- 🟡 Partially implemented / needs production completion
- ❌ Not implemented
- 🔴 Known issue/blocker

## 4.1 Application shell / visual system — 🟡

Built:

- GenZ black/yellow high-contrast theme
- Customer mobile-oriented interface
- Admin dashboard shell
- Global styling

Still needed:

- Full visual consistency across every future admin screen
- Loading/error/empty states everywhere
- Accessibility pass
- Responsive/tablet/kitchen-display optimization

---

## 4.2 Customer authentication — ✅

Built:

- Mobile number input
- OTP request
- OTP verification
- Hashed OTP challenge
- OTP expiry
- OTP attempt limit
- resend cooldown
- hourly rate limiting
- customer creation/lookup
- hashed customer session token
- HttpOnly cookie
- customer/member lookup
- DEV OTP mode guarded by environment

Important source:

- `lib/customer-auth.ts`

Known improvement:

- Review returned membership object semantics so expired/inactive membership is not represented as effectively active anywhere outside server-authoritative pricing logic.

---

## 4.3 Membership pricing — 🟡

Built:

- server-authoritative membership lookup
- active/expiry checks in important pricing paths
- member/non-member gaming pricing
- member food pricing
- member-rate snapshot at gaming participant join
- customer UI hides regular price for active member
- non-member UI can show regular + member savings

Still needed:

- Complete admin membership CRUD UI
- renewals
- expiry workflow
- membership payment/finance transaction
- tier management UI
- customer membership history

---

## 4.4 Customer gaming price list — 🟡

Built:

- Normal PC
- Premium PC
- PS5
- PS4
- PSVR
- MOZA
- configurable-rate architecture
- image/spec placeholders/configuration support

Still needed:

- Complete admin rate editor
- complete station/tier editor
- upload/manage actual images
- final café-specific rates
- polished product cards

---

## 4.5 Customer food ordering — 🟡

Built:

- food catalog
- cart
- quantity controls
- active-session association
- server-side pricing
- active member eligibility check
- PAY_NOW
- PAY_AT_COUNTER
- order creation
- food order attribution to session/participant
- no wallet path
- no gaming-bill path

Still needed:

- order history/status for customer
- customer cancellation policy/workflow
- stock-aware availability
- out-of-stock UX
- kitchen status updates in real time
- retry/failure UX for Razorpay
- payment-script readiness guard in `FoodCart`

---

## 4.6 Razorpay payments — 🟡

Built:

- server-side Razorpay order creation
- amount validation
- INR validation foundation
- checkout integration
- signature verification
- webhook signature verification
- webhook reconciliation
- idempotent paid-state handling
- protection against replacing a different payment ID after PAID

Environment secrets:

```env
GENZ_RAZORPAY_KEY_ID=...
GENZ_RAZORPAY_KEY_SECRET=...
GENZ_RAZORPAY_WEBHOOK_SECRET=...
```

Still needed:

- verify all webhook event types used by production
- explicit currency/status checks in every payment path
- payment event audit trail
- refund support
- reconciliation screen
- failed payment/retry flow
- duplicate webhook/event handling table or equivalent robust idempotency
- admin realtime payment update

---

## 4.7 Gaming billing engine — 🟡

Built:

- server timestamps
- elapsed-time billing
- per-minute rounding
- pause/resume
- paused-time exclusion
- participant-level billing
- regular/member rate snapshots
- participant join timestamp
- participant leave timestamp
- finalization
- live billing endpoint
- station-rate fallback when no participants

Example:

```text
1 active member @ ₹90
3 non-members @ ₹100
= ₹390 total participant gaming charges
```

Still needed:

- fully integrate live computed billing into all admin dashboard/session balances
- participant join/leave polish and audit UX
- configurable rounding policy UI
- rate editing UI
- full settlement integration
- receipt generation
- edge-case tests around pause/end/join/leave

Important files:

- `lib/gaming-billing.ts`
- `app/api/sessions/billing/route.ts`
- `app/api/customer/session/billing/route.ts`
- `db/migrations/008_gaming_billing.sql`

---

## 4.8 Admin sessions — 🟡

Built:

- live sessions page
- station-specific Start Session
- customer name
- optional membership association
- active session list
- refresh/polling
- end session
- grouping selection
- participant management foundation
- live participant charge visibility
- pause/resume billing backend

Still needed:

- proper customer/member search selector
- participant add/remove UI polish
- live timer + charge card for every active session
- booking conflict visibility
- automatic booking handoff
- station state machine integration
- hardware/agent state
- final settlement controls

---

## 4.9 Session extension — 🟡

Built:

- +15m
- +30m
- +60m
- server-side locking
- future booking conflict protection
- exact station check
- customer polling

Current conservative behavior:

- if any future booking exists for the station, extension can be refused rather than calculating the exact available gap.

Still needed:

- calculate earliest next booking precisely
- allow extension up to the exact safe limit
- display reason and next booking time
- test race conditions around booking creation vs extension

---

## 4.10 Station QR — 🟡 / recently expanded

Built:

- station resolver endpoint
- station-aware customer URL
- active-session requirement
- QR identifies station only
- QR administration/print foundation
- printable station QR view

Still needed:

- verify current QR admin UI end-to-end
- regenerate/print all stations cleanly
- download/print labels as production artifact
- customer QR-first navigation polish
- test unauthenticated QR -> login -> station/session flow
- ensure no QR endpoint exposes unauthorized session data

---

## 4.11 Group billing — 🟡 foundation

Built:

- group creation
- select 2–20 active sessions
- group ID
- session-group tables
- member links
- individual session attribution retained
- group total foundation
- unpaid food + gaming balance calculation foundation

Tables:

- `session_groups`
- `session_group_members`

APIs:

- GET `/api/session-groups`
- GET `/api/session-groups?id=...`
- POST `/api/session-groups`
- PATCH `/api/session-groups`

Still needed — HIGH PRIORITY:

- group settlement engine
- one group payment
- equal split
- by PC/session
- by food item
- percentage split
- custom split
- mixed shared gaming + individual food
- payment allocation table/ledger
- partial settlement
- overpayment protection
- receipt
- group close validation

---

## 4.12 Bookings — 🟡

Built:

- booking admin UI
- create booking
- station selection
- customer name
- start/end time
- deposit field/foundation
- cancellation
- conflict checking foundation
- live refresh

Still needed — HIGH PRIORITY:

- customer/member lookup
- edit booking
- check-in
- no-show
- automatic session creation/handoff
- booking arrival grace period
- deposit payment/reconciliation
- cancellation/refund policy
- next-booking-aware extension
- timeline/calendar UX

---

## 4.13 Orders / kitchen — 🟡

Built:

- live admin order queue
- polling
- today count
- new orders
- paid food sales
- open counter orders
- status progression
- mark counter order paid

Still needed — HIGH PRIORITY:

- full KDS screen
- kitchen station assignment
- preparation states
- realtime order events
- ready/served state
- customer order status
- item notes/modifiers
- stock reservation/decrement
- order cancellation/void
- audit of status overrides

---

## 4.14 Inventory — ❌

Not complete.

Required:

- ingredients/menu stock
- stock units
- opening stock
- stock adjustment
- purchase/receiving
- consumption
- order-driven decrement
- out-of-stock
- low-stock alerts
- wastage
- COGS
- inventory audit
- menu availability toggle

---

## 4.15 Menu administration — ❌ / 🟡 data foundation

Required:

- CRUD menu items
- category
- price
- member price rules
- image
- description
- availability
- stock linkage
- modifier/add-on support
- display ordering

Server must remain authoritative for final order pricing.

---

## 4.16 Gaming pricing administration — ❌ / 🟡 data foundation

Required:

- gaming rate CRUD
- PC tier CRUD
- station-specific override
- member tier pricing
- effective dates
- price snapshot policy
- admin audit

---

## 4.17 Membership management — 🟡 backend foundation / ❌ full UI

Existing domain logic includes:

- find member
- find by mobile
- list members
- create member
- update member
- tier validation
- expiry/active handling

Still needed:

- production admin screen
- search
- create/edit modal
- renew
- activate/deactivate
- expiry warnings
- duplicate mobile handling
- membership payment transaction
- receipt
- history/audit

---

## 4.18 Customer management — 🟡 / ❌ full UI

Required:

- customer search
- mobile lookup
- membership status
- active sessions
- participant history
- order history
- payments
- booking history
- notes where appropriate

---

## 4.19 Staff/RBAC — 🟡

Built:

Roles:

- OWNER
- MANAGER
- CASHIER
- KITCHEN
- FLOOR

Built:

- password hashing
- staff sessions
- logout
- permissions foundation
- audit logging
- owner bootstrap
- admin route protection for major modules

Still needed:

- complete staff management UI
- create/edit staff
- disable staff
- revoke sessions
- password reset
- role assignment UI
- verify **every** admin API is protected
- audit every sensitive staff action

---

## 4.20 Finance — 🟡

Built:

- `finance_transactions`
- revenue/expense categories
- expense entry
- finance dashboard
- food revenue integration
- gaming revenue foundation

Still needed — HIGH PRIORITY:

- membership revenue
- booking deposits
- refunds
- payment-method reconciliation
- cash drawer
- UPI/card/Razorpay breakdown
- daily close
- discrepancy recording
- opening/closing cash
- finance reports
- ledger-based source of truth without double-counting

**Important known concern:** Current finance dashboard has historically derived some revenue from paid food/ended gaming while food payment code also records ledger transactions. Before making ledger the canonical source, audit for duplicate counting.

---

## 4.21 Receipts — ❌

Required:

- food receipt
- gaming receipt
- group receipt
- combined receipt
- payment method
- transaction ID
- customer/member information
- tax fields if café requires them
- printable receipt
- reprint

---

## 4.22 Refunds/reconciliation — ❌

Required:

- Razorpay refund request
- refund webhook reconciliation
- counter refund
- partial refund
- finance ledger reversal/credit
- audit trail
- refund authorization by role
- receipt/refund document

---

## 4.23 Realtime event bus — ❌ / polling foundation

Current modules frequently use polling:

- sessions ~10s
- orders ~5s
- bookings ~10s
- customer billing ~10s
- customer session ~15s

Required production event bus:

```text
SESSION_CREATED
SESSION_UPDATED
SESSION_ENDED
PARTICIPANT_JOINED
PARTICIPANT_LEFT
BILLING_UPDATED
ORDER_CREATED
ORDER_STATUS_CHANGED
PAYMENT_CAPTURED
BOOKING_CREATED
BOOKING_CANCELLED
STATION_STATUS_CHANGED
INVENTORY_CHANGED
```

Target transport:

- SSE and/or WebSocket over LAN

Important:

- database remains source of truth
- realtime messages are notifications, not authorization
- reconnect/resync must exist
- event ordering/versioning should be considered

---

## 4.24 Equipment/station hardware control — ❌

Required abstraction:

```text
GenZ Server
    |
LAN Controller / Station Agent
    |
Commercial PDU / Rated Relay / Contactor
    |
Equipment
```

PC requirements:

- Wake-on-LAN
- station agent
- boot detection
- heartbeat
- READY state
- graceful lock/shutdown

Console/VR/MOZA control depends on actual hardware/model.

Never directly control mains through improvised hardware. Use properly rated commercial equipment and qualified installation.

Controller failure must produce ERROR/OFFLINE, never fake AVAILABLE/READY.

---

## 4.25 Operational health — ❌

Required dashboard:

- MySQL connectivity
- disk space
- application process
- LAN reachability
- station agent heartbeat
- station controller health
- payment provider health
- MSG91 health
- last successful backup
- migration state

---

## 4.26 Backup/restore — ❌

Required:

- automated MySQL backup
- retention policy
- backup integrity check
- restore drill
- documented disaster recovery
- backup status in admin

---

## 4.27 Testing — 🟡 CI only

Current:

- GitHub Actions build
- TypeScript compilation via `next build`

Required:

- unit tests
- API integration tests
- billing tests
- membership eligibility tests
- food pricing tests
- payment idempotency tests
- group settlement tests
- booking conflict tests
- authentication tests
- RBAC tests
- migration tests
- E2E customer flow
- E2E admin flow
- E2E kitchen flow

---

# 5. DATABASE / MIGRATION STATE

Canonical database:

`db/mysql-schema.sql`

Migration runner:

`scripts/migrate.mjs`

Command:

```bash
npm run db:migrate
```

Recent migrations include:

- `005_session_extensions.sql`
- `006_session_groups.sql`
- `007_staff_auth_rbac.sql`
- `008_gaming_billing.sql`
- `009_payment_mode_cleanup.sql`
- `010_finance_ledger.sql`
- `011_...` foreign-key/schema hardening migration present in repository

Important migration behavior:

- fresh current databases should use canonical current schema/baseline
- existing databases should apply incremental migrations
- migration records must not be manually deleted/reordered
- transactions should be used for migration execution where supported

Known concern:

- Some migrations/schema operations use `ADD COLUMN IF NOT EXISTS`; verify compatibility with the actual MySQL version used by the café.

---

# 6. ERRORS THAT HAVE BEEN FACED AND FIXED

## Error 1 — CI npm cache without lockfile

Problem:

GitHub Actions attempted npm caching without a package-lock file.

Fix:

Removed incompatible npm cache configuration from CI.

Commit:

`b6efd8bd54666e5a0e291d5091eee70a7de50d89`

---

## Error 2 — Razorpay response TypeScript narrowing

Problem:

Razorpay response fields were inferred as potentially undefined, causing CI TypeScript failure.

Fix:

Explicitly validate `id`, amount, and currency and narrow the response type before returning.

Result:

Build type error fixed.

---

## Error 3 — customer auth row typing

Problem:

MySQL row type was inferred as a `RowDataPacket` intersection and later assigned a plain customer object.

CI error:

```text
Type '{ id: string; mobile: string; name: string | null; member_id: string | null; }'
is not assignable to type 'RowDataPacket & ...'
```

Fix:

Explicit customer row type and explicit narrowing/cast.

Commit:

`51698b2d2be526e880096095d799485ad66a6f5d`

---

## Error 4 — members.ts MySQL execute values

Problem:

`updateMember()` declared:

```ts
const values: unknown[] = [];
```

`mysql2/promise` `execute()` rejected `unknown[]` because its overload requires MySQL-compatible execute values.

CI error:

```text
Argument of type 'unknown[]' is not assignable to parameter of type 'ExecuteValues'
```

Fix:

Change values to a MySQL-compatible value type / use a typed value array acceptable to `mysql2`.

Fix commit:

`a594d454005f84b009489e3d32921e0485b5a14b`

**CI status after this fix must be checked before declaring green.**

---

## Error 5 — Node 20 GitHub Actions deprecation warning

GitHub runner currently warns that Node 20-based actions are being forced toward Node 24 runtime.

This is currently a **warning, not the application build failure**.

Future task:

- upgrade workflow action versions when stable/current
- consider Node 22/24 project runtime after application compatibility review

---

## Error 6 — Next.js 14.2.15 security warning

CI currently reports:

```text
next@14.2.15: This version has a security vulnerability.
2 vulnerabilities (1 high, 1 critical)
```

This is **NOT FIXED YET**.

Required:

- upgrade to a supported patched Next.js release
- run complete build/tests
- fix compatibility issues
- do not use `npm audit fix --force` blindly

---

# 7. CURRENT CI STATE

The repository uses:

```text
.github/workflows/ci.yml
```

Current workflow essentially does:

```text
checkout
setup Node
npm install
npm run build
```

Latest known CI sequence:

- earlier build failed in `lib/customer-auth.ts` — fixed
- next build failed in `lib/members.ts` — fixed in commit `a594d454005f84b009489e3d32921e0485b5a14b`
- newest run must be checked after that commit

**Rule:** Before starting major feature work, verify the newest CI run. If it is red, fix CI first.

---

# 8. KNOWN CURRENT ISSUES / RISKS NOT YET FIXED

## 🔴 Production/security

1. Next.js version is outdated/vulnerable.
2. Full admin API RBAC audit is still required.
3. CSRF strategy is not yet fully documented/implemented.
4. API rate limits/body-size limits need full review.
5. CSP/security headers need final review.
6. Payment reconciliation/refund is incomplete.
7. Backup/restore automation is incomplete.
8. Hardware station agent is not implemented.

## 🟠 Data/financial

1. Finance revenue can risk double-counting if derived summaries and ledger entries are mixed.
2. Group settlement is incomplete.
3. Membership revenue is not fully integrated.
4. Booking deposits are not fully reconciled.
5. Refunds are incomplete.
6. Daily close is incomplete.

## 🟠 Operational

1. Realtime bus is not complete; polling remains widespread.
2. KDS is incomplete.
3. Inventory is incomplete.
4. Customer order history is incomplete.
5. Booking check-in/no-show/handoff is incomplete.
6. Station power/agent integration is incomplete.

## 🟡 UX

1. Customer “Get Membership” action needs implementation.
2. Razorpay script readiness should be guarded.
3. QR unauthenticated -> OTP -> station flow needs full E2E verification.
4. Admin customer/member search should replace manual ID entry where possible.
5. All pages need consistent error/empty/loading states.

---

# 9. PRIORITY ORDER — WHAT TO BUILD NEXT

Do not randomly jump between modules. Preferred production sequence:

### P0 — Keep build green

1. Check latest CI.
2. Fix every TypeScript/build failure.
3. Keep `PROJECT_STATE.md` updated.

### P1 — Complete core money flow

4. Group settlement/split engine.
5. Payment allocation and ledger correctness.
6. Receipts.
7. Refunds/reconciliation.
8. Daily close.

### P2 — Complete physical café workflow

9. Booking check-in/no-show/handoff.
10. Next-booking-aware session extension.
11. Realtime event bus.
12. Kitchen display system.
13. Inventory.

### P3 — Complete administration

14. Membership management.
15. Customer management.
16. Menu management.
17. Gaming rate/station configuration.
18. Staff management.

### P4 — Hardware

19. Station agent protocol.
20. PC WOL/heartbeat.
21. Equipment state machine.
22. Hardware adapters.

### P5 — Reliability/security

23. Operational health dashboard.
24. Backup automation.
25. Restore verification.
26. Comprehensive tests.
27. RBAC/security audit.
28. CSRF/rate-limit/body-size/CSP review.
29. Supported Next.js upgrade.

### P6 — Final production hardening

30. Deployment/bootstrap docs.
31. LAN/firewall validation.
32. Migration upgrade testing.
33. Full E2E testing on café topology.
34. Production readiness checklist.

---

# 10. FILE / MODULE MAP

Important current files/directories:

```text
app/
  api/
    customer/
    orders/
    payments/
    sessions/
    session-groups/
    bookings/
    stations/
    members/
    finance/
    dashboard/
  customer/
  bookings/
  finance/
  orders/
  sessions/
  stations/
  members/
  page.tsx
  globals.css

lib/
  customer-auth.ts
  food-orders.ts
  gaming-billing.ts
  session-groups.ts
  finance.ts
  razorpay.ts
  members.ts
  store.ts
  ...

db/
  mysql-schema.sql
  migrations/

scripts/
  migrate.mjs

docs/
  BUILD_STATUS.md

.github/workflows/
  ci.yml

PROJECT_STATE.md
README.md
package.json
```

Before modifying any module, search/fetch the current implementation on `main` because files may have been changed by another parallel agent.

---

# 11. API SECURITY CONTRACT

Every protected API must:

1. Authenticate request.
2. Determine server-side staff/customer identity.
3. Authorize the requested operation.
4. Validate all IDs against MySQL.
5. Recalculate money server-side.
6. Use transactions/locks for competing financial/session operations.
7. Write audit records for sensitive staff actions.
8. Return safe errors without leaking secrets/internal SQL.

Never trust browser-supplied:

- price
- total
- membership state
- role
- payment status
- station ownership
- group balance
- participant billing

---

# 12. MONEY / BILLING INVARIANTS

These must remain true:

### Gaming

```text
server timestamps
+ server rate snapshot
+ participant identity
+ active/paused state
= authoritative gaming charge
```

### Food

```text
server menu price
+ server membership eligibility
+ server quantity validation
= authoritative food order total
```

### Payment

```text
server order total
+ gateway order ID
+ gateway payment ID
+ signature/webhook validation
= accepted online payment
```

### Group

```text
group member sessions
+ individual food attribution
+ settlement allocations
= group outstanding balance
```

Settlement allocations must never exceed outstanding amounts.

### Finance

No money should appear in reports without a traceable source transaction.

---

# 13. WALLET STATUS

The wallet concept is **retired from the active product flow**.

Do not build:

- wallet UI
- wallet recharge
- wallet balance payment
- food wallet
- wallet deduction

`members.wallet_balance` may still exist in the legacy/canonical schema for compatibility. It should be treated as deprecated until a safe migration removes it.

---

# 14. PRODUCTION ENVIRONMENT CHECKLIST

Before go-live:

```text
[ ] MySQL installed and backed up
[ ] GenZ database created
[ ] Correct application DB credentials
[ ] Current schema/migrations applied
[ ] Real station records inserted
[ ] Gaming rates configured
[ ] Menu configured
[ ] Food/member pricing configured
[ ] Initial OWNER created securely
[ ] Staff accounts configured
[ ] MSG91 configured
[ ] Razorpay configured
[ ] Razorpay webhook configured
[ ] HTTPS/LAN access policy decided
[ ] Firewall rules configured
[ ] Customer Wi-Fi cannot reach MySQL directly
[ ] Admin PC has reserved/static LAN IP
[ ] Backup schedule enabled
[ ] Restore test completed
[ ] Station QR labels printed
[ ] Customer QR flow tested
[ ] Booking flow tested
[ ] Session flow tested
[ ] Participant billing tested
[ ] Food PAY_NOW tested
[ ] Food COUNTER tested
[ ] Payment webhook tested
[ ] Group settlement tested
[ ] Receipt printing tested
[ ] Kitchen display tested
[ ] Inventory decrement tested
[ ] Daily close tested
[ ] Power/agent integration tested if deployed
[ ] Offline/ISP-failure operation tested
```

---

# 15. PARALLEL AI DEVELOPMENT PROTOCOL

This file exists specifically because multiple AI agents may work on GenZ simultaneously.

## Before work

1. Fetch latest `main`.
2. Read this file.
3. Inspect the files you intend to modify.
4. Check latest CI.
5. Search for existing implementation before adding a new one.

## During work

- Prefer small commits.
- Do not overwrite another agent's unrelated changes.
- Do not create duplicate APIs or domain functions.
- Reuse existing business logic.
- Keep server-side authorization authoritative.
- Keep MySQL as source of truth.
- Do not add wallet behavior.
- Do not silently change business rules.

## After work

1. Build/test.
2. Commit to `main` with a descriptive message.
3. Check CI.
4. Update this state file with:
   - what changed
   - commit SHA
   - errors found
   - errors fixed
   - errors remaining
   - next recommended work

## Conflict handling

If another agent changed the same file between your fetch and write:

- re-fetch latest file
- merge your intended logic
- do not blindly overwrite

If a feature depends on a migration:

- add migration
- update canonical schema where appropriate
- update state documentation
- test fresh and upgrade paths

---

# 16. DEFINITION OF 100% COMPLETE

GenZ OS is not considered complete merely because the dashboard builds.

A module is complete only when:

```text
UI
+ API
+ server authorization
+ MySQL persistence
+ audit trail
+ money integrity where applicable
+ error handling
+ realtime update where operationally required
+ tests
+ deployment documentation
= COMPLETE
```

The whole project is 100% complete only when:

- all core café workflows operate end-to-end
- all money flows reconcile
- customer/member pricing is authoritative
- bookings and sessions integrate correctly
- food/kitchen/inventory operate end-to-end
- staff permissions are complete
- receipts/refunds/daily close work
- realtime LAN operation works
- equipment states are reliable
- backups and restore are verified
- security review is complete
- CI/tests are green
- supported runtime/framework versions are used
- production bootstrap is documented

---

# 17. CURRENT EXECUTIVE STATUS

## Overall

**Status: 🟠 ACTIVE DEVELOPMENT — NOT PRODUCTION READY**

The foundation is substantial and the main identity, pricing, session, food, payment, RBAC, finance, migration, QR and participant-billing domains exist. However, the project still lacks several complete production workflows, especially settlement, booking handoff, realtime operations, inventory, receipts/refunds, hardware integration, comprehensive tests, backups and final security/runtime hardening.

## Strongest completed areas

- MySQL-first architecture
- customer OTP identity
- server-authoritative membership pricing
- food ordering/payment foundation
- gaming billing engine
- participant billing foundation
- session extensions
- group foundation
- staff authentication/RBAC foundation
- audit foundation
- live admin polling
- station QR foundation
- migration tooling
- CI

## Biggest blockers to production

1. Group settlement and money allocation
2. Booking/session handoff
3. Kitchen + realtime
4. Inventory
5. Receipts/refunds/daily close
6. Complete admin configuration screens
7. Station hardware/agent
8. Security/test hardening
9. Backup/restore
10. Next.js upgrade

---

# 18. LAST KNOWN DEVELOPMENT LOG

### `d030b11c32666ba90eb1a081dc4ca813abd02871`
**Harden food member eligibility and payment idempotency**

- Active membership validated server-side.
- Food payment ID replacement protected.
- Food revenue ledger entry hardened.

### `51698b2d2be526e880096095d799485ad66a6f5d`
**Fix customer auth TypeScript row typing**

- Fixed CI type error in customer authentication.

### `c807206abea063dfa24cfa535f920c3e28bed67b`
**Build station QR administration and print view**

- QR administration/print work added.

### `a594d454005f84b009489e3d32921e0485b5a14b`
**Fix MySQL execute value typing in member updates**

- Fixed `unknown[]` passed to `mysql2.execute()`.
- This is the latest known commit when this state document was created.

---

# 19. IMMEDIATE NEXT ACTIONS FOR ANY AI AGENT

If starting work immediately, use this order:

1. Check CI for `a594d454005f84b009489e3d32921e0485b5a14b`.
2. If red, fix the build before feature development.
3. Audit the newly added QR/participant changes for regressions.
4. Implement **group settlement/split billing** end-to-end.
5. Add settlement allocation persistence and payment transaction links.
6. Add group receipts.
7. Implement booking check-in/no-show/handoff.
8. Implement realtime event bus.
9. Complete KDS.
10. Complete inventory/menu management.
11. Complete membership/customer/staff management screens.
12. Complete finance reconciliation/daily close.
13. Add receipts/refunds.
14. Add tests.
15. Upgrade Next.js/runtime.
16. Complete deployment, backup, health and hardware integration.

**Do not stop at documentation. Continue implementing until the definition of 100% completion above is satisfied.**

---

# 20. HAND-OFF NOTE

This file is intentionally exhaustive rather than optimistic. If another AI agent reads only one project-state file before touching GenZ, it should be this one.

When the implementation changes, this document must change with it. A stale state file is considered a project defect because it can cause parallel agents to duplicate work, overwrite features, or misunderstand financial/security invariants.
