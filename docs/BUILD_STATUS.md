# GenZ OS Build Status

## Current milestone
Persistent LAN database foundation + transactional session/order storage.

## Implemented
- Black / GenZ yellow visual system with high-contrast status accents.
- Shared Next.js application shell.
- Dashboard, sessions, bookings, orders, kitchen and finance screens.
- Station domain model for PC, PS5 and MOZA.
- Session lifecycle API: list, start and end.
- Food order API: create, list and advance through kitchen states.
- Booking conflict engine and API.
- Membership lookup, expiry validation and tier pricing helper.
- SQLite database bootstrap with WAL mode and foreign-key enforcement.
- Versioned schema migration table and initial relational schema.
- Persistent stations, sessions, orders and order items; state survives application restart.
- Transactional session start/end and food-order creation.
- Local SQLite files excluded from Git so each café server keeps its own operational data.
- LAN-first application structure.

## Important development note
The SQLite layer is the first production-oriented persistence milestone, but the system is not production-ready yet. Pricing, memberships, payments, permissions and audit records still need to be moved onto the persistent transaction model. Native SQLite deployment should be validated on the target LAN server/OS before rollout.

## Next
1. Session timer and rate engine with pause/resume and member pricing.
2. Group sessions and split billing.
3. Payment ledger, partial payments and reconciliation.
4. QR station/session authorization.
5. Real-time event layer for staff/KDS/customer screens.
6. Admin RBAC and audit trail.
7. Production menu/inventory configuration and COGS.
8. Operational reports and exports.
