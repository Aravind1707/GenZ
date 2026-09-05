# Static IP, Owner Remote Access & POS Integration

## Purpose

GenZ is designed to remain LAN-first while allowing the café to use its ISP static public IP as a stable public entry point. The static IP is not an authentication mechanism and must not expose the database or private café services directly.

## Recommended network layout

```text
Internet
  |
ISP static public IP
  |
Router / firewall
  |-- HTTPS 443 -> GenZ reverse proxy -> Next.js app
  `-- VPN       -> private café LAN (OWNER only)
                     |-- GenZ server
                     |-- kitchen/admin devices
                     `-- gaming equipment
```

Do not expose MySQL (3306), RDP (3389), SSH (22), router administration or CCTV ports to the public internet. Prefer VPN for owner-only infrastructure access.

## Environment flags

- `GENZ_PUBLIC_BASE_URL`: public HTTPS origin used for customer links.
- `GENZ_OWNER_REMOTE_ACCESS_ENABLED`: explicit feature flag for owner remote access.
- `GENZ_OWNER_REMOTE_ACCESS_MODE`: currently documented as `VPN`; keep private infrastructure behind the VPN.
- `GENZ_POS_PROVIDER`: provider/terminal name once the exact POS is selected.
- `GENZ_POS_INTEGRATION_ENABLED`: master POS/ECR switch, disabled by default.
- `GENZ_POS_DYNAMIC_UPI_QR_ENABLED`: enables the UPI QR capability only after provider support is verified.
- `GENZ_POS_CARD_ENABLED`: enables the card-terminal capability only after provider support is verified.
- `GENZ_POS_AUTO_CONFIRM_ENABLED`: enables automatic payment confirmation only when the provider sends a trusted callback/status response.

The repository contains a provider-neutral terminal boundary. It intentionally returns `UNSUPPORTED` until a real POS provider adapter is implemented and verified for the café's exact model.

## Intended counter settlement flow

1. Manager opens the final bill.
2. GenZ shows total, already-paid amount and remaining amount.
3. Manager records any cash received.
4. GenZ automatically calculates the remaining amount.
5. Manager can select UPI or CARD/POS for the remaining amount.
6. When integrated POS is supported, GenZ sends the exact remaining amount to the terminal.
7. Customer scans the dynamic UPI QR or taps/inserts their card and enters a PIN when required.
8. A trusted payment callback/status response marks the payment captured.
9. When total captured payments equal the bill, GenZ marks the bill settled and releases the equipment.

If POS integration is disabled, normal manager-recorded cash/UPI/card settlement APIs continue to work.

## Payment model

A bill supports multiple payment entries. Examples:

- Cash ₹250 + UPI ₹250
- Cash ₹200 + UPI ₹200 + Card ₹100
- Online UPI ₹250 + counter Cash ₹300 + Card ₹500
- Partial payment now and another payment later

A failed payment never settles the bill.

## Trusted monthly customers

Approved regular customers can have a `customer_credit_accounts` record with a manager/owner-controlled credit limit. Charges are recorded as session credit entries and payments are recorded separately. Membership pricing remains independent from credit status.

Monthly credit is manager-controlled; it is not a wallet or stored customer balance.
