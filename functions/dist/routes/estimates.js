import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { requireUser } from '../auth';
const ZEstimateDoc = z.object({
    periodStart: z.string(),
    periodEnd: z.string(),
    inputsHash: z.string(),
    summary: z.any(),
    result: z.any(),
    schemaVersion: z.number().int(),
});
export async function createEstimate(req, res) {
    const { uid } = await requireUser(req);
    const body = ZEstimateDoc.parse(req.body);
    const db = getFirestore();
    const ref = await db.collection('paycheck_estimates').add({ userId: uid, createdAt: Timestamp.now(), ...body });
    res.status(201).json({ id: ref.id });
}
//# sourceMappingURL=estimates.js.map