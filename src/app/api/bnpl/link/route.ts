import { NextRequest, NextResponse } from 'next/server';
import { getUid } from '@/lib/auth.server';
import { linkTxn } from '@/data/bnpl';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const uid = await getUid();
    const { planId, txnId, role } = await req.json();
    if (!planId || !txnId) return NextResponse.json({ error: 'planId, txnId required' }, { status: 400 });
    await linkTxn(uid, planId, txnId, role ?? 'installment');
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('bnpl/link', e);
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 });
  }
}
