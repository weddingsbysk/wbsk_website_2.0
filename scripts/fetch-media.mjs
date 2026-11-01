// Decisions 04 and 08: at each rebuild, the current cover videos are copied from the Studio onto the
// site's hosting, so visitors download them from there. Only the current ones are kept.
import { mkdirSync, readdirSync, rmSync, statSync, createWriteStream, existsSync } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const dir = "apps/web/public/media";
const query = `{
  "home": *[_id == "homepage"][0]{ "a": heroVideoDesktop.asset->url, "b": heroVideoPhone.asset->url },
  "pre": *[_id == "preWeddingPage"][0]{ "a": coverVideoDesktop.asset->url, "b": coverVideoPhone.asset->url }
}`;
const response = await fetch(
  `https://80o0qshj.api.sanity.io/v2026-11-01/data/query/production?query=${encodeURIComponent(query)}`,
);
if (!response.ok) throw new Error(`Couldn't read the Studio: ${response.status}`);
const { result } = await response.json();
const urls = [result.home?.a, result.home?.b, result.pre?.a, result.pre?.b].filter(Boolean);

mkdirSync(dir, { recursive: true });
const wanted = new Set(urls.map((url) => path.basename(new URL(url).pathname)));
for (const file of readdirSync(dir)) if (!wanted.has(file)) rmSync(path.join(dir, file));

for (const url of urls) {
  const name = path.basename(new URL(url).pathname);
  const target = path.join(dir, name);
  if (existsSync(target) && statSync(target).size > 0) continue;
  const download = await fetch(url);
  if (!download.ok || !download.body) throw new Error(`Couldn't download ${name}: ${download.status}`);
  await pipeline(Readable.fromWeb(download.body), createWriteStream(target));
}
console.log(`Cover videos ready: ${urls.length}.`);
