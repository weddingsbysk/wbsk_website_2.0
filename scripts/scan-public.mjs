// Runs before every push and in CI: nothing private may reach this public repository.
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const privateFolder = ["wbsk", "planning"].join("-");
const phrasesFile =
  process.env.WBSK_SCAN_PHRASES ??
  path.resolve("..", privateFolder, "docs", "public-scan-phrases.txt");

// Fingerprints only, so this file reveals nothing: the draft logo and the reference screenshot.
const bannedFiles = new Set([
  "8bad8804a2879d5dca5dc0f67b68b532426fe9f76d7175899c3c37a9d8ac82c4",
  "c7df07e667c520432b1bda7fce86bfd21400c305279857c29f0bc0c8e1f92cef",
]);
const secretPatterns = [
  /ghp_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /sk-[A-Za-z0-9]{20,}/,
  /AIza[A-Za-z0-9_-]{30,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /sanity[_-]?(?:api[_-]?)?token\s*[:=]\s*["'][^"']{10,}/i,
];
const email = /[A-Za-z0-9._%+-]+@(?:gmail|yahoo|outlook|hotmail)\.com/;
const internalNames =
  /(TRANSFER-MANIFEST|BUILD-LOG|IMPLEMENTATION-PLAN|WBSK-DESIGN-\d\d|WBSK-MASTER-PROMPT)/;

const phrases = fs.existsSync(phrasesFile)
  ? fs
      .readFileSync(phrasesFile, "utf8")
      .split("\n")
      .map((l) => l.trim().toLowerCase())
      .filter((l) => l && !l.startsWith("#"))
  : [];
if (!phrases.length)
  console.log("Private phrase list not available here; running the other checks.");

const files = execSync("git ls-files --cached --others --exclude-standard", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);
const problems = [];
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const data = fs.readFileSync(file);
  if (bannedFiles.has(createHash("sha256").update(data).digest("hex")))
    problems.push(`${file}: private image`);
  if (internalNames.test(file)) problems.push(`${file}: internal file name`);
  if (data.includes(0) || file === "scripts/scan-public.mjs" || file === "package-lock.json")
    continue;
  const text = data.toString("utf8");
  const lower = text.toLowerCase();
  for (const p of secretPatterns)
    if (p.test(text)) problems.push(`${file}: looks like a secret (${p.source.slice(0, 16)}…)`);
  if (email.test(text)) problems.push(`${file}: personal email address`);
  if (internalNames.test(text)) problems.push(`${file}: mentions an internal document`);
  for (const phrase of phrases)
    if (lower.includes(phrase)) problems.push(`${file}: private wording ("${phrase}")`);
}
for (const required of ["CLAUDE.md", ".claude"]) {
  if (files.some((f) => f === required || f.startsWith(`${required}/`)))
    problems.push(`${required} must stay out of this repository`);
}
if (files.some((f) => path.basename(f) === "CNAME"))
  problems.push(
    "A CNAME file would point a domain here. Launch needs the owner's separate approval.",
  );

if (problems.length) {
  console.error(`Public-repo scan failed:\n${[...new Set(problems)].join("\n")}`);
  process.exit(1);
}
console.log(
  `Public-repo scan clean: ${files.length} files, ${phrases.length} private phrases checked.`,
);
