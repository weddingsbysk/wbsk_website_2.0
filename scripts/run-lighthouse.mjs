// Lighthouse serves files from the site root, so it needs its own build with no base path.
import { execSync } from "node:child_process";
import fs from "node:fs";

const run = (command, env = {}) =>
  execSync(command, { stdio: "inherit", env: { ...process.env, ...env } });

run("npm run build", { NEXT_PUBLIC_BASE_PATH: "" });
fs.rmSync("apps/web/out-lh", { recursive: true, force: true });
fs.cpSync("apps/web/out", "apps/web/out-lh", { recursive: true });
try {
  run("npx lhci autorun");
} finally {
  run("npm run build", { NEXT_PUBLIC_BASE_PATH: "/wbsk_website_2.0" });
}
