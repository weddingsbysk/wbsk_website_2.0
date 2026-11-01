/**
 * The record and sleeve, drawn in code (Decision 09, Route A). The grooves and five card stocks are
 * drawn once and shared, so six or sixteen destinations cost about the same. Only the small label
 * is drawn per destination.
 */

const RECORD_SIZE = 800;
const SLEEVE_SIZE = 720;
const LABEL_SIZE = 280;
/** The label's radius as a share of the record's. */
export const LABEL_SHARE = 0.33;

const CARD_TONES: [number, number, number][] = [
  [232, 222, 205],
  [228, 217, 198],
  [234, 225, 210],
  [226, 214, 194],
  [231, 220, 202],
];

/** A small repeatable random, so a destination's card looks the same on every visit. */
function seededRandom(seed: number) {
  let state = seed >>> 0 || 1;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
  return (low: number, high: number) => low + next() * (high - low);
}

function makeCanvas(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  return { canvas, x: canvas.getContext("2d")! };
}

function toUrl(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<string>((resolve) => {
    canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : ""), "image/jpeg", quality);
  });
}

/** Grooves with track gaps and a varying density, grain, hairline scratches and dust. */
export function drawRecord() {
  const N = RECORD_SIZE;
  const { canvas, x } = makeCanvas(N);
  const rand = seededRandom(33);
  const R = N / 2;
  const C = N / 2;
  x.fillStyle = "#0A0908";
  x.fillRect(0, 0, N, N);
  x.beginPath();
  x.arc(C, C, R, 0, Math.PI * 2);
  x.clip();

  const base = x.createRadialGradient(C, C, R * 0.3, C, C, R);
  base.addColorStop(0, "#151311");
  base.addColorStop(1, "#0A0908");
  x.fillStyle = base;
  x.fillRect(0, 0, N, N);

  const gaps = [0.5, 0.6, 0.7, 0.8, 0.885];
  const edges = [0.37, ...gaps, 0.96];
  const levels = edges.map(() => rand(0.7, 1.35));
  for (let r = R * 0.37; r < R * 0.955; r += 1) {
    const t = r / R;
    const inGap = gaps.some((gap) => Math.abs(t - gap) < 0.0065);
    let band = 0;
    for (let b = 0; b < edges.length - 1; b += 1) {
      if (t >= edges[b]! && t < edges[b + 1]!) band = b;
    }
    const loud = levels[band]! * (0.82 + 0.3 * Math.sin(r * 0.09 + band * 2.1));
    x.lineWidth = inGap ? 1.6 : 0.6;
    x.strokeStyle = inGap
      ? "rgba(235,225,210,0.02)"
      : `rgba(235,225,210,${rand(0.025, 0.07) * loud})`;
    x.beginPath();
    x.arc(C, C, r, 0, Math.PI * 2);
    x.stroke();
  }

  // The smooth run-out near the label, and the rounded outer edge.
  const runout = x.createRadialGradient(C, C, R * 0.33, C, C, R * 0.37);
  runout.addColorStop(0, "rgba(30,27,24,1)");
  runout.addColorStop(1, "rgba(30,27,24,0)");
  x.fillStyle = runout;
  x.beginPath();
  x.arc(C, C, R * 0.37, 0, Math.PI * 2);
  x.fill();
  x.lineWidth = R * 0.045;
  x.strokeStyle = "rgba(255,255,255,0.035)";
  x.beginPath();
  x.arc(C, C, R * 0.977, 0, Math.PI * 2);
  x.stroke();
  x.lineWidth = 2;
  x.strokeStyle = "rgba(255,255,255,0.14)";
  x.beginPath();
  x.arc(C, C, R - 2, 0, Math.PI * 2);
  x.stroke();

  for (let i = 0; i < 3500; i += 1) {
    const angle = rand(0, Math.PI * 2);
    const radius = rand(R * 0.37, R * 0.97);
    x.fillStyle = `rgba(240,232,220,${rand(0.012, 0.035)})`;
    x.fillRect(C + Math.cos(angle) * radius, C + Math.sin(angle) * radius, 1, 1);
  }
  for (let i = 0; i < 7; i += 1) {
    const start = rand(0, Math.PI * 2);
    x.strokeStyle = `rgba(240,232,220,${rand(0.04, 0.1)})`;
    x.lineWidth = rand(0.5, 1.1);
    x.beginPath();
    x.arc(
      C + rand(-R * 0.06, R * 0.06),
      C + rand(-R * 0.06, R * 0.06),
      rand(R * 0.42, R * 0.93),
      start,
      start + rand(0.08, 0.45),
    );
    x.stroke();
  }
  for (let i = 0; i < 45; i += 1) {
    const angle = rand(0, Math.PI * 2);
    const radius = rand(R * 0.38, R * 0.95);
    x.fillStyle = `rgba(240,232,220,${rand(0.06, 0.18)})`;
    x.beginPath();
    x.arc(C + Math.cos(angle) * radius, C + Math.sin(angle) * radius, rand(0.5, 1.4), 0, Math.PI * 2);
    x.fill();
  }
  return toUrl(canvas, 0.9);
}

let cardFibres: HTMLCanvasElement | null = null;

/** One small tile of grain, repeated across every card, in place of per-pixel noise on each. */
function fibreTile() {
  if (cardFibres) return cardFibres;
  const { canvas, x } = makeCanvas(256);
  const rand = seededRandom(7);
  const image = x.createImageData(256, 256);
  for (let i = 0; i < image.data.length; i += 4) {
    const value = rand(0, 1) < 0.5 ? 0 : 255;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = value;
    image.data[i + 3] = rand(0, 12);
  }
  x.putImageData(image, 0, 0);
  cardFibres = canvas;
  return canvas;
}

/** Uncoated card: fibres, light from the top left, a worn ring, scuffs, flaps, foil WBSK. */
export function drawSleeve(toneIndex: number, serif: string) {
  const N = SLEEVE_SIZE;
  const { canvas, x } = makeCanvas(N);
  const rand = seededRandom(101 + toneIndex * 97);
  x.fillStyle = `rgb(${CARD_TONES[toneIndex % CARD_TONES.length]!.join(",")})`;
  x.fillRect(0, 0, N, N);
  x.fillStyle = x.createPattern(fibreTile(), "repeat")!;
  x.fillRect(0, 0, N, N);

  for (let i = 0; i < 700; i += 1) {
    const fx = rand(0, N);
    const fy = rand(0, N);
    const length = rand(3, 14);
    const angle = rand(0, Math.PI);
    x.strokeStyle = `rgba(110,90,65,${rand(0.025, 0.07)})`;
    x.lineWidth = rand(0.4, 1);
    x.beginPath();
    x.moveTo(fx, fy);
    x.lineTo(fx + Math.cos(angle) * length, fy + Math.sin(angle) * length);
    x.stroke();
  }

  const light = x.createLinearGradient(0, 0, N, N);
  light.addColorStop(0, "rgba(255,252,245,0.18)");
  light.addColorStop(0.55, "rgba(255,252,245,0)");
  light.addColorStop(1, "rgba(60,42,25,0.12)");
  x.fillStyle = light;
  x.fillRect(0, 0, N, N);

  const ring = x.createRadialGradient(N / 2, N / 2, N * 0.4, N / 2, N / 2, N * 0.47);
  ring.addColorStop(0, "rgba(90,68,45,0)");
  ring.addColorStop(0.75, `rgba(90,68,45,${rand(0.06, 0.1)})`);
  ring.addColorStop(1, "rgba(90,68,45,0)");
  x.fillStyle = ring;
  x.fillRect(0, 0, N, N);
  x.strokeStyle = "rgba(255,255,255,0.10)";
  x.lineWidth = 3;
  x.beginPath();
  x.arc(N / 2 - 3, N / 2 - 3, N * 0.452, Math.PI * 0.9, Math.PI * 1.6);
  x.stroke();

  // Glue flaps on the left and bottom.
  x.strokeStyle = "rgba(80,60,40,0.10)";
  x.lineWidth = 1.2;
  x.beginPath();
  x.moveTo(N * 0.018, 0);
  x.lineTo(N * 0.018, N);
  x.moveTo(0, N * 0.982);
  x.lineTo(N, N * 0.982);
  x.stroke();

  // Scuffed edges and rubbed corners.
  for (let i = 0; i < 140; i += 1) {
    const side = Math.floor(rand(0, 4));
    const along = rand(0, N);
    const length = rand(4, 22);
    const inset = rand(0, 3);
    x.strokeStyle = `rgba(255,252,246,${rand(0.15, 0.4)})`;
    x.lineWidth = rand(0.6, 1.6);
    x.beginPath();
    if (side === 0) {
      x.moveTo(along, inset);
      x.lineTo(along + length, inset);
    } else if (side === 1) {
      x.moveTo(along, N - inset);
      x.lineTo(along + length, N - inset);
    } else if (side === 2) {
      x.moveTo(inset, along);
      x.lineTo(inset, along + length);
    } else {
      x.moveTo(N - inset, along);
      x.lineTo(N - inset, along + length);
    }
    x.stroke();
  }
  for (const [cx, cy] of [
    [0, 0],
    [N, 0],
    [0, N],
    [N, N],
  ] as const) {
    const corner = x.createRadialGradient(cx, cy, 0, cx, cy, N * rand(0.03, 0.06));
    corner.addColorStop(0, "rgba(255,251,244,0.55)");
    corner.addColorStop(1, "rgba(255,251,244,0)");
    x.fillStyle = corner;
    x.fillRect(0, 0, N, N);
  }

  // A faint crease or two.
  for (let i = 0; i < 2; i += 1) {
    const y = rand(N * 0.1, N * 0.9);
    x.strokeStyle = "rgba(90,70,50,0.05)";
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(rand(0, N * 0.3), y);
    x.lineTo(rand(N * 0.5, N), y + rand(-N * 0.2, N * 0.2));
    x.stroke();
  }

  // The shaded opening on the right edge.
  const opening = x.createLinearGradient(N - 16, 0, N, 0);
  opening.addColorStop(0, "rgba(40,28,18,0)");
  opening.addColorStop(1, "rgba(40,28,18,0.45)");
  x.fillStyle = opening;
  x.fillRect(N - 16, 0, 16, N);
  x.fillStyle = "rgba(30,20,12,0.55)";
  x.fillRect(N - 2, 0, 2, N);

  const foil = x.createLinearGradient(0, N * 0.9, 0, N * 0.95);
  foil.addColorStop(0, "#F0D58A");
  foil.addColorStop(0.5, "#C8962E");
  foil.addColorStop(1, "#E9C66B");
  x.fillStyle = foil;
  x.font = `500 ${N * 0.032}px ${serif}`;
  if ("letterSpacing" in x) x.letterSpacing = `${N * 0.004}px`;
  x.fillText("WBSK", N * 0.055, N * 0.945);
  return toUrl(canvas, 0.88);
}

/** Deep-brown paper, a thin gold ring, the destination's name in gold (Decision 09). */
export function drawLabel(name: string, catalogue: string, serif: string, sans: string) {
  const N = LABEL_SIZE;
  const { canvas, x } = makeCanvas(N);
  const rand = seededRandom(name.length * 131 + 3);
  const C = N / 2;
  const L = N / 2;
  // Sizes below were set against the record's radius, of which the label is a third.
  const R = L / LABEL_SHARE;

  const paper = x.createRadialGradient(C - L * 0.3, C - L * 0.3, L * 0.1, C, C, L);
  paper.addColorStop(0, "#3A2D21");
  paper.addColorStop(1, "#271D15");
  x.fillStyle = paper;
  x.beginPath();
  x.arc(C, C, L, 0, Math.PI * 2);
  x.fill();
  for (let i = 0; i < 500; i += 1) {
    const angle = rand(0, Math.PI * 2);
    const radius = Math.sqrt(rand(0, 1)) * L;
    x.fillStyle = `rgba(255,240,220,${rand(0.01, 0.04)})`;
    x.fillRect(C + Math.cos(angle) * radius, C + Math.sin(angle) * radius, 1, 1);
  }
  x.strokeStyle = "rgba(221,175,58,0.55)";
  x.lineWidth = 1;
  x.beginPath();
  x.arc(C, C, L * 0.93, 0, Math.PI * 2);
  x.stroke();

  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillStyle = "#DDAF3A";
  const tracked = (text: string, size: number, y: number, weight: number, alpha: number, gap: number) => {
    x.globalAlpha = alpha;
    x.font = `${weight} ${size}px ${sans}`;
    if ("letterSpacing" in x) x.letterSpacing = `${gap}px`;
    x.fillText(text, C, y);
    if ("letterSpacing" in x) x.letterSpacing = "0px";
    x.globalAlpha = 1;
  };
  tracked("WBSK", R * 0.034, C - L * 0.62, 500, 0.85, R * 0.012);

  // Long names shrink to stay inside the label, rather than running into its ring.
  const title = name.toUpperCase();
  let size = R * 0.12;
  x.font = `500 ${size}px ${serif}`;
  const widest = L * 1.56;
  const measured = x.measureText(title).width;
  if (measured > widest) size *= widest / measured;
  x.font = `500 ${size}px ${serif}`;
  x.fillText(title, C, C - L * 0.12);

  tracked("PRE-WEDDING", R * 0.026, C + L * 0.24, 500, 0.8, R * 0.01);
  tracked(catalogue, R * 0.018, C + L * 0.43, 400, 0.6, R * 0.006);
  tracked("SIDE A  ·  33⅓ RPM", R * 0.022, C + L * 0.62, 400, 0.65, R * 0.006);

  x.fillStyle = "#050505";
  x.beginPath();
  x.arc(C, C, R * 0.022, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = "rgba(221,175,58,0.35)";
  x.lineWidth = 1;
  x.beginPath();
  x.arc(C, C, R * 0.026, 0, Math.PI * 2);
  x.stroke();
  return canvas;
}
