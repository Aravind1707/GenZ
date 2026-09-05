import { randomUUID } from 'node:crypto';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool, transaction } from './mysql';
import type { StationCommand } from './station-agent-protocol';

const COMMAND_TTL_MS = 30_000;

type CommandRow = RowDataPacket & {
  id: string;
  station_id: string;
  session_id: string | null;
  type: StationCommand['type'];
  payload_json: string | object;
  status: string;
  idempotency_key: string;
  created_at: Date | string;
  expires_at: Date | string;
  result_message: string | null;
};

function parsePayload(value: string | object): Record<string, unknown> {
  if (typeof value === 'object' && value !== null) return value as Record<string, unknown>;
  try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
}

function rowToCommand(row: CommandRow): StationCommand {
  const payload = parsePayload(row.payload_json);
  switch (row.type) {
    case 'START_SESSION':
    case 'RESUME_SESSION':
      return { type: row.type, sessionId: String(payload.sessionId), expiresAt: String(payload.expiresAt) };
    case 'PAUSE_SESSION':
      return { type: row.type, sessionId: String(payload.sessionId) };
    case 'LOCK_STATION':
      return { type: row.type, ...(payload.sessionId ? { sessionId: String(payload.sessionId) } : {}) };
    case 'SHUTDOWN':
      return { type: row.type, reason: String(payload.reason || 'Server requested shutdown') };
  }
}

export async function enqueueStationCommand(input: {
  stationId: string;
  command: StationCommand;
  idempotencyKey: string;
  ttlMs?: number;
}) {
  const ttlMs = Math.max(5_000, Math.min(input.ttlMs ?? COMMAND_TTL_MS, 5 * 60_000));
  return transaction(async (c: PoolConnection) => {
    const [existing] = await c.query<CommandRow[]>('SELECT * FROM station_agent_commands WHERE station_id=? AND idempotency_key=? LIMIT 1 FOR UPDATE', [input.stationId, input.idempotencyKey]);
    if (existing[0]) return { id: String(existing[0].id), command: rowToCommand(existing[0]), status: String(existing[0].status), existing: true };
    const id = randomUUID();
    const sessionId = 'sessionId' in input.command ? input.command.sessionId ?? null : null;
    const payload = JSON.stringify(input.command);
    const expiresAt = new Date(Date.now() + ttlMs);
    await c.execute(
      'INSERT INTO station_agent_commands(id,station_id,session_id,type,payload_json,status,idempotency_key,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)',
      [id, input.stationId, sessionId, input.command.type, payload, 'PENDING', input.idempotencyKey, new Date(), expiresAt],
    );
    return { id, command: input.command, status: 'PENDING', existing: false };
  });
}

export async function claimNextStationCommand(stationId: string) {
  return transaction(async (c: PoolConnection) => {
    await c.execute("UPDATE station_agent_commands SET status='EXPIRED', result_message='Command expired before delivery' WHERE station_id=? AND status IN ('PENDING','CLAIMED') AND expires_at<=NOW(3)", [stationId]);
    const [rows] = await c.query<CommandRow[]>("SELECT * FROM station_agent_commands WHERE station_id=? AND status='PENDING' AND expires_at>NOW(3) ORDER BY created_at ASC LIMIT 1 FOR UPDATE", [stationId]);
    const row = rows[0];
    if (!row) return null;
    await c.execute("UPDATE station_agent_commands SET status='CLAIMED', claimed_at=NOW(3) WHERE id=?", [row.id]);
    return { id: String(row.id), command: rowToCommand(row), expiresAt: new Date(row.expires_at).toISOString() };
  });
}

export async function acknowledgeStationCommand(input: { stationId: string; commandId: string; accepted: boolean; message?: string }) {
  const [result] = await pool.execute<ResultSetHeader>(
    "UPDATE station_agent_commands SET status=?, acknowledged_at=NOW(3), result_message=? WHERE id=? AND station_id=? AND status='CLAIMED'",
    [input.accepted ? 'ACKNOWLEDGED' : 'REJECTED', input.message?.slice(0, 255) || null, input.commandId, input.stationId],
  );
  const affected = Number(result.affectedRows);
  if (affected !== 1) throw new Error('Command is not claimable or does not belong to station');
}
