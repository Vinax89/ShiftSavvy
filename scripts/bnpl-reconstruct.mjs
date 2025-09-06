
// scripts/bnpl-reconstruct.mjs
import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import crypto from 'node:crypto';

const app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID });
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

// --- patterns ---
const PROVIDER_PATTERNS = {
  Afterpay: /(AFTERPAY|CLEARPAY)/i,
  Klarna: /KLARNA/i,
  Affirm: /AFFIRM/i,
  Zip: /(ZIP\s*PAY|QUADPAY)/i,
  Sezzle: /SEZZLE/i,
  'PayPal Pay in 4': /PAYPAL.*(PAY\s*IN\s*4|PN4|INSTALLMENT)/i,
  'Apple Pay Later': /(APPLE\s*PAY\s*LATER|APL\s*PAY\s*LATER)/i,
};
const KEYWORDS_INSTALLMENT = /(INSTALL(?:MENT)?|INSTALMENT|PAYMENT|PAYMENT PLAN)/i;

const round2 = (n) => Math.round(n * 100) / 100;
const debit = (n) => Math.abs(n);
const iso = (d) => (d instanceof Date ? d : new Date(d)).toISOString();
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const approxEqual = (a, b, pct = 0.03, abs = 1.0) => Math.abs(a - b) <= Math.max(abs, Math.min(a, b) * pct);
const cadenceFromDiff = (avg) => (Math.abs(avg - 14) <= 2 ? 'biweekly' : 'monthly');
const nextDate = (startISO, cadence, i) => {
  const base = new Date(startISO); const d = new Date(base);
  if (cadence === 'biweekly') d.setDate(base.getDate() + 14 * i); else d.setMonth(base.getMonth() + i);
  return d.toISOString();
};
const extractMerchantHint = (desc) => (desc.match(/(?:AT|\bat\b|@|\*)\s*([A-Z0-9&'\- ]{3,})/i)?.[1]);
const normalizeMerchant = (s) => s?.replace(/\s{2,}/g, ' ').replace(/[\*#@\-_/]+/g, ' ').trim().toUpperCase().slice(0, 80);
const detectProvider = (s) => { if (!s) return; for (const [k, rx] of Object.entries(PROVIDER_PATTERNS)) if (rx.test(s)) return k; };
const modeAmount = (values, pctTol = 0.03, absTol = 1.0) => {
  const buckets = []; for (const v of values) { let placed = false; for (const b of buckets) { if (approxEqual(v, b[0], pctTol, absTol)) { b.push(v); placed = true; break; } } if (!placed) buckets.push([v]); }
  const best = buckets.sort((a, b) => b.length - a.length)[0]; return best?.[0];
};
const closest = (n, choices) => choices.reduce((p, c) => (Math.abs(c - n) < Math.abs(p - n) ? c : p));
const makeContractId = ({ userId, accountId, provider, merchant, startDate, typical }) => {
  const base = `${userId}|${accountId}|${provider}|${merchant || 'UNK'}|${startDate.slice(0,10)}|${typical.toFixed(2)}`;
  const hash = crypto.createHash('sha1').update(base).digest('hex').slice(0, 12);
  return `bnpl_${hash}`;
};

export async function reconstructAndPersistBnpl({ userId, accountId, horizonDays = 120, txns }) {
  const allTx = txns ?? (await queryTxns(userId, accountId, horizonDays));

  const candidates = allTx.filter((t) => {
    const desc = `${t.description || ''} ${t.merchant || ''}`;
    return !!detectProvider(desc) || KEYWORDS_INSTALLMENT.test(desc);
  });

  const groups = new Map();
  for (const t of candidates) {
    const desc = `${t.description || ''} ${t.merchant || ''}`;
    const provider = detectProvider(desc) || 'Unknown';
    const merchantHint = normalizeMerchant(extractMerchantHint(desc)) || 'UNKNOWN';
    const key = `${provider}__${merchantHint}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }

  const contracts = [];
  const installments = [];

  const splitClusters = (arr) => {
    const sorted = [...arr].sort((a, b) => new Date(a.postedAt) - new Date(b.postedAt));
    const clusters = []; let cur = [];
    for (let i = 0; i < sorted.length; i++) {
      const prev = sorted[i - 1], curTx = sorted[i];
      if (!prev) cur = [curTx];
      else if (daysBetween(prev.postedAt, curTx.postedAt) > 45) { clusters.push(cur); cur = [curTx]; }
      else cur.push(curTx);
    }
    if (cur.length) clusters.push(cur);
    return clusters;
  };

  for (const [key, arr] of groups) {
    const [provider, merchantHint] = key.split('__');
    for (const cluster of splitClusters(arr)) {
      if (cluster.length < 2) continue;
      const amounts = cluster.map((t) => round2(debit(t.amountCents/100)));
      const typical = modeAmount(amounts, 0.03, 1.0);
      if (!typical) continue;
      const installmentsTx = cluster.filter((t) => approxEqual(round2(debit(t.amountCents/100)), typical));
      if (installmentsTx.length < 2) continue;
      const sorted = installmentsTx.sort((a, b) => new Date(a.postedAt) - new Date(b.postedAt));
      const gaps = []; for (let i = 1; i < sorted.length; i++) gaps.push(daysBetween(sorted[i - 1].postedAt, sorted[i].postedAt));
      const avgGap = gaps.reduce((a, b) => a + b, 0) / Math.max(1, gaps.length);
      const cadence = cadenceFromDiff(avgGap);

      const first = sorted[0];
      const principalCand = allTx
        .filter((t) => !candidates.includes(t))
        .filter((t) => Math.abs(daysBetween(first.postedAt, t.postedAt)) <= 2 && debit(t.amountCents/100) >= typical * 0.8)
        .sort((a, b) => debit(b.amountCents/100) - debit(a.amountCents/100))[0];

      const principal = principalCand ? round2(debit(principalCand.amountCents/100)) : round2(typical * 4);
      const rawExpected = Math.round(principal / typical);
      const expectedInstallments = closest(rawExpected, [4, 6, 12]) || 4;

      const startDate = first.postedAt;
      const merchant = principalCand?.merchant || (merchantHint !== 'UNKNOWN' ? merchantHint : undefined);
      const contractId = makeContractId({ userId, accountId, provider, merchant, startDate, typical });

      const paidCount = Math.min(sorted.length, expectedInstallments);
      const nextDueDate = paidCount >= expectedInstallments ? undefined : nextDate(startDate, cadence, paidCount);
      const status = paidCount >= expectedInstallments ? 'paid' : (nextDueDate && new Date(nextDueDate) < new Date() ? 'late' : 'active');

      contracts.push({
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
      });

      for (let i = 0; i < expectedInstallments; i++) {
        const paidTx = sorted[i];
        const dueDate = nextDate(startDate, cadence, i);
        const id = `${contractId}__${i + 1}`;
        if (paidTx) installments.push({ id, contractId, txId: paidTx.id, amount: typical, dueDate, postedAt: paidTx.postedAt, status: 'paid' });
        else installments.push({ id, contractId, amount: typical, dueDate, status: 'scheduled' });
      }
    }
  }

  // Persist
  const batch = db.batch();
  const contractsCol = db.collection('bnplContracts');
  const installmentsCol = db.collection('bnplInstallments');
  const txCol = db.collection('transactions');

  for (const c of contracts) batch.set(contractsCol.doc(c.id), c, { merge: true });
  for (const ins of installments) {
    batch.set(installmentsCol.doc(ins.id), ins, { merge: true });
    if (ins.txId) batch.set(txCol.doc(ins.txId), { bnpl: { contractId: ins.contractId, role: 'installment' } }, { merge: true });
  }
  await batch.commit();

  return { contracts, installments, stats: { contracts: contracts.length, installments: installments.length } };
}

async function queryTxns(userId, accountId, horizonDays = 120) {
  const end = new Date(); const start = new Date(); start.setDate(end.getDate() - horizonDays);
  const snap = await db
    .collection('transactions')
    .where('userId', '==', userId)
    .where('accountId', '==', accountId)
    .where('postedDate', '>=', start.toISOString().slice(0,10))
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data()), postedAt: d.data().postedDate, amountCents: d.data().amountCents, amount: d.data().amountCents/100 }));
}
