import { NextResponse } from 'next/server';
import { findMember } from '../../../lib/members';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id')?.trim() ?? '';
  if (!id || id.length > 64) {
    return NextResponse.json({ ok: false, error: 'Membership ID is required' }, { status: 400 });
  }

  try {
    const member = findMember(id);
    return NextResponse.json(
      { ok: true, member: member ? { id: member.id, name: member.name, tier: member.tier, expiresAt: member.expiresAt, active: member.active } : null },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ ok: false, error: 'Unable to validate membership' }, { status: 500 });
  }
}
