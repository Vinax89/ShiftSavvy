import { onRequest } from 'firebase-functions/v2/https'
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app'
import { REGION } from './config'
import { withCors } from './cors'
import { sendError } from './errors'
import { health } from './routes/health'
import { createEstimate } from './routes/estimates'

if (!getApps().length) initializeApp({ credential: applicationDefault() })

export const api_health = onRequest({ region: REGION }, (req, res) =>
  withCors(async (req, res) => { try { await health(req, res) } catch (e) { sendError(res, e) } })(req, res)
)

export const api_estimates_create = onRequest({ region: REGION }, (req, res) =>
  withCors(async (req, res) => { try { await createEstimate(req, res) } catch (e) { sendError(res, e) } })(req, res)
)
