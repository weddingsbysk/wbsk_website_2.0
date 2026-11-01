// The one way to delete files here: generated build and test output only.
import fs from "node:fs";

for (const dir of [
  "apps/web/out",
  "apps/web/out-lh",
  "apps/web/.next",
  "test-results",
  "playwright-report",
  ".lighthouseci",
]) {
  fs.rmSync(dir, { recursive: true, force: true });
}
