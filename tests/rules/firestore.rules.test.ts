import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest'
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} from '@firebase/rules-unit-testing'
import { collection, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import fs from 'node:fs'

let testEnv: Awaited<ReturnType<typeof initializeTestEnvironment>>

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-nursefin',
    firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') },
  })
})
afterAll(async () => { await testEnv.cleanup() })
beforeEach(async () => { await testEnv.clearFirestore() })

describe('paycheck_estimates', () => {
  it('owner can create with schemaVersion=2 and cents fields', async () => {
    const ctx = testEnv.authenticatedContext('alice')
    const db = ctx.firestore()
    const ref = doc(collection(db, 'paycheck_estimates'))
    await assertSucceeds(setDoc(ref, {
      userId: 'alice',
      periodStart: '2025-09-01',
      periodEnd: '2025-09-14',
      inputsHash: 'abc',
      summary: { shiftCount: 1, hours: 12, nightH: 12, weekendH: 0, holidayH: 0, chargeH: 0, otHours: 0 },
      result: {
        baseCents: 480000, diffCents: 96000, otPremiumCents: 0, grossCents: 576000,
        taxes: { federalCents: 50000, stateCents: 0, ficaCents: 95000, totalCents: 145000 },
        netCents: 431000
      },
      schemaVersion: 2,
      createdAt: serverTimestamp(),
    }))
  })

  it('rejects wrong user or wrong schemaVersion', async () => {
    const bob = testEnv.authenticatedContext('bob').firestore()
    await assertFails(addDoc(collection(bob, 'paycheck_estimates'), { userId: 'alice', schemaVersion: 1 }))
  })
})
