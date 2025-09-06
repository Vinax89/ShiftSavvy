import { NextRequest, NextResponse } from 'next/server';
import { getUid } from '@/lib/auth.server';
import { closePlan } from '@/data/bnpl';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const uid = await getUid();
    const { planId } = await req.json();
    if (!planId) return NextResponse.json({ error: 'planId required' }, { status: 400 });
    await closePlan(uid, planId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('bnpl/close', e);
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 });
  }
}
