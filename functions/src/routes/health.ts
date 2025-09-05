import type { Request, Response } from 'express'
export async function health(req: Request, res: Response) {
  res.json({ ok: true, ts: Date.now() })
}
