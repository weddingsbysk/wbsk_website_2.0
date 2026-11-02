// The film's soundtrack, written note by note so nothing is licensed from anyone: warm pads, plucked
// strings, a light beat, and sound effects timed from the film's own cues. Writes a WAV.
//   node apps/studio/tutorial-film/music.mjs <film.json> <out.wav>
import { readFileSync, writeFileSync } from "node:fs";

const [input, output] = process.argv.slice(2);
const film = JSON.parse(readFileSync(input, "utf8"));
const RATE = 44100;
const LENGTH = Math.ceil((film.duration + 0.5) * RATE);
const music = [new Float32Array(LENGTH), new Float32Array(LENGTH)];
const fx = [new Float32Array(LENGTH), new Float32Array(LENGTH)];

let seed = 7;
const noise = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 2147483648 - 1;
};
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const add = (bus, index, left, right = left) => {
  if (index < 0 || index >= LENGTH) return;
  bus[0][index] += left;
  bus[1][index] += right;
};

function pad(start, seconds, notes, level) {
  const from = Math.floor(start * RATE);
  const count = Math.floor(seconds * RATE);
  notes.forEach((note, n) => {
    const f = hz(note);
    const pan = 0.5 + (n % 2 ? 0.16 : -0.16);
    for (let i = 0; i < count; i += 1) {
      const time = i / RATE;
      const attack = Math.min(time / 1.1, 1);
      const release = Math.min((seconds - time) / 1.3, 1);
      const shape = attack * release;
      const wobble = 1 + 0.0009 * Math.sin(2 * Math.PI * (0.21 + n * 0.03) * time);
      const phase = 2 * Math.PI * f * wobble * time;
      const value = Math.sin(phase) + 0.32 * Math.sin(phase * 2.003) + 0.12 * Math.sin(phase * 3.01) + 0.5 * Math.sin(phase * 0.5);
      add(music, from + i, value * shape * level * (1 - pan), value * shape * level * pan);
    }
  });
}

// A plucked string: a burst of noise ringing round a short loop.
function pluck(start, note, level, pan = 0.5, seconds = 1.5, damp = 0.5) {
  const from = Math.floor(start * RATE);
  const period = Math.max(2, Math.round(RATE / hz(note)));
  const loop = new Float32Array(period);
  for (let i = 0; i < period; i += 1) loop[i] = noise();
  let at = 0;
  const count = Math.floor(seconds * RATE);
  for (let i = 0; i < count; i += 1) {
    const next = (at + 1) % period;
    const value = loop[at];
    loop[at] = (loop[at] * damp + loop[next] * (1 - damp)) * 0.996;
    at = next;
    const fade = Math.min((count - i) / 3000, 1);
    add(music, from + i, value * level * fade * (1 - pan), value * level * fade * pan);
  }
}

function kick(start, level) {
  const from = Math.floor(start * RATE);
  for (let i = 0; i < 0.26 * RATE; i += 1) {
    const time = i / RATE;
    const value = Math.sin(2 * Math.PI * (48 * time + 3.2 * (1 - Math.exp(-time * 34)))) * Math.exp(-time * 13);
    add(music, from + i, value * level);
  }
}
function brush(start, level, pan = 0.5) {
  const from = Math.floor(start * RATE);
  let previous = 0;
  for (let i = 0; i < 0.09 * RATE; i += 1) {
    const raw = noise();
    const value = raw - previous;
    previous = raw;
    const shape = Math.exp((-i / RATE) * 42);
    add(music, from + i, value * shape * level * (1 - pan), value * shape * level * pan);
  }
}

// ---------- The tune ----------
const BEAT = 60 / 86;
const BAR = BEAT * 4;
const CHORDS = [
  { notes: [50, 57, 62, 66, 69, 76], bass: 38 }, // D major 9
  { notes: [47, 54, 62, 66, 69, 73], bass: 35 }, // B minor 7
  { notes: [43, 55, 59, 62, 66, 71], bass: 31 }, // G major 7
  { notes: [45, 52, 59, 64, 67, 74], bass: 33 }, // A with a suspended top
];
const ARP = [2, 4, 5, 3, 4, 5, 3, 4];
const TUNE = [[0, 81], [1.5, 78], [2, 76], [3, 78], [4, 74], [6, 73], [8, 79], [9.5, 78], [10, 74], [11, 76], [12, 73], [13, 74], [14, 76]];
const chapter = (name) => film.chapters.find((item) => item.title.startsWith(name))?.at ?? 0;
const AT = { home: chapter("Your home"), wedding: chapter("Add a wedding"), left: chapter("What"), publish: chapter("Publish"), jobs: chapter("Everyday"), rules: chapter("Three") };
const silence = film.cues.find((cue) => cue.type === "clock");
const inSilence = (time) => silence && time >= silence.at && time < silence.at + 2.4;

const endBars = Math.ceil(film.duration / BAR);
for (let bar = 0; bar < endBars; bar += 1) {
  const start = bar * BAR;
  if (start > film.duration - 3) break;
  const chord = CHORDS[bar % 4];
  const open = start < AT.home;
  pad(start, BAR + 1, chord.notes, open ? 0.016 : 0.013);
  if (start >= AT.home - 0.2) pluck(start, chord.bass + 12, 0.14, 0.5, 1.8, 0.55);
  for (let eighth = 0; eighth < 8; eighth += 1) {
    const time = start + eighth * (BEAT / 2);
    if (inSilence(time) || time < AT.home) continue;
    const note = chord.notes[ARP[eighth]] + 12;
    pluck(time, note, eighth % 2 ? 0.055 : 0.085, eighth % 4 < 2 ? 0.34 : 0.66, 1.1, 0.5);
  }
  for (let beat = 0; beat < 4; beat += 1) {
    const time = start + beat * BEAT;
    if (inSilence(time) || time < AT.wedding || time > AT.rules + 6.4) continue;
    if (beat === 0 || beat === 2) kick(time, 0.2);
    brush(time + BEAT / 2, 0.045, 0.64);
    if (beat === 1 || beat === 3) brush(time, 0.075, 0.4);
  }
  // The little tune comes in when the wedding starts, and rests while you read the rules.
  const fourBars = bar % 4;
  const playsTune = (start >= AT.wedding && start < AT.rules) || start < 0;
  if (playsTune && fourBars === 0) {
    for (const [offset, note] of TUNE) {
      const time = start + offset * BEAT;
      if (!inSilence(time)) pluck(time, note + 12, 0.1, 0.56, 2.2, 0.46);
    }
  }
}

// ---------- Sound effects ----------
function tone(start, f, seconds, level, { to = f, decay = 6, pan = 0.5, bright = 0.3 } = {}) {
  const from = Math.floor(start * RATE);
  let phase = 0;
  for (let i = 0; i < seconds * RATE; i += 1) {
    const time = i / RATE;
    const now = f + (to - f) * Math.min(time / seconds, 1);
    phase += (2 * Math.PI * now) / RATE;
    const value = (Math.sin(phase) + bright * Math.sin(phase * 2)) * Math.exp(-time * decay) * Math.min(time / 0.002, 1);
    add(fx, from + i, value * level * (1 - pan) * 2, value * level * pan * 2);
  }
}
function air(start, seconds, level, { rise = true, low = 0.05, high = 0.5 } = {}) {
  const from = Math.floor(start * RATE);
  let a = 0;
  let b = 0;
  const count = seconds * RATE;
  for (let i = 0; i < count; i += 1) {
    const place = i / count;
    const amount = low + (high - low) * (rise ? place : 1 - place);
    a += (noise() - a) * amount;
    b += (noise() - b) * amount * 0.9;
    const shape = Math.sin(Math.PI * place) ** 1.5;
    add(fx, from + i, a * shape * level * (1 - place * 0.5), b * shape * level * (0.5 + place * 0.5));
  }
}
const EFFECTS = {
  key: (at, level) => { air(at, 0.022, 0.05 * level, { low: 0.5, high: 0.9 }); },
  click: (at, level) => { tone(at, 1500, 0.035, 0.05 * level, { to: 900, decay: 70 }); air(at, 0.02, 0.05 * level, { low: 0.4, high: 0.8 }); },
  soft: (at, level) => { tone(at, 880, 0.35, 0.012 * level, { decay: 9 }); },
  tick: (at, level) => { tone(at, 1320, 0.14, 0.03 * level, { decay: 24 }); },
  pop: (at, level) => { tone(at, 330, 0.16, 0.09 * level, { to: 780, decay: 16 }); },
  patter: (at, level) => { tone(at, 620 + (at * 777) % 500, 0.06, 0.05 * level, { decay: 42 }); },
  nope: (at, level) => { tone(at, 196, 0.12, 0.11 * level, { to: 180, decay: 14 }); tone(at + 0.14, 147, 0.18, 0.11 * level, { to: 138, decay: 12 }); },
  whoosh: (at, level) => { air(at, 0.75, 0.23 * level, { low: 0.03, high: 0.46 }); },
  swell: (at, level) => { air(at, 1.8, 0.05 * level, { low: 0.02, high: 0.2 }); },
  needle: (at, level) => {
    kick(at, 0.3 * level);
    for (let i = 0; i < 26; i += 1) air(at + 0.05 + i * 0.09 + noise() * 0.03, 0.006, 0.09 * level, { low: 0.5, high: 0.9 });
  },
  hit: (at, level) => {
    kick(at, 0.5 * level);
    air(at, 1.4, 0.07 * level, { rise: false, low: 0.04, high: 0.32 });
    [74, 81, 86].forEach((note, n) => tone(at + n * 0.015, hz(note), 1.5, 0.028 * level, { decay: 3 }));
  },
  chime: (at, level) => { [74, 78, 81, 86].forEach((note, n) => tone(at + n * 0.11, hz(note), 1.8, 0.05 * level, { decay: 3.2, pan: 0.32 + n * 0.12 })); },
  clock: (at) => { for (let i = 0; i < 4; i += 1) tone(at + 0.12 + i * 0.57, i % 2 ? 1500 : 1180, 0.05, 0.075, { decay: 60 }); },
  end: (at, level) => {
    [38, 50, 57, 62, 66, 69, 76, 81].forEach((note, n) => tone(at + n * 0.02, hz(note), 4.6, 0.032 * level, { decay: 0.8, bright: 0.14 }));
  },
};
for (const cue of film.cues) EFFECTS[cue.type]?.(cue.at, cue.level);

// Everything in one room: music dips slightly under sound effects, then shared reverb.
const left = new Float32Array(LENGTH);
const right = new Float32Array(LENGTH);
for (let i = 0; i < LENGTH; i += 1) {
  const time = i / RATE;
  let level = Math.min(time / 1.2, 1) * Math.min((film.duration + 0.2 - time) / 3, 1);
  if (silence && time > silence.at - 0.05 && time < silence.at + 2.35) level *= Math.max(0.03, Math.min(Math.abs(time - (silence.at - 0.05)) > 0.25 ? 0.03 : 1 - (time - silence.at + 0.05) / 0.25, 1));
  left[i] = music[0][i] * Math.max(level, 0) + fx[0][i];
  right[i] = music[1][i] * Math.max(level, 0) + fx[1][i];
}
function reverb(channel, times, gain) {
  const wet = new Float32Array(LENGTH);
  for (const delay of times) {
    const size = Math.floor(delay * RATE);
    const line = new Float32Array(size);
    let at = 0;
    for (let i = 0; i < LENGTH; i += 1) {
      const out = line[at];
      line[at] = channel[i] + out * gain;
      at = (at + 1) % size;
      wet[i] += out;
    }
  }
  return wet;
}
const wetLeft = reverb(left, [0.0297, 0.0371, 0.0411, 0.0437], 0.78);
const wetRight = reverb(right, [0.0313, 0.0353, 0.0429, 0.0451], 0.78);
let peak = 0;
for (let i = 0; i < LENGTH; i += 1) {
  left[i] += wetLeft[i] * 0.06;
  right[i] += wetRight[i] * 0.06;
  peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
}
const gain = 0.8 / peak;
const pcm = Buffer.alloc(44 + LENGTH * 4);
pcm.write("RIFF", 0);
pcm.writeUInt32LE(36 + LENGTH * 4, 4);
pcm.write("WAVEfmt ", 8);
pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20);
pcm.writeUInt16LE(2, 22);
pcm.writeUInt32LE(RATE, 24);
pcm.writeUInt32LE(RATE * 4, 28);
pcm.writeUInt16LE(4, 32);
pcm.writeUInt16LE(16, 34);
pcm.write("data", 36);
pcm.writeUInt32LE(LENGTH * 4, 40);
for (let i = 0; i < LENGTH; i += 1) {
  pcm.writeInt16LE(Math.round(Math.tanh(left[i] * gain) * 32767), 44 + i * 4);
  pcm.writeInt16LE(Math.round(Math.tanh(right[i] * gain) * 32767), 46 + i * 4);
}
writeFileSync(output, pcm);
console.log(`wrote ${(LENGTH / RATE).toFixed(1)}s, peak before gain ${peak.toFixed(2)}`);
