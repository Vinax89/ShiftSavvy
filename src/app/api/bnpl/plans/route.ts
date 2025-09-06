
import { NextRequest, NextResponse } from 'next/server';
import { getUid } from '@/lib/auth.server';
import { rollups } from '@/data/bnpl';

export const runtime = 'nodejs';

// This endpoint was created to replace the direct client-side call in ReviewClient.
// It uses the existing `rollups` function which already fetches plans.
export async function GET(req: NextRequest) {
  try {
    const uid = await getUid();
    // The `rollups` function conveniently fetches both summary and the full plan list.
    const { plans } = await rollups(uid);
    return NextResponse.json({ ok: true, plans: plans || [] });
  } catch (e: any) {
    console.error('bnpl/plans GET error:', e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
