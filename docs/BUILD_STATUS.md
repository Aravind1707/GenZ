# GenZ OS Build Status

## Current milestone
Core application shell + first domain APIs.

## Implemented
- Black / GenZ yellow visual system with high-contrast status accents.
- Shared Next.js application shell.
- Dashboard, sessions, bookings, orders, kitchen and finance screens.
- Station domain model for PC, PS5 and MOZA.
- Session lifecycle API: list, start and end.
- Food order API: create, list and advance through kitchen states.
- Booking conflict engine and API.
- Membership lookup, expiry validation and tier pricing helper.
- LAN-first application structure.

## Important development note
The current domain store is intentionally an in-process development store. It is not yet the production database. The next backend milestone is a persistent LAN database with migrations, transactions, audit records and restart-safe state.

## Next
1. Persistent database and migrations.
2. Real-time event layer for staff/KDS/customer screens.
3. Session timer and rate engine.
4. Group sessions and split billing.
5. Payment ledger and reconciliation.
6. QR station/session authorization.
7. Admin RBAC and audit trail.
8. Production menu/inventory configuration.
