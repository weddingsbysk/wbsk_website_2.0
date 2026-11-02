// Renders the tutorial film frame by frame with a real browser. Needs ffmpeg on this PC; nothing here
// runs online. Run from the repository root:
//   node apps/studio/tutorial-film/render.mjs --meta            write the chapters and captions
//   node apps/studio/tutorial-film/render.mjs --stills 5,20,60  save stills to check
//   node apps/studio/tutorial-film/render.mjs --frames [from to]  render the frames (seconds)
import { createReadStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = resolve(import.meta.dirname, "../../..");
const WORK = process.env.FILM_WORK ?? join(ROOT, "apps/studio/tutorial-film/.work");
const FPS = 30;
const WORKERS = 6;
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".webp": "image/webp", ".woff2": "font/woff2" };

const server = createServer((request, response) => {
  const file = join(ROOT, decodeURIComponent(new URL(request.url, "http://x").pathname));
  if (!file.startsWith(ROOT) || !existsSync(file)) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(response);
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const address = `http://127.0.0.1:${server.address().port}/apps/studio/tutorial-film/film.html`;

const browser = await chromium.launch();
async function openFilm() {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on("pageerror", (error) => console.error("page error:", error.message));
  await page.goto(address);
  await page.evaluate(() => window.filmReady);
  return page;
}

const [mode, ...rest] = process.argv.slice(2);
mkdirSync(WORK, { recursive: true });
const first = await openFilm();
const film = await first.evaluate(() => ({ duration: window.FILM.duration, captions: window.FILM.captions, chapters: window.FILM.chapters, cues: window.FILM.cues }));

if (mode === "--meta") {
  writeFileSync(join(WORK, "film.json"), JSON.stringify(film, null, 1));
  console.log(`duration ${film.duration.toFixed(1)}s, ${film.captions.length} captions, ${film.cues.length} cues`);
  for (const item of film.chapters) console.log(`${item.at.toFixed(1).padStart(6)}  ${item.title}`);
} else if (mode === "--stills") {
  const dir = join(WORK, "stills");
  mkdirSync(dir, { recursive: true });
  for (const time of rest[0].split(",").map(Number)) {
    await first.evaluate((value) => window.seekFilm(value), time);
    await first.screenshot({ path: join(dir, `${String(time).padStart(6, "0")}.jpg`), type: "jpeg", quality: 80 });
  }
} else if (mode === "--frames") {
  const from = Math.round((Number(rest[0] ?? 0)) * FPS);
  const to = Math.min(Math.round((Number(rest[1] ?? film.duration)) * FPS), Math.ceil(film.duration * FPS));
  const dir = join(WORK, "frames");
  mkdirSync(dir, { recursive: true });
  const size = Math.ceil((to - from) / WORKERS);
  let done = 0;
  await Promise.all(
    Array.from({ length: WORKERS }, async (_, index) => {
      const page = index === 0 ? first : await openFilm();
      const start = from + index * size;
      const stop = Math.min(start + size, to);
      for (let frame = start; frame < stop; frame += 1) {
        await page.evaluate((value) => window.seekFilm(value), frame / FPS);
        await page.screenshot({ path: join(dir, `${String(frame).padStart(6, "0")}.jpg`), type: "jpeg", quality: 95 });
        done += 1;
        if (done % 300 === 0) console.log(`${done} of ${to - from}`);
      }
    }),
  );
  console.log(`rendered ${to - from} frames`);
}

await browser.close();
server.close();
