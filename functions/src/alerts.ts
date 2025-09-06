
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
// import * as sg from "@sendgrid/mail"; // optional alternative

if (!admin.apps.length) {
    admin.initializeApp();
}
const db = getFirestore();

type Settings = {
  timezone?: string;
  bufferCents?: number;
  alerts?: { email?: string; emailEnabled?: boolean; pushEnabled?: boolean };
};

type Account = { id: string; name?: string; balanceCents?: number; primary?: boolean };
type Bill = {
  id: string;
  name: string;
  amountCents: number;
  active?: boolean;
  // schedule (either monthly or weekly)
  freq: 'monthly' | 'weekly';
  dueDay?: number;      // 1-28/31 for monthly
  weekday?: number;     // 0-6 (Sun=0) for weekly
};
type BNPLPlan = {
  id: string;
  provider?: string;
  status: 'active' | 'closed';
  nextDueAt?: number; // ms epoch
  amountNextCents?: number;
  merchant?: string;
};
type Paycheck = { id: string; netCents: number; payDate: number }; // optional

type AlertDoc = {
  userId: string;
  type: 'bill-due' | 'bill-overdue' | 'bnpl-due' | 'bnpl-overdue' | 'buffer-risk';
  title: string;
  body: string;
  severity: 'info' | 'warn' | 'critical';
  state: 'open' | 'ack';
  dueDate?: string;
  entityRef?: { kind: 'bill' | 'bnpl' | 'paycheck' | 'account' | 'other'; id?: string; name?: string };
  createdAt: number;
  ack?: boolean;
  ackAt?: number | null;
  hash: string;
};

const TZ_FALLBACK = "UTC";
const WINDOW_DAYS = 7;

/** Deterministic alert key to dedupe */
function alertHash(a: Omit<AlertDoc, 'hash' | 'createdAt' | 'state' | 'ack' | 'ackAt'>): string {
  const s = JSON.stringify({
    u: a.userId, t: a.type, d: a.dueDate ?? '', e: a.entityRef ?? {}, sev: a.severity, title: a.title
  });
  // tiny hash
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** Return YYYY-MM-DD in UTC for a millis (we use UTC for storage) */
function isoDateUTC(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = d.getUTCDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfUTCDay(ms: number) {
  const d = new Date(ms);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

async function listUserIds(): Promise<string[]> {
  // Prefer scanning users collection (faster/cheaper than listUsers in many apps)
  const snap = await db.collection("users").select().limit(10000).get();
  return snap.docs.map(d => d.id);
}

async function getSettings(uid: string): Promise<Settings> {
  const ref = db.collection("users").doc(uid).collection("settings").doc("app");
  const snap = await ref.get();
  return (snap.exists ? (snap.data() as Settings) : {}) ?? {};
}

async function getPrimaryAccount(uid: string): Promise<Account | undefined> {
  const accRef = db.collection("users").doc(uid).collection("accounts");
  const primary = await accRef.where("primary", "==", true).limit(1).get();
  if (!primary.empty) {
    const d = primary.docs[0];
    return { id: d.id, ...(d.data() as any) };
  }
  const first = await accRef.limit(1).get();
  if (!first.empty) {
    const d = first.docs[0];
    return { id: d.id, ...(d.data() as any) };
  }
  return undefined;
}

async function listBills(uid: string): Promise<Bill[]> {
  const snap = await db.collection("users").doc(uid).collection("obligations").where("active", "in", [true, null]).get();
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Bill[];
}

async function listBNPL(uid: string): Promise<BNPLPlan[]> {
  const snap = await db.collection("users").doc(uid).collection("bnplPlans").where("status", "==", "active").get();
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as BNPLPlan[];
}

async function listPaychecks(uid: string, fromMs: number, toMs: number): Promise<Paycheck[]> {
  const ref = db.collection("users").doc(uid).collection("paychecks");
  const snap = await ref.where("payDate", ">=", fromMs).where("payDate", "<=", toMs).get();
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Paycheck[];
}

function nextBillOccurrence(bill: Bill, now: Date, until: Date): { dateMs: number }[] {
  const out: { dateMs: number }[] = [];
  if (bill.freq === 'monthly' && bill.dueDay) {
    // Find next occurrence between now..until
    const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    for (let i = 0; i < 3; i++) {
      const dt = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), bill.dueDay));
      // Clamp for short months
      if (dt.getUTCMonth() !== cursor.getUTCMonth()) {
        // exceeded month length; use last day of month
        const last = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0));
        dt.setUTCDate(last.getUTCDate());
      }
      if (dt >= now && dt <= until) out.push({ dateMs: dt.getTime() });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  } else if (bill.freq === 'weekly' && bill.weekday !== undefined) {
    const dayMs = 24 * 60 * 60 * 1000;
    let cur = startOfUTCDay(now.getTime());
    const untilMs = startOfUTCDay(until.getTime());
    for (; cur <= untilMs; cur += dayMs) {
      const d = new Date(cur);
      if (d.getUTCDay() === bill.weekday) out.push({ dateMs: cur });
    }
  }
  return out;
}

async function upsertAlert(a: Omit<AlertDoc, 'state' | 'createdAt' | 'hash'>) {
  const hash = alertHash(a);
  const ref = db.collection("users").doc(a.userId).collection("alerts").doc(hash);
  const snap = await ref.get();
  if (snap.exists) return; // already open/ack; leave it
  const payload: AlertDoc = { ...a, state: 'open', createdAt: Date.now(), hash };
  await ref.set(payload);
}

async function runForUser(uid: string) {
  const now = new Date();
  const todayMs = startOfUTCDay(now.getTime());
  const endMs = startOfUTCDay(now.getTime() + WINDOW_DAYS * 86400000);
  const todayISO = isoDateUTC(todayMs);

  const [settings, account, bills, bnpl, paychecks] = await Promise.all([
    getSettings(uid),
    getPrimaryAccount(uid),
    listBills(uid),
    listBNPL(uid),
    listPaychecks(uid, todayMs, endMs)
  ]);

  const bufferCents = settings.bufferCents ?? 50000;
  const email = settings.alerts?.email;
  const emailEnabled = !!settings.alerts?.emailEnabled;

  // 1) Bill alerts
  for (const b of bills) {
    if (b.active === false) continue;
    const occ = nextBillOccurrence(b, new Date(todayMs), new Date(endMs));
    for (const o of occ) {
      const iso = isoDateUTC(o.dateMs);
      const isOverdue = o.dateMs < todayMs;
      await upsertAlert({
        userId: uid,
        type: isOverdue ? 'bill-overdue' : 'bill-due',
        title: isOverdue ? `Overdue bill: ${b.name}` : `Upcoming bill: ${b.name}`,
        body: `${b.name} for $${(b.amountCents/100).toFixed(2)} on ${iso}`,
        severity: isOverdue ? 'critical' : 'warn',
        dueDate: iso,
        entityRef: { kind: 'bill', id: b.id, name: b.name },
      });
    }
  }

  // 2) BNPL alerts (uses nextDueAt if present)
  for (const p of bnpl) {
    if (p.status !== 'active' || !p.nextDueAt) continue;
    const iso = isoDateUTC(startOfUTCDay(p.nextDueAt));
    if (p.nextDueAt <= endMs) {
      const isOverdue = p.nextDueAt < todayMs;
      await upsertAlert({
        userId: uid,
        type: isOverdue ? 'bnpl-overdue' : 'bnpl-due',
        title: isOverdue ? `Overdue BNPL: ${p.provider ?? 'BNPL'}` : `Upcoming BNPL: ${p.provider ?? 'BNPL'}`,
        body: `${p.merchant ?? 'Purchase'} installment $${((p.amountNextCents ?? 0)/100).toFixed(2)} on ${iso}`,
        severity: isOverdue ? 'critical' : 'warn',
        dueDate: iso,
        entityRef: { kind: 'bnpl', id: p.id, name: p.provider ?? 'BNPL' },
      });
    }
  }

  // 3) Buffer risk (next 7 days): sum debits (bills + bnpl within window) vs credits (paychecks within window)
  const debitsCents =
    bills.flatMap(b => nextBillOccurrence(b, new Date(todayMs), new Date(endMs)).map(x => b.amountCents))
         .reduce((a, c) => a + (c || 0), 0)
    + bnpl.filter(p => p.nextDueAt && p.nextDueAt <= endMs).reduce((a, p) => a + (p.amountNextCents || 0), 0);

  const creditsCents = paychecks.reduce((a, p) => a + (p.netCents || 0), 0);

  const startBalance = account?.balanceCents ?? 0;
  const projected = startBalance - debitsCents + creditsCents;

  if (startBalance > 0 && projected < bufferCents) {
    await upsertAlert({
      userId: uid,
      type: 'buffer-risk',
      title: 'Buffer risk in next 7 days',
      body: `Projected to ${projected < 0 ? 'go negative' : 'dip below buffer'}: $${(projected/100).toFixed(2)} (buffer $${(bufferCents/100).toFixed(2)})`,
      severity: projected < 0 ? 'critical' : 'warn',
      entityRef: { kind: 'account', id: account?.id, name: account?.name },
    });
  }

  // 4) Optional email summary
  if (emailEnabled && email) {
    const openAlerts = await db.collection("users").doc(uid).collection("alerts")
      .where("state", "==", "open")
      .orderBy("createdAt", "desc").limit(20).get();

    if (!openAlerts.empty) {
      await sendEmail(email, `ShiftSavvy Alerts`, openAlerts.docs.map(d => d.data() as AlertDoc));
    }
  }
}

async function sendEmail(to: string, subject: string, alerts: AlertDoc[]) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "alerts@shiftsavvy.local";

  if (!(host && user && pass)) {
    console.log("SMTP not configured; skipping email.");
    return;
  }

  const transporter = nodemailer.createTransport({ host, port, auth: { user, pass } });
  const html = `
    <div style="font-family:system-ui">
      <h2>ShiftSavvy — New Alerts</h2>
      <ul>
        ${alerts.map(a => `<li><b>${a.title}</b><br/>${a.body}</li>`).join("")}
      </ul>
      <p>You can disable emails in Settings.</p>
    </div>
  `;
  await transporter.sendMail({ from, to, subject, html });
}

// ---- Schedules & Endpoints ----

// Run daily at 8:30AM in your default TZ (override with env TZ)
export const alertsDaily = onSchedule({
  schedule: "every day 08:30",
  timeZone: process.env.SPEC3_TZ || "America/Los_Angeles",
  region: "us-central1",
}, async () => {
  const uids = await listUserIds();
  for (const uid of uids) {
    try { await runForUser(uid); } catch (e) { console.error("alertsDaily error for", uid, e); }
  }
});

// Manual on-demand trigger: GET /alertsRunNow?uid=abc
export const alertsRunNow = onRequest({region: "us-central1"}, async (req, res) => {
  const uid = (req.query.uid as string) || "";
  if (!uid) {
    res.status(400).send("Missing uid");
    return;
  }
  try {
    await runForUser(uid);
    res.status(200).send("OK");
  } catch (e: any) {
    console.error(e);
    res.status(500).send(e?.message ?? "error");
  }
});
