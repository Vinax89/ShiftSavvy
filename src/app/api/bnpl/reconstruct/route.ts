// src/app/api/bnpl/reconstruct/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { reconstructBnplContracts, persistBnplResults } from '@/lib/bnpl/reconstruct';

export const runtime = 'nodejs'; // use Node runtime (not edge) for Admin SDK

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, accountId } = body || {};
    if (!userId || !accountId) {
      return NextResponse.json({ error: 'userId and accountId are required' }, { status: 400 });
    }

    const out = await reconstructBnplContracts({ userId, accountId });
    if (out.contracts.length > 0) {
      await persistBnplResults(out);
    }

    return NextResponse.json({ ok: true, stats: out.stats });
  } catch (e: any) {
    console.error('BNPL reconstruct error', e);
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
