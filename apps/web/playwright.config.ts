import { defineConfig, devices } from '@playwright/test';

const PORT = 14022;
const WS_PORT = 14045;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : 2,
  reporter: process.env['CI'] ? [['line']] : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL,
    headless: true,
    actionTimeout: 5_000,
    navigationTimeout: 15_000,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'node_modules/.bin/vite --host 127.0.0.1 --port 14022 --strictPort',
      url: baseURL,
      reuseExistingServer: true,
      timeout: 30_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: `cd ../ws && node_modules/.bin/tsx src/index.ts`,
      url: `http://127.0.0.1:${WS_PORT}/`,
      reuseExistingServer: true,
      timeout: 10_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
