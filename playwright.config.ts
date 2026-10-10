import { defineConfig, devices } from '@playwright/test';

const isolated = process.env.E2E_MODE === 'isolated' || !process.env.E2E_BASE_URL;
const baseURL = isolated ? `http://localhost:${process.env.E2E_PORT || 3100}` : process.env.E2E_BASE_URL!;
process.env.E2E_MODE = isolated ? 'isolated' : 'smoke';
if (isolated) {
  process.env.E2E_USER_EMAIL = 'host@matchday.test';
  process.env.E2E_USER_PASSWORD = 'Matchday-test-2026';
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: isolated ? 60_000 : 20_000,

  use: {
    baseURL,
    actionTimeout: isolated ? 30_000 : 10_000,
    navigationTimeout: isolated ? 60_000 : 15_000,
    serviceWorkers: isolated ? 'block' : 'allow',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testMatch: '**/e2e/global-setup.ts',
      use: { actionTimeout: 30_000, navigationTimeout: 30_000 },
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    ...(isolated ? [
      { name: 'android-chromium', use: { ...devices['Pixel 7'], storageState: 'e2e/.auth/user.json' }, dependencies: ['setup'] },
      { name: 'iphone-webkit', use: { ...devices['iPhone 13'], storageState: 'e2e/.auth/user.json' }, dependencies: ['setup'] },
    ] : []),
  ],

  // Lokaler Dev-Server wird nur gestartet wenn kein E2E_BASE_URL gesetzt
  webServer: isolated ? {
    command: 'node scripts/e2e-server.mjs',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: { E2E_MODE: 'isolated', E2E_BASE_URL: baseURL, E2E_PORT: process.env.E2E_PORT || '3100' },
  } : undefined,
});
