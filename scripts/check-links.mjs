// Every internal link, image and script in the built pages must lead to a real file.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("apps/web/out");
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const pages = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".html")) pages.push(p);
  }
};
walk(root);

const broken = [];
for (const page of pages) {
  const html = fs.readFileSync(page, "utf8");
  for (const match of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
    let target = match[1].split("#")[0].split("?")[0];
    if (!target) continue;
    if (base && !target.startsWith(base)) {
      broken.push(`${path.relative(root, page)} -> ${match[1]} (misses the base path)`);
      continue;
    }
    target = decodeURIComponent(target.slice(base.length));
    const file = path.join(root, target);
    const exists =
      fs.existsSync(file) &&
      (fs.statSync(file).isFile() || fs.existsSync(path.join(file, "index.html")));
    if (!exists) broken.push(`${path.relative(root, page)} -> ${match[1]}`);
  }
}
if (broken.length) {
  console.error(`Broken links:\n${[...new Set(broken)].join("\n")}`);
  process.exit(1);
}
console.log(`Links fine across ${pages.length} pages.`);
