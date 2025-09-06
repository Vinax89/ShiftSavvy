import { onRequest } from 'firebase-functions/v2/https';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createGzip } from 'node:zlib';
if (!getApps().length)
    initializeApp();
function cors(req, res) {
    const origins = (process.env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);
    const origin = req.headers.origin;
    if (origin && origins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return true;
    }
    return false;
}
function esc(v) {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
export const api_transactions_exportCsv = onRequest({ region: 'us-central1', cors: false }, async (req, res) => {
    if (cors(req, res))
        return;
    try {
        const authz = String(req.headers.authorization || '');
        const token = authz.startsWith('Bearer ') ? authz.slice(7) : '';
        if (!token) {
            res.status(401).send('Missing Authorization header');
            return;
        }
        const decoded = await getAuth().verifyIdToken(token);
        const uid = decoded.uid;
        const accountId = typeof req.query.accountId === 'string' ? req.query.accountId : undefined;
        const from = typeof req.query.from === 'string' ? req.query.from : undefined; // YYYY-MM-DD
        const to = typeof req.query.to === 'string' ? req.query.to : undefined;
        const db = getFirestore();
        let q = db.collection('transactions').where('userId', '==', uid).orderBy('postedDate', 'desc');
        if (accountId)
            q = q.where('accountId', '==', accountId);
        if (from)
            q = q.where('postedDate', '>=', from);
        if (to)
            q = q.where('postedDate', '<=', to);
        const wantsGzip = /\bgzip\b/i.test(String(req.headers['accept-encoding'] || '')) || req.query.gzip === '1';
        const write = (chunk) => wantsGzip ? gz.write(chunk) : res.write(chunk);
        const end = () => wantsGzip ? gz.end() : res.end();
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        if (wantsGzip)
            res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Content-Disposition', `attachment; filename="transactions-${uid}-${Date.now()}.csv"`);
        const gz = wantsGzip ? createGzip() : null;
        if (gz)
            gz.pipe(res);
        write('id,postedDate,description,amountCents,currency,accountId,possibleDuplicateOf,src.kind,src.externalId\n');
        const PAGE = 2000;
        let last;
        while (true) {
            let qq = q.limit(PAGE);
            if (last)
                qq = qq.startAfter(last);
            const snap = await qq.get();
            if (snap.empty)
                break;
            for (const doc of snap.docs) {
                const r = doc.data();
                write([
                    esc(doc.id), esc(r.postedDate), esc(r.description), esc(r.amountCents), esc(r.currency), esc(r.accountId),
                    esc(r.possibleDuplicateOf ?? ''), esc(r.src?.kind ?? ''), esc(r.src?.externalId ?? '')
                ].join(',') + '\n');
            }
            last = snap.docs[snap.docs.length - 1];
            if (snap.size < PAGE)
                break;
        }
        end();
    }
    catch (err) {
        console.error('export failed', err);
        if (!res.headersSent)
            res.status(500);
        res.end('Export failed');
    }
});
//# sourceMappingURL=transactions.export.js.map