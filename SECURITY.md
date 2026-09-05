# GenZ OS Security Policy

## Security posture

GenZ OS is a LAN-first business application handling customer identity, memberships, gaming sessions, food orders, payments, refunds, inventory and finance. Production deployments must keep MySQL and station-agent services private to the café LAN.

## Reporting a vulnerability

Do not publish credentials, payment secrets, customer data, or exploitable details in public issues. Report suspected vulnerabilities privately to the repository owner through an authenticated GitHub security channel when available.

Include:

- affected component
- affected version/commit
- reproduction steps
- security impact
- minimal proof of concept
- suggested remediation, if known

## Required production controls

- HTTPS for public access.
- MySQL never exposed to the WAN.
- Station agents never exposed to the WAN.
- Strong unique secrets for every station.
- Strong unique database and staff credentials.
- Production OTP development mode disabled.
- Razorpay and MSG91 secrets remain server-side.
- `.env` is never committed.
- Database backups are encrypted or otherwise access-controlled and stored off-host.
- Production images run as a non-root user.
- CI must pass tests, type validation, linting, dependency audit and security contract checks.
- CodeQL and dependency-review workflows remain enabled.

## Dependency policy

Direct dependencies are pinned to reviewed stable releases. Dependabot is enabled for npm, Docker and GitHub Actions updates. Security updates should be tested through the complete CI pipeline before production deployment.
