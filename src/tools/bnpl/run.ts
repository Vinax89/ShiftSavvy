import 'dotenv/config'
import { adminDb } from '../firebase-admin'
import { applyBnpl } from './apply'

async function main() {
    const userId = process.argv[2] || process.env.DEMO_UID || 'demo-uid'
    console.log(`Running BNPL detection for user: ${userId}`)
    
    const count = await applyBnpl(adminDb, userId)
    
    console.log(`Applied ${count} BNPL plan(s).`)
}

main().catch(err => {
  console.error('BNPL detection failed:', err)
  process.exit(1)
})
