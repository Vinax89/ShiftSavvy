import { ALLOWED_ORIGINS } from './config';
export function withCors(handler) {
    return async (req, res) => {
        const origin = req.headers.origin;
        if (origin && (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin))) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Vary', 'Origin');
        }
        res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type, x-correlation-id');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        if (req.method === 'OPTIONS') {
            res.status(204).end();
            return;
        }
        return handler(req, res);
    };
}
//# sourceMappingURL=cors.js.map