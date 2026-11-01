import next from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [
      "**/.next/**",
      "**/out/**",
      "**/node_modules/**",
      ".lighthouseci/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  ...next,
  { settings: { next: { rootDir: "apps/web" } }, rules: { "@next/next/no-img-element": "off" } },
];

export default config;
