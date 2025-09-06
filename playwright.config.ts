import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://localhost:9002' },
  webServer: {
    command: 'npm run start',
    port: 9002,
    reuseExistingServer: !process.env.CI
  }
})
