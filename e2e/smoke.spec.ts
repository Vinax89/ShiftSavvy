import { test, expect } from '@playwright/test'

test('dashboard loads', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveTitle(/ThriveFlow|Thrive|Dashboard/i)
  await expect(page.locator('body')).toBeVisible()
})
// Optional: probe /paycheck once the page is wired
// test('paycheck renders', async ({ page }) => {
//   await page.goto('/paycheck')
//   await expect(page.locator('body')).toBeVisible()
// })
