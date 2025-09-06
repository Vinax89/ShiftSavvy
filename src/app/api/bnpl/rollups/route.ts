
import { NextRequest, NextResponse } from 'next/server';
import { getUid } from '@/lib/auth.server';
import { rollups } from '@/data/bnpl';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const uid = await getUid();
    const r = await rollups(uid);
    return NextResponse.json({ ok: true, ...r });
  } catch (e: any) {
    console.error('bnpl/rollups', e);
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 });
  }
}
