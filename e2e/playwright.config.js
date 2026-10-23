// Browser suite: clicks every control on every admin and client page and fails
// on dead clicks, numbers formatted for the viewer's locale, page errors and
// server errors. Run with `npm run e2e` (see e2e/README.md).
const path = require('path');
const { defineConfig } = require('@playwright/test');

const API_PORT = process.env.E2E_API_PORT || '8100';
const WEB_PORT = process.env.E2E_WEB_PORT || '3100';

module.exports = defineConfig({
  testDir: __dirname,
  outputDir: path.join(__dirname, '.tmp/results'),
  // One crawl walks hundreds of controls; it is one long test, not many short ones.
  timeout: 60 * 60 * 1000,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: path.join(__dirname, '.tmp/report'), open: 'never' }]],
  globalSetup: require.resolve('./global-setup.js'),
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    channel: process.env.CI ? undefined : 'chrome',
    storageState: path.join(__dirname, '.tmp/admin.json'),
    // A German browser: comma decimals and dot thousands. Every figure must
    // still read the US way, so any locale-dependent formatting shows up here.
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    viewport: { width: 1440, height: 1000 },
    // Software WebGL: the earnings globe needs it and headless has no GPU.
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: `bash "${path.join(__dirname, 'start-backend.sh')}"`,
      url: `http://localhost:${API_PORT}/healthz`,
      timeout: 120 * 1000,
      reuseExistingServer: false,
    },
    {
      command: `bash "${path.join(__dirname, 'start-frontend.sh')}"`,
      url: `http://localhost:${WEB_PORT}`,
      timeout: 10 * 60 * 1000,
      reuseExistingServer: false,
    },
  ],
});
