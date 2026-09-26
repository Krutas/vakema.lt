import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'npm run preview',
    port: 4321,
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://localhost:4321',
    // Playwright's own chromium cannot be downloaded on this network; use system Chrome.
    channel: 'chrome',
  },
});
