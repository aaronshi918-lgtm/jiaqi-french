const { defineConfig, webkit } = require("@playwright/test");
const fs = require("node:fs");
module.exports = defineConfig({
  testDir: "./tests/browser",
  // Run browser processes sequentially to avoid CPU contention in cloud runners.
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1024, height: 900 },
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      testMatch: "**/app.spec.js",
      use: {
        browserName: "chromium",
        launchOptions: fs.existsSync("/usr/bin/chromium")
          ? { executablePath: "/usr/bin/chromium" }
          : {},
      },
    },
    {
      name: "webkit",
      use: {
        browserName: "webkit",
        // Explicit executable supports both system and user-owned runtime libraries.
        // The browser must still launch and execute every functional assertion.
        launchOptions: { executablePath: webkit.executablePath() },
      },
    },
  ],
  webServer: {
    command: "node scripts/build.js && node scripts/serve.js",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
  },
});
