// New dependencies need the owner's approval, so an unapproved package fails the build.
import fs from "node:fs";

const approved = new Set([
  "next",
  "react",
  "react-dom",
  "gsap",
  "@wbsk/ui",
  "@wbsk/content",
  "typescript",
  "@types/node",
  "@types/react",
  "@types/react-dom",
  "tailwindcss",
  "@tailwindcss/postcss",
  "eslint",
  "eslint-config-next",
  "prettier",
  "vitest",
  "@playwright/test",
  "@axe-core/playwright",
  "@lhci/cli",
  "sharp",
  "@fontsource-variable/bodoni-moda",
  "@fontsource-variable/hanken-grotesk",
]);
const banned =
  /^(framer-motion|motion|@radix-ui\/|@shadcn|shadcn|three$|tailwindcss-animate|lenis)/;

const problems = [];
for (const file of [
  "package.json",
  "apps/web/package.json",
  "packages/ui/package.json",
  "packages/content/package.json",
]) {
  const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const name of Object.keys({
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.peerDependencies,
  })) {
    if (banned.test(name)) problems.push(`${file}: ${name} is not allowed`);
    else if (!approved.has(name)) problems.push(`${file}: ${name} isn't approved yet`);
  }
}
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("Dependencies all approved.");
