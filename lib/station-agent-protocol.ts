export type StationAgentState =
  | 'OFFLINE'
  | 'IDLE'
  | 'STARTING'
  | 'ACTIVE'
  | 'PAUSED'
  | 'LOCKED'
  | 'STOPPING'
  | 'ERROR';

export type StationAgentHeartbeat = {
  stationId: string;
  agentId: string;
  state: StationAgentState;
  sessionId?: string | null;
  observedAt: string;
  version: string;
};

export type StationCommand =
  | { type: 'START_SESSION'; sessionId: string; expiresAt: string }
  | { type: 'PAUSE_SESSION'; sessionId: string }
  | { type: 'RESUME_SESSION'; sessionId: string; expiresAt: string }
  | { type: 'LOCK_STATION'; sessionId?: string }
  | { type: 'SHUTDOWN'; reason: string };

/**
 * Provider-neutral contract between GenZ OS and a station agent.
 * The agent is the enforcement point on the physical machine; the web app
 * remains authoritative for session/payment state.
 */
export interface StationAgentAdapter {
  heartbeat(input: StationAgentHeartbeat): Promise<void>;
  dispatch(stationId: string, command: StationCommand): Promise<{ accepted: boolean; commandId: string }>;
}

export function isStationAgentState(value: unknown): value is StationAgentState {
  return typeof value === 'string' &&
    ['OFFLINE', 'IDLE', 'STARTING', 'ACTIVE', 'PAUSED', 'LOCKED', 'STOPPING', 'ERROR'].includes(value);
}

export function isExpiredIso(value: string, now = Date.now()): boolean {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) || timestamp <= now;
}
