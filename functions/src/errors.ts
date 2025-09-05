import type { Response } from 'express'
export function sendError(res: Response, err: any) {
  const code = err?.code || 'internal'
  const status = code === 'unauthenticated' ? 401 : code === 'permission-denied' ? 403 : 400
  res.status(status).json({ error: { code, message: String(err?.message || err) } })
}
