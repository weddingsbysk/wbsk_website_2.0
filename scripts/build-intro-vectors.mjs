// Traces the opening logo from the owner's lossless 4K master into vector outlines, and reads its
// timing from the approved clip, so the intro is sharp on any screen. Run by hand, only if the master
// changes. The master and the timing clip stay outside this repository (the clip is kept in the private
// planning folder, docs/checkins/intro-vector):
//   node scripts/build-intro-vectors.mjs "<master.mov>" <timing-clip.mp4> <shapes.json> <motion.json>
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const [master, clip, shapesOut, motionOut] = process.argv.slice(2);
const W = 2640;
const H = 200;
const CROP = `crop=${W}:${H}:600:980`;
const OPEN_AT = 2.2;
const CLOSED_AT = 0.2;
const LEVEL = 127.5;
const TOLERANCE = 0.14;
const SAMPLE_EVERY = 3;

const rgba = (at) =>
  execFileSync("ffmpeg", ["-v", "error", "-ss", String(at), "-i", master, "-frames:v", "1", "-vf", `${CROP},format=rgba`, "-f", "rawvideo", "-pix_fmt", "rgba", "-"], { maxBuffer: 1 << 28 });

const alphaOf = (frame) => {
  const alpha = new Float32Array(W * H);
  for (let i = 0; i < W * H; i += 1) alpha[i] = frame[i * 4 + 3];
  return alpha;
};

/** Runs of occupied columns, split wherever at least `gap` empty columns separate them. */
function runs(alpha, gap, from = 0, to = W) {
  const found = [];
  let start = -1;
  let last = -1;
  for (let x = from; x < to; x += 1) {
    let used = false;
    for (let y = 0; y < H && !used; y += 1) used = alpha[y * W + x] > 40;
    if (!used) continue;
    if (start < 0) start = x;
    else if (x - last > gap) {
      found.push([start, last + 1]);
      start = x;
    }
    last = x;
  }
  if (start >= 0) found.push([start, last + 1]);
  return found;
}

/** Marching squares at half coverage: the antialiased edge gives positions finer than a pixel. */
function contours(alpha, from, to) {
  const at = (x, y) => (x < from || x >= to || y < 0 || y >= H ? 0 : alpha[y * W + x]);
  const cross = (a, b) => (LEVEL - a) / (b - a);
  const segments = new Map();
  const key = (p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
  const link = (a, b) => segments.set(key(a), { from: a, to: b });
  for (let y = -1; y < H; y += 1) {
    for (let x = from - 1; x < to; x += 1) {
      const tl = at(x, y);
      const tr = at(x + 1, y);
      const br = at(x + 1, y + 1);
      const bl = at(x, y + 1);
      const code = (tl > LEVEL ? 8 : 0) | (tr > LEVEL ? 4 : 0) | (br > LEVEL ? 2 : 0) | (bl > LEVEL ? 1 : 0);
      if (code === 0 || code === 15) continue;
      const top = () => [x + cross(tl, tr), y];
      const right = () => [x + 1, y + cross(tr, br)];
      const bottom = () => [x + cross(bl, br), y + 1];
      const left = () => [x, y + cross(tl, bl)];
      const middle = (tl + tr + br + bl) / 4;
      switch (code) {
        case 1: link(left(), bottom()); break;
        case 2: link(bottom(), right()); break;
        case 3: link(left(), right()); break;
        case 4: link(right(), top()); break;
        case 5:
          if (middle > LEVEL) { link(left(), top()); link(right(), bottom()); }
          else { link(left(), bottom()); link(right(), top()); }
          break;
        case 6: link(bottom(), top()); break;
        case 7: link(left(), top()); break;
        case 8: link(top(), left()); break;
        case 9: link(top(), bottom()); break;
        case 10:
          if (middle > LEVEL) { link(top(), right()); link(bottom(), left()); }
          else { link(top(), left()); link(bottom(), right()); }
          break;
        case 11: link(top(), right()); break;
        case 12: link(right(), left()); break;
        case 13: link(right(), bottom()); break;
        case 14: link(bottom(), left()); break;
        default: break;
      }
    }
  }
  const loops = [];
  while (segments.size) {
    const [firstKey, first] = segments.entries().next().value;
    segments.delete(firstKey);
    const loop = [first.from];
    let next = first.to;
    while (next) {
      loop.push(next);
      const k = key(next);
      const seg = segments.get(k);
      if (!seg) break;
      segments.delete(k);
      next = seg.to;
    }
    if (loop.length > 4) loops.push(loop);
  }
  return loops;
}

function simplify(points, tolerance) {
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let far = -1;
    let most = tolerance;
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const length = Math.hypot(bx - ax, by - ay) || 1;
    for (let i = a + 1; i < b; i += 1) {
      const distance = Math.abs((bx - ax) * (ay - points[i][1]) - (ax - points[i][0]) * (by - ay)) / length;
      if (distance > most) { most = distance; far = i; }
    }
    if (far >= 0) {
      keep[far] = 1;
      stack.push([a, far], [far, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

const trim = (value) => String(+value.toFixed(1));
function toPath(loops, originX) {
  return loops
    .map((loop) => {
      // A closed loop has no natural end for the simplifier, so it's split at its far point.
      const body = loop.slice(0, -1);
      const far = body.reduce((best, p, i) => (Math.hypot(p[0] - body[0][0], p[1] - body[0][1]) > Math.hypot(body[best][0] - body[0][0], body[best][1] - body[0][1]) ? i : best), 0);
      const half = [...simplify(body.slice(0, far + 1), TOLERANCE), ...simplify([...body.slice(far), body[0]], TOLERANCE).slice(1, -1)];
      return `M${half.map((p) => `${trim(p[0] - originX)} ${trim(p[1])}`).join("L")}Z`;
    })
    .join("");
}

const open = alphaOf(rgba(OPEN_AT));
const closed = alphaOf(rgba(CLOSED_AT));

// The four words are the widest gaps in the open frame.
const pieces = runs(open, 1);
const gaps = pieces.slice(1).map((piece, i) => ({ at: i + 1, size: piece[0] - pieces[i][1] }));
const cuts = gaps.sort((a, b) => b.size - a.size).slice(0, 3).map((g) => g.at).sort((a, b) => a - b);
const groups = [pieces.slice(0, cuts[0]), pieces.slice(cuts[0], cuts[1]), pieces.slice(cuts[1], cuts[2]), pieces.slice(cuts[2])];
const closedRuns = runs(closed, 0);
const closedLeft = closedRuns[0][0];
const closedRight = closedRuns.at(-1)[1];
console.log("open pieces", pieces.length, "word spans", groups.map((g) => [g[0][0], g.at(-1)[1]]), "closed", closedLeft, closedRight, "closed runs", closedRuns);

const words = groups.map((group, index) => {
  const start = group[0][0];
  const end = group.at(-1)[1];
  const path = toPath(contours(open, start - 2, end + 2), start);
  return { name: ["W", "B", "S", "K"][index], start, end, initialEnd: group[0][1], path };
});
const closedLetters = [];
{
  // Each closed letter's left edge is read by matching its open shape against the closed frame.
  for (const word of words) {
    const width = word.initialEnd - word.start;
    let best = 0;
    let bestScore = Infinity;
    for (let x = closedLeft - 4; x <= closedRight - width + 4; x += 1) {
      let score = 0;
      for (let y = 0; y < H; y += 2) for (let c = 0; c < width; c += 1) score += Math.abs(open[y * W + word.start + c] - closed[y * W + x + c]);
      if (score < bestScore) { bestScore = score; best = x; }
    }
    closedLetters.push(best);
  }
}
console.log("initial widths", words.map((w) => w.initialEnd - w.start), "closed lefts", closedLetters);

// Timing comes from the clip already approved: how far the name has opened on each of its frames.
const gray = execFileSync("ffmpeg", ["-v", "error", "-i", clip, "-f", "rawvideo", "-pix_fmt", "gray", "-"], { maxBuffer: 1 << 30 });
const frames = gray.length / (W * H);
const openWidth = groups[3].at(-1)[1] - groups[0][0][0];
const closedWidth = closedRight - closedLeft;
const progress = [];
for (let f = 0; f < frames; f += 1) {
  let min = W;
  let max = 0;
  for (let x = 0; x < W; x += 1) {
    for (let y = 0; y < H; y += 1) {
      if (gray[f * W * H + y * W + x] > 90) {
        if (x < min) min = x;
        if (x > max) max = x;
        break;
      }
    }
  }
  progress.push(Math.max(0, Math.min(1, (max - min - closedWidth) / (openWidth - closedWidth))));
}
console.log("clip frames", frames, "progress sample", progress.filter((_, i) => i % 15 === 0).map((p) => p.toFixed(3)).join(" "));

const smooth = (values, reach = 2) =>
  values.map((_, i) => {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - reach); j <= Math.min(values.length - 1, i + reach); j += 1) { sum += values[j]; count += 1; }
    return sum / count;
  });

// Each word keeps its own pace. On every frame of the approved clip, the three widest gaps nearest
// where they last were mark where the four words begin and end.
const columnsOf = (frame) => {
  const used = new Uint8Array(W);
  for (let x = 0; x < W; x += 1) for (let y = 0; y < H; y += 1) if (gray[frame * W * H + y * W + x] > 48) { used[x] = 1; break; }
  return used;
};
let lastGaps = [0, 1, 2].map((i) => (words[i].end + words[i + 1].start) / 2);
const edges = Array.from({ length: frames }, (_, f) => {
  const used = columnsOf(f);
  const left = used.indexOf(1);
  const right = used.lastIndexOf(1) + 1;
  const gaps = [];
  let start = -1;
  for (let x = left; x < right; x += 1) {
    if (!used[x] && start < 0) start = x;
    if (used[x] && start >= 0) { gaps.push({ from: start, to: x, size: x - start }); start = -1; }
  }
  const chosen = lastGaps.map((expected, i) => {
    const near = gaps.filter((gap) => gap.size >= 4 && Math.abs((gap.from + gap.to) / 2 - expected) < 70);
    return near.reduce((best, gap) => (!best || gap.size > best.size ? gap : best), null) ?? { from: expected, to: expected, size: 0 };
  });
  lastGaps = chosen.map((gap) => (gap.from + gap.to) / 2);
  return {
    lefts: [left, chosen[0].to, chosen[1].to, chosen[2].to],
    ends: [chosen[0].from, chosen[1].from, chosen[2].from, right],
  };
});
const settle = (values) => {
  const out = [...values];
  for (let f = 1; f < out.length; f += 1) out[f] = Math.min(out[f], out[f - 1]);
  const steady = smooth(out);
  steady[0] = 1;
  steady[steady.length - 1] = 0;
  return steady;
};
// A word may overshoot where it closes and settle back, as the S does, so this isn't clamped.
const spreads = words.map((word, index) => {
  const steady = smooth(smooth(edges.map(({ lefts }) => (lefts[index] - closedLetters[index]) / (word.start - closedLetters[index]))));
  steady[0] = 1;
  steady[steady.length - 1] = 0;
  return steady;
});
const reveal = words.map((word, index) => {
  const initial = word.initialEnd - word.start;
  return settle(edges.map(({ lefts, ends }) => Math.max(0, Math.min(1, (ends[index] - lefts[index] - initial) / (word.end - word.start - initial)))));
});

const sample = (values) => {
  const out = [];
  for (let f = 0; f < frames; f += SAMPLE_EVERY) out.push(+values[f].toFixed(4));
  if ((frames - 1) % SAMPLE_EVERY) out.push(+values[frames - 1].toFixed(4));
  return out;
};

writeFileSync(shapesOut, `${JSON.stringify(words.map((word, index) => ({ name: word.name, gold: index === 1, openX: word.start, closedX: closedLetters[index], width: word.end - word.start, initial: word.initialEnd - word.start, path: word.path })))}\n`);
writeFileSync(
  motionOut,
  `${JSON.stringify({
    seconds: +(frames / 120).toFixed(3),
    words: words.map((word, index) => ({ openX: word.start, closedX: closedLetters[index], width: word.end - word.start, initial: word.initialEnd - word.start, spread: sample(spreads[index]), reveal: sample(reveal[index]) })),
  })}\n`,
);
console.log("bytes", Buffer.byteLength(words.map((w) => w.path).join("")));
