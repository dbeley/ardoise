import { defineConfig } from '@playwright/test'

// On NixOS the bundled browser cannot find the system libraries: point
// PLAYWRIGHT_CHROMIUM_EXECUTABLE at the local chromium to run the suite.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE

/**
 * Browser smoke tests: the unit suite covers the pure modules, this one covers
 * the keyboard, CodeMirror and the rendered result.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
    ...(executablePath
      ? { launchOptions: { executablePath, args: ['--no-sandbox'] } }
      : {}),
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
