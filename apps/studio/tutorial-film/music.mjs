// The film's soundtrack, written note by note so nothing is licensed from anyone: warm pads, felt piano,
// plucked strings, a light beat, and sound effects timed from the film's own cues. The music's bars start
// when the needle lands, and each chapter has its own arrangement. Writes a WAV.
//   node apps/studio/tutorial-film/music.mjs <film.json> <out.wav>
import { readFileSync, writeFileSync } from "node:fs";

const [input, output] = process.argv.slice(2);
const film = JSON.parse(readFileSync(input, "utf8"));
const RATE = 44100;
const LENGTH = Math.ceil((film.duration + 0.6) * RATE);
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

/* ---------- Instruments ---------- */
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
function pluck(start, note, level, pan = 0.5, seconds = 1.5, damp = 0.5, bus = music) {
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
    add(bus, from + i, value * level * fade * (1 - pan), value * level * fade * pan);
  }
}

// A felt piano: soft hammer, a few slightly stretched partials, a long fade.
function piano(start, note, level, pan = 0.5, seconds = 3.2, bus = music) {
  const from = Math.floor(start * RATE);
  const f = hz(note);
  const count = Math.floor(seconds * RATE);
  for (let i = 0; i < count; i += 1) {
    const time = i / RATE;
    const attack = Math.min(time / 0.012, 1);
    const value =
      Math.sin(2 * Math.PI * f * time) * Math.exp(-time * 1.5) +
      0.42 * Math.sin(2 * Math.PI * f * 2.002 * time) * Math.exp(-time * 2.6) +
      0.16 * Math.sin(2 * Math.PI * f * 3.007 * time) * Math.exp(-time * 4.4) +
      0.05 * Math.sin(2 * Math.PI * f * 4.02 * time) * Math.exp(-time * 7);
    const fade = Math.min((count - i) / 4000, 1);
    add(bus, from + i, value * attack * fade * level * (1 - pan) * 2, value * attack * fade * level * pan * 2);
  }
}

// A soft bowed line, for the moments that want to open up.
function strings(start, seconds, note, level, pan = 0.5) {
  const from = Math.floor(start * RATE);
  const count = Math.floor(seconds * RATE);
  const f = hz(note);
  for (let i = 0; i < count; i += 1) {
    const time = i / RATE;
    const shape = Math.min(time / 0.8, 1) * Math.min((seconds - time) / 0.9, 1);
    const vibrato = 1 + 0.0028 * Math.sin(2 * Math.PI * 4.6 * time) * Math.min(time / 1.2, 1);
    const phase = 2 * Math.PI * f * vibrato * time;
    const value = Math.sin(phase) + 0.45 * Math.sin(phase * 2) + 0.24 * Math.sin(phase * 3) + 0.12 * Math.sin(phase * 4) + 0.06 * Math.sin(phase * 5);
    add(music, from + i, value * shape * level * (1 - pan), value * shape * level * pan);
  }
}

function kick(start, level, bus = music) {
  const from = Math.floor(start * RATE);
  for (let i = 0; i < 0.26 * RATE; i += 1) {
    const time = i / RATE;
    const value = Math.sin(2 * Math.PI * (48 * time + 3.2 * (1 - Math.exp(-time * 34)))) * Math.exp(-time * 13);
    add(bus, from + i, value * level);
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

/* ---------- The tune, chapter by chapter ---------- */
const BEAT = 60 / film.music.bpm;
const BAR = BEAT * 4;
const ORIGIN = film.music.origin;
const CHORDS = [
  { notes: [50, 57, 62, 66, 69, 76], bass: 38 }, // D major 9
  { notes: [47, 54, 62, 66, 69, 73], bass: 35 }, // B minor 7
  { notes: [43, 55, 59, 62, 66, 71], bass: 31 }, // G major 7
  { notes: [45, 52, 59, 64, 67, 74], bass: 33 }, // A with a suspended top
];
const ARP = [2, 4, 5, 3, 4, 5, 3, 4];
const TUNE = [[0, 81], [1.5, 78], [2, 76], [3, 78], [4, 74], [6, 73], [8, 79], [9.5, 78], [10, 74], [11, 76], [12, 73], [13, 74], [14, 76]];
const LONG_LINE = [78, 76, 74, 76];

// pad level, arpeggio level, bass level, beat amount, little tune, bowed line, piano on the downbeat
const ARRANGEMENT = {
  open: { pad: 0.013, arp: 0.038, bass: 0.09, beat: 0, tune: 0, bow: 0, piano: 0.05 },
  home: { pad: 0.012, arp: 0.055, bass: 0.11, beat: 0.25, tune: 0, bow: 0, piano: 0.03 },
  wedding: { pad: 0.012, arp: 0.066, bass: 0.13, beat: 0.75, tune: 1, bow: 0, piano: 0 },
  six: { pad: 0.012, arp: 0.066, bass: 0.13, beat: 0.8, tune: 1, bow: 0, piano: 0 },
  album: { pad: 0.018, arp: 0.024, bass: 0.1, beat: 0, tune: 0, bow: 0.012, piano: 0.06 },
  steps: { pad: 0.012, arp: 0.066, bass: 0.13, beat: 0.6, tune: 0, bow: 0, piano: 0 },
  help: { pad: 0.013, arp: 0.036, bass: 0.1, beat: 0.2, tune: 0, bow: 0, piano: 0.045 },
  publish: { pad: 0.014, arp: 0.05, bass: 0.12, beat: 0.3, tune: 0, bow: 0.006, piano: 0.02 },
  more: { pad: 0.012, arp: 0.07, bass: 0.14, beat: 1, tune: 1, bow: 0, piano: 0 },
  chat: { pad: 0.012, arp: 0.046, bass: 0.1, beat: 0.3, tune: 0, bow: 0, piano: 0.035 },
  quotes: { pad: 0.012, arp: 0.066, bass: 0.13, beat: 0.75, tune: 0, bow: 0, piano: 0 },
  know: { pad: 0.012, arp: 0.056, bass: 0.12, beat: 0.5, tune: 0, bow: 0, piano: 0.02 },
  down: { pad: 0.012, arp: 0.05, bass: 0.12, beat: 0.45, tune: 0, bow: 0, piano: 0.02 },
  status: { pad: 0.013, arp: 0.046, bass: 0.11, beat: 0.3, tune: 0, bow: 0, piano: 0.03 },
  end: { pad: 0.019, arp: 0.022, bass: 0.1, beat: 0, tune: 0, bow: 0.012, piano: 0.06 },
};
const sectionAt = (time) => film.sections.reduce((found, item) => (time + 0.05 >= item.at ? item.name : found), "open");

// Before the needle lands: only a low, dark swell under the crackle.
pad(0, ORIGIN + 1.2, [38, 50, 57], 0.012);

const endBars = Math.ceil((film.duration - ORIGIN) / BAR);
for (let bar = 0; bar < endBars; bar += 1) {
  const start = ORIGIN + bar * BAR;
  if (start > film.duration - 4.5) break;
  const chord = CHORDS[bar % 4];
  const part = ARRANGEMENT[sectionAt(start)] ?? ARRANGEMENT.home;
  pad(start, BAR + 1, chord.notes, part.pad);
  pluck(start, chord.bass + 12, part.bass, 0.5, 1.8, 0.55);
  if (part.piano) {
    piano(start, chord.notes[3] + 12, part.piano, 0.42);
    piano(start + BEAT * 2, chord.notes[4] + 12, part.piano * 0.7, 0.58);
  }
  if (part.bow) strings(start, BAR + 0.7, LONG_LINE[bar % 4] + 12, part.bow, 0.56);
  for (let eighth = 0; eighth < 8; eighth += 1) {
    const time = start + eighth * (BEAT / 2);
    const note = chord.notes[ARP[eighth]] + 12;
    pluck(time, note, part.arp * (eighth % 2 ? 0.66 : 1), eighth % 4 < 2 ? 0.34 : 0.66, 1.1, 0.5);
  }
  if (part.beat) {
    for (let beat = 0; beat < 4; beat += 1) {
      const time = start + beat * BEAT;
      if (part.beat >= 0.5 && (beat === 0 || beat === 2)) kick(time, 0.2 * part.beat);
      brush(time + BEAT / 2, 0.045 * part.beat, 0.64);
      if (beat === 1 || beat === 3) brush(time, 0.075 * part.beat, 0.4);
    }
  }
  if (part.tune && bar % 4 === 0) {
    for (const [offset, note] of TUNE) pluck(start + offset * BEAT, note + 12, 0.1, 0.56, 2.2, 0.46);
  }
}

/* ---------- Sound effects ---------- */
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
function air(start, seconds, level, { rise = true, low = 0.05, high = 0.5, panFrom = 0.5, panTo = 0.5 } = {}) {
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
    const pan = panFrom + (panTo - panFrom) * place;
    add(fx, from + i, a * shape * level * (1 - pan) * 1.5, b * shape * level * pan * 1.5);
  }
}
function rumble(start, seconds, level, panFrom = 0.1, panTo = 0.9) {
  const from = Math.floor(start * RATE);
  const count = seconds * RATE;
  let a = 0;
  for (let i = 0; i < count; i += 1) {
    const place = i / count;
    a += (noise() - a) * 0.012;
    const value = (a * 6 + 0.4 * Math.sin((2 * Math.PI * 55 * i) / RATE)) * Math.sin(Math.PI * place) ** 1.2;
    const pan = panFrom + (panTo - panFrom) * place;
    add(fx, from + i, value * level * (1 - pan) * 2, value * level * pan * 2);
  }
}
function thud(start, level) {
  kick(start, 0.4 * level, fx);
  air(start, 0.14, 0.09 * level, { rise: false, low: 0.04, high: 0.25 });
}
function crackle(start, seconds, level) {
  const from = Math.floor(start * RATE);
  const count = Math.floor(seconds * RATE);
  // A soft hiss with little ticks in it, fading as the music takes over.
  let hiss = 0;
  for (let i = 0; i < count; i += 1) {
    const place = i / count;
    hiss += (noise() - hiss) * 0.25;
    const shape = Math.min(place * 8, 1) * Math.min((1 - place) * 2.5, 1);
    add(fx, from + i, hiss * 0.012 * level * shape, hiss * 0.012 * level * shape);
  }
  const ticks = Math.floor(seconds * 9);
  for (let i = 0; i < ticks; i += 1) {
    const at = start + (i / ticks) * seconds + noise() * 0.05;
    const place = (at - start) / seconds;
    const gain = Math.min(place * 8, 1) * Math.min((1 - place) * 2.5, 1);
    air(at, 0.004 + Math.abs(noise()) * 0.006, (0.02 + Math.abs(noise()) * 0.05) * level * gain, { low: 0.5, high: 0.9, panFrom: 0.5 + noise() * 0.3, panTo: 0.5 });
  }
}

const SLATE_NOTES = { 2: 62, 3: 66, 4: 69, 5: 71, 6: 74, 7: 76, 8: 78, 9: 81 };
const EFFECTS = {
  key: (at, level) => { air(at, 0.022, 0.05 * level, { low: 0.5, high: 0.9 }); },
  click: (at, level) => { tone(at, 1500, 0.035, 0.05 * level, { to: 900, decay: 70 }); air(at, 0.02, 0.05 * level, { low: 0.4, high: 0.8 }); },
  soft: (at, level) => { tone(at, 880, 0.35, 0.012 * level, { decay: 9 }); },
  tick: (at, level) => { tone(at, 1320, 0.14, 0.03 * level, { decay: 24 }); },
  pop: (at, level) => { tone(at, 330, 0.16, 0.08 * level, { to: 780, decay: 16 }); },
  land: (at, level) => { thud(at, 0.5 * level); tone(at, 150, 0.14, 0.07 * level, { to: 80, decay: 16 }); },
  toggle: (at, level) => { tone(at, 900, 0.05, 0.045 * level, { decay: 60 }); tone(at + 0.075, 1300, 0.07, 0.05 * level, { decay: 50 }); air(at, 0.02, 0.04 * level, { low: 0.4, high: 0.8 }); },
  patter: (at, level) => { tone(at, 620 + (at * 777) % 500, 0.06, 0.05 * level, { decay: 42 }); air(at, 0.03, 0.03 * level, { low: 0.2, high: 0.5 }); },
  nope: (at, level) => { tone(at, 196, 0.12, 0.1 * level, { to: 180, decay: 14 }); tone(at + 0.14, 147, 0.18, 0.1 * level, { to: 138, decay: 12 }); },
  whoosh: (at, level) => { air(at, 0.75, 0.2 * level, { low: 0.03, high: 0.46, panFrom: 0.35, panTo: 0.65 }); },
  swell: (at, level) => { air(at, 1.8, 0.05 * level, { low: 0.02, high: 0.2 }); },
  lift: (at, level) => { air(at, 1.1, 0.09 * level, { low: 0.02, high: 0.24 }); tone(at, 120, 1.1, 0.03 * level, { to: 190, decay: 2 }); },
  page: (at, level) => { air(at, 0.5, 0.13 * level, { rise: false, low: 0.08, high: 0.6, panFrom: 0.7, panTo: 0.3 }); for (let i = 0; i < 6; i += 1) air(at + 0.05 + i * 0.06, 0.03, 0.045 * level, { low: 0.3, high: 0.7, panFrom: 0.7 - i * 0.07, panTo: 0.5 }); },
  needle: (at, level) => { thud(at, 0.55 * level); for (let i = 0; i < 14; i += 1) air(at + 0.04 + i * 0.05 + noise() * 0.02, 0.006, 0.05 * level, { low: 0.5, high: 0.9 }); },
  arm: (at, level) => { air(at, 1.4, 0.03 * level, { low: 0.03, high: 0.12, panFrom: 0.8, panTo: 0.55 }); },
  crackle: (at, level) => { crackle(at, ORIGIN + BAR * 2.4, level); },
  dive: (at, level) => { air(at, 0.95, 0.2 * level, { low: 0.02, high: 0.5 }); tone(at, 70, 0.95, 0.12 * level, { to: 220, decay: 0.7 }); thud(at + 0.95, 0.7 * level); },
  hit: (at, level) => {
    kick(at, 0.42 * level, fx);
    air(at, 1.4, 0.07 * level, { rise: false, low: 0.04, high: 0.32 });
    [74, 81, 86].forEach((note, n) => tone(at + n * 0.015, hz(note), 1.5, 0.026 * level, { decay: 3 }));
  },
  chime: (at, level) => { [74, 78, 81, 86].forEach((note, n) => tone(at + n * 0.11, hz(note), 1.8, 0.045 * level, { decay: 3.2, pan: 0.32 + n * 0.12 })); },
  goldtick: (at, level) => { [81, 86, 90, 93].forEach((note, n) => tone(at + n * 0.05, hz(note), 2.6, 0.034 * level, { decay: 2.2, pan: 0.36 + n * 0.1, bright: 0.12 })); air(at, 1.2, 0.022 * level, { rise: false, low: 0.3, high: 0.8 }); },
  riser: (at, level) => { air(at, 2.15, 0.11 * level, { low: 0.015, high: 0.55 }); tone(at, 98, 2.15, 0.05 * level, { to: 392, decay: 0.1, bright: 0.5 }); },
  publish: (at, level) => {
    kick(at, 0.5 * level, fx);
    air(at, 2.2, 0.08 * level, { rise: false, low: 0.03, high: 0.34 });
    [50, 57, 62, 66, 69, 74, 78].forEach((note, n) => tone(at + n * 0.012, hz(note), 3.6, 0.03 * level, { decay: 1.1, bright: 0.2, pan: 0.32 + n * 0.06 }));
  },
  slate: (at, track) => { piano(at, SLATE_NOTES[track] ?? 74, 0.075, 0.5, 3, fx); piano(at, (SLATE_NOTES[track] ?? 74) - 12, 0.05, 0.5, 3, fx); },
  split: (at, level) => { tone(at, 2400, 0.34, 0.012 * level, { to: 3800, decay: 3, bright: 0 }); air(at + 0.26, 0.5, 0.15 * level, { low: 0.06, high: 0.4 }); },
  roll: (at, level) => { rumble(at, 0.95, 0.09 * level); air(at, 0.95, 0.09 * level, { low: 0.05, high: 0.3, panFrom: 0.1, panTo: 0.9 }); },
  turn: (at, level) => { air(at, 0.7, 0.16 * level, { low: 0.08, high: 0.55, panFrom: 0.8, panTo: 0.25 }); for (let i = 0; i < 5; i += 1) air(at + 0.1 + i * 0.09, 0.03, 0.05 * level, { low: 0.3, high: 0.7, panFrom: 0.8 - i * 0.1, panTo: 0.5 }); },
  iris: (at, level) => { air(at, 0.62, 0.15 * level, { low: 0.03, high: 0.42 }); tone(at + 0.5, 90, 0.3, 0.09 * level, { to: 60, decay: 9 }); },
  slats: (at, level) => { for (let i = 0; i < 16; i += 1) { const place = i / 15; tone(at + i * 0.022 + 0.1, 900 + i * 40, 0.03, 0.022 * level, { decay: 70, pan: 0.1 + place * 0.8 }); air(at + i * 0.022 + 0.08, 0.03, 0.04 * level, { low: 0.3, high: 0.6, panFrom: 0.1 + place * 0.8, panTo: 0.1 + place * 0.8 }); } },
  bubble: (at, level) => { tone(at, 240, 0.7, 0.05 * level, { to: 620, decay: 3, bright: 0.1 }); air(at, 0.7, 0.09 * level, { low: 0.03, high: 0.3 }); },
  "bubble-tick": (at, level) => { tone(at, 620, 0.09, 0.05 * level, { to: 880, decay: 26, bright: 0.1 }); },
  strips: (at, level) => { for (let i = 0; i < 9; i += 1) air(at + i * 0.028, 0.5, 0.05 * level, { low: 0.06, high: 0.4, panFrom: i % 2 ? 0.85 : 0.15, panTo: 0.5 }); },
  crop: (at, level) => { tone(at, 620, 0.04, 0.06 * level, { decay: 60 }); air(at, 0.6, 0.11 * level, { low: 0.05, high: 0.32 }); tone(at + 0.56, 1100, 0.05, 0.06 * level, { decay: 60 }); thud(at + 0.6, 0.5 * level); },
  "crop-tick": (at, level) => { tone(at, 1000, 0.05, 0.045 * level, { to: 700, decay: 50 }); air(at, 0.03, 0.04 * level, { low: 0.3, high: 0.7 }); },
  drawer: (at, level) => { air(at, 0.8, 0.13 * level, { low: 0.04, high: 0.32, panFrom: 0.85, panTo: 0.6 }); thud(at + 0.72, 0.28 * level); },
  turnstile: (at, level) => { air(at, 1, 0.13 * level, { low: 0.04, high: 0.32, panFrom: 0.8, panTo: 0.2 }); tone(at + 0.93, 1200, 0.05, 0.03 * level, { decay: 60 }); },
  recordroll: (at, level) => { rumble(at, 1, 0.07 * level, 0.9, 0.55); thud(at + 0.96, 0.45 * level); },
  lock: (at, level) => { tone(at, 1900, 0.04, 0.05 * level, { decay: 70 }); tone(at + 0.07, 1300, 0.08, 0.06 * level, { decay: 40 }); },
  stamp: (at, level) => { kick(at, 0.55 * level, fx); air(at, 0.24, 0.16 * level, { rise: false, low: 0.06, high: 0.5 }); },
  end: (at, level) => { [38, 50, 57, 62, 66, 69, 76, 81].forEach((note, n) => tone(at + n * 0.02, hz(note), 4.6, 0.03 * level, { decay: 0.8, bright: 0.14 })); },
};
for (const item of film.cues) EFFECTS[item.type]?.(item.at, item.level);

/* ---------- The mix ---------- */
// The room goes quiet for a breath before Publish lands, and the music steps back from the big moments.
const publishAt = film.cues.find((item) => item.type === "publish")?.at ?? -10;
const dips = [{ from: publishAt - 0.7, to: publishAt + 0.02, floor: 0.14, back: 2.2 }];
for (const item of film.cues) if (item.type === "hit" || item.type === "stamp") dips.push({ from: item.at - 0.02, to: item.at + 0.02, floor: 0.55, back: 0.9 });
const dipAt = (time) => {
  let level = 1;
  for (const { from, to, floor, back } of dips) {
    if (time < from || time > to + back) continue;
    if (time < to) level = Math.min(level, 1 + (floor - 1) * ((time - from) / (to - from)));
    else level = Math.min(level, floor + (1 - floor) * ((time - to) / back));
  }
  return level;
};

const left = new Float32Array(LENGTH);
const right = new Float32Array(LENGTH);
for (let i = 0; i < LENGTH; i += 1) {
  const time = i / RATE;
  const level = Math.min(time / 1.5, 1) * Math.max(Math.min((film.duration + 0.1 - time) / 3.5, 1), 0) * dipAt(time);
  left[i] = music[0][i] * level + fx[0][i];
  right[i] = music[1][i] * level + fx[1][i];
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
// Level by how loud it sounds, not its one loudest moment: soft saturation below rounds off the few big hits.
let energy = 0;
for (let i = 0; i < LENGTH; i += 1) energy += left[i] * left[i] + right[i] * right[i];
const gain = 0.085 / Math.sqrt(energy / (2 * LENGTH));
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
console.log(`wrote ${(LENGTH / RATE).toFixed(1)}s, peak ${(peak * gain).toFixed(2)} before saturation`);
