// src/app/api/bnpl/reconstruct/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { reconstructBnplContracts, persistBnplResults } from '@/lib/bnpl/reconstruct.server';
import { getUid } from '@/lib/auth.server';

export const runtime = 'nodejs'; // use Node runtime (not edge) for Admin SDK

export async function POST(req: NextRequest) {
  try {
    const { accountId } = await req.json();
    const uid = await getUid();
    
    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }

    const out = await reconstructBnplContracts({ userId: uid, accountId });
    if (out.contracts.length > 0) {
      await persistBnplResults(out);
    }

    return NextResponse.json({ ok: true, stats: out.stats });
  } catch (e: any) {
    console.error('BNPL reconstruct error', e);
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
