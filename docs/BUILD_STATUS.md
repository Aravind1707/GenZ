# GenZ OS Build Status

## Current milestone
Persistent MySQL LAN foundation + customer mobile OTP identity + member-aware pricing.

## Implemented
- Black / GenZ yellow visual system with high-contrast status accents.
- Shared Next.js application shell.
- Dashboard, sessions, bookings, orders, kitchen and finance screens.
- Station domain model for PC, PS5 and MOZA.
- Session lifecycle API: list, start and end.
- Food order API: create, list and advance through kitchen states.
- Booking conflict engine and API.
- MySQL connection pool and transactional data layer.
- Persistent stations, sessions, orders, order items and bookings.
- Server-side food pricing; client-supplied prices are not trusted.
- Session QR tokens stored as SHA-256 hashes rather than raw tokens.
- Customer mobile-number OTP login with 5-minute OTP expiry and 5-attempt verification limit.
- OTP request throttling: 30-second cooldown and maximum 5 requests/hour per mobile.
- HttpOnly customer session cookie with 30-day expiry.
- Customer mobile is matched against the persistent members table after OTP verification.
- Customer pricing endpoint returns separate Gaming and Food & Beverages pricing.
- Gaming pricing supports PC NORMAL/PREMIUM, PS5 and MOZA, with regular/member price, unit label and configurable specs.
- Non-members can see the member price as an upsell; members see their member price and savings.
- Customer-facing mobile login/pricing UI is responsive for phone screens.
- MySQL setup keeps the database on localhost and grants the app account runtime CRUD permissions only.
- Security headers and no-store/private caching on sensitive customer pricing responses.

## OTP provider
The customer OTP transport is server-side and currently supports MSG91 configuration through environment variables. Credentials are never sent to browsers. Development-only OTP return is opt-in through `GENZ_OTP_DEV_MODE=true` and must remain disabled in production. Indian SMS deployments should use an approved DLT/template configuration with the provider.

## Important development note
The customer identity and pricing layer is now persistent, but the system is not production-ready yet. Staff authentication/RBAC, payment ledger, gaming billing, group/split billing, QR session authorization, real-time KDS events, audit records, inventory/COGS and reports still need to be completed and security-tested.

## Next
1. Staff authentication + RBAC and API authorization.
2. Server-authoritative gaming timer/rate engine with member pricing.
3. QR station/session authorization for customer ordering.
4. Payment ledger, partial payments, refunds and reconciliation.
5. Group sessions and split billing.
6. Real-time event layer for staff/KDS/customer screens.
7. Admin pricing/spec/menu configuration and inventory/COGS.
8. Operational reports, backups and production security testing.
