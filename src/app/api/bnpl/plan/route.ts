
import { NextRequest, NextResponse } from 'next/server';
import { getUid } from '@/lib/auth.server';
import { upsertPlan } from '@/data/bnpl';
import type { Plan } from '@/data/bnpl';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const uid = await getUid();
    const plan = (await req.json()) as Plan;
    if (!plan || !plan.id) {
      return NextResponse.json({ error: 'plan with id is required' }, { status: 400 });
    }
    await upsertPlan(uid, plan);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('bnpl/plan POST error:', e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
