
import { NextRequest, NextResponse } from 'next/server';
import { getUid } from '@/lib/auth.server';
import { unlinkTxn } from '@/data/bnpl';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const uid = await getUid();
    const { planId, txnId } = await req.json();
    if (!planId || !txnId) return NextResponse.json({ error: 'planId, txnId required' }, { status: 400 });
    await unlinkTxn(uid, planId, txnId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('bnpl/unlink', e);
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 });
  }
}
