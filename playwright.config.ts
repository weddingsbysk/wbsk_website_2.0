import { defineConfig, devices } from "@playwright/test";

const widths = [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1100 },
  { name: "desktop", width: 1440, height: 900 },
];
const browsers = [
  { name: "chromium", use: devices["Desktop Chrome"] },
  { name: "webkit", use: devices["Desktop Safari"] },
  { name: "firefox", use: devices["Desktop Firefox"] },
];

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173/wbsk_website_2.0/",
    trace: "retain-on-failure",
    // Most tests are about other things, so the first-visit guide counts as already seen (see guide.spec.ts).
    storageState: {
      cookies: [],
      origins: [{ origin: "http://127.0.0.1:4173", localStorage: ["couple", "gallery", "albums", "filmstack", "records", "filmrow", "filmswindow"].map((name) => ({ name: `wbsk-guide-${name}`, value: "1" })) }],
    },
  },
  webServer: {
    command: "node scripts/serve-out.mjs",
    url: "http://127.0.0.1:4173/wbsk_website_2.0/",
    reuseExistingServer: !process.env.CI,
  },
  projects: browsers.flatMap((b) =>
    widths.map((w) => ({
      name: `${b.name}-${w.name}`,
      use: { ...b.use, viewport: { width: w.width, height: w.height }, hasTouch: false },
    })),
  ),
});
