const { defineConfig, devices } = require("@playwright/test");

// E2E smoke config. Boots the production build (`next start`) and drives it with the preinstalled
// Chromium (PLAYWRIGHT_BROWSERS_PATH is set in this environment). Run: npm run build && npm run e2e.
const PORT = process.env.E2E_PORT || 3123;
module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  expect: { timeout: 8000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    headless: true,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}/login`,
    timeout: 60000,
    reuseExistingServer: !process.env.CI,
  },
});
