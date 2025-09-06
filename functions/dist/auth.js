import { getAuth } from 'firebase-admin/auth';
export async function requireUser(req) {
    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token)
        throw Object.assign(new Error('UNAUTHENTICATED'), { code: 'unauthenticated' });
    const decoded = await getAuth().verifyIdToken(token);
    return { uid: decoded.uid };
}
//# sourceMappingURL=auth.js.map