# GenZ OS Build Status

## Current milestone
Persistent MySQL LAN foundation + customer OTP identity + member-aware catalog + food payment foundation.

## Implemented
- Shared GenZ dark/yellow application shell plus customer mobile UI.
- Persistent MySQL data layer for stations, sessions, bookings, orders, customers and members.
- Customer mobile OTP login with throttling and HttpOnly session cookie.
- Member lookup by verified mobile and member/non-member pricing display.
- Gaming price list supports PC NORMAL/PREMIUM, PS5, PS4, PSVR and MOZA with configurable specs, images and regular/member prices.
- Customer catalog now renders local placeholders when an image URL is not configured.
- Food and beverage catalog is explicitly separated from the gaming price-list experience.
- Food payment modes are now restricted to PAY NOW or PAY AT COUNTER; ADD TO BILL/WALLET are removed from the customer order path.
- Food orders record payment state and payment transactions in MySQL.
- Session participants link verified customer identity and member status to a session, so membership is not a client-side checkbox.
- Server-side food pricing uses the verified customer's member relationship rather than a browser-supplied price.
- Razorpay server integration foundation: server-created payment orders, server-side checkout-signature verification, and webhook handling for captured/paid events.
- Razorpay credentials are server-only environment variables.
- Station schema migration now supports PC, PS5, PS4, PSVR and MOZA.
- Fixed `advanceOrder` to keep transaction reads on the same MySQL connection.

## Payment behavior
PAY NOW creates a pending payment-backed food order and a Razorpay order. Customer confirmation is verified server-side; Razorpay webhook events can also mark the order PAID if the browser callback is lost. PAY AT COUNTER remains UNPAID until authorized staff marks it paid.

## Critical security architecture decision
A customer must never be allowed to choose a member price or freely type a station/session ID. The next QR layer will bind the customer's verified login to the active station session using a short-lived signed session authorization. This is what prevents a customer at PC-01 from ordering against PC-07.

For group gaming, each player becomes a session participant. A PS5 at ₹100/head with four players is four participant charges. If only one participant is an active member at ₹90/head, the gaming total is ₹90 + ₹100 + ₹100 + ₹100 = ₹390. The same identity model will be used for food: the backend determines each customer's member price from their verified account; nobody can claim a discount by editing browser data. Shared food can remain attached to the session/group while individually ordered food can be attributed to its participant.

## Not production-ready yet
Staff authentication/RBAC, station/session QR authorization, server-authoritative gaming timer/rate engine, complete group/split billing UI, realtime KDS/customer events, full payment reconciliation/refunds, audit logging, inventory/COGS, admin pricing editor, backups, security testing, and supported-Next.js upgrade remain before production deployment.

## Next
1. Staff authentication + RBAC and secure admin APIs.
2. Permanent station QR + short-lived active-session authorization.
3. Customer food cart + Razorpay checkout + customer payment-status screen.
4. Admin live orders/payment-status screen with automatic PAID updates.
5. Server-authoritative participant gaming billing and group/split settlement.
6. Realtime LAN events, audit log, inventory/COGS, reports, backups and security testing.
