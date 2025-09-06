
import { test, expect } from '@playwright/test'
import { spawn } from 'node:child_process'
import path from 'node:path'

const UID = process.env.E2E_UID || 'e2e-user-001'

// Add X-UID on all API calls (dev bypass for auth)
async function addDevUidHeader(page) {
  await page.route('**/api/**', async (route) => {
    const headers = { ...route.request().headers(), 'x-uid': UID }
    await route.continue({ headers })
  })
}

test.describe('BNPL end-to-end', () => {
  test.beforeAll(async () => {
    // Seed data
    await runNode(path.resolve('tests/e2e/seed-bnpl.ts'))
  })

  test('import→reconstruct→link all→close→dashboard/calendar reflect', async ({ page, request }) => {
    await addDevUidHeader(page)

    // Trigger reconstruct via API
    const rec = await request.post('/api/bnpl/reconstruct', {
      headers: { 'x-uid': UID, 'content-type': 'application/json' },
      data: { userId: UID, accountId: 'acct:test:checking' }
    })
    expect(rec.ok()).toBeTruthy()

    // Open Review & link all installments for first plan
    await page.goto('/bnpl/review')

    // Wait for any plan to appear (merchant text from seed)
    await expect(page.getByText('Klarna Shop')).toBeVisible()

    // Link all remaining "Link" buttons (picker -> click first "Select")
    // loop safeguards against dynamic re-render
    for (let i = 0; i < 6; i++) {
      const linkBtn = page.getByRole('button', { name: /^Link$/ }).first()
      if (!(await linkBtn.isVisible().catch(()=>false))) break
      await linkBtn.click()
      await page.getByRole('button', { name: 'Select' }).first().click()
      // linked badge should appear
      await expect(page.getByText('linked').first()).toBeVisible({ timeout: 10000 })
    }

    // Close the plan
    const closeBtn = page.getByRole('button', { name: 'Close' }).first()
    await expect(closeBtn).toBeEnabled()
    await closeBtn.click()
    await expect(page.getByText('paid')).toBeVisible()

    // Dashboard rollups reflect no upcoming dues for this user
    await page.goto('/dashboard')
    const card = page.getByTestId('bnpl-card')
    await expect(card).toBeVisible()
    // Either $0.00 outstanding or "No upcoming dues" depending on other plans
    const noDue = await card.getByText('No upcoming dues').isVisible().catch(()=>false)
    if (!noDue) {
      // at least ensure total outstanding is under $1.00
      const text = await card.textContent()
      expect(text?.match(/\$0\.\d{2}/) || text?.includes('$0.00')).toBeTruthy()
    }

    // Calendar shows no BNPL markers for the plan
    await page.goto('/calendar')
    await expect(page.getByText(/BNPL — Klarna Shop/i)).toHaveCount(0)
  })
})

// helpers
function runNode(script: string) {
  return new Promise<void>((resolve, reject) => {
    // Use tsx to run TypeScript files directly
    const p = spawn('tsx', [script], { stdio: 'inherit', env: process.env })
    p.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`seed failed ${code}`)))
    p.on('error', (err) => reject(err));
  })
}
