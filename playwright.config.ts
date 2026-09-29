import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:3001',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: process.platform === 'win32'
      ? 'set NEXT_DIST_DIR=.next-e2e&& npm run dev -- --port 3001'
      : 'NEXT_DIST_DIR=.next-e2e npm run dev -- --port 3001',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
