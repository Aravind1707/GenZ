# GenZ OS Build Status

## Current milestone
LAN-first gaming café OS with persistent MySQL, customer identity/pricing, staff RBAC, live admin modules, food checkout, participant billing foundation and migration tooling.

## Implemented
- Shared GenZ black/yellow high-contrast application shell and customer mobile UI.
- Persistent MySQL data layer for stations, sessions, bookings, orders, customers and members.
- Customer mobile OTP login with throttling and HttpOnly session cookie.
- Verified member lookup and server-authoritative member/non-member pricing.
- Gaming price list supports PC NORMAL/PREMIUM, PS5, PS4, PSVR and MOZA with configurable specs/images/rates.
- Food catalog separated from gaming price-list experience.
- Food ordering supports only PAY NOW and PAY AT COUNTER; no wallet and no add-to-gaming-bill path.
- Customer food cart with quantity controls and Razorpay checkout confirmation.
- Razorpay server-created orders, signature verification, webhook handling and amount validation.
- Staff authentication with hashed passwords, hashed sessions, role permissions, logout and audit logging.
- Staff-protected sessions, bookings, orders, stations, groups, members, dashboard and finance APIs.
- Server-authoritative gaming billing engine with elapsed-time billing, pause/resume, member-rate snapshots, participant billing and finalization.
- Session extension with per-station booking conflict checks.
- Session grouping foundation for multi-station group billing.
- Live admin dashboard, live food-order queue, live booking timeline and finance dashboard.
- Customer station resolver endpoint for permanent station QR links; station QR identifies equipment and only an active session can be joined.
- Canonical MySQL schema synchronized with the current application model.
- Deterministic MySQL migration runner and `npm run db:migrate` command.
- CI build workflow.

## Billing rules
Gaming charges are computed from server timestamps, not browser timers. Charges are calculated per active participant using the rate snapshot taken when the participant joins. An active member receives the configured member rate; a non-member receives the regular rate. Paused time is excluded. A session without participants falls back to the station rate.

## Food/payment rules
Customer food orders are attached to an active session and participant. PAY NOW creates a pending Razorpay-backed order and requires server-side signature/payment validation. Razorpay webhook events can reconcile payment if the browser callback is lost. PAY AT COUNTER remains unpaid until authorized staff marks it paid. Food is never added to the gaming bill.

## Remaining production modules
- Complete permanent QR generation/printing UI and customer QR-first navigation.
- Full group settlement/split payment engine and UI.
- Booking-to-session automatic handoff/no-show workflow.
- Realtime SSE/WebSocket event bus across admin, kitchen and customer clients.
- Inventory, stock decrement, COGS and menu/station administration.
- Membership management, customer management and staff management screens.
- Receipts, refunds, finance reconciliation and daily close.
- Station hardware/agent abstraction and optional power-control adapters.
- Automated database backups/restore verification and operational health checks.
- Comprehensive unit/integration/end-to-end tests.
- Security hardening review, rate limits, CSRF strategy and supported Next.js upgrade.

## Important deployment note
The repository can be built and migrated, but production readiness requires the real MySQL instance, MSG91 credentials, Razorpay credentials, initial staff credentials, station configuration, menu/rate data and café hardware integration to be configured on the admin PC.
