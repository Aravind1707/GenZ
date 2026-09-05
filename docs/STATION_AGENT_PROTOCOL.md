# GenZ Station Agent Protocol

The station agent is the local enforcement layer for physical equipment. It must never decide price, payment, membership, or authorization itself; it receives commands derived from the server-authoritative session state.

## Required state machine

`OFFLINE -> IDLE -> STARTING -> ACTIVE <-> PAUSED -> STOPPING -> LOCKED -> IDLE`

`ERROR` may transition to `LOCKED` after local cleanup. A station must fail closed: if its session lease expires or it loses authoritative connectivity beyond the configured grace period, it locks the user session rather than granting extra time.

## Heartbeat

Every agent sends a heartbeat containing station ID, agent ID, state, optional session ID, observed timestamp and agent version. Heartbeats are telemetry, not authorization.

## Commands

- `START_SESSION`: start the assigned session with an explicit expiry.
- `PAUSE_SESSION`: pause the assigned session.
- `RESUME_SESSION`: resume with a new server-provided expiry.
- `LOCK_STATION`: immediately lock the station; optionally include the session ID for correlation.
- `SHUTDOWN`: graceful shutdown after the server has ended the session.

Commands should be idempotent by command ID. Agents should reject stale session commands and never extend a lease locally.

## Security

Keep the agent port on the café LAN only. Do not expose it through the public static IP. Authenticate agent-to-server requests with a per-station secret or certificate, rotate credentials, and bind every command to the station ID. The QR code is an identifier/challenge mechanism, not an agent credential.

## Session lifecycle

1. Server verifies customer, participant, booking and session state.
2. Server creates/updates the station lease and issues `START_SESSION`.
3. Agent enforces the lease locally.
4. Agent reports heartbeats and state transitions.
5. Server ends the session and calculates the bill.
6. Agent receives `LOCK_STATION` when the lease expires or the session is ended.
7. Server releases the station only after settlement or approved credit posting.

The protocol intentionally leaves PC lock implementation, console APIs, VR runtime integration and MOZA vendor APIs behind adapters because those are hardware/provider-specific.
