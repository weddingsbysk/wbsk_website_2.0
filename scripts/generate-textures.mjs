// Run with: node scripts/generate-textures.mjs. Paper and dark textures, made from nothing but
// numbers: no stock images. Every one tiles without a seam, because all its noise wraps around.
import sharp from "sharp";

const SIZE = 512;
const OUT = "packages/ui/src/textures";

function random(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function periodicNoise(rand, cells) {
  const grid = Float32Array.from({ length: cells * cells }, () => rand());
  const smooth = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = (x / SIZE) * cells;
    const fy = (y / SIZE) * cells;
    const x0 = Math.floor(fx) % cells;
    const y0 = Math.floor(fy) % cells;
    const x1 = (x0 + 1) % cells;
    const y1 = (y0 + 1) % cells;
    const tx = smooth(fx - Math.floor(fx));
    const ty = smooth(fy - Math.floor(fy));
    const a = grid[y0 * cells + x0] * (1 - tx) + grid[y0 * cells + x1] * tx;
    const b = grid[y1 * cells + x0] * (1 - tx) + grid[y1 * cells + x1] * tx;
    return a * (1 - ty) + b * ty;
  };
}

function make({ seed, base, mottle, relief, grain, fibres, fibreLength, fibreStrength, weave = 0, weaveCells = 128 }) {
  const rand = random(seed);
  const layers = [
    [periodicNoise(rand, 5), 1],
    [periodicNoise(rand, 13), 0.55],
    [periodicNoise(rand, 37), 0.3],
  ];
  const tooth = [periodicNoise(rand, 160), periodicNoise(rand, 320)];
  const height = new Float32Array(SIZE * SIZE);
  const tone = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      let sum = 0;
      for (const [noise, weight] of layers) sum += noise(x, y) * weight;
      tone[y * SIZE + x] = sum / 1.85 - 0.5;
      let h = tooth[0](x, y) * 0.7 + tooth[1](x, y) * 0.5;
      if (weave) {
        const u = (x / SIZE) * weaveCells * 2 * Math.PI;
        const v = (y / SIZE) * weaveCells * 2 * Math.PI;
        h += (Math.sin(u) * (Math.sin(v / 2) > 0 ? 1 : 0.35) + Math.sin(v) * (Math.sin(u / 2) > 0 ? 0.35 : 1)) * weave;
      }
      height[y * SIZE + x] = h;
    }
  }
  // Fibres: short wandering strands pressed into the sheet, as in cotton paper.
  for (let i = 0; i < fibres; i += 1) {
    let x = rand() * SIZE;
    let y = rand() * SIZE;
    let angle = rand() * Math.PI * 2;
    const length = fibreLength * (0.4 + rand());
    const raised = (rand() > 0.35 ? 1 : -1) * fibreStrength * (0.4 + rand());
    for (let s = 0; s < length; s += 1) {
      angle += (rand() - 0.5) * 0.28;
      x += Math.cos(angle);
      y += Math.sin(angle);
      const px = ((Math.round(x) % SIZE) + SIZE) % SIZE;
      const py = ((Math.round(y) % SIZE) + SIZE) % SIZE;
      height[py * SIZE + px] += raised;
    }
  }
  const out = Buffer.alloc(SIZE * SIZE * 3);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const right = height[y * SIZE + ((x + 1) % SIZE)];
      const down = height[((y + 1) % SIZE) * SIZE + x];
      const here = height[y * SIZE + x];
      // Light from the top left, as on the record sleeves.
      const lit = (here - right + (here - down)) * relief;
      const speck = (rand() - 0.5) * grain;
      const shade = 1 + tone[y * SIZE + x] * mottle + lit + speck;
      const o = (y * SIZE + x) * 3;
      for (let c = 0; c < 3; c += 1) out[o + c] = Math.max(0, Math.min(255, base[c] * shade));
    }
  }
  return out;
}

const textures = {
  "paper-ivory": { seed: 11, base: [244, 238, 228], mottle: 0.02, relief: 0.06, grain: 0.012, fibres: 1500, fibreLength: 30, fibreStrength: 0.22 },
  "paper-dusk": { seed: 23, base: [33, 27, 21], mottle: 0.1, relief: 0.5, grain: 0.05, fibres: 700, fibreLength: 24, fibreStrength: 0.16, weave: 0.15 },
  "card-stock": { seed: 37, base: [254, 251, 245], mottle: 0.01, relief: 0.075, grain: 0.01, fibres: 1500, fibreLength: 18, fibreStrength: 0.22 },
};

for (const [name, settings] of Object.entries(textures)) {
  const raw = make(settings);
  const info = await sharp(raw, { raw: { width: SIZE, height: SIZE, channels: 3 } }).webp({ quality: 86, effort: 6, preset: "photo", smartSubsample: true }).toFile(`${OUT}/${name}.webp`);
  console.log(name, Math.round(info.size / 1024), "KB");
}
