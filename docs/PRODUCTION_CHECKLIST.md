# GenZ OS Production Completion Checklist

## Café network

- [ ] ISP static public IPv4 confirmed and not behind CGNAT.
- [ ] DNS A record points to the static IPv4.
- [ ] Router forwards only TCP 443 to the reverse proxy host.
- [ ] TCP 3000, MySQL 3306, RDP 3389, SSH 22, router admin, CCTV and station-agent ports are not exposed to WAN.
- [ ] Owner remote administration is through VPN.
- [ ] Admin server has a DHCP reservation/static LAN address.

## Application

- [ ] Production `.env.local` created from `.env.example` with real secrets.
- [ ] Database migrations applied once and verified.
- [ ] HTTPS certificate issued and renewal tested.
- [ ] Windows startup runner tested after reboot.
- [ ] Customer OTP delivery tested with production provider.
- [ ] Payment provider flows tested in the intended live/test mode.

## Café operations

- [ ] Customer login and membership pricing verified.
- [ ] Booking/check-in/no-show flow verified.
- [ ] PC/console/VR/MOZA station lifecycle verified.
- [ ] Session expiry locks the physical station.
- [ ] Ended unpaid session cannot be reused.
- [ ] Split Cash/UPI/Card settlement verified.
- [ ] Monthly credit charge and repayment verified.
- [ ] Food inventory reservation/consumption verified.
- [ ] Combined receipt verified.
- [ ] Refund/void/reversal policy verified.
- [ ] Daily cash close and finance reconciliation verified.

## Reliability and recovery

- [ ] MySQL automated backup runs on schedule.
- [ ] Backup is stored separately from the live database host.
- [ ] A restore has been performed successfully on a clean database.
- [ ] Database/network outage behavior has been tested.
- [ ] Station agent offline/fail-closed behavior has been tested.
- [ ] Reboot recovery has been tested.
- [ ] Logs and audit records are retained and reviewable.

## Security sign-off

- [ ] No production secrets are committed to Git.
- [ ] Staff role boundaries tested as OWNER and MANAGER.
- [ ] Customer cannot alter price, membership, session ownership, payment state or credit state from the browser.
- [ ] Rate limiting works across multiple application processes/instances.
- [ ] CSP/HSTS/security headers match the production deployment.
- [ ] Request IDs and audit events are present for payment and privileged mutations.
