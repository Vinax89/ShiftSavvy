#!/usr/bin/env node
/* eslint-disable no-console */
import 'dotenv/config'
import admin from 'firebase-admin'

try { admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID }) } catch { admin.initializeApp() }
const db = admin.firestore()

const fix = process.argv.includes('--fix')

async function run() {
  const users = await db.collection('users').select().get()
  let mismatches = 0

  for (const u of users.docs) {
    const uid = u.id
    const nestedTxns = await db.collection(`users/${uid}/transactions`).get()
    for (const d of nestedTxns.docs) {
      const n = d.data()
      const legacyRef = db.collection('transactions').doc(d.id)
      const legacySnap = await legacyRef.get()
      const l = legacySnap.exists ? legacySnap.data() : null

      const nBnpl = JSON.stringify(n.bnpl || null)
      const lBnpl = JSON.stringify(l?.bnpl || null)

      if (nBnpl !== lBnpl) {
        mismatches++
        console.log(`[${uid}] txn ${d.id} mismatch nested=${nBnpl} legacy=${lBnpl}`)
        if (fix) {
          await legacyRef.set({ ...(l||{}), userId: uid, bnpl: n.bnpl }, { merge: true })
          console.log('  -> fixed legacy to match nested')
        }
      }
    }
  }
  console.log(`Done. Mismatches: ${mismatches}${fix ? ' (fixed where possible)' : ''}`)
}

run().catch(e => { console.error(e); process.exit(1) })