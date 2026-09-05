import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authorizeStationAgent } from '../../../../lib/station-challenges';
import { acknowledgeStationCommand, claimNextStationCommand, enqueueStationCommand } from '../../../../lib/station-agent-commands';
import type { StationCommand } from '../../../../lib/station-agent-protocol';
import { COOKIE, requireStaff } from '../../../../lib/staff-auth';

const MAX_BODY_BYTES = 8192;
const VALID_TYPES = new Set(['START_SESSION','PAUSE_SESSION','RESUME_SESSION','LOCK_STATION','SHUTDOWN']);

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) throw new Error('Request body too large');
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw new Error('Request body too large');
  const body = JSON.parse(text);
  if (!body || typeof body !== 'object') throw new Error('Invalid JSON body');
  return body as Record<string, unknown>;
}

function agentAuthorized(request: Request, stationId: string) {
  const secret = request.headers.get('x-genz-station-secret') || '';
  return Boolean(stationId && authorizeStationAgent(stationId, secret));
}

export async function GET(request: Request) {
  const stationId = new URL(request.url).searchParams.get('stationId') || '';
  if (!agentAuthorized(request, stationId)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, command: await claimNextStationCommand(stationId) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Command fetch failed' }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const staff = await requireStaff((await cookies()).get(COOKIE)?.value, 'sessions:write');
    const body = await readJson(request);
    const stationId = typeof body.stationId === 'string' ? body.stationId : '';
    const idempotencyKey = request.headers.get('Idempotency-Key') || (typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '');
    const command = body.command as Record<string, unknown> | undefined;
    if (!stationId || stationId.length > 64 || !idempotencyKey || idempotencyKey.length > 128 || !command || typeof command.type !== 'string' || !VALID_TYPES.has(command.type)) {
      return NextResponse.json({ ok: false, error: 'Invalid command request' }, { status: 400 });
    }
    const normalized = command as unknown as StationCommand;
    const result = await enqueueStationCommand({ stationId, command: normalized, idempotencyKey });
    return NextResponse.json({ ok: true, requestedBy: staff.id, ...result }, { status: result.existing ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Command enqueue failed';
    const status = message === 'STAFF_FORBIDDEN' ? 403 : message === 'STAFF_UNAUTHORIZED' ? 401 : 400;
    return NextResponse.json({ ok: false, error: status === 403 ? 'Permission denied' : status === 401 ? 'Staff authorization required' : message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await readJson(request);
    const stationId = typeof body.stationId === 'string' ? body.stationId : '';
    const commandId = typeof body.commandId === 'string' ? body.commandId : '';
    if (!agentAuthorized(request, stationId) || !commandId || typeof body.accepted !== 'boolean') {
      return NextResponse.json({ ok: false, error: 'Unauthorized or invalid acknowledgement' }, { status: 401 });
    }
    await acknowledgeStationCommand({ stationId, commandId, accepted: body.accepted, message: typeof body.message === 'string' ? body.message : undefined });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Command acknowledgement failed' }, { status: 400 });
  }
}
