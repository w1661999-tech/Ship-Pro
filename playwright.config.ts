import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  retries: 1,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    locale: 'ar-EG',
    timezoneId: 'Africa/Cairo',
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'off',
    actionTimeout: 20000,
    navigationTimeout: 30000,
    // Start each test with completely fresh browser state (no cookies, no localStorage)
    storageState: { cookies: [], origins: [] },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
