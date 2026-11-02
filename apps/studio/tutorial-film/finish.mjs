// Joins the rendered frames and the soundtrack into the film the Studio plays, and fails if it's over
// the owner's 20MB limit. Needs ffmpeg. Run after render.mjs --frames and music.mjs:
//   FILM_WORK=<folder> node apps/studio/tutorial-film/finish.mjs
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const WORK = process.env.FILM_WORK ?? join(ROOT, "apps/studio/tutorial-film/.work");
const OUT = join(ROOT, "apps/studio/src/tutorials");
const FILM = join(ROOT, "apps/web/public/tutorial/using-wbsk-studio.mp4");
const LIMIT = 20 * 1024 * 1024;
const VIDEO_KBPS = process.env.VIDEO_KBPS ?? "925";
const AUDIO_KBPS = "96";
mkdirSync(OUT, { recursive: true });

const film = JSON.parse(readFileSync(join(WORK, "film.json"), "utf8"));
const run = (...args) => execFileSync("ffmpeg", ["-y", "-v", "error", ...args], { stdio: "inherit", cwd: WORK });
const frames = ["-framerate", "30", "-i", "frames/%06d.jpg"];
const video = ["-c:v", "libx264", "-preset", "veryslow", "-tune", "animation", "-b:v", `${VIDEO_KBPS}k`, "-vf", "scale=in_range=full:out_range=tv,format=yuv420p", "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-g", "150", "-x264-params", "aq-mode=3:aq-strength=1.1"];

run(...frames, ...video, "-pass", "1", "-passlogfile", "pass", "-an", "-f", "null", "/dev/null");
run(...frames, "-i", "music.wav", ...video, "-pass", "2", "-passlogfile", "pass", "-af", "loudnorm=I=-17:TP=-1.5:LRA=9", "-c:a", "aac", "-b:a", `${AUDIO_KBPS}k`, "-ar", "44100", "-shortest", "-movflags", "+faststart", FILM);
run("-i", "frames/000258.jpg", "-q:v", "4", "-vf", "scale=1280:-1", join(OUT, "using-wbsk-studio.jpg"));
writeFileSync(join(OUT, "using-wbsk-studio.json"), `${JSON.stringify({ duration: film.duration, chapters: film.chapters, captions: film.captions.map(({ start, text }) => ({ start, text })) }, null, 1)}\n`);

const size = statSync(FILM).size;
console.log(`film is ${(size / 1024 / 1024).toFixed(2)} MB`);
if (size >= LIMIT) throw new Error("The film is over the 20MB limit; lower VIDEO_KBPS.");
