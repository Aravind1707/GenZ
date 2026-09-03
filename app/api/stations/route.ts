import { NextResponse } from 'next/server';
import { listStations } from '../../../lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stations = await listStations();
    return NextResponse.json({ ok: true, stations }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ok: false, error: 'Unable to load stations' }, { status: 500 });
  }
}
