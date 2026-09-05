# GenZ OS Build Order

The remaining work should be executed in this order because each layer depends on the previous one:

1. **Station enforcement** — server lease/commands, PC agent integration boundary, fail-closed expiry, heartbeat and hardware adapters.
2. **Unified receipts and financial reversals** — combined bill, receipt numbering, payment/refund/void linkage and immutable audit trail.
3. **Daily close and reconciliation** — tender totals, finance-vs-payment reconciliation, cash drawer and close report.
4. **Inventory completion** — recipes/BOM, menu ingredient mapping, receiving costs, stocktake, wastage and COGS.
5. **Admin completion** — menu, gaming rates, stations, membership rules, customers and staff lifecycle UIs.
6. **Bookings/KDS polish** — timeline, deposit/refund policy, modifiers, retry and out-of-stock workflows.
7. **Realtime hardening** — replay cursors, reconnect behavior, mutation coverage and multi-process safety.
8. **Security/test hardening** — concurrency tests, shared rate limits, CSP/HSTS, request IDs and migration integrity checks.
9. **Backups/recovery** — scheduled backups, off-host copy, clean restore drill and reboot/outage testing.
10. **On-site deployment** — real ISP static IP, DNS, router/firewall/NAT, HTTPS and full café acceptance test.

No hardware/provider-specific behavior should be faked. POS/ECR, consoles, VR and MOZA adapters must be implemented against the exact hardware/API available at deployment time.
