// src/app/api/transactions/candidates/route.ts
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/firebaseAdmin'
import { getUid } from '@/lib/auth.server'

type Txn = { id: string; date: string; amountCents: number; memo?: string; merchant?: string; userId?: string }

export const runtime = 'nodejs'

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n))

export async function GET(req: NextRequest) {
  try {
    const uid = await getUid()
    const { searchParams } = new URL(req.url)

    const dueDate = searchParams.get('date') || ''
    const amountCents = Number(searchParams.get('amtCents') || NaN)
    const winBefore = Number(searchParams.get('winBefore') || 10)
    const winAfter  = Number(searchParams.get('winAfter')  || 21)
    const tolPct    = Number(search.get('tolPct')    || 0.03) // 3%
    const tolAbs    = Number(searchParams.get('tolAbs')    || 2)    // $2
    const limit     = Number(searchParams.get('limit')     || 10)
    const merchantQ = (searchParams.get('merchant') || '').toLowerCase()

    if (!dueDate || Number.isNaN(amountCents)) {
      return NextResponse.json({ error: 'date and amtCents required' }, { status: 400 })
    }

    const from = new Date(dueDate)
    const to   = new Date(dueDate)
    from.setDate(from.getDate() - winBefore)
    to.setDate(to.getDate() + winAfter)
    const fromYMD = from.toISOString().slice(0,10)
    const toYMD   = to.toISOString().slice(0,10)

    // Prefer nested; fall back to legacy top-level. Merge + de-dupe.
    const nestedQ = db.collection(`users/${uid}/transactions`)
      .where('date', '>=', fromYMD).where('date', '<=', toYMD)
    const topQ = db.collection('transactions')
      .where('userId', '==', uid)
      .where('date', '>=', fromYMD).where('date', '<=', toYMD)

    const [nestedSnap, topSnap] = await Promise.all([nestedQ.get(), topQ.get()])

    const seen = new Set<string>()
    const rows: Txn[] = []
    const push = (id: string, data: any) => {
      if (seen.has(id)) return
      seen.add(id)
      rows.push({ id, ...(data as any) })
    }
    nestedSnap.forEach(d => push(d.id, d.data()))
    topSnap.forEach(d => push(d.id, d.data()))

    const maxWin = Math.max(winBefore, winAfter)
    const amtAbsTolCents = Math.round(tolAbs * 100)

    const score = (t: Txn) => {
      const amtDiff = Math.abs((t.amountCents ?? 0) - amountCents)
      const rel = amountCents ? amtDiff / Math.max(1, Math.abs(amountCents)) : 1
      const amtScoreRel = 1 - rel / tolPct
      const amtScoreAbs = 1 - (amtDiff / Math.max(1, amtAbsTolCents))
      const amountScore = clamp(Math.max(amtScoreRel, amtScoreAbs), 0, 1)

      const dDays = Math.abs((Date.parse(t.date) - Date.parse(dueDate)) / 86_400_000)
      const dateScore = clamp(1 - dDays / Math.max(1, maxWin), 0, 1)

      const m = (t.merchant || t.memo || '').toLowerCase()
      const merchantScore = merchantQ ? (m.includes(merchantQ) ? 1 : 0) : 0.5

      return 0.6*amountScore + 0.3*dateScore + 0.1*merchantScore
    }

    const out = rows
      .map(r => ({ ...r, confidence: score(r) }))
      .sort((a,b) => b.confidence - a.confidence)
      .slice(0, Math.min(50, limit))

    return NextResponse.json({ ok: true, candidates: out })
  } catch (e: any) {
    console.error('candidates error', e)
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}
