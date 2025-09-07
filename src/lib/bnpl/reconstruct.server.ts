'use server';
// src/lib/bnpl/reconstruct.server.ts
import db from '@/lib/firebaseAdmin';
import type {
  RawTransaction,
  BnplContract,
  BnplInstallment,
  BnplLink,
  BnplContractState,
  BnplInstallmentStatus,
  BnplScheduleFrequency,
} from './types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';

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

// --- Helpers ---
const toCents = (n: number) => Math.round(n * 100);
const debit = (amountCents: number): number => Math.abs(amountCents);
const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
const approxEqual = (a: number, b: number, pct = 0.03, abs = 100) => Math.abs(a - b) <= Math.max(abs, Math.min(a, b) * pct);
const normalizeMerchant = (s?: string): string => (s || '').replace(/\s{2,}/g, ' ').replace(/[\*#@\-_/]+/g, ' ').trim().toUpperCase().slice(0, 80);
const detectProvider = (desc?: string): string | undefined => {
  if (!desc) return undefined;
  for (const [name, rx] of Object.entries(PROVIDER_PATTERNS)) if (rx.test(desc)) return name;
  return undefined;
};
const closest = (n: number, choices: number[]): number => choices.reduce((p, c) => (Math.abs(c - n) < Math.abs(p - n) ? c : p));

function cadenceFromDiff(avgDiffDays: number): BnplScheduleFrequency {
  if (Math.abs(avgDiffDays - 14) <= 3) return 'biweekly';
  if (Math.abs(avgDiffDays - 7) <= 2) return 'weekly';
  return 'monthly';
}

function getNextDueDate(startDate: string, cadence: BnplScheduleFrequency, installmentIndex: number): Date {
  const d = new Date(startDate);
  if (cadence === 'weekly') d.setDate(d.getDate() + 7 * installmentIndex);
  else if (cadence === 'biweekly') d.setDate(d.getDate() + 14 * installmentIndex);
  else d.setMonth(d.getMonth() + installmentIndex);
  return d;
}

function modeAmount(values: number[], pctTol = 0.03, absTol = 100): number | undefined {
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

function makeContractId(args: { userId: string; provider: string; merchant?: string; startDate: string; typicalAmount: number; }): string {
  const base = `${args.userId}|${args.provider}|${args.merchant || 'UNK'}|${args.startDate}|${args.typicalAmount}`;
  return `bnpl_${createHash('sha1').update(base).digest('hex').slice(0,12)}`;
}

// --- Main Logic ---

export interface ReconstructInput {
  userId: string;
  accountId: string;
  horizonDays?: number;
  txns?: RawTransaction[];
}

export interface ReconstructOutput {
  contracts: BnplContract[];
  installments: BnplInstallment[];
  links: BnplLink[];
  stats: { contracts: number; installments: number; links: number };
}

async function fetchRecentTransactions(userId: string, accountId: string, horizonDays = 120): Promise<RawTransaction[]> {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - horizonDays);

  const snap = await db.collection(`users/${userId}/transactions`)
    .where('accountId', '==', accountId)
    .where('postedDate', '>=', start.toISOString().slice(0, 10))
    .get();

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      userId: userId,
      accountId: accountId,
      amountCents: data.amountCents,
      postedDate: data.postedDate,
      description: data.description,
    };
  });
}

export async function reconstructBnplContracts(input: ReconstructInput): Promise<ReconstructOutput> {
  const { userId, accountId } = input;
  const txns = input.txns ?? (await fetchRecentTransactions(userId, accountId, input.horizonDays));

  const candidates = txns.filter(t => detectProvider(t.description) || KEYWORDS_INSTALLMENT.test(t.description || ''));

  const groups = new Map<string, RawTransaction[]>();
  for (const t of candidates) {
    const provider = detectProvider(t.description) || 'Unknown';
    const merchantHint = normalizeMerchant((t.description || '').replace(provider, ''));
    const key = `${provider}__${merchantHint}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  const out: ReconstructOutput = { contracts: [], installments: [], links: [], stats: { contracts: 0, installments: 0, links: 0 } };

  for (const [, arr] of groups) {
    const clusters = splitClusters(arr);
    for (const cluster of clusters) {
      if (cluster.length < 2) continue;

      const typicalAmount = modeAmount(cluster.map(t => debit(t.amountCents)));
      if (!typicalAmount) continue;

      const installmentTxs = cluster.filter(t => approxEqual(debit(t.amountCents), typicalAmount))
        .sort((a, b) => new Date(a.postedDate).getTime() - new Date(b.postedDate).getTime());
      if (installmentTxs.length < 2) continue;

      const gaps = [];
      for (let i = 1; i < installmentTxs.length; i++) gaps.push(daysBetween(installmentTxs[i - 1].postedDate, installmentTxs[i].postedDate));
      const avgGap = gaps.reduce((a, b) => a + b, 0) / Math.max(1, gaps.length);
      const cadence = cadenceFromDiff(avgGap);

      const first = installmentTxs[0];
      const principalCand = txns
        .filter(t => !candidates.includes(t) && Math.abs(daysBetween(first.postedDate, t.postedDate)) <= 2 && debit(t.amountCents) >= typicalAmount * 0.8)
        .sort((a, b) => debit(b.amountCents) - debit(a.amountCents))[0];

      const principal = principalCand ? debit(principalCand.amountCents) : typicalAmount * 4;
      const totalInstallments = closest(Math.round(principal / typicalAmount), [4, 6, 12]) || 4;
      const merchant = principalCand?.merchant || normalizeMerchant(first.description);
      const provider = detectProvider(first.description) || 'Unknown';
      const startDate = first.postedDate;

      const contractId = makeContractId({ userId, provider, merchant, startDate, typicalAmount });
      const contractInstallments: BnplInstallment[] = [];
      const contractLinks: BnplLink[] = [];

      for (let i = 0; i < totalInstallments; i++) {
        const installmentId = `${contractId}_${i + 1}`;
        const dueDate = Timestamp.fromDate(getNextDueDate(startDate, cadence, i));
        const paidTx = installmentTxs[i];
        const amountPaid = paidTx ? debit(paidTx.amountCents) : 0;
        const paidAt = paidTx ? Timestamp.fromDate(new Date(paidTx.postedDate)) : null;

        if (paidTx) {
          contractLinks.push({
            id: `${contractId}_${paidTx.id}`, contractId, txnId: paidTx.id, installmentId,
            amountApplied: amountPaid, confidence: 1.0, matchedAt: Timestamp.now()
          });
        }

        const status = determineInstallmentStatus({ dueDate, amountDue: typicalAmount, amountPaid });

        contractInstallments.push({
          id: installmentId, contractId, dueDate, amountDue: typicalAmount, amountPaid, status, paidAt
        });
      }

      const contractState = determineContractState(contractInstallments);
      const paidInstallments = contractInstallments.filter(i => i.status === 'PAID').length;
      const nextUpcoming = contractInstallments.find(i => i.status === 'UPCOMING' || i.status === 'DUE');

      const contract: BnplContract = {
        id: contractId, userId, provider, merchant, principal, currency: 'USD',
        startDate: Timestamp.fromDate(new Date(startDate)),
        scheduleCount: totalInstallments, scheduleFrequency: cadence,
        state: contractState,
        nextDueDate: nextUpcoming ? nextUpcoming.dueDate : null,
        paidInstallments, totalInstallments,
        outstanding: contractInstallments.reduce((sum, i) => sum + (i.amountDue - i.amountPaid), 0),
        lastReconciledAt: Timestamp.now(),
        createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
      };

      out.contracts.push(contract);
      out.installments.push(...contractInstallments);
      out.links.push(...contractLinks);
    }
  }

  out.stats = { contracts: out.contracts.length, installments: out.installments.length, links: out.links.length };
  return out;
}

function splitClusters(arr: RawTransaction[]): RawTransaction[][] {
  const sorted = [...arr].sort((a, b) => new Date(a.postedDate).getTime() - new Date(b.postedDate).getTime());
  const clusters: RawTransaction[][] = [];
  let cur: RawTransaction[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (!sorted[i-1] || daysBetween(sorted[i-1].postedDate, sorted[i].postedDate) > 45) {
      if(cur.length) clusters.push(cur);
      cur = [sorted[i]];
    } else {
      cur.push(sorted[i]);
    }
  }
  if (cur.length) clusters.push(cur);
  return clusters;
}

function determineInstallmentStatus(inst: { dueDate: Timestamp, amountDue: number, amountPaid: number }): BnplInstallmentStatus {
  if (inst.amountPaid >= inst.amountDue - 1) return 'PAID';
  const isPastDue = inst.dueDate.toMillis() < Date.now();
  if (isPastDue) {
    if (inst.amountPaid > 0) return 'PARTIAL';
    return 'OVERDUE';
  }
  return 'UPCOMING'; // Simplified, could be 'DUE' if close to due date
}

function determineContractState(installments: BnplInstallment[]): BnplContractState {
  if (installments.every(i => i.status === 'PAID')) return 'PAID';
  if (installments.some(i => i.status === 'OVERDUE')) return 'LATE';
  if (installments.some(i => i.status === 'PAID' || i.status === 'PARTIAL')) return 'ACTIVE';
  return 'OPEN';
}

export async function persistBnplResults(out: ReconstructOutput) {
  if (out.contracts.length === 0) return;
  const batch = db.batch();
  const userId = out.contracts[0].userId;

  for (const c of out.contracts) {
    const ref = db.collection(`users/${userId}/bnpl/contracts`).doc(c.id);
    batch.set(ref, { ...c, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
  for (const i of out.installments) {
    const ref = db.collection(`users/${userId}/bnpl/contracts/${i.contractId}/installments`).doc(i.id);
    batch.set(ref, i);
  }
  for (const l of out.links) {
    const ref = db.collection(`users/${userId}/bnpl/contracts/${l.contractId}/links`).doc(l.id);
    batch.set(ref, l);
  }

  await batch.commit();
}
