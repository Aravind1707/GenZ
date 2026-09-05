export type StationLease = {
  stationId: string;
  sessionId: string;
  expiresAt: string;
};

export function validateStationLease(lease: StationLease, now = Date.now()): void {
  if (!lease.stationId || !lease.sessionId) throw new Error('Station lease identity is required');
  const expires = Date.parse(lease.expiresAt);
  if (Number.isNaN(expires) || expires <= now) throw new Error('Station lease has expired');
}

export function remainingLeaseMs(lease: StationLease, now = Date.now()): number {
  const expires = Date.parse(lease.expiresAt);
  if (Number.isNaN(expires)) return 0;
  return Math.max(0, expires - now);
}
