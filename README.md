# GenZ OS

**LAN-first gaming café operating system for gaming, food & beverages, memberships, bookings, billing, payments, staff operations, and equipment control.**

> GenZ OS is designed to run primarily on the café's admin PC and local network. Internet-dependent services such as OTP delivery and online payments are integrations, not the core source of truth.

## Table of contents

- [What GenZ OS does](#what-genz-os-does)
- [Operating model](#operating-model)
- [Core business rules](#core-business-rules)
- [Architecture](#architecture)
- [Customer experience](#customer-experience)
- [Admin operations](#admin-operations)
- [Billing and payments](#billing-and-payments)
- [Database](#database)
- [Authentication and security](#authentication-and-security)
- [Equipment and station model](#equipment-and-station-model)
- [Realtime design](#realtime-design)
- [Project structure](#project-structure)
- [Environment configuration](#environment-configuration)
- [Local development](#local-development)
- [Database setup and migrations](#database-setup-and-migrations)
- [Production deployment](#production-deployment)
- [Testing and CI](#testing-and-ci)
- [Current implementation status](#current-implementation-status)
- [Roadmap to production](#roadmap-to-production)
- [Important implementation rules](#important-implementation-rules)
- [Troubleshooting](#troubleshooting)

## What GenZ OS does

GenZ OS is the operating system for a physical gaming café. It models the business around four connected domains:

```text
CUSTOMER / MEMBER
        |
      BOOKING
        |
      SESSION -------- STATION / EQUIPMENT
        |
   +----+-------------------+
   |                        |
GAMING BILL             FOOD ORDERS
   |                        |
   +-----------+------------+
               |
           PAYMENTS
               |
        FINANCE / AUDIT
```

The café currently operates approximately:

- 20 gaming PCs
- 5 PS5 stations
- 2 PS4 stations
- 2 PSVR stations
- 2 MOZA racing simulator stations

The system is intended to scale beyond those counts through database-driven stations and configuration.

## Operating model

### LAN-first

The admin PC hosts GenZ OS and MySQL. Café devices communicate over the LAN.

The system must continue to support core operational work when an ISP is unavailable:

- active sessions
- station state
- gaming timers and billing
- food order creation
- kitchen queue
- staff/admin operations
- local database access

Internet connectivity is required for external services such as:

- SMS/OTP delivery through MSG91
- Razorpay online payment processing
- external monitoring or remote access, if enabled later

### Source of truth

The canonical relationship is:

```text
CUSTOMER -> MEMBERSHIP
CUSTOMER/GROUP -> BOOKING -> SESSION -> STATION
SESSION -> GAMING CHARGES + FOOD ORDERS + PAYMENTS + GROUP
```

Every rupee entering or leaving the business must ultimately originate from a transaction or auditable ledger entry.

## Core business rules

### Customer identity

- Customers authenticate with mobile number + OTP.
- OTP challenges are server-generated, short-lived, hashed, attempt-limited, and rate-limited.
- A verified customer is represented by an internal `customer_id`.
- Mobile numbers are normalized before lookup/storage.
- Browser state is never trusted as proof of membership or payment.

### Membership

Membership belongs to an individual participant, not to an entire session or group.

The server determines whether membership is currently active using the member record and expiry date.

### Gaming pricing

The browser may display prices, but the server is authoritative for every charge.

For a member:

- show only the member price
- do not show the regular price

For a non-member:

- show the regular price
- show the member price/savings where appropriate

Gaming categories include:

- Normal PC
- Premium PC
- PS5
- PS4
- PSVR
- MOZA

Rates are intended to become fully admin-configurable.

### Food ordering

Food and beverages can only be ordered through the customer site when the customer has an eligible active gaming session/tab.

Customer payment options are exactly:

1. **Pay Now** — Razorpay
2. **Pay at Counter** — remains unpaid until authorized staff marks it paid

The old wallet/balance concept is not part of the active product flow.

### Station QR

Each station has a permanent QR identifier such as:

```text
PC-01
PS5-01
PS4-01
PSVR-01
MOZA-01
```

A QR identifies a station; it does not grant permission by itself.

The server binds:

```text
QR station -> active session -> authenticated customer/participant -> order
```

## Architecture

### Application stack

- Next.js
- React
- TypeScript
- MySQL
- `mysql2`
- Server-side API routes
- PWA-oriented customer/admin/kitchen interfaces
- SSE/WebSocket-compatible realtime architecture planned for full rollout

### Deployment topology

```text
                         INTERNET
                       /           \
                  MSG91           Razorpay
                    |                 |
                    +-------+---------+
                            |
                       Admin PC / Server
                       GenZ OS + MySQL
                            |
              +-------------+-------------+
              |             |             |
            LAN PCs      Consoles       Kitchen
              |             |             |
        Station agents   Station UI    KDS/PWA
              |
        Customer phones
              |
          Customer PWA
```

The admin PC is the primary local authority for café operations.

## Customer experience

### Authentication flow

```text
Enter mobile number
        |
      OTP
        |
 Server verifies OTP
        |
 Lookup/create customer
        |
 Determine active membership
        |
 Show correct prices
```

### Gaming page

The customer can browse the gaming price list. It is a price-list experience rather than a customer-controlled gaming billing interface.

The page supports:

- station-aware access through QR
- active session information
- live gaming billing
- participant charge information where available
- session extension options

### Session extension

Supported extension options:

- +15 minutes
- +30 minutes
- +60 minutes

The server checks future bookings for the exact station before accepting an extension. A booked next session must not be overwritten by an extension.

### Food page

The customer can browse food and beverages, build a cart, and choose Pay Now or Pay at Counter.

The server recalculates menu pricing and membership eligibility when the order is created.

## Admin operations

### Dashboard

The dashboard is intended to provide live visibility into:

- revenue
- active sessions
- occupancy
- food orders
- outstanding counter orders
- station status
- kitchen queue

### Sessions

Admin session operations include:

- start session
- station selection
- customer association
- group association
- live session monitoring
- pause/resume billing
- participant management
- end/finalize session

### Bookings

Booking operations include:

- create booking
- station assignment
- customer information
- start/end time
- deposit information
- cancellation
- conflict detection

The production workflow will additionally support check-in, no-show handling, and automatic booked-session handoff.

### Orders

The live orders queue supports:

- incoming orders
- order status progression
- payment state
- counter payment authorization
- kitchen visibility

### Groups

Multiple active sessions can be linked into a group while remaining individually attributable.

The group model is designed for shared gaming and individual food consumption without losing participant-level attribution.

### Finance

Finance currently supports a transaction ledger foundation for revenue and expenses. The final production system will reconcile gaming, food, memberships, deposits, refunds, and payment methods into a daily close.

## Billing and payments

### Gaming billing engine

Gaming billing is server-authoritative and based on elapsed session time.

The billing engine supports:

- per-minute rounding
- pause/resume
- participant-level billing
- member-rate snapshots at participant join
- regular-rate snapshots
- session finalization
- live charge calculation

A participant's membership status is evaluated server-side. Historical billing uses the rate snapshot captured for that participant rather than allowing a later membership change to rewrite an already-started charge.

### Participant example

If a session contains:

- 1 active member at ₹90
- 3 non-members at ₹100

the participant gaming charges are calculated independently as:

```text
₹90 + ₹100 + ₹100 + ₹100 = ₹390
```

The exact rates are configuration, not hard-coded business constants.

### Food payment

Pay Now uses Razorpay with:

- server-side order creation
- amount validation
- signature verification
- payment-status verification
- webhook verification
- idempotent paid-state handling

Pay at Counter creates an unpaid order until an authorized staff member records the payment.

Payment IDs cannot be silently replaced after an order has already been marked paid.

### Financial integrity

A payment should never be trusted because a browser says it succeeded. The server must validate:

- order ownership/context
- amount
- currency
- gateway order ID
- gateway payment ID
- signature/webhook authenticity
- current order payment state

## Database

MySQL is the production database and the permanent source of truth.

Major domains include:

- `stations`
- `sessions`
- `session_participants`
- `session_groups`
- `session_group_members`
- `customers`
- `members`
- `bookings`
- `menu_items`
- `orders`
- `order_items`
- `payment_transactions`
- `gaming_rates`
- `member_price_rules`
- `finance_transactions`
- staff authentication/session tables
- OTP/customer-session tables
- audit logs

### Migrations

Schema evolution is handled through SQL migrations in `db/migrations/` and the migration runner in `scripts/migrate.mjs`.

The canonical schema in `db/mysql-schema.sql` represents the current database model.

Fresh installations should use the current canonical schema/baseline. Existing installations use the migration history to upgrade without replaying incompatible historical initialization steps.

## Authentication and security

### Customer authentication

Customer OTP security requirements:

- server-side OTP generation
- hashed OTP storage
- short expiration
- maximum attempts
- resend cooldown
- hourly rate limiting
- hashed customer session tokens
- secure cookie/session handling

### Staff authentication

Staff roles:

- `OWNER`
- `MANAGER`
- `CASHIER`
- `KITCHEN`
- `FLOOR`

Staff passwords use strong password hashing. Staff sessions are server-side and expire. Sensitive operations must check role permissions on the server.

### Authorization principle

Never trust:

- `isMember` from the browser
- browser-submitted prices
- browser-submitted payment status
- station ownership supplied only by a client
- group totals calculated only in the browser
- staff role supplied by the browser

The API must resolve the authoritative record from MySQL and enforce authorization there.

### Auditability

Sensitive staff actions should create audit records, especially:

- session creation/end
- billing changes
- payment actions
- refunds
- expenses
- membership changes
- staff changes
- booking cancellation/override
- inventory adjustments

## Equipment and station model

Every physical playable unit is represented as a station.

Example state machine:

```text
AVAILABLE
   |
SESSION CREATED
   |
POWERING ON
   |
BOOTING
   |
READY
   |
PLAYING
   |
SESSION ENDING
   |
SHUTTING DOWN
   |
AVAILABLE
```

Failure state:

```text
ERROR / OFFLINE
```

### Hardware abstraction

GenZ OS should not hard-code a particular smart plug or relay implementation.

The intended architecture is:

```text
GenZ Server
    |
LAN controller / station agent
    |
Commercial PDU / properly installed relay / contactor
    |
Equipment
```

For PCs, Wake-on-LAN and a station agent can support startup and graceful shutdown. Console and simulator control must use model-appropriate interfaces.

Direct mains switching must use properly rated commercial equipment and qualified electrical installation.

A controller failure must never silently turn an unavailable station into a playable station.

## Realtime design

The target realtime architecture is event-driven over the LAN.

Important events include:

- `SESSION_CREATED`
- `SESSION_UPDATED`
- `SESSION_ENDED`
- `PARTICIPANT_JOINED`
- `PARTICIPANT_LEFT`
- `BILLING_UPDATED`
- `ORDER_CREATED`
- `ORDER_STATUS_CHANGED`
- `PAYMENT_CAPTURED`
- `BOOKING_CREATED`
- `BOOKING_CANCELLED`
- `STATION_STATUS_CHANGED`
- `INVENTORY_CHANGED`

Current interfaces use polling in several areas while the realtime event bus is being completed. Polling must not become the permanent consistency mechanism where immediate operational updates are required.

## Project structure

```text
.
├── app/
│   ├── api/                 # Server API routes
│   ├── customer/            # Customer PWA
│   ├── bookings/             # Booking admin UI
│   ├── finance/              # Finance UI
│   ├── orders/               # Food/order admin UI
│   ├── sessions/             # Session admin UI
│   ├── stations/             # Station management
│   ├── members/              # Membership management
│   ├── page.tsx              # Admin dashboard
│   └── globals.css           # Global GenZ visual system
├── db/
│   ├── migrations/           # Incremental MySQL migrations
│   └── mysql-schema.sql      # Current canonical MySQL schema
├── lib/
│   ├── customer-auth.ts      # Customer OTP/session identity
│   ├── food-orders.ts        # Food order domain logic
│   ├── gaming-billing.ts     # Gaming billing engine
│   ├── session-groups.ts     # Group domain logic
│   ├── finance.ts             # Finance ledger logic
│   ├── razorpay.ts            # Razorpay integration
│   └── ...
├── scripts/
│   └── migrate.mjs           # Database migration runner
├── docs/
│   └── BUILD_STATUS.md       # Detailed implementation status
├── .github/workflows/
│   └── ci.yml                # Build CI
└── package.json
```

## Environment configuration

Never commit production secrets.

### MySQL

Typical production configuration:

```env
GENZ_MYSQL_HOST=127.0.0.1
GENZ_MYSQL_PORT=3306
GENZ_MYSQL_DATABASE=genz
GENZ_MYSQL_USER=genz
GENZ_MYSQL_PASSWORD=change-this
```

Use the actual variable names expected by the current database helper in the repository when deploying. Do not invent alternative names in application code without updating the configuration contract.

### MSG91

Required production values include the MSG91 authentication/template configuration used by the OTP sender.

OTP development mode must never be enabled in production.

### Razorpay

Server-only secrets:

```env
GENZ_RAZORPAY_KEY_ID=...
GENZ_RAZORPAY_KEY_SECRET=...
GENZ_RAZORPAY_WEBHOOK_SECRET=...
```

The secret key and webhook secret must never be exposed to the browser.

### Staff bootstrap

The initial owner bootstrap uses the repository's documented environment variables and should be removed/disabled after the first secure owner setup where appropriate.

## Local development

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Production build:

```bash
npm run build
```

Production server:

```bash
npm start
```

Database migrations:

```bash
npm run db:migrate
```

## Database setup and migrations

Recommended fresh installation sequence:

1. Install MySQL.
2. Create the GenZ database and application user.
3. Apply the current canonical schema/baseline.
4. Configure environment variables.
5. Run the migration command if the deployment procedure requires migration reconciliation.
6. Seed stations, rates, menu items, staff, and configuration through controlled admin/setup tooling.
7. Run the production build.
8. Start the GenZ server on the admin PC.
9. Verify LAN access from a customer phone and operational devices.

For an existing GenZ database, do not manually delete or reorder migration records. Use the migration runner and back up MySQL before schema changes.

## Production deployment

### Admin PC

The admin PC should have:

- stable Windows/Linux environment appropriate for the deployment
- static/reserved LAN IP
- MySQL
- Node.js runtime supported by the application
- GenZ OS service/process manager
- automatic restart after machine reboot
- local firewall rules allowing only required LAN ports
- scheduled database backups
- sufficient SSD storage
- UPS where practical

### LAN

Recommended logical segments:

```text
ADMIN SERVER
    |
MANAGED SWITCH / LAN
    +---- Gaming PCs
    +---- Console stations
    +---- VR / MOZA stations
    +---- Kitchen display
    +---- Customer Wi-Fi
```

Keep administrative services protected from untrusted networks. Customer devices should never receive direct MySQL access.

### Backup policy

Production backup must include:

- database dumps
- migration state
- configuration documentation
- receipts/financial records where stored locally

Backups are not considered complete until restore verification has been tested.

## Testing and CI

GitHub Actions builds the project on pushes and pull requests to `main`.

The minimum CI gate is:

```bash
npm install
npm run build
```

Production readiness requires adding:

- unit tests for pricing/billing/payment logic
- API integration tests
- authorization tests
- migration tests on fresh and upgraded databases
- customer authentication tests
- Razorpay webhook/idempotency tests
- group settlement tests
- inventory tests
- end-to-end customer ordering tests
- admin workflow tests
- station/agent tests

## Current implementation status

### Implemented foundations

- LAN-first MySQL architecture
- customer mobile/OTP identity
- membership recognition
- server-authoritative member/non-member pricing
- member-only pricing display for members
- customer gaming price list
- food ordering
- Pay Now and Pay at Counter
- Razorpay payment foundation
- webhook verification foundation
- food payment idempotency
- active membership validation for food pricing
- station/session QR resolution foundation
- session extension
- booking conflict protection for extensions
- live customer gaming billing
- participant-level gaming billing foundation
- pause/resume billing
- rate snapshots
- staff authentication and RBAC foundation
- audit logging foundation
- live sessions UI
- live orders UI
- bookings UI
- dashboard foundation
- session groups foundation
- finance ledger foundation
- migration tooling

### Remaining production modules

The following work remains before GenZ OS can be considered fully production-complete:

1. Participant join/leave/search UI and workflows.
2. Fully authoritative live billing across every admin screen.
3. Complete station QR generation, printing, and administration.
4. Full group settlement and split billing.
5. Booking check-in, no-show, and automatic session handoff.
6. LAN realtime event bus/SSE/WebSocket implementation.
7. Complete kitchen display system.
8. Inventory and stock accounting.
9. Admin menu/pricing/station configuration.
10. Membership lifecycle management.
11. Customer management and history.
12. Staff management and session revocation.
13. Gaming, food, and group receipts.
14. Refunds and payment reconciliation.
15. Daily cash/UPI/card/Razorpay close.
16. Hardware station agents and power-control abstraction.
17. Operational health/heartbeat monitoring.
18. Backup and restore verification tooling.
19. Comprehensive automated tests.
20. Full API RBAC/CSRF/rate-limit/body-limit/CSP/security audit.
21. Upgrade from the current vulnerable Next.js release to a supported release after compatibility testing.
22. Final LAN deployment/bootstrap documentation.
23. Remove/deprecate unused wallet schema/product remnants safely.

## Roadmap to production

Development should proceed in this order because each layer depends on the previous one:

```text
1. CI + build correctness
        |
2. Participant management + live billing
        |
3. QR administration
        |
4. Group settlement
        |
5. Booking/session handoff
        |
6. Realtime event bus
        |
7. KDS + inventory
        |
8. Configuration + membership/customer/staff admin
        |
9. Receipts + refunds + reconciliation + daily close
        |
10. Hardware agents
        |
11. Health + backup/restore
        |
12. Security audit + automated tests
        |
13. Supported Next.js upgrade
        |
14. Production deployment validation
```

Every completed module should be followed by a production build and appropriate automated tests before moving to the next dependent module.

## Important implementation rules

### Never trust the client

All of the following must be server-authoritative:

- membership
- prices
- discounts
- totals
- station/session ownership
- payment state
- group totals
- staff permissions
- inventory availability

### Preserve attribution

A food order must remain traceable to:

```text
customer -> participant -> session -> station -> order -> payment
```

Group billing must not destroy participant-level attribution.

### Preserve financial auditability

Never update a historical transaction merely to make a dashboard number look correct. Corrections should use explicit adjustment/refund/reversal transactions.

### Preserve offline operation

Do not make core LAN operations depend on an external SaaS service when the data can safely remain local.

### No wallet in the active product

Do not reintroduce customer wallet balance, GenZ Pay balance, or food-wallet payment flows unless the product requirements explicitly change.

### UI theme

The GenZ OS interface uses a high-contrast gaming-café visual language:

- black base
- vibrant yellow primary accent
- strong contrast
- clear status colors
- mobile-first customer UX
- dense but readable admin operations

## Troubleshooting

### Build says `better-sqlite3` is missing

GenZ OS uses MySQL. An obsolete SQLite module should not be imported by the application. Search the repository for `better-sqlite3` and remove obsolete SQLite-only modules rather than installing SQLite just to satisfy the build.

### Customer sees wrong membership price

Check that the API determines active membership from MySQL and expiry, rather than trusting the browser. Also verify that member and non-member display rules are applied independently from the price calculation.

### Food order payment says paid but admin is stale

Verify Razorpay webhook/signature handling and the admin realtime/polling refresh path. Payment state must be read from the server/database.

### Session extension is rejected

Check whether a future booking exists for the same station. The extension API must never extend a session into an already-booked period.

### Customer QR works but ordering fails

Verify:

1. station ID resolves
2. the station has an active session
3. customer has authenticated
4. customer is associated with that session as a participant
5. the order references that active session
6. server authorization passes

### MySQL migration problems

Back up the database first. Inspect `schema_migrations`, compare the installed schema with `db/mysql-schema.sql`, and use the repository migration runner rather than manually replaying old migrations.

## Project principle

GenZ OS should behave like an actual café operating system rather than a collection of disconnected pages.

The final system must make the complete lifecycle reliable:

```text
BOOKING
   -> CHECK-IN
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

The database remains the source of truth, the server remains authoritative, and the LAN remains usable even when the internet is unavailable.
