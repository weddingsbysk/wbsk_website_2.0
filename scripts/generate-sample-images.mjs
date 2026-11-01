// Plain generated tones labelled "Sample" plus a slot name. Never stock photos or real people (Decision 25).
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const out = path.resolve("apps/web/public/sample");
fs.mkdirSync(out, { recursive: true });

const samples = [
  {
    name: "hero-desktop",
    width: 2560,
    height: 1440,
    from: "#6b5442",
    to: "#2c2219",
    label: "Hero poster, desktop",
  },
  {
    name: "hero-phone",
    width: 1350,
    height: 2400,
    from: "#6b5442",
    to: "#2c2219",
    label: "Hero poster, phone",
  },
  {
    name: "team-wide",
    width: 3000,
    height: 1286,
    from: "#9a7f63",
    to: "#4b3c2e",
    label: "Team photo",
  },
];

for (const s of samples) {
  const size = Math.round(Math.min(s.width, s.height) * 0.024);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s.width}" height="${s.height}">
    <defs><radialGradient id="g" cx="62%" cy="38%" r="80%"><stop offset="0" stop-color="${s.from}"/><stop offset="1" stop-color="${s.to}"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="46%" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${size}" fill="#F5EFE6" fill-opacity="0.7">Sample: ${s.label}</text>
  </svg>`;
  await sharp(Buffer.from(svg))
    .jpeg({ quality: 72, mozjpeg: true })
    .toFile(path.join(out, `${s.name}.jpg`));
}
