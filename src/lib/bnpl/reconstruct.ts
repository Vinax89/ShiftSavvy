
// src/lib/bnpl/reconstruct.ts
import db from '@/lib/firebaseAdmin';
import type { BnplContract, BnplInstallment, RawTransaction, Cadence } from './types';
import { Timestamp, FieldValue, Query } from 'firebase-admin/firestore';

// --- Provider patterns ---
const PROVIDER_PATTERNS: Record<string, RegExp> = {
  Afterpay: /(AFTERPAY|CLEARPAY)/i,
  Klarna: /KLARNA/i,
  Affirm: /AFFIRM/i,
  Zip: /(ZIP\s*PAY|QUADPAY)/i,
  Sezzle: /SEZZLE/i,
  'PayPal Pay in 4': /PAYPAL.*(PAY\s*IN\s*4|PN4|INSTALLMENT)/i,
  'Apple Pay Later': /(APPLE\s*PAY\s*LATER|APL\s*PAY\s*LATER)/i,
};

const KEYWORDS_INSTALLMENT = /(INSTALL(?:MENT)?|INSTALMENT|PAYMENT|PAYMENT PLAN)/i;

// Normalize amount to positive debits (money going out)
function debit(amount: number): number {
  return Math.abs(amount);
}

function iso(d: Date | string): string {
  return (d instanceof Date ? d : new Date(d)).toISOString();
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function approxEqual(a: number, b: number, pct = 0.03, abs = 1.0) {
  return Math.abs(a - b) <= Math.max(abs, Math.min(a, b) * pct);
}

function cadenceFromDiff(avgDiffDays: number): Cadence {
  return Math.abs(avgDiffDays - 14) <= 2 ? 'biweekly' : 'monthly';
}

function nextDate(startISO: string, cadence: Cadence, installmentIndex: number): string {
  const base = new Date(startISO);
  const d = new Date(base);
  if (cadence === 'biweekly') d.setDate(base.getDate() + 14 * installmentIndex);
  else d.setMonth(base.getMonth() + installmentIndex);
  return d.toISOString();
}

function normalizeMerchant(s?: string): string | undefined {
  if (!s) return undefined;
  return s
    .replace(/\s{2,}/g, ' ')
    .replace(/[\*#@\-_/]+/g, ' ')
    .trim()
    .toUpperCase()
    .slice(0, 80);
}

function detectProvider(desc?: string): string | undefined {
  if (!desc) return undefined;
  for (const [name, rx] of Object.entries(PROVIDER_PATTERNS)) {
    if (rx.test(desc)) return name;
  }
  return undefined;
}

export interface ReconstructInput {
  userId: string;
  accountId: string;
  // Optional: filter horizon; default 120 days
  horizonDays?: number;
  // Optional: pass transactions directly; if omitted, will query Firestore
  txns?: RawTransaction[];
}

export interface ReconstructOutput {
  contracts: (BnplContract & { id: string })[];
  installments: (BnplInstallment & { id: string })[];
  stats: { contracts: number; installments: number };
}

// Fetch transactions when not provided, limited horizon
async function fetchRecentTransactions(userId: string, accountId: string, horizonDays = 120): Promise<RawTransaction[]> {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - horizonDays);

  // Try top-level `transactions` with user/account fields; adjust if your schema differs.
  const snap = await db
    .collection('transactions')
    .where('userId', '==', userId)
    .where('accountId', '==', accountId)
    .where('postedDate', '>=', start.toISOString().slice(0,10))
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any), amount: d.data().amountCents / 100, postedAt: d.data().postedDate }));
}

// Core reconstruction pipeline
export async function reconstructBnplContracts(input: ReconstructInput): Promise<ReconstructOutput> {
  const { userId, accountId } = input;
  const horizonDays = input.horizonDays ?? 120;
  const txns = input.txns ?? (await fetchRecentTransactions(userId, accountId, horizonDays));

  // Candidate detection: provider hits or keyword hits
  const candidates = txns.filter((t) => {
    const desc = `${t.description || ''} ${t.merchant || ''}`;
    return !!detectProvider(desc) || KEYWORDS_INSTALLMENT.test(desc);
  });

  // Group by provider + rough merchant hint extracted from description
  type GroupKey = string;
  const groups = new Map<GroupKey, RawTransaction[]>();

  for (const t of candidates) {
    const desc = `${t.description || ''} ${t.merchant || ''}`;
    const provider = detectProvider(desc) || 'Unknown';
    const merchantHint = normalizeMerchant(extractMerchantHint(desc)) || 'UNKNOWN';
    const key = `${provider}__${merchantHint}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  // Split long sequences into clusters separated by >45 days
  function splitClusters(arr: RawTransaction[]): RawTransaction[][] {
    const sorted = [...arr].sort((a, b) => new Date(a.postedAt).getTime() - new Date(b.postedAt).getTime());
    const clusters: RawTransaction[][] = [];
    let cur: RawTransaction[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curTx = sorted[i];
      if (!prev) {
        cur = [curTx];
      } else if (daysBetween(prev.postedAt, curTx.postedAt) > 45) {
        clusters.push(cur);
        cur = [curTx];
      } else {
        cur.push(curTx);
      }
    }
    if (cur.length) clusters.push(cur);
    return clusters;
  }

  const outputs: ReconstructOutput = {
    contracts: [],
    installments: [],
    stats: { contracts: 0, installments: 0 },
  };

  for (const [key, arr] of groups) {
    const [provider, merchantHint] = key.split('__');
    for (const cluster of splitClusters(arr)) {
      if (cluster.length < 2) continue; // need at least two provider charges to be confident

      // Find typical installment amount (mode w/ tolerance)
      const amounts = cluster.map((t) => round2(debit(t.amount)));
      const typical = modeAmount(amounts, 0.03, 1.0);
      if (!typical) continue;

      // Filter to near-equal amounts (±3% or $1)
      const installmentsTx = cluster.filter((t) => approxEqual(round2(debit(t.amount)), typical));
      if (installmentsTx.length < 2) continue;

      // Infer cadence from average gap
      const gaps: number[] = [];
      const sorted = installmentsTx.sort((a, b) => new Date(a.postedAt).getTime() - new Date(b.postedAt).getTime());
      for (let i = 1; i < sorted.length; i++) gaps.push(daysBetween(sorted[i - 1].postedAt, sorted[i].postedAt));
      const avgGap = gaps.reduce((a, b) => a + b, 0) / Math.max(1, gaps.length);
      const cadence = cadenceFromDiff(avgGap);

      // Attempt to locate merchant principal near first installment (±2 days)
      const first = sorted[0];
      const principalCand = txns
        .filter((t) => {
          if (candidates.includes(t)) return false; // skip provider charges
          const d = Math.abs(daysBetween(first.postedAt, t.postedAt));
          return d <= 2 && debit(t.amount) >= typical * 0.8; // rough threshold
        })
        .sort((a, b) => debit(b.amount) - debit(a.amount))[0];

      const principal = principalCand ? round2(debit(principalCand.amount)) : round2(typical * 4); // default to 4-pay if unknown

      // Expected installments = clamp(round(principal / typical)) into {4,6,12}
      const rawExpected = Math.round(principal / typical);
      const expectedInstallments = (closest(rawExpected, [4, 6, 12]) as 4 | 6 | 12) ?? 4;

      // Build contract
      const startDate = sorted[0].postedAt;
      const merchant = principalCand?.merchant || (merchantHint !== 'UNKNOWN' ? merchantHint : undefined);
      const contractId = makeContractId({ userId, accountId, provider, merchant, startDate, typical });

      const paidCount = Math.min(sorted.length, expectedInstallments);
      const nextDueDate = paidCount >= expectedInstallments
        ? undefined
        : nextDate(startDate, cadence, paidCount);

      const status: BnplContract['status'] = paidCount >= expectedInstallments
        ? 'paid'
        : (nextDueDate && new Date(nextDueDate) < new Date() ? 'late' : 'active');

      const contract: BnplContract & { id: string } = {
        id: contractId,
        userId,
        accountId,
        provider,
        merchant,
        principal,
        feeTotal: 0,
        startDate,
        cadence,
        expectedInstallments,
        installmentAmount: typical,
        paidCount,
        nextDueDate,
        status,
        endDate: paidCount >= expectedInstallments ? sorted[Math.min(sorted.length, expectedInstallments) - 1]?.postedAt : undefined,
        sourceTxIds: sorted.map((t) => t.id).concat(principalCand?.id ? [principalCand.id] : []),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      // Build installment docs (paid ones only; scheduled can be derived or written too)
      const installments: (BnplInstallment & { id: string })[] = [];
      for (let i = 0; i < expectedInstallments; i++) {
        const paidTx = sorted[i];
        const dueDate = nextDate(startDate, cadence, i);
        const id = `${contractId}__${i + 1}`;
        if (paidTx) {
          installments.push({
            id,
            contractId,
            txId: paidTx.id,
            amount: typical,
            dueDate,
            postedAt: paidTx.postedAt,
            status: 'paid',
          });
        } else {
          installments.push({ id, contractId, amount: typical, dueDate, status: 'scheduled' });
        }
      }

      outputs.contracts.push(contract);
      outputs.installments.push(...installments);
    }
  }

  outputs.stats.contracts = outputs.contracts.length;
  outputs.stats.installments = outputs.installments.length;
  return outputs;
}

export async function persistBnplResults(out: ReconstructOutput) {
  const batch = db.batch();
  const contractsCol = db.collection('bnplContracts');
  const installmentsCol = db.collection('bnplInstallments');
  const txCol = db.collection('transactions');

  for (const c of out.contracts) {
    batch.set(contractsCol.doc(c.id), c, { merge: true });
  }
  for (const ins of out.installments) {
    batch.set(installmentsCol.doc(ins.id), ins, { merge: true });
    if (ins.txId) {
      batch.set(
        txCol.doc(ins.txId),
        { bnpl: { contractId: ins.contractId, role: 'installment' as const } },
        { merge: true }
      );
    }
  }

  await batch.commit();
}

// --- helpers ---
function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function modeAmount(values: number[], pctTol = 0.03, absTol = 1.0): number | undefined {
  // bucket by closeness
  const buckets: number[][] = [];
  for (const v of values) {
    let placed = false;
    for (const b of buckets) {
      if (approxEqual(v, b[0], pctTol, absTol)) {
        b.push(v); placed = true; break;
      }
    }
    if (!placed) buckets.push([v]);
  }
  const best = buckets.sort((a, b) => b.length - a.length)[0];
  return best?.[0];
}

function closest(n: number, choices: number[]): number {
  return choices.reduce((prev, cur) => (Math.abs(cur - n) < Math.abs(prev - n) ? cur : prev));
}

function extractMerchantHint(desc: string): string | undefined {
  // weak heuristics: Afterpay/Klarna lines often include merchant after a separator
  const m = desc.match(/(?:AT|\bat\b|@|\*)\s*([A-Z0-9&'\- ]{3,})/i);
  return m?.[1];
}

function makeContractId(args: { userId: string; accountId: string; provider: string; merchant?: string; startDate: string; typical: number; }) {
  const base = `${args.userId}|${args.accountId}|${args.provider}|${args.merchant || 'UNK'}|${args.startDate.slice(0,10)}|${args.typical.toFixed(2)}`;
  const hash = Buffer.from(require('crypto').createHash('sha1').update(base).digest('hex').slice(0,10)).toString('hex');
  return `bnpl_${hash}`;
}
