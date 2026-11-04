/* The tutorial film: one paused GSAP timeline, sought frame by frame by render.mjs. Open film.html?play in a
   browser to watch it live. Nothing here ships with the Studio; only the rendered video does. Times are in
   seconds. The sets are in dom.js. Chapters start on the soundtrack's bars, so picture and music move together. */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const BPM = 86;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const NEEDLE = 3.75; // The needle lands here, and the music's first bar starts with it.
const nextBar = (t) => NEEDLE + Math.ceil((t - NEEDLE) / BAR - 1e-6) * BAR;
const nextHalf = (t) => NEEDLE + Math.ceil((t - NEEDLE) / (BEAT * 2) - 1e-6) * BEAT * 2;
const FRAME_Y = 468; // What the camera looks at sits a little high, so captions never cover it.

gsap.defaults({ immediateRender: false, overwrite: false, lazy: false });
const tl = gsap.timeline({ paused: true });
const captions = [];
const cues = [];
const chapters = [];
const sections = [];
const cue = (type, at, level = 1) => cues.push({ type, at: +at.toFixed(3), level });
const chapter = (title, at) => chapters.push({ title, at: +at.toFixed(3) });
const section = (name, at) => sections.push({ name, at: +at.toFixed(3) });

let seed = 20261104;
const random = (low, high) => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return low + (seed / 4294967296) * (high - low);
};

/* Where something sits on its set, ignoring every transform. */
function rect(selector) {
  const element = typeof selector === "string" ? $(selector) : selector;
  let x = 0;
  let y = 0;
  for (let e = element; e && e.id !== "pan" && e !== document.body; e = e.offsetParent) {
    x += e.offsetLeft;
    y += e.offsetTop;
  }
  const w = element.offsetWidth;
  const h = element.offsetHeight;
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
}

/* ---------- Small moves ---------- */
const show = (selector, at) => tl.set(selector, { visibility: "visible" }, at);
const hide = (selector, at) => tl.set(selector, { visibility: "hidden" }, at);
const appear = (selector, at, duration = 0.7, from = { y: 24 }, ease = "expo.out") => tl.fromTo(selector, { autoAlpha: 0, ...from }, { autoAlpha: 1, x: 0, y: 0, z: 0, scale: 1, rotation: 0, rotationX: 0, rotationY: 0, duration, ease }, at);
const leave = (selector, at, duration = 0.35, to = {}) => tl.to(selector, { autoAlpha: 0, duration, ease: "power2.in", ...to }, at);
const on = (selector, at) => tl.set(selector, { autoAlpha: 1 }, at);
const off = (selector, at) => tl.set(selector, { autoAlpha: 0 }, at);

let camNow = { cx: 960, cy: 540, zoom: 1 };
/* The rig: #pan slides and zooms the set, #cam tilts about the middle of the frame. */
function camera(cx, cy, zoom, at, duration = 1.5, { rx = 0, ry = 0, rz = 0, z = 0, ease = "power3.inOut", frameY = FRAME_Y } = {}) {
  tl.to("#pan", { x: (960 - cx) * zoom, y: (540 - cy) * zoom + (frameY - 540), scale: zoom, duration, ease }, at);
  tl.to("#cam", { rotationX: rx, rotationY: ry, rotation: rz, z, duration, ease }, at);
  camNow = { cx, cy, zoom, frameY };
}
function cameraNow(cx, cy, zoom, at, { rx = 0, ry = 0, rz = 0, z = 0, frameY = FRAME_Y } = {}) {
  tl.set("#pan", { x: (960 - cx) * zoom, y: (540 - cy) * zoom + (frameY - 540), scale: zoom }, at);
  tl.set("#cam", { rotationX: rx, rotationY: ry, rotation: rz, z }, at);
  camNow = { cx, cy, zoom, frameY };
}
const onScreen = (box) => {
  const { cx, cy, zoom, frameY } = camNow;
  return { left: 960 + (box.x - cx) * zoom, top: frameY + (box.y - cy) * zoom, right: 1920 - (960 + (box.x + box.w - cx) * zoom), bottom: 1080 - (frameY + (box.y + box.h - cy) * zoom) };
};

/* A cursor with weight: it arcs, leans into the move and settles. */
let cur = { x: 1300, y: 700 };
function cursorIn(x, y, at) {
  tl.set("#cursor", { x, y }, at);
  tl.fromTo("#cursor", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, at);
  cur = { x, y };
}
const cursorOut = (at) => tl.to("#cursor", { autoAlpha: 0, duration: 0.25 }, at);
function go(x, y, at, duration = 0.85) {
  tl.to("#cursor", { x, duration, ease: "power3.inOut" }, at);
  tl.to("#cursor", { y, duration, ease: "power2.inOut" }, at);
  const lean = Math.max(-14, Math.min(14, (x - cur.x) / 50));
  tl.to("#cur-in", { rotation: lean, duration: duration * 0.45, ease: "power2.out" }, at);
  tl.to("#cur-in", { rotation: 0, duration: duration * 0.7, ease: "back.out(2.4)" }, at + duration * 0.45);
  cur = { x, y };
}
const goTo = (selector, at, duration, dx = 0, dy = 0) => {
  const box = rect(selector);
  go(box.cx + dx, box.cy + dy, at, duration);
  return box;
};
function press(selector, at, { sound = "click" } = {}) {
  tl.to("#cur-in", { scale: 0.8, duration: 0.08, ease: "power2.out" }, at).to("#cur-in", { scale: 1, duration: 0.3, ease: "back.out(3)" }, at + 0.08);
  const ripple = document.createElement("div");
  ripple.className = "ripple";
  ripple.style.left = `${cur.x}px`;
  ripple.style.top = `${cur.y}px`;
  $("#ripples").appendChild(ripple);
  gsap.set(ripple, { z: 3 });
  tl.fromTo(ripple, { autoAlpha: 0.95, scale: 0.15 }, { autoAlpha: 0, scale: 1.5, duration: 0.6, ease: "expo.out" }, at);
  if (selector) tl.to(selector, { scale: 0.955, duration: 0.08, ease: "power2.out" }, at).to(selector, { scale: 1, duration: 0.4, ease: "back.out(3)" }, at + 0.08);
  cue(sound, at);
}
const click = (selector, at, duration = 0.85) => {
  goTo(selector, at, duration);
  press(selector, at + duration + 0.02);
  return at + duration + 0.02;
};

function type(selector, text, at, perChar = 0.05, sound = 0.5) {
  const element = $(selector);
  const state = { n: 0 };
  const duration = text.length * perChar;
  tl.to(state, { n: text.length, duration, ease: "none", onUpdate() { element.textContent = text.slice(0, Math.round(state.n)); } }, at);
  if (sound) for (let i = 0; i < text.length; i += 1) if (i % 2 === 0 || perChar > 0.05) cue("key", at + i * perChar, sound);
  return at + duration;
}
function setHTML(selector, html, at) {
  const element = $(selector);
  const state = { v: 0 };
  tl.to(state, { v: 1, duration: 0.001, onUpdate() { if (state.v >= 1) element.innerHTML = html; } }, at);
}
function lit(selector, isOn, at, name = "on") {
  const element = typeof selector === "string" ? $(selector) : selector;
  const state = { v: 0 };
  tl.to(state, { v: 1, duration: 0.001, onUpdate() { if (state.v >= 1) element.classList.toggle(name, isOn); } }, at);
}
const rupees = (amount) => `₹${Math.round(amount).toLocaleString("en-IN")}`;
function roll(selector, from, to, at, duration = 0.7) {
  const element = $(selector);
  const state = { v: from };
  tl.to(state, { v: to, duration, ease: "power2.out", onUpdate() { element.textContent = rupees(Math.round(state.v / 100) * 100); } }, at);
}
function drawOn(selector, at, duration = 0.8, ease = "power2.inOut", stagger = 0) {
  tl.fromTo(selector, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration, ease, stagger }, at);
}
function sweep(at, duration = 1.3) {
  tl.fromTo("#sweep", { x: -800 }, { x: 2400, duration, ease: "power1.inOut" }, at);
}
const rise = (selector, at, { stagger = 0.018, duration = 0.8, ease = "expo.out" } = {}) => {
  tl.set(selector, { autoAlpha: 1 }, at);
  tl.fromTo(`${selector} .ch`, { yPercent: 118 }, { yPercent: 0, duration, ease, stagger }, at);
};
const fall = (selector, at, duration = 0.32) => tl.to(`${selector} .ch`, { yPercent: -118, duration, ease: "power2.in", stagger: 0.006 }, at);

/* The gold spotlight on one thing. */
let focusOpen = false;
function focus(selector, at, { pad = 10, duration = 0.65, radius = 20 } = {}) {
  const box = rect(selector);
  const place = { x: box.x - pad, y: box.y - pad, width: box.w + pad * 2, height: box.h + pad * 2, borderRadius: radius };
  if (focusOpen) tl.to("#dim", { ...place, duration, ease: "power3.inOut" }, at);
  else {
    tl.set("#dim", place, at);
    tl.fromTo("#dim", { autoAlpha: 0 }, { autoAlpha: 1, duration, ease: "power2.out" }, at);
  }
  focusOpen = true;
}
function unfocus(at, duration = 0.45) {
  tl.to("#dim", { autoAlpha: 0, duration, ease: "power2.inOut" }, at);
  focusOpen = false;
}

/* One caption at a time, each giving way as the next arrives. A note goes in the written words only. */
const say = (html, at, duration) => captions.push({ start: +at.toFixed(2), end: +(at + (duration ?? Math.max(2.4, html.replace(/<[^>]+>/g, "").length / 15))).toFixed(2), html });
const note = (text, at) => captions.push({ start: +at.toFixed(2), end: 0, html: text, quiet: true });
function placeCaptions() {
  captions.sort((a, b) => a.start - b.start);
  const shown = captions.filter((item) => !item.quiet);
  shown.forEach((item, index) => {
    const next = shown[index + 1];
    if (next && item.end > next.start - 0.12) item.end = +(next.start - 0.12).toFixed(2);
    const element = document.createElement("div");
    element.className = "cap";
    const parts = item.html.split(/(<em>.*?<\/em>)/).filter(Boolean);
    element.innerHTML = parts.map((part) => (part.startsWith("<em>") ? `<em>${part.slice(4, -5).trim().split(" ").map((w) => `<span class="cw">${w}</span>`).join(" ")}</em>` : part.trim().split(" ").map((w) => `<span class="cw">${w}</span>`).join(" "))).reduce((all, part) => all + (!all || /^<span class="cw">[,.:;!?…]/.test(part) ? "" : " ") + part, "");
    $("#caps").appendChild(element);
    gsap.set(element, { xPercent: -50 });
    tl.fromTo(element, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.42, ease: "expo.out" }, item.start);
    tl.fromTo(element.querySelectorAll(".cw"), { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "expo.out", stagger: 0.022 }, item.start + 0.03);
    tl.to(element, { autoAlpha: 0, y: -8, duration: 0.2, ease: "power2.in" }, item.end - 0.2);
  });
  captions.forEach((item) => {
    item.text = item.html.replace(/<[^>]+>/g, "");
    item.seconds = +(item.end - item.start).toFixed(2);
    delete item.html;
  });
}

/* ---------- The family of chapter changes: a dark plate, a gold thread, the record ---------- */
const plate = $("#plate");
function shape(from, to, at, duration, ease, draw) {
  const state = { v: from };
  tl.to(state, { v: to, duration, ease, onUpdate() { draw(state.v); } }, at);
}
const COVER = {
  split(at) {
    tl.set("#thread", { visibility: "visible", scaleX: 0, autoAlpha: 1, scaleY: 1 }, at);
    tl.to("#thread", { scaleX: 1, duration: 0.34, ease: "power3.inOut" }, at);
    tl.set(plate, { visibility: "visible" }, at + 0.3);
    shape(50, 0, at + 0.3, 0.42, "power3.inOut", (v) => { plate.style.clipPath = `inset(${v}% 0 ${v}% 0)`; });
    tl.to("#thread", { scaleY: 8, autoAlpha: 0, duration: 0.3 }, at + 0.34);
    cue("split", at);
    return 0.72;
  },
  roll(at) {
    tl.set("#roller", { visibility: "visible", x: -900, rotation: 0 }, at);
    tl.to("#roller", { x: 2820, rotation: 240, duration: 0.95, ease: "power2.inOut" }, at);
    tl.set(plate, { visibility: "visible" }, at);
    shape(0, 1, at, 0.95, "power2.inOut", (v) => { plate.style.clipPath = `inset(0 ${100 - Math.min(100, ((-900 + 3720 * v) / 1920) * 100)}% 0 0)`; });
    tl.set("#roller", { visibility: "hidden" }, at + 0.95);
    cue("roll", at);
    return 0.8;
  },
  turn(at) {
    tl.set(plate, { visibility: "visible", clipPath: "none", transformOrigin: "100% 50%", transformPerspective: 1700, rotationY: 96 }, at);
    tl.to(plate, { rotationY: 0, duration: 0.72, ease: "power3.inOut" }, at);
    cue("turn", at);
    return 0.72;
  },
  iris(at, { x = 960, y = 540 } = {}) {
    tl.set(plate, { visibility: "visible" }, at);
    shape(0, 1300, at, 0.62, "power3.in", (v) => { plate.style.clipPath = `circle(${v}px at ${x}px ${y}px)`; });
    cue("iris", at);
    return 0.62;
  },
  slats(at) {
    tl.set("#slats", { visibility: "visible" }, at);
    tl.fromTo(".slat", { rotationY: 92, transformOrigin: "0% 50%" }, { rotationY: 0, duration: 0.55, ease: "power3.out", stagger: 0.022 }, at);
    tl.set(plate, { visibility: "visible" }, at + 0.9);
    tl.set("#slats", { visibility: "hidden" }, at + 0.9);
    cue("slats", at);
    return 0.86;
  },
  bubble(at) {
    tl.set(plate, { visibility: "visible" }, at);
    shape(0, 1, at, 0.7, "expo.inOut", (v) => {
      const t = 1060 * (1 - v);
      const r = 860 * (1 - v);
      const b = 22 * (1 - v);
      const l = 90 * (1 - v);
      plate.style.clipPath = `inset(${t}px ${r}px ${b}px ${l}px round ${42 * (1 - v)}px)`;
    });
    cue("bubble", at);
    return 0.7;
  },
  strips(at) {
    tl.set("#strips", { visibility: "visible" }, at);
    tl.fromTo(".strip", { x: (i) => (i % 2 ? 2000 : -2000) }, { x: 0, duration: 0.6, ease: "power4.inOut", stagger: 0.028 }, at);
    tl.set(plate, { visibility: "visible" }, at + 0.86);
    tl.set("#strips", { visibility: "hidden" }, at + 0.86);
    cue("strips", at);
    return 0.86;
  },
  crop(at) {
    tl.set("#crops", { visibility: "visible" }, at);
    tl.fromTo("#cr-t, #cr-b", { scaleY: 0 }, { scaleY: 1, duration: 0.66, ease: "power4.inOut" }, at);
    tl.fromTo("#cr-l, #cr-r", { scaleX: 0 }, { scaleX: 1, duration: 0.66, ease: "power4.inOut" }, at + 0.06);
    tl.set(plate, { visibility: "visible" }, at + 0.74);
    tl.set("#crops", { visibility: "hidden" }, at + 0.74);
    cue("crop", at);
    return 0.72;
  },
};
const REVEAL = {
  split(at) {
    shape(0, 50, at, 0.62, "power3.inOut", (v) => { plate.style.clipPath = `inset(${v}% 0 ${v}% 0)`; });
    tl.set("#thread", { visibility: "visible", scaleX: 1, scaleY: 1, autoAlpha: 1 }, at);
    tl.to("#thread", { scaleY: 0, autoAlpha: 0, duration: 0.62, ease: "power2.in" }, at);
    cue("whoosh", at, 0.5);
    return 0.62;
  },
  roll(at) {
    tl.set("#roller", { visibility: "visible", x: -900, rotation: 240 }, at);
    tl.to("#roller", { x: 2820, rotation: 480, duration: 0.95, ease: "power2.inOut" }, at);
    shape(0, 1, at, 0.95, "power2.inOut", (v) => { plate.style.clipPath = `inset(0 0 0 ${Math.max(0, ((-900 + 3720 * v) / 1920) * 100)}%)`; });
    tl.set("#roller", { visibility: "hidden" }, at + 0.95);
    cue("roll", at, 0.7);
    return 0.82;
  },
  turn(at) {
    tl.set(plate, { transformOrigin: "0% 50%", rotationY: 0 }, at);
    tl.to(plate, { rotationY: -96, duration: 0.72, ease: "power3.inOut" }, at);
    cue("turn", at, 0.7);
    return 0.72;
  },
  iris(at, { x = 960, y = 540 } = {}) {
    shape(0, 1300, at, 0.85, "power3.out", (v) => {
      plate.style.clipPath = "none";
      const mask = v >= 1299 ? "none" : `radial-gradient(circle at ${x}px ${y}px, transparent ${v}px, #000 ${v + 2}px)`;
      plate.style.maskImage = mask;
      plate.style.webkitMaskImage = mask;
    });
    cue("iris", at, 0.6);
    return 0.85;
  },
  slats(at) {
    tl.set("#slats", { visibility: "visible" }, at);
    tl.set(plate, { visibility: "hidden" }, at);
    tl.set(".slat", { transformOrigin: "100% 50%" }, at);
    tl.fromTo(".slat", { rotationY: 0 }, { rotationY: -92, duration: 0.55, ease: "power3.in", stagger: 0.022 }, at);
    cue("slats", at, 0.7);
    return 0.86;
  },
  bubble(at) {
    shape(0, 1, at, 0.65, "power3.inOut", (v) => { plate.style.clipPath = `inset(0 0 ${v * 100}% 0)`; });
    cue("whoosh", at, 0.55);
    return 0.65;
  },
  strips(at) {
    tl.set("#strips", { visibility: "visible" }, at);
    tl.set(plate, { visibility: "hidden" }, at);
    tl.fromTo(".strip", { x: 0 }, { x: (i) => (i % 2 ? -2000 : 2000), duration: 0.6, ease: "power4.inOut", stagger: 0.028 }, at);
    cue("strips", at, 0.7);
    return 0.86;
  },
  crop(at) {
    tl.set("#crops", { visibility: "visible" }, at);
    tl.set(plate, { visibility: "hidden" }, at);
    tl.fromTo("#cr-l, #cr-r", { scaleX: 1 }, { scaleX: 0, duration: 0.62, ease: "power4.inOut" }, at);
    tl.fromTo("#cr-t, #cr-b", { scaleY: 1 }, { scaleY: 0, duration: 0.62, ease: "power4.inOut" }, at + 0.1);
    cue("crop", at, 0.7);
    return 0.72;
  },
};

let slateCount = 0;
/* Brings on a chapter's card. Returns the moment the next scene should already be set up, and the reveal's end. */
const TYPE_DELAY = { none: 0.45, split: 0.35, roll: 0.62, turn: 0.42, iris: 0.58, slats: 0.62, bubble: 0.55, strips: 0.6, crop: 0.72 };
function slate(track, title, sub, at, inKind, outKind, { hold, chapterTitle = title, coverOptions, revealOptions, sound = true } = {}) {
  hold = hold ?? TYPE_DELAY[inKind] + 1.75; // Long enough to read, however long the card took to arrive.
  slateCount += 1;
  const set = document.createElement("div");
  set.className = "slateset";
  set.id = `slate-${slateCount}`;
  set.innerHTML = `<div class="slate-kicker">Track ${String(track).padStart(2, "0")}</div><div class="slate-title">${kinetic(title)}</div><i class="slate-rule"></i><div class="slate-sub">${sub}</div>`;
  $("#slate-sets").appendChild(set);
  gsap.set(set, { autoAlpha: 0 });
  chapter(chapterTitle, at);
  note(`${title}. ${sub}`, at);

  const covered = at + COVER[inKind](at, coverOptions);
  if (sound) cue("slate", at + 0.02, track);
  const d = TYPE_DELAY[inKind];
  tl.set("#slate", { visibility: "visible" }, at + d - 0.05);
  tl.set(set, { autoAlpha: 1 }, at + d - 0.05);
  tl.fromTo("#slate-rec", { x: -420 }, { x: 0, duration: 1.2, ease: "expo.out" }, at + d - 0.05);
  tl.fromTo(`#${set.id} .slate-kicker`, { autoAlpha: 0, letterSpacing: "0.7em" }, { autoAlpha: 1, letterSpacing: "0.34em", duration: 0.9, ease: "expo.out" }, at + d);
  tl.fromTo(`#${set.id} .ch`, { yPercent: 118 }, { yPercent: 0, duration: 0.8, ease: "expo.out", stagger: 0.016 }, at + d + 0.06);
  tl.fromTo(`#${set.id} .slate-rule`, { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "power3.inOut" }, at + d + 0.2);
  tl.fromTo(`#${set.id} .slate-sub`, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: "expo.out" }, at + d + 0.4);
  const out = at + hold;
  tl.to(set, { autoAlpha: 0, y: -26, duration: 0.3, ease: "power2.in" }, out - 0.28);
  tl.to("#slate-rec", { x: -420, duration: 0.5, ease: "power3.in" }, out - 0.28);
  tl.set("#slate", { visibility: "hidden" }, out + 0.02);
  const length = REVEAL[outKind](out, revealOptions);
  tl.set(plate, { visibility: "hidden", clipPath: "none", rotationY: 0 }, out + length + 0.02);
  tl.set("#slats, #strips, #crops, #thread", { visibility: "hidden" }, out + length + 0.02);
  return { covered, out, ready: out + 0.05 };
}

/* ---------- First frame ---------- */
const tile = document.createElement("canvas");
tile.width = 320;
tile.height = 320;
{
  const context = tile.getContext("2d");
  const data = context.createImageData(320, 320);
  for (let i = 0; i < data.data.length; i += 4) {
    const value = random(0, 255);
    data.data[i] = value;
    data.data[i + 1] = value;
    data.data[i + 2] = value;
    data.data[i + 3] = 255;
  }
  context.putImageData(data, 0, 0);
  $("#grain").style.backgroundImage = `url(${tile.toDataURL()})`;
}
for (let i = 0; i < 26; i += 1) {
  const mote = document.createElement("i");
  mote.className = "mote";
  mote.style.left = `${random(0, 1920)}px`;
  mote.style.top = `${random(0, 1080)}px`;
  mote.style.opacity = random(0.15, 0.6);
  mote.style.transform = `scale(${random(0.4, 1.3)})`;
  $("#dust").appendChild(mote);
}

const build = () => {
  gsap.set("#fade", { autoAlpha: 1 });
  gsap.set("#cursor", { x: 1300, y: 700, z: 4 });
  gsap.set("#dim", { z: 2 });
  gsap.set("#pub-sheen", { x: 0 });
  gsap.set("#keys", { xPercent: 0 });

  const toolX = (prefix, tool) => $(`#${prefix}-t-${tool}`).offsetLeft;
  gsap.set("#h-pill", { x: 0 });
  gsap.set("#e-pill", { x: toolX("e", "content") - 4 });
  gsap.set("#q-pill", { x: 0 });
  gsap.set("#tabpill", { x: 0, width: $("#tab-0").offsetWidth });
  gsap.set("#step-fill", { scaleX: 0.2 });

  // The dust drifts, slowly, the whole film through.
  $$(".mote").forEach((mote) => {
    tl.to(mote, { x: random(-160, 160), y: random(-300, -60), duration: 240, ease: "none" }, 0);
  });
  // Every record's label keeps turning, as long as you can see it.
  tl.to("#slate-record .record__label", { rotation: 360 * 120, duration: 240, ease: "none" }, 0);
  tl.to("#h-rec .record__label", { rotation: 360 * 60, duration: 240, ease: "none" }, 0);
  tl.to("#roller .record__label", { rotation: 360 * 200, duration: 240, ease: "none" }, 0);
  tl.to("#op-rec .record__label", { rotation: 360 * 6, duration: 11, ease: "power1.in" }, 0);

  /* ================================= Opening ================================= */
  chapter("Welcome", 0);
  section("open", 0);
  show("#s-open", 0);
  cameraNow(960, 540, 1.16, 0, { rx: 66, rz: -20, z: 120, frameY: 540 });
  gsap.set("#op-rec", { opacity: 0 });
  gsap.set("#op-arm", { z: 40, rotation: 0, opacity: 0 });
  gsap.set("#op-spark", { z: 4, scale: 0, opacity: 0 });
  gsap.set("#op-rings", { z: 2 });
  tl.to("#fade", { autoAlpha: 0, duration: 1.5, ease: "power2.out" }, 0.25);
  tl.fromTo("#op-spark", { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8, ease: "expo.out" }, 0.3);
  tl.to("#op-spark", { scale: 0.35, opacity: 0, duration: 1.7, ease: "power2.inOut" }, 1.0);
  cue("swell", 0.2, 0.9);
  cue("crackle", 0.2);
  tl.fromTo(".op-ring", { strokeDashoffset: 1, rotation: -70, transformOrigin: "0px 0px" }, { strokeDashoffset: 0, rotation: 0, duration: 1.05, ease: "power2.inOut", stagger: 0.075 }, 0.75);
  tl.to("#op-rec", { opacity: 1, duration: 1.2, ease: "power2.inOut" }, 2.0);
  tl.to("#op-rings", { opacity: 0.16, duration: 1.4, ease: "power1.inOut" }, 2.5);
  tl.to("#op-rings", { opacity: 0, duration: 0.8 }, 4.6);
  // Slowly coming round while it draws itself.
  tl.to("#cam", { rotation: -10, rotationX: 58, z: 160, duration: 3.7, ease: "none" }, 0);
  tl.to("#op-arm", { opacity: 1, duration: 0.5 }, 2.0);
  tl.to("#op-arm", { rotation: 25, duration: 1.45, ease: "power2.inOut" }, 2.3);
  cue("arm", 2.3);
  cue("needle", NEEDLE);
  sweep(NEEDLE, 1.6);
  tl.to("#op-arm", { rotation: 26.5, duration: 4, ease: "none" }, NEEDLE);

  // The camera lifts off the table as the first words arrive.
  camera(590, 540, 1.02, NEEDLE - 0.05, 2.6, { rx: 14, ry: -16, rz: -2, z: 0, frameY: 540, ease: "power3.inOut" });
  rise("#op-a", 4.05);
  rise("#op-c", 4.5);
  rise("#op-b", 4.95);
  note("Everything on your website starts here.", 4.05);
  fall("#op-a", 6.1);
  fall("#op-c", 6.13);
  fall("#op-b", 6.16);

  // The title lands on the bar, the record sinking like a sun behind it.
  const titleAt = NEEDLE + BAR;
  tl.to("#op-arm", { opacity: 0, duration: 0.4 }, titleAt - 0.7);
  camera(960, -60, 1.08, titleAt - 0.72, 1.15, { rx: 26, frameY: 540, ease: "expo.inOut" });
  rise("#op-title", titleAt, { stagger: 0.03, duration: 1.1 });
  tl.fromTo("#op-title", { letterSpacing: "0.05em" }, { letterSpacing: "-0.012em", duration: 1.6, ease: "expo.out" }, titleAt);
  tl.fromTo("#op-sub", { autoAlpha: 0, letterSpacing: "0.6em" }, { autoAlpha: 1, letterSpacing: "0.32em", duration: 1.2, ease: "expo.out" }, titleAt + 0.55);
  cue("hit", titleAt);
  sweep(titleAt + 0.1, 1.4);
  note("The WBSK Studio. A short film, starring you.", titleAt);

  // Down through the hole in the record's middle.
  const diveAt = NEEDLE + BAR * 2;
  fall("#op-title", diveAt - 0.62);
  tl.to("#op-sub", { autoAlpha: 0, duration: 0.3 }, diveAt - 0.62);
  camera(960, 540, 1, diveAt - 0.6, 0.85, { frameY: 540, ease: "power2.inOut" });
  camera(960, 540, 3.4, diveAt + 0.2, 0.72, { frameY: 540, ease: "power3.in" });
  tl.set(plate, { visibility: "visible", backgroundColor: "#15100c" }, diveAt + 0.62);
  shape(50, 1300, diveAt + 0.62, 0.32, "power2.in", (v) => { plate.style.clipPath = `circle(${v}px at 960px 540px)`; });
  cue("dive", diveAt + 0.1);

  /* ================================= Home ================================= */
  let t = diveAt + 0.95;
  const homeAt = t;
  chapter("Home and search", t);
  section("home", t);
  hide("#s-open", t);
  show("#s-home", t);
  // Home assembles itself out of the dark as the iris opens.
  cameraNow(900, 500, 0.68, t, { rx: 32, ry: -24, rz: 5, z: -300 });
  REVEAL.iris(t);
  tl.set(plate, { visibility: "hidden", backgroundColor: "#1f1914", clipPath: "none" }, t + 0.87);
  const HOME = ["#h-bg", "#h-nav", "#h-hero", "#h-a0", "#h-a1", "#h-a2", "#h-a3", "#h-a4", "#h-a5", "#h-wait", "#h-worth", "#h-last"];
  HOME.forEach((selector, index) => {
    const lift = index === 0 ? -80 : 120 + (index % 5) * 90;
    tl.fromTo(selector, { autoAlpha: index === 0 ? 1 : 0, z: lift * 2.4, y: index === 0 ? 0 : 50 }, { autoAlpha: 1, z: 0, y: 0, duration: 1.3, ease: "expo.out" }, t + 0.1 + index * 0.075);
    if (index > 2) cue("tick", t + 0.1 + index * 0.075, 0.35);
  });
  camera(960, 500, 0.9, t + 0.1, 2.4, { ease: "expo.out", frameY: 492 });
  sweep(t + 1.3, 1.6);
  say("Every morning <em>starts here.</em>", t + 1.1, 2.3);

  t += 3.45;
  focus("#h-wait", t, { pad: 4, radius: 24 });
  camera(rect("#h-wait").cx + 40, rect("#h-wait").cy, 1.72, t - 0.1, 1.2, { ry: -5, rx: 3 });
  say("<em>Waiting for you:</em> drafts, and reviews to approve.", t + 0.15, 3);
  cursorIn(1040, 700, t + 0.3);
  goTo("#h-wait .row:nth-of-type(1)", t + 0.5, 0.9, 70, 6);
  t += 3;
  focus("#h-worth", t, { pad: 4, radius: 24 });
  camera(rect("#h-worth").cx, rect("#h-worth").cy, 1.72, t - 0.1, 1.1, { ry: 2, rx: 3 });
  goTo("#h-worth .row:nth-of-type(2)", t + 0.15, 0.8, 90, 0);
  say("<em>Worth a look:</em> small fixes. No panic.", t + 0.15, 2.5);
  t += 2.55;
  unfocus(t);
  cursorOut(t);
  camera(960, 500, 0.86, t - 0.1, 1.1, { frameY: 480, rx: 8, ry: 3 });

  // Two keys, large as life.
  say("Lost? Press <em>⌘K</em> anywhere. (Windows: Ctrl + K.)", t + 0.3, 3);
  tl.fromTo("#keys", { autoAlpha: 0, scale: 0.75, y: 40 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.7, ease: "back.out(1.5)" }, t + 0.25);
  tl.to("#key-cmd", { y: 14, duration: 0.09, ease: "power2.in" }, t + 1.2);
  tl.to("#key-k", { y: 14, duration: 0.09, ease: "power2.in" }, t + 1.5);
  tl.to("#key-cmd, #key-k", { y: 0, duration: 0.3, ease: "back.out(3)" }, t + 1.95);
  cue("key", t + 1.2, 1.4);
  cue("key", t + 1.5, 1.4);
  tl.to("#keys", { autoAlpha: 0, scale: 1.18, duration: 0.28, ease: "power2.in" }, t + 2.05);
  const spotAt = t + 2.1;
  appear("#spot-veil", spotAt, 0.3, {});
  tl.fromTo("#spot", { autoAlpha: 0, y: -40, scale: 0.94, z: 180 }, { autoAlpha: 1, y: 0, scale: 1, z: 0, duration: 0.65, ease: "back.out(1.4)" }, spotAt);
  cue("pop", spotAt);
  camera(960, 390, 1.12, spotAt - 0.05, 0.9);
  off("#spot-ph", spotAt + 0.9);
  let end = type("#spot-t", "asha", spotAt + 0.9, 0.12);
  off("#set-0", end);
  on("#set-1", end);
  say("Type a couple’s name…", spotAt + 1.05, 1.9);
  const secondAt = end + 1.05;
  const again = { n: 11 };
  const spotT = $("#spot-t");
  tl.set(again, { n: 11 }, secondAt);
  tl.to(again, { n: 0, duration: 0.01, onUpdate() { if (again.n < 1) spotT.textContent = ""; } }, secondAt);
  off("#set-1", secondAt);
  on("#set-2", secondAt);
  const typed = { n: 0 };
  tl.to(typed, { n: 11, duration: 0.72, ease: "none", onUpdate() { spotT.textContent = "add wedding".slice(0, Math.round(typed.n)); } }, secondAt + 0.02);
  for (let i = 0; i < 11; i += 2) cue("key", secondAt + i * 0.065, 0.5);
  say("…or a job. Press return, and you’re there.", secondAt, 2.7);

  /* ================================= Add a wedding ================================= */
  const pop = rect("#spot-add");
  const wedAt = nextBar(secondAt + 2.7);
  // The highlighted row grows until it's the whole screen.
  const grow = onScreen(pop);
  cue("key", wedAt - 0.12, 1.4);
  tl.to("#spot-add", { scale: 0.98, duration: 0.08 }, wedAt - 0.12).to("#spot-add", { scale: 1, duration: 0.14 }, wedAt - 0.04);
  tl.set(plate, { visibility: "visible", backgroundColor: "#7a5c17" }, wedAt);
  shape(0, 1, wedAt, 0.62, "expo.inOut", (v) => {
    const k = 1 - v;
    plate.style.clipPath = `inset(${grow.top * k}px ${grow.right * k}px ${grow.bottom * k}px ${grow.left * k}px round ${16 * k}px)`;
  });
  tl.to(plate, { backgroundColor: "#1f1914", duration: 0.5, ease: "power2.in" }, wedAt + 0.2);
  COVER.none = () => 0.62;
  REVEAL.none = () => 0;
  section("wedding", wedAt);
  const s2 = slate(2, "Add a wedding", "Names, six photos, a gallery and films.", wedAt, "none", "split");
  tl.set(plate, { backgroundColor: "#1f1914" }, s2.out + 0.7);

  t = s2.ready;
  hide("#s-home", t);
  show("#s-edit", t);
  gsap.set("#drawer, #drawer-b, #drawer-c", { autoAlpha: 0 });
  // The form arrives as layers floating apart, and closes up as the camera comes round.
  const EDIT = ["#e-bg", "#side", "#form", "#pv", "#phone", "#e-nav"];
  const layerZ = { "#e-bg": -90, "#side": 40, "#form": 110, "#pv": 60, "#phone": 340, "#e-nav": 200 };
  EDIT.forEach((selector) => gsap.set(selector, { z: layerZ[selector] }));
  cameraNow(1040, 500, 0.74, t, { rx: 24, ry: 28, rz: -3, z: -200 });
  tl.to(EDIT, { z: 0, duration: 2.1, ease: "power3.inOut" }, t + 0.25);
  tl.fromTo("#side .sideitem, #side .sidehead", { x: -26, opacity: 0 }, { x: 0, opacity: 1, duration: 0.7, ease: "expo.out", stagger: 0.028 }, t + 0.6);
  tl.fromTo("#b-couple .field:not(#addr-field)", { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "expo.out", stagger: 0.07 }, t + 1);
  tl.fromTo("#stepbar, #bar, #foot", { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "expo.out", stagger: 0.12 }, t + 1.3);
  tl.fromTo(".tab", { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "expo.out", stagger: 0.06 }, t + 0.8);
  camera(960, 500, 0.915, t + 0.2, 2.2, { ease: "power3.inOut", frameY: 480 });
  sweep(t + 0.9, 1.5);
  say("A new wedding opens as <em>five steps.</em>", t + 0.5, 2.7);
  // A little wave along the tabs.
  for (let i = 0; i < 5; i += 1) {
    tl.to(`#tab-${i}`, { y: -7, duration: 0.15, ease: "power2.out" }, t + 1.9 + i * 0.11).to(`#tab-${i}`, { y: 0, duration: 0.34, ease: "back.out(3)" }, t + 2.05 + i * 0.11);
    cue("tick", t + 1.9 + i * 0.11, 0.3);
  }

  t += 3.3;
  camera(760, 340, 1.22, t, 1.2, { ry: -3 });
  cursorIn(1300, 620, t);
  click("#f-first", t + 0.1, 0.7);
  lit("#f-first", true, t + 0.82);
  end = type("#f-first-t", "Sample Meera", t + 0.9, 0.06);
  setHTML("#ed-title", "Sample Meera", end - 0.15);
  setHTML("#pv-names", "Sample Meera &amp;<br>Second name", end - 0.15);
  lit("#f-first", false, end + 0.1);
  say("Type their names. <em>The preview types along.</em>", t + 0.5, 3.3);
  lit("#f-second", true, end + 0.1);
  const afterFirst = end;
  end = type("#f-second-t", "Sample Arjun", end + 0.22, 0.06);
  setHTML("#ed-title", "Sample Meera &amp; Sample Arjun", end - 0.1);
  setHTML("#pv-names", "Sample Meera &amp;<br>Sample Arjun", end - 0.1);
  lit("#f-second", false, end + 0.1);
  tl.to("#ring-fill", { strokeDashoffset: 150.8 * 0.92, duration: 0.8, ease: "power3.out" }, afterFirst);
  setHTML("#bar-state", "Draft · not on the website yet", afterFirst);
  off("#b-new", afterFirst);
  appear("#saved", afterFirst + 0.1, 0.5, { x: -14 });
  on("#b-chips", afterFirst);
  appear("#addr-field", end + 0.15, 0.6, { y: 14 });
  cue("pop", end + 0.2);
  const cityAt = end + 0.55;
  say("The page address writes itself.", cityAt, 2.4);
  lit("#f-city", true, cityAt);
  end = type("#f-city-t", "Goa", cityAt, 0.08);
  setHTML("#pv-city", "GOA", end);
  lit("#f-city", false, end + 0.05);
  lit("#f-venue", true, end + 0.05);
  end = type("#f-venue-t", "Sample Beach House", end + 0.1, 0.04);
  lit("#f-venue", false, end + 0.1);

  // Next: the six photographs get a wall of their own.
  t = end + 0.45;
  chapter("The six photos", t);
  section("six", t);
  click("#step-next", t - 0.15, 0.6);
  const nextAt = t + 0.47;
  function tabTo(index, at) {
    const tab = $(`#tab-${index}`);
    tl.to("#tabpill", { x: tab.offsetLeft - 5, width: tab.offsetWidth, duration: 0.6, ease: "back.out(1.3)" }, at);
    setHTML("#step-n", String(index + 1), at);
    setHTML("#step-name", ["Couple", "Photos", "Story", "Films &amp; reels", "Homepage"][index], at);
    tl.to("#step-fill", { scaleX: (index + 1) / 5, duration: 0.7, ease: "power3.out" }, at);
  }
  function tickTab(index, at) {
    tl.fromTo(`#tick-${index}`, { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(3)" }, at);
    cue("tick", at, 0.9);
  }
  const ringTo = (fraction, at) => { tl.to("#ring-fill", { strokeDashoffset: 150.8 * (1 - fraction), duration: 0.9, ease: "power3.out" }, at); cue("tick", at, 0.5); };
  function bodyTo(from, to, at) {
    leave(from, at, 0.2, { x: -24 });
    appear(to, at + 0.14, 0.55, { x: 28 });
  }
  tabTo(1, nextAt);
  tickTab(0, nextAt);
  ringTo(0.2, nextAt);
  bodyTo("#b-couple", "#b-photos", nextAt);
  cursorOut(nextAt + 0.25);

  // Through the wall: the camera backs out of the form, the six frames hanging in the dark.
  t = nextAt + 0.5;
  camera(960, 500, 0.5, t, 0.8, { ease: "power3.in", z: -500, ry: -22 });
  tl.set(plate, { visibility: "visible", backgroundColor: "#17100b" }, t + 0.45);
  shape(0, 1, t + 0.45, 0.32, "power2.in", (v) => { plate.style.clipPath = "none"; plate.style.opacity = String(v); });
  cue("whoosh", t + 0.2, 0.7);
  t += 0.85;
  hide("#s-edit", t);
  show("#s-six", t);
  shape(1, 0, t, 0.5, "power2.out", (v) => { plate.style.opacity = String(v); });
  tl.set(plate, { visibility: "hidden", backgroundColor: "#1f1914" }, t + 0.52);
  const SIX = ["cover", "bride", "groom", "card", "desk", "mob"];
  // Each frame hangs at its own depth, so the wall has parallax as the camera tracks.
  const slotZ = [50, -30, 40, -20, 30, -10];
  SIX.forEach((id, i) => gsap.set(`#sl-${id}`, { z: slotZ[i] }));
  cameraNow(300, 320, 0.96, t, { ry: 26, rx: 4, z: -220 });
  tl.to(".slot", { opacity: 1, duration: 0.4, ease: "power1.out", stagger: 0.07 }, t);
  camera(480, 320, 1, t, 1.8, { ry: 12, rx: 2, ease: "power2.out" });
  say("Six photos. <em>Each has its own shape.</em>", t + 0.3, 2.6);
  appear("#br-a", t + 0.7, 0.8, { y: 10 });

  const land = (id, at, zFrom = 460) => {
    tl.fromTo(`#sl-${id} .slot__photo`, { opacity: 0, z: zFrom, rotation: random(-5, 5), scale: 1.04 }, { opacity: 1, z: 0, rotation: 0, scale: 1, duration: 0.62, ease: "power3.in" }, at);
    tl.fromTo(`#sl-${id} .slot__tick`, { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(3)" }, at + 0.62);
    cue("land", at + 0.6);
    cue("tick", at + 0.68, 0.6);
  };
  gsap.set(".slot__photo", { transformStyle: "flat" });
  t += 2.1;
  land("cover", t);
  say("<em>Album cover:</em> tall and narrow, 3:7.", t + 0.1, 2.3);
  camera(760, 320, 1, t + 0.8, 1.3, { ry: 6, rx: 2 });
  t += 2.15;
  land("bride", t);
  land("groom", t + 0.3);
  say("<em>Bride and groom pages:</em> a matching pair, 4:5.", t + 0.1, 2.9);
  camera(1120, 320, 0.94, t + 1.15, 1.5, { ry: 0, rx: 2 });
  appear("#br-b", t + 1.5, 0.8, { y: 10 });
  t += 2.75;
  land("card", t);
  say("<em>Card,</em> for the Weddings page: 4:5 again.", t + 0.1, 2.4);
  camera(2312, 320, 0.94, t + 1, 1.5, { ry: -6, rx: 2 });
  appear("#br-c", t + 1.5, 0.8, { y: 10 });
  t += 2.3;

  // A polite refusal, then the right one.
  say("Too small? The Studio refuses it, <em>politely.</em>", t + 0.1, 3.5);
  const tiny = rect("#tiny");
  tl.fromTo("#tiny", { autoAlpha: 0, x: 0, y: 0, rotation: 6 }, { autoAlpha: 1, x: 0, y: 0, rotation: 6, duration: 0.3 }, t);
  tl.to("#tiny", { x: 2312 - 135 - tiny.x, y: 300 - tiny.y, rotation: -3, duration: 0.8, ease: "power3.inOut" }, t + 0.2);
  tl.to("#tiny", { x: "+=22", duration: 0.06, repeat: 5, yoyo: true, ease: "none" }, t + 1.02);
  tl.to("#tiny", { y: "+=560", x: "+=160", rotation: 24, autoAlpha: 0, duration: 0.6, ease: "power2.in" }, t + 1.42);
  cue("nope", t + 1.02);
  appear("#nope", t + 1.1, 0.55, { y: 16 });
  leave("#nope", t + 3.1, 0.3);
  t += 3.4;
  land("desk", t);
  say("<em>Desktop cover,</em> 21:9. <em>Phone cover,</em> 3:4.", t + 0.1, 2.7);
  camera(2720, 320, 0.94, t + 0.75, 1.3, { ry: -10, rx: 2 });
  land("mob", t + 1.1);
  t += 2.6;

  // All six.
  camera(1656, 330, 0.565, t, 1.5, { ry: 0, rx: 0, ease: "power3.inOut" });
  sweep(t + 0.7, 1.4);

  // Back into the form: the gallery rains in.
  t += 1.85;
  tl.to("#cam", { z: 300, duration: 0.48, ease: "power2.in" }, t);
  tl.set(plate, { visibility: "visible", backgroundColor: "#17100b" }, t + 0.26);
  shape(0, 1, t + 0.26, 0.22, "power1.in", (v) => { plate.style.opacity = String(v); });
  t += 0.5;
  hide("#s-six", t);
  show("#s-edit", t);
  tl.set("#cursor", { z: 4 }, t);
  cameraNow(830, 450, 1.02, t, { ry: -8, rx: 5, z: 120 });
  shape(1, 0, t, 0.42, "power2.out", (v) => { plate.style.opacity = String(v); });
  tl.set(plate, { visibility: "hidden", backgroundColor: "#1f1914", opacity: 1 }, t + 0.44);
  camera(830, 460, 1.1, t, 1.3, { ry: -2, rx: 1, ease: "power3.out" });
  say("<em>The gallery:</em> drop 50 or 60 at once. Drag to reorder.", t + 0.2, 3.2);
  appear("#gal-label", t + 0.1, 0.4);
  const tiles = $$(".tile");
  tiles.forEach((element, i) => {
    const from = { opacity: 0, z: random(300, 620), y: random(-180, -40), rotation: random(-22, 22) };
    tl.fromTo(element, from, { opacity: 1, z: 0, y: 0, rotation: 0, duration: 0.6, ease: "power3.out" }, t + 0.2 + i * 0.021);
    if (i % 3 === 0) cue("patter", t + 0.55 + i * 0.021, 0.8);
  });
  const counted = { n: 0 };
  tl.to(counted, { n: 56, duration: 1.1, ease: "power1.out", onUpdate() { $("#gal-count").textContent = Math.round(counted.n); } }, t + 0.25);
  // One tile picked up and put down elsewhere.
  const g3 = tiles[3];
  const g3Box = rect(g3);
  const g7 = rect(tiles[7]);
  cursorIn(1200, 640, t + 1.3);
  go(g3Box.cx, g3Box.cy, t + 1.35, 0.55);
  press(null, t + 1.92, { sound: "soft" });
  const dx = g7.x - g3Box.x;
  tl.to(g3, { x: dx, y: -8, scale: 1.2, duration: 0.65, ease: "power3.inOut" }, t + 2.0);
  go(g3Box.cx + dx, g3Box.cy - 8, t + 2.0, 0.65);
  tiles.slice(4, 8).forEach((element) => tl.to(element, { x: -(dx / 4), duration: 0.5, ease: "power3.inOut" }, t + 2.1));
  tl.to(g3, { y: 0, scale: 1, duration: 0.3, ease: "back.out(2)" }, t + 2.65);
  tl.fromTo("#gal-small", { opacity: 0, scale: 1.6 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)" }, t + 2.8);

  // Every photo needs words.
  t += 3.15;
  cursorOut(t);
  appear("#desc-box", t, 0.6, { y: 40, scale: 0.97 });
  camera(rect("#desc-box").cx, rect("#desc-box").cy, 1.14, t - 0.05, 0.9);
  setHTML("#chip-b", "56 photo descriptions", t);
  say("Every photo needs a <em>description.</em> Yes, every one.", t + 0.15, 3.4);
  end = type("#f-desc-t", "Sample Meera and Sample Arjun laughing, Goa", t + 0.5, 0.05);
  const descLeft = { n: 56 };
  tl.to(descLeft, { n: 3, duration: 1.9, ease: "power2.in", onUpdate() { $("#chip-b").textContent = `${Math.round(descLeft.n)} photo descriptions`; } }, end + 0.4);
  say("Allow 10 to 15 minutes. Publishing waits for them.", end + 0.75, 3);
  t = end + 2.9;
  leave("#desc-box", t, 0.3, { y: 24 });

  // Story.
  t += 0.2;
  cursorIn(1000, 660, t - 0.25);
  click("#step-next", t, 0.6);
  camera(960, 470, 1.05, t, 0.9);
  const storyAt = t + 0.62;
  tabTo(2, storyAt);
  tickTab(1, storyAt);
  ringTo(0.4, storyAt);
  bodyTo("#b-photos", "#b-story", storyAt);
  say("A short line for the card, and their story.", storyAt + 0.1, 2.7);
  lit("#f-short", true, storyAt + 0.3);
  end = type("#f-short-t", "A quiet seaside wedding, with family close.", storyAt + 0.3, 0.018, 0.35);
  lit("#f-short", false, end + 0.03);
  lit("#f-story", true, end + 0.03);
  const storyText = "We stayed near, kept quiet, and let Goa do what it does at the end of a long day.";
  end = type("#f-story-t", storyText, end + 0.05, 0.012, 0.3);
  setHTML("#pv-story", storyText, end);
  lit("#f-story", false, end + 0.05);

  // Films.
  t = end + 0.3;
  click("#step-next", t, 0.3);
  const filmAt = t + 0.32;
  tabTo(3, filmAt);
  tickTab(2, filmAt);
  ringTo(0.6, filmAt);
  bodyTo("#b-story", "#b-films", filmAt);
  say("Films are YouTube links, <em>each with a 16:9 poster.</em>", filmAt + 0.1, 3.2);
  lit("#f-film", true, filmAt + 0.3);
  end = type("#f-film-t", "youtube.com/watch?v=sample-highlight", filmAt + 0.3, 0.016, 0.3);
  lit("#f-film", false, end);
  tl.fromTo("#poster-a", { opacity: 0, z: 200, rotation: -5 }, { opacity: 1, z: 0, rotation: 0, duration: 0.5, ease: "power3.in" }, end);
  cue("land", end + 0.48, 0.8);
  lit("#f-teaser", true, end + 0.3);
  const teaserEnd = type("#f-teaser-t", "youtube.com/watch?v=sample-teaser", end + 0.3, 0.014, 0.3);
  lit("#f-teaser", false, teaserEnd);
  tl.fromTo("#poster-b", { opacity: 0, z: 200, rotation: 5 }, { opacity: 1, z: 0, rotation: 0, duration: 0.5, ease: "power3.in" }, teaserEnd);
  cue("land", teaserEnd + 0.48, 0.8);
  lit("#f-reel", true, teaserEnd + 0.3);
  const reelEnd = type("#f-reel-t", "instagram.com/reel/sample", teaserEnd + 0.3, 0.014, 0.3);
  lit("#f-reel", false, reelEnd);
  tl.to("#reel-chip", { opacity: 1, duration: 0.3 }, reelEnd);

  // One switch: the homepage.
  t = reelEnd + 0.35;
  click("#step-next", t, 0.3);
  const homeStep = t + 0.32;
  tabTo(4, homeStep);
  tickTab(3, homeStep);
  ringTo(0.8, homeStep);
  bodyTo("#b-films", "#b-home", homeStep);
  camera(rect("#featrow").cx, rect("#featrow").cy + 90, 1.2, homeStep, 0.9, { rx: 3 });
  say("One switch puts their <em>album</em> on the homepage.", homeStep + 0.15, 3);
  const swAt = homeStep + 1.1;
  goTo("#sw-feat", homeStep + 0.35, 0.72);
  press("#sw-feat", swAt, { sound: "toggle" });
  tl.to("#sw-feat .switch__knob", { x: 40, duration: 0.42, ease: "back.out(2.2)" }, swAt);
  tl.to("#sw-feat .switch__on", { opacity: 1, duration: 0.25 }, swAt);
  // It slides into the row on the homepage.
  tl.fromTo("#tray-ours", { autoAlpha: 0, y: -90, scale: 1.3 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.75, ease: "back.out(1.3)" }, swAt + 0.15);
  tl.to(".trayitem--r", { x: 186, duration: 0.6, ease: "power3.out" }, swAt + 0.1);
  cue("land", swAt + 0.5, 0.8);

  /* ---------- The homepage album: the payoff ---------- */
  const albumAt = nextHalf(swAt + 1.5);
  chapter("The homepage album", albumAt);
  section("album", albumAt);
  cursorOut(albumAt - 0.3);
  tl.to("#pan", { scale: 1.5, duration: 0.6, ease: "power3.in" }, albumAt - 0.05);
  tl.set(plate, { visibility: "visible", backgroundColor: "#17100b" }, albumAt + 0.25);
  shape(0, 1, albumAt + 0.25, 0.28, "power2.in", (v) => { plate.style.opacity = String(v); });
  cue("whoosh", albumAt, 0.7);
  t = albumAt + 0.55;
  hide("#s-edit", t);
  show("#s-album", t);
  shape(1, 0, t, 0.5, "power2.out", (v) => { plate.style.opacity = String(v); });
  tl.set(plate, { visibility: "hidden", backgroundColor: "#1f1914", opacity: 1 }, t + 0.52);
  gsap.set("#album-cover", { z: 9, transformOrigin: "0% 50%" });
  gsap.set("#album", { transformOrigin: "50% 50%" });
  gsap.set("#page-r", { z: 8 });
  gsap.set("#page-l", { rotationY: 180 });
  cameraNow(960, 530, 0.62, t, { rx: 34, rz: -3, z: -60, frameY: 500 });
  // The row drifts along the table, as it does on the homepage.
  tl.fromTo("#al-row", { x: 260 }, { x: -60, duration: 9, ease: "none" }, t);
  gsap.set("#album", { scale: 0.827 });
  tl.fromTo("#album", { x: 260, z: 0 }, { x: 157, z: 0, duration: 2.9, ease: "none" }, t);
  camera(960, 530, 0.8, t, 3, { rx: 28, rz: -1, frameY: 500, ease: "power1.inOut" });
  say("On the homepage, albums drift along a dark table.", t + 0.3, 2.9);
  tl.fromTo("#album-glare", { x: -360 }, { x: 420, duration: 3, ease: "power1.inOut" }, t);

  t += 2.9;
  // It lifts towards you, and opens.
  say("Press one, and it <em>opens</em> to the bride and groom.", t, 3.4);
  tl.to("#album", { x: 260, z: 150, scale: 1, duration: 1.25, ease: "power3.inOut" }, t + 0.2);
  tl.to(".malbum", { opacity: 0.22, duration: 0.9, ease: "power2.inOut" }, t + 0.2);
  camera(960, 525, 0.98, t + 0.15, 1.9, { rx: 14, ry: -6, ease: "power3.inOut", frameY: 480 });
  cue("lift", t + 0.2);
  tl.to("#album-cover", { rotationY: -180, duration: 1.7, ease: "power2.inOut" }, t + 0.75);
  cue("page", t + 0.8);
  tl.to("#album-shadow", { left: "-104%", duration: 1.7, ease: "power2.inOut" }, t + 0.75);
  sweep(t + 1.4, 1.5);
  cue("chime", t + 2.3, 0.75);
  t += 3.4;
  camera(960, 525, 1.02, t, 2.6, { rx: 8, ry: 4, ease: "power1.inOut", frameY: 480 });
  say("Bride on the left. <em>Groom on the right.</em> Their names below.", t, 3.2);

  /* ================================= Step by step ================================= */
  t = nextHalf(t + 3.2);
  const s3 = slate(3, "Step by step", "A bar that says where you are, and what’s left.", t, "roll", "roll");
  section("steps", t);
  t = s3.ready;
  hide("#s-album", t);
  show("#s-edit", t);
  // Back on step 2, close up on the bar.
  const bar2 = rect("#stepbar");
  tabTo(1, t);
  leave("#b-home", t, 0.01);
  appear("#b-photos", t, 0.01, {});
  tl.set("#tick-1", { opacity: 0 }, t);
  tl.set("#tick-3", { opacity: 0 }, t);
  tl.set("#ring-fill", { strokeDashoffset: 150.8 * 0.6 }, t);
  setHTML("#chip-a", "wedding date", t);
  setHTML("#chip-b", "3 photo descriptions", t);
  setHTML("#chip-c", "2 film posters", t);
  cameraNow(bar2.cx, bar2.cy - 40, 1.6, t, { rx: 18, ry: -12, z: 120 });
  camera(bar2.cx, bar2.cy - 20, 1.72, t + 0.1, 1.8, { rx: 3, ry: -2, ease: "power3.out" });
  say("It always says where you are: <em>Step 2 of 5.</em>", t + 0.85, 2.7);
  focus("#stepbar", t + 0.95, { pad: 6, radius: 22 });

  t += 3.3;
  cursorIn(bar2.cx + 180, bar2.cy + 120, t - 0.3);
  say("<em>Next</em> and <em>Back</em> move you along. The line fills up.", t + 0.1, 2.9);
  click("#step-next", t, 0.65);
  const n1 = t + 0.67;
  tabTo(2, n1);
  bodyTo("#b-photos", "#b-story", n1);
  tl.fromTo("#step-fill", { filter: "brightness(1)" }, { filter: "brightness(1.5)", duration: 0.2, yoyo: true, repeat: 1 }, n1);
  click("#step-back", n1 + 0.6, 0.6);
  const n2 = n1 + 1.22;
  tabTo(1, n2);
  bodyTo("#b-story", "#b-photos", n2);
  unfocus(n2 + 0.6);
  // Ticks on finished steps.
  t = n2 + 0.75;
  const tabs = rect("#tabs");
  camera(tabs.cx, tabs.cy + 30, 1.72, t, 1, { ry: 2, rx: -1 });
  say("Finished steps get a <em>tick</em> at the top.", t + 0.1, 2.3);
  tickTab(1, t + 0.9);
  tl.to("#tab-1", { y: -5, duration: 0.14, ease: "power2.out" }, t + 0.9).to("#tab-1", { y: 0, duration: 0.34, ease: "back.out(3)" }, t + 1.04);
  go(tabs.x + 500, tabs.y + 110, t + 0.1, 0.9);

  // The ring, and the chips.
  t += 1.95;
  const barBox = rect("#bar");
  camera(barBox.cx, barBox.cy - 20, 1.72, t, 1.1, { rx: 3, ry: 3 });
  focus("#bar", t + 0.1, { pad: 6, radius: 26 });
  say("The <em>ring</em> fills up. Each chip names what’s left.", t + 0.2, 3);
  tl.to("#ring", { scale: 1.12, duration: 0.3, ease: "power2.out" }, t + 0.9).to("#ring", { scale: 1, duration: 0.5, ease: "back.out(2)" }, t + 1.2);
  const chips = [["#chip-a", 0], ["#chip-b", 0.14], ["#chip-c", 0.28]];
  chips.forEach(([chip, delay]) => {
    tl.to(chip, { y: -5, duration: 0.14, ease: "power2.out" }, t + 1.4 + delay).to(chip, { y: 0, duration: 0.34, ease: "back.out(3)" }, t + 1.54 + delay);
    cue("tick", t + 1.4 + delay, 0.5);
  });

  t += 2.75;
  say("Press a chip, and it <em>takes you to the place.</em>", t, 3);
  click("#chip-b", t, 0.75);
  const j1 = t + 0.77;
  unfocus(j1);
  camera(830, 500, 1.1, j1 + 0.05, 1, { rx: 1 });
  tabTo(1, j1);
  appear("#desc-box", j1 + 0.25, 0.55, { y: 30, scale: 0.97 });
  setHTML("#f-desc-t", "", j1);
  lit("#f-desc", true, j1 + 0.4);
  end = type("#f-desc-t", "Sample Arjun’s family on the lawn", j1 + 0.6, 0.03, 0.3);
  const fewer = { n: 3 };
  tl.to(fewer, { n: 0, duration: 0.8, ease: "none", onUpdate() { $("#chip-b").textContent = `${Math.round(fewer.n)} photo descriptions`; } }, end - 0.3);
  tl.to("#chip-b", { autoAlpha: 0, scale: 0.7, duration: 0.25, ease: "power2.in" }, end + 0.55);
  tl.to("#chip-c", { x: -rect("#chip-b").w - 8, duration: 0.42, ease: "back.out(1.6)" }, end + 0.7);
  ringTo(0.78, end + 0.55);
  leave("#desc-box", end + 0.8, 0.25);

  t = end + 1;
  setHTML("#chip-c", "2 film posters", t);
  tl.to("#chip-c", { autoAlpha: 0, scale: 0.7, duration: 0.25 }, t + 0.1);
  ringTo(0.9, t + 0.1);
  camera(760, 400, 1.2, t + 0.05, 1, {});
  click("#chip-a", t, 0.65);
  const j2 = t + 0.67;
  tabTo(0, j2);
  bodyTo("#b-photos", "#b-couple", j2);
  appear("#date-row", j2 + 0.2, 0.5, { y: 12 });
  lit("#f-date", true, j2 + 0.45);
  end = type("#f-date-t", "14 November 2026", j2 + 0.5, 0.045, 0.4);
  lit("#f-date", false, end + 0.1);
  tl.to("#chip-a", { autoAlpha: 0, scale: 0.7, duration: 0.25 }, end + 0.12);
  off("#b-chips", end + 0.4);
  appear("#b-ready", end + 0.4, 0.5, { y: 8 });
  ringTo(1, end + 0.3);
  tl.fromTo("#ring-tick", { autoAlpha: 0, scale: 0.4, transformOrigin: "50% 50%" }, { autoAlpha: 1, scale: 1, duration: 0.55, ease: "back.out(2.6)" }, end + 0.85);
  tl.to("#pub-lit", { autoAlpha: 1, duration: 0.5 }, end + 0.9);
  cue("chime", end + 0.82, 0.85);
  tickTab(4, end + 0.7);
  say("Nothing left? <em>Ready to publish.</em>", end + 0.3, 2.6);
  camera(barBox.cx, barBox.cy - 40, 1.45, end + 0.2, 1);
  cursorOut(end + 1.6);

  /* ================================= How this works ================================= */
  t = nextHalf(end + 2);
  const s4 = slate(4, "How this works", "Short steps, in a drawer, whenever you need them.", t, "turn", "turn");
  section("help", t);
  t = s4.ready;
  const help = rect("#help-btn");
  cameraNow(help.cx - 140, help.cy + 160, 1.38, t, { ry: -8, rx: 3, z: 40 });
  camera(help.cx - 140, help.cy + 150, 1.46, t + 0.1, 1.2, { ry: -2, ease: "power3.out" });
  cursorIn(help.cx - 300, help.cy + 240, t + 0.5);
  say("Not sure how something works?", t + 0.7, 2.2);
  t += 0.95;
  focus("#help-btn", t + 0.1, { pad: 7, radius: 34 });
  click("#help-btn", t + 0.3, 0.85);
  const drawerAt = t + 1.2;
  unfocus(drawerAt);
  camera(1240, 500, 0.98, drawerAt, 1.2, { ry: -9, rx: 2 });
  tl.fromTo("#drawer", { autoAlpha: 0, rotationY: -64, x: 180 }, { autoAlpha: 1, rotationY: 0, x: 0, duration: 0.95, ease: "power3.out" }, drawerAt);
  cue("drawer", drawerAt);
  tl.to("#phone", { x: -30, scale: 0.97, duration: 0.8, ease: "power2.out" }, drawerAt);
  tl.fromTo(".hstep", { opacity: 0, x: 44 }, { opacity: 1, x: 0, duration: 0.65, ease: "expo.out", stagger: 0.17 }, drawerAt + 0.4);
  say("Short steps for this kind of entry, beside your work.", drawerAt + 0.3, 3.4);
  cursorOut(drawerAt + 0.5);
  t = drawerAt + 3.2;
  camera(1130, 500, 0.86, t, 1.3, { ry: -20, rx: 4, z: -40 });
  tl.fromTo("#drawer-b", { autoAlpha: 0, x: 0, z: -10, rotationY: 0 }, { autoAlpha: 1, x: -330, z: -70, rotationY: 7, duration: 0.95, ease: "power3.out" }, t + 0.25);
  tl.fromTo("#drawer-c", { autoAlpha: 0, x: 0, z: -20, rotationY: 0 }, { autoAlpha: 1, x: -650, z: -140, rotationY: 12, duration: 0.95, ease: "power3.out" }, t + 0.42);
  cue("page", t + 0.25, 0.7);
  say("A film has its own. So does a review, or a shoot.", t + 0.3, 3);

  /* ================================= Saved and published ================================= */
  t = nextHalf(t + 2.6);
  const s5 = slate(5, "Saved and published", "It saves itself. Nothing goes live until you say.", t, "iris", "iris", { coverOptions: { x: 1500, y: 300 } });
  section("publish", t);
  t = s5.ready;
  tl.set("#drawer, #drawer-b, #drawer-c", { autoAlpha: 0 }, t);
  tl.set("#phone", { x: 0, scale: 1 }, t);
  const saved = rect("#saved");
  cameraNow(saved.cx + 120, saved.cy - 100, 1.9, t, { rx: 6, ry: 8, z: 40 });
  camera(saved.cx + 120, saved.cy - 100, 2.05, t, 2.6, { rx: 2, ry: 2, ease: "power2.out" });
  say("See this pill? <em>Every change saves itself.</em>", t + 0.85, 2.7);
  t += 1.45;
  setHTML("#saved-t", "Saving…", t);
  tl.fromTo("#saved-dot", { scale: 1 }, { scale: 0.5, duration: 0.25, yoyo: true, repeat: 3, ease: "sine.inOut" }, t);
  setHTML("#saved-t", "Saved just now", t + 1);
  tl.fromTo("#saved", { scale: 1 }, { scale: 1.07, duration: 0.16, yoyo: true, repeat: 1, ease: "power2.out" }, t + 1);
  cue("tick", t + 1, 0.9);
  t += 1.6;
  const pub = rect("#pub");
  camera(pub.cx - 200, pub.cy - 110, 1.72, t, 1.7, { rx: 2, ry: -4 });
  say("Nothing goes live until you press <em>Publish.</em>", t + 0.25, 3);
  cursorIn(pub.cx - 330, pub.cy + 80, t + 0.4);
  tl.to("#pub-sheen", { x: 340, duration: 0.9, ease: "power2.inOut" }, t + 1);
  tl.set("#pub-sheen", { x: 0 }, t + 1.95);
  tl.to("#pub-sheen", { x: 340, duration: 0.9, ease: "power2.inOut" }, t + 2.0);
  go(pub.cx, pub.cy, t + 1.2, 1.4);
  camera(pub.cx - 40, pub.cy - 72, 2.3, t + 1.8, 1.35, { rx: 1, ry: -1, ease: "power2.inOut" });
  const pressAt = nextBar(t + 2.8);
  // The riser leads to the press, and the press lands on the bar.
  cue("riser", pressAt - 2.2);
  tl.to("#pub", { scale: 0.92, duration: 0.09 }, pressAt).to("#pub", { scale: 1, duration: 0.45, ease: "back.out(3)" }, pressAt + 0.09);
  press(null, pressAt, { sound: "click" });
  cue("publish", pressAt);
  tl.to("#pub-lit", { autoAlpha: 0, duration: 0.5 }, pressAt + 0.8);
  off("#b-ready", pressAt + 0.2);
  on("#b-pub", pressAt + 0.2);
  setHTML("#bar-state", "On the website", pressAt + 0.2);
  tl.set("#e-dot", { background: "#ddaf3a", boxShadow: "0 0 0 4px rgb(221 175 58 / 0.22)" }, pressAt + 0.3);
  setHTML("#e-status", "Website updating…", pressAt + 0.3);
  tl.fromTo("#moment", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: "power2.out" }, pressAt + 0.06);
  tl.fromTo("#moment-glow", { scale: 0.2, opacity: 1 }, { scale: 1, opacity: 1, duration: 1.2, ease: "expo.out" }, pressAt + 0.06);
  drawOn("#mt-ring", pressAt + 0.1, 0.75, "power2.inOut");
  drawOn("#mt-path", pressAt + 0.62, 0.42, "power3.out");
  tl.fromTo("#moment-tick", { scale: 0.86 }, { scale: 1, duration: 1.4, ease: "expo.out" }, pressAt + 0.1);
  cue("goldtick", pressAt + 0.68);
  rise("#moment-a", pressAt + 0.7, { stagger: 0.025 });
  appear("#moment-b", pressAt + 1.15, 0.75, { y: 18 });
  note("Published. On the website in about 10 minutes.", pressAt + 0.7);
  // A little gold dust. Calm, not confetti.
  for (let i = 0; i < 46; i += 1) {
    const spark = document.createElement("i");
    spark.className = "spark";
    $("#sparks").appendChild(spark);
    const angle = random(0, Math.PI * 2);
    const far = random(160, 760);
    tl.fromTo(spark, { opacity: 0, x: Math.cos(angle) * 70, y: Math.sin(angle) * 70, scale: random(0.5, 1.3) }, { opacity: 0.95, x: Math.cos(angle) * far * 0.6, y: Math.sin(angle) * far * 0.6, duration: 0.55, ease: "expo.out" }, pressAt + 0.68 + random(0, 0.12));
    tl.to(spark, { opacity: 0, x: Math.cos(angle) * far, y: Math.sin(angle) * far + random(40, 170), duration: random(1.1, 2), ease: "power1.out" }, pressAt + 1.25);
  }
  t = pressAt + 2.6;
  appear("#moment-link", t, 0.6, { y: 20 });
  cue("pop", t, 0.8);
  say("When it’s ready, <em>View on website</em> takes you there.", t + 0.15, 3);
  // A cursor on the top layer, for this one link.
  const cursorTop = document.createElement("div");
  cursorTop.id = "cursor2";
  cursorTop.innerHTML = $("#cursor").innerHTML.replace('id="cur-in"', 'id="cur2-in"');
  cursorTop.style.cssText = "position:absolute;left:0;top:0;width:46px;height:46px;opacity:0;visibility:hidden";
  $("#moment").appendChild(cursorTop);
  $("#cur2-in").style.cssText = "width:46px;height:46px;filter:drop-shadow(0 7px 8px rgb(0 0 0 / 0.5));transform-origin:8px 6px";
  tl.set("#cursor", { autoAlpha: 0 }, pressAt + 0.5);
  tl.fromTo("#cursor2", { autoAlpha: 0, x: 1300, y: 900 }, { autoAlpha: 1, x: 1300, y: 900, duration: 0.3 }, t + 0.5);
  tl.to("#cursor2", { x: 960, duration: 0.95, ease: "power3.inOut" }, t + 0.7);
  tl.to("#cursor2", { y: 776, duration: 0.95, ease: "power2.inOut" }, t + 0.7);
  const viewAt = t + 1.75;
  tl.to("#cur2-in", { scale: 0.8, duration: 0.08 }, viewAt).to("#cur2-in", { scale: 1, duration: 0.3, ease: "back.out(3)" }, viewAt + 0.08);
  tl.to("#moment-link", { scale: 0.95, duration: 0.08 }, viewAt).to("#moment-link", { scale: 1, duration: 0.4, ease: "back.out(3)" }, viewAt + 0.08);
  cue("click", viewAt);
  // The page, on a phone. Always check it on a phone.
  tl.to("#moment-tick, #moment-a, #moment-b, #moment-link, #cursor2", { autoAlpha: 0, y: -50, duration: 0.45, ease: "power2.in" }, viewAt + 0.25);
  tl.set("#live", { transformPerspective: 1700 }, viewAt);
  tl.fromTo("#live", { autoAlpha: 0, y: 900, rotationX: -40, rotationY: 16 }, { autoAlpha: 1, y: 0, rotationX: 0, rotationY: -4, duration: 1.2, ease: "expo.out" }, viewAt + 0.4);
  tl.to("#live", { rotationY: 5, duration: 3.2, ease: "none" }, viewAt + 1.6);
  cue("lift", viewAt + 0.4, 0.8);
  say("Then look at it on your phone. <em>Always.</em>", viewAt + 0.65, 2.5);

  /* ================================= Everything else ================================= */
  t = nextHalf(viewAt + 2.6);
  const s6 = slate(6, "Films, pre-wedding and more", "The other things you’ll look after.", t, "slats", "slats");
  section("more", t);
  t = s6.ready;
  tl.set("#moment, #live", { autoAlpha: 0 }, t);
  hide("#s-edit", t);
  show("#s-spin", t);
  const CARDS = ["#c-films", "#c-pre", "#c-rev", "#c-team", "#c-roles", "#c-feat"];
  const R = 1200;
  CARDS.forEach((card, i) => {
    const angle = (i * 60 * Math.PI) / 180;
    gsap.set(card, { x: Math.sin(angle) * R, z: Math.cos(angle) * R, rotationY: i * 60, opacity: i === 0 ? 1 : 0.35 });
  });
  gsap.set("#ring-3d", { z: -R });
  const turnTo = (index, at) => {
    tl.to("#ring-3d", { rotationY: -index * 60, duration: 1.05, ease: "power3.inOut" }, at);
    CARDS.forEach((card, i) => tl.to(card, { opacity: i === index ? 1 : 0.32, duration: 0.7, ease: "power2.inOut" }, at + 0.2));
    cue("turnstile", at, 0.8);
    sweep(at + 0.45, 1);
  };
  cameraNow(960, 470, 0.86, t, { rx: 12, ry: -14, z: -220 });
  camera(960, 470, 0.98, t + 0.05, 1.6, { rx: 2, ease: "power3.out" });

  // Films: two switches, two places.
  say("<em>Films:</em> a YouTube link, a poster, two switches.", t + 0.95, 3);
  cursorIn(1200, 880, t + 1);
  const sw1 = rect("#sw-f1");
  const sw2 = rect("#sw-f2");
  // Measured with the card turned to the front.
  go(sw1.cx, sw1.cy, t + 1.5, 0.8);
  const a1 = t + 2.35;
  press("#sw-f1", a1, { sound: "toggle" });
  tl.to("#sw-f1 .switch__knob", { x: 40, duration: 0.42, ease: "back.out(2.2)" }, a1);
  tl.to("#sw-f1 .switch__on", { opacity: 1, duration: 0.25 }, a1);
  tl.to("#mp-home .lit", { opacity: 1, duration: 0.4 }, a1 + 0.2);
  tl.fromTo("#mp-home", { y: 0 }, { y: -8, duration: 0.2, yoyo: true, repeat: 1, ease: "power2.out" }, a1 + 0.2);
  cue("pop", a1 + 0.2, 0.7);
  go(sw2.cx, sw2.cy, a1 + 0.35, 0.65);
  const a2 = a1 + 1.05;
  press("#sw-f2", a2, { sound: "toggle" });
  tl.to("#sw-f2 .switch__knob", { x: 40, duration: 0.42, ease: "back.out(2.2)" }, a2);
  tl.to("#sw-f2 .switch__on", { opacity: 1, duration: 0.25 }, a2);
  tl.to("#mp-films .lit", { opacity: 1, duration: 0.4 }, a2 + 0.2);
  tl.fromTo("#mp-films", { y: 0 }, { y: -8, duration: 0.2, yoyo: true, repeat: 1, ease: "power2.out" }, a2 + 0.2);
  cue("pop", a2 + 0.2, 0.7);
  say("<em>Featured:</em> the homepage. <em>Show on Films page:</em> the Films page.", a2 + 0.2, 3.1);
  cursorOut(a2 + 0.9);

  // Pre-wedding.
  t = a2 + 3.25;
  turnTo(1, t);
  const places = [[40, 130], [278, 54], [530, 16], [782, 54], [1020, 130]];
  places.forEach(([x, y], i) => gsap.set(`#arc-${i}`, { left: x, top: y }));
  say("<em>Pre-wedding:</em> add a destination, then its shoots.", t + 0.6, 3.1);
  const preSteps = ["#pre-a", "#pre-b"];
  preSteps.forEach((step, i) => tl.fromTo(step, { scale: 1, boxShadow: "inset 0 0 0 1px rgb(58 36 16 / 0.08)" }, { scale: 1.035, boxShadow: "inset 0 0 0 2.5px #ddaf3a", duration: 0.4, ease: "back.out(2)" }, t + 1.1 + i * 0.8));
  preSteps.forEach((step, i) => cue("tick", t + 1.1 + i * 0.8, 0.7));
  gsap.set("#arc-4", { autoAlpha: 0 });
  // The records turn, the fifth arriving only when it has a shoot.
  for (let i = 0; i < 5; i += 1) tl.to(`#arc-${i} .record__label`, { rotation: 360 * 2, duration: 14, ease: "none" }, t);
  const fifthAt = t + 3.2;
  tl.fromTo("#pre-c", { scale: 1, boxShadow: "inset 0 0 0 1px rgb(58 36 16 / 0.08)" }, { scale: 1.035, boxShadow: "inset 0 0 0 2.5px #ddaf3a", duration: 0.4, ease: "back.out(2)" }, fifthAt - 0.1);
  tl.fromTo("#arc-4", { autoAlpha: 0, x: 420, rotation: 200 }, { autoAlpha: 1, x: 0, rotation: 0, duration: 1.05, ease: "power3.out" }, fifthAt);
  cue("recordroll", fifthAt);
  say("Its <em>record</em> appears once it has a published shoot.", fifthAt + 0.05, 3.2);

  // Reviews.
  t = fifthAt + 3.05;
  turnTo(2, t);
  say("<em>Reviews:</em> ask the couple first, then switch on Approved.", t + 0.55, 3.4);
  for (let i = 0; i < 5; i += 1) {
    tl.fromTo(`#st-${i}`, { opacity: 0, scale: 0.3, rotation: -60 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.5, ease: "back.out(2.6)" }, t + 1 + i * 0.1);
    cue("tick", t + 1 + i * 0.1, 0.5);
  }
  const swr = rect("#sw-rev");
  cursorIn(1100, 860, t + 1.2);
  go(swr.cx, swr.cy, t + 1.3, 0.8);
  const a3 = t + 2.15;
  press("#sw-rev", a3, { sound: "toggle" });
  tl.to("#sw-rev .switch__knob", { x: 40, duration: 0.42, ease: "back.out(2.2)" }, a3);
  tl.to("#sw-rev .switch__on", { opacity: 1, duration: 0.25 }, a3);
  cursorOut(a3 + 0.5);

  // Team.
  t = a3 + 1.25;
  turnTo(3, t);
  say("<em>Team:</em> a black and white 4:5 portrait.", t + 0.55, 2.2);
  tl.fromTo(".teamcard", { y: 60, opacity: 0.2 }, { y: 0, opacity: 1, duration: 0.8, ease: "expo.out", stagger: 0.09 }, t + 0.5);

  // Open roles.
  t += 2.55;
  turnTo(4, t);
  say("<em>Open roles:</em> on Careers, and in its form.", t + 0.55, 2.2);
  tl.fromTo(".rolerow", { x: 70, opacity: 0.2 }, { x: 0, opacity: 1, duration: 0.8, ease: "expo.out", stagger: 0.1 }, t + 0.5);

  // Featured on.
  t += 2.7;
  turnTo(5, t);
  say("<em>Featured on:</em> who has written about you.", t + 0.55, 2.4);
  tl.fromTo(".feat", { scale: 0.86, opacity: 0.2 }, { scale: 1, opacity: 1, duration: 0.7, ease: "back.out(1.6)", stagger: 0.07 }, t + 0.5);
  t += 2.75;

  /* ================================= The chat ================================= */
  t = nextHalf(t);
  const s7 = slate(7, "The chat enquiry", "One question at a time, in your words.", t, "bubble", "bubble");
  section("chat", t);
  t = s7.ready;
  hide("#s-spin", t);
  show("#s-chat", t);
  gsap.set("#qform", { z: -500, opacity: 0 });
  gsap.set("#sw-guests .switch__knob, #sw-q2 .switch__knob", { x: 40 });
  gsap.set("#sw-guests .switch__on, #sw-q2 .switch__on", { opacity: 1 });
  const TOPS = { "m-1": 0, "m-2": 84, "m-3": 168, "m-4": 240, "m-5": 324, "m-6": 408, "m-7": 480, "m-8": 562 };
  Object.entries(TOPS).forEach(([id, top]) => gsap.set(`#${id}`, { top }));
  cameraNow(520, 400, 1.08, t, { ry: 14, rx: 4, z: -80 });
  camera(520, 400, 1.16, t + 0.05, 1.8, { ry: 4, rx: 1, ease: "power3.out" });
  say("On the website, couples answer <em>one question at a time.</em>", t + 0.6, 3.3);
  const bubbleIn = (id, at, from = "them") => {
    tl.fromTo(`#${id}`, { autoAlpha: 0, y: 26, scale: 0.92, transformOrigin: from === "them" ? "0% 100%" : "100% 100%" }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(1.5)" }, at);
    cue("bubble-tick", at, from === "them" ? 0.9 : 0.6);
  };
  const typing = (top, at, duration = 0.65) => {
    tl.set("#chat-typing", { top: top + 136 }, at);
    tl.to("#chat-typing", { opacity: 1, duration: 0.15 }, at);
    tl.fromTo("#chat-typing i", { y: 0 }, { y: -7, duration: 0.2, yoyo: true, repeat: 3, stagger: 0.09, ease: "sine.inOut" }, at);
    tl.to("#chat-typing", { opacity: 0, duration: 0.1 }, at + duration);
  };
  t += 0.6;
  bubbleIn("m-1", t);
  bubbleIn("m-2", t + 0.8, "me");
  tl.to("#chat-fill", { scaleX: 0.2, duration: 0.6, ease: "power2.out" }, t + 0.8);
  typing(168, t + 1.15, 0.36);
  bubbleIn("m-3", t + 1.55);
  bubbleIn("m-4", t + 1.9);
  bubbleIn("m-5", t + 2.6, "me");
  tl.to("#chat-fill", { scaleX: 0.35, duration: 0.6, ease: "power2.out" }, t + 2.6);
  typing(408, t + 2.95, 0.32);
  bubbleIn("m-6", t + 3.3);
  bubbleIn("m-7", t + 3.65);
  camera(520, 430, 1.04, t + 3.3, 1.1, { ry: 2, rx: 1 });
  tl.fromTo(".pick", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "back.out(1.6)", stagger: 0.06 }, t + 4);
  on("#m-8", t + 4);
  const pick = rect("#pick-1");
  cursorIn(pick.cx + 260, pick.cy + 150, t + 4);
  say("Their answers reach you as usual.", t + 3.2, 2.2);
  go(rect("#pick-1").cx, rect("#pick-1").cy, t + 4.15, 0.6);
  press("#pick-1", t + 4.8, { sound: "click" });
  lit("#pick-1", true, t + 4.8);
  tl.to("#chat-fill", { scaleX: 0.5, duration: 0.6, ease: "power2.out" }, t + 4.8);
  cursorOut(t + 5.1);

  // Round to the Studio: the same chat, the words yours.
  t += 5.45;
  tl.to("#qform", { z: 0, opacity: 1, duration: 1.3, ease: "power3.inOut" }, t);
  camera(960, 450, 1.02, t, 1.5, { ry: -5, rx: 2 });
  cue("whoosh", t, 0.6);
  say("In the Studio, <em>Enquiry forms</em> lets you reword them.", t + 0.4, 3);
  cursorIn(1500, 880, t + 0.9);
  t += 1.95;
  click("#f-ask", t, 0.7);
  lit("#f-ask", true, t + 0.72);
  end = type("#f-ask-t", "Where are you getting married?", t + 0.8, 0.045, 0.45);
  lit("#f-ask", false, end + 0.1);
  // The bubble takes the new words as you finish.
  setHTML("#m-4-b", "Where are you getting married?", end + 0.05);
  tl.fromTo("#m-4-b", { boxShadow: "0 0 0 0 rgb(221 175 58 / 0)" }, { boxShadow: "0 0 0 5px rgb(221 175 58 / 0.75)", duration: 0.25, yoyo: true, repeat: 1 }, end + 0.05);
  cue("pop", end + 0.06, 0.8);
  say("<em>How the chat asks it</em> changes the question…", t + 0.85, 2.6);
  t = end + 1.05;
  lit("#f-reply", true, t);
  end = type("#f-reply-t", "[answer]! We love it there.", t + 0.1, 0.05, 0.45);
  lit("#f-reply", false, end + 0.1);
  setHTML("#m-6-b", "Goa! We love it there.", end + 0.05);
  tl.fromTo("#m-6-b", { boxShadow: "0 0 0 0 rgb(221 175 58 / 0)" }, { boxShadow: "0 0 0 5px rgb(221 175 58 / 0.75)", duration: 0.25, yoyo: true, repeat: 1 }, end + 0.05);
  cue("pop", end + 0.06, 0.8);
  say("…<em>What the chat says back</em> changes its reply.", t, 2.7);
  t = end + 0.85;
  say("Switch a question off, and <em>the chat skips it.</em>", t + 0.15, 2.7);
  goTo("#sw-guests", t + 0.15, 0.7);
  const hideAt = t + 0.9;
  press("#sw-guests", hideAt, { sound: "toggle" });
  // Switched on at the start of the film's chat, off now.
  tl.to("#sw-guests .switch__knob", { x: 0, duration: 0.42, ease: "back.out(2.2)" }, hideAt);
  tl.to("#sw-guests .switch__on", { opacity: 0, duration: 0.25 }, hideAt);
  setHTML("#q-guests-s", "Hidden", hideAt + 0.1);
  tl.to("#q-guests", { opacity: 0.55, duration: 0.3 }, hideAt + 0.1);
  cursorOut(hideAt + 0.8);

  /* ================================= Quotes ================================= */
  t = nextHalf(hideAt + 1.95);
  const s8 = slate(8, "Quotes", "A rough estimate, from your own prices.", t, "strips", "strips");
  section("quotes", t);
  t = s8.ready;
  hide("#s-chat", t);
  show("#s-quotes", t);
  const QS = ["#q-bg", "#q-nav", "#q-head", "#q-enq", "#q-est", "#q-prices"];
  const qZ = { "#q-bg": -60, "#q-nav": 180, "#q-head": 60, "#q-enq": 120, "#q-est": 240, "#q-prices": 300 };
  QS.forEach((s) => gsap.set(s, { z: qZ[s] }));
  // The menu first: the pill glides to Quotes.
  const qTool = rect("#q-t-quotes");
  cameraNow(qTool.cx, 120, 1.5, t, { rx: 22, ry: -10, z: 40, frameY: 340 });
  camera(qTool.cx, 120, 1.6, t + 0.05, 1.2, { rx: 6, ry: -2, ease: "power3.out", frameY: 340 });
  say("A new item in the top menu: <em>Quotes.</em>", t + 0.85, 2.3);
  const pillTo = toolX("q", "quotes") - 4;
  tl.to("#q-pill", { x: pillTo, duration: 0.65, ease: "back.out(1.4)" }, t + 1.2);
  cue("tick", t + 1.25, 0.8);
  tl.to(QS, { z: 0, duration: 1.4, ease: "power3.inOut" }, t + 1.6);
  tl.fromTo("#q-enq .field, #q-enq .qline", { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "expo.out", stagger: 0.05 }, t + 1.9);
  tl.fromTo("#q-range, #q-msg, #q-send", { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "expo.out", stagger: 0.09 }, t + 2.1);
  t += 2.4;

  // Your prices: saved privately.
  camera(960, 465, 1.12, t, 1.2, { frameY: 468 });
  tl.to("#q-enq, #q-est, #q-head", { opacity: 0.28, duration: 0.5 }, t);
  tl.to("#q-prices", { top: 230, height: 470, left: 360, width: 1200, duration: 0.95, ease: "power3.inOut" }, t + 0.1);
  tl.to("#qp-rows", { opacity: 1, duration: 0.4 }, t + 0.7);
  tl.to("#qp-save", { opacity: 1, duration: 0.4 }, t + 0.8);
  say("First, your <em>prices.</em> These are made up.", t + 0.3, 2.7);
  const qpField = (id, value, at) => { lit(id, true, at); const e = type(`${id}-t`, value, at + 0.04, 0.035, 0.3); lit(id, false, e + 0.03); return e + 0.06; };
  let q = t + 1.1;
  q = qpField("#qp-day", "10,000", q);
  q = qpField("#qp-base", "10,000", q);
  q = qpField("#qp-travel", "1,000", q);
  q = qpField("#qp-tax", "10", q);
  cursorIn(1500, 800, q - 0.3);
  say("Saved privately: <em>only people signed in can see them.</em>", q + 0.4, 3.2);
  go(1457, 647, q, 0.7);
  const saveAt = q + 0.75;
  press("#qp-save", saveAt, { sound: "click" });
  setHTML("#qp-private", `<i id="qp-lock">${I.lock}</i>Saved. Checked: the public can’t see them.`, saveAt + 0.25);
  cue("lock", saveAt + 0.25);
  tl.fromTo("#qp-private", { scale: 1, transformOrigin: "0% 50%" }, { scale: 1.08, duration: 0.2, yoyo: true, repeat: 1, ease: "power2.out" }, saveAt + 0.25);
  cursorOut(saveAt + 0.3);

  // Back to its place; the couple's answers.
  t = saveAt + 2.15;
  tl.to("#q-prices", { top: 830, height: 136, left: 120, width: 860, duration: 0.9, ease: "power3.inOut" }, t);
  tl.to("#qp-rows, #qp-save", { opacity: 0, duration: 0.25 }, t);
  tl.to("#q-enq, #q-est, #q-head", { opacity: 1, duration: 0.5 }, t + 0.3);
  camera(960, 500, 0.98, t + 0.1, 1.1, { ry: 2, frameY: 476 });
  say("Then fill in what the couple told the chat.", t + 0.3, 2.8);
  t += 0.9;
  lit("#q-name", true, t);
  end = type("#q-name-t", "Sample Meera", t, 0.04, 0.4);
  lit("#q-name", false, end);
  lit("#q-place", true, end);
  const placeEnd = type("#q-place-t", "Goa", end + 0.03, 0.05, 0.4);
  lit("#q-place", false, placeEnd);
  lit("#q-date", true, placeEnd);
  const dateEnd = type("#q-date-t", "November 2026", placeEnd + 0.03, 0.03, 0.4);
  lit("#q-date", false, dateEnd);
  const chipOn = (selector, at) => {
    lit(selector, true, at);
    tl.fromTo(selector, { scale: 0.9 }, { scale: 1, duration: 0.4, ease: "back.out(3)" }, at);
    cue("click", at, 0.8);
  };
  t = dateEnd + 0.1;
  const prices = [[30000, 36000], [50000, 61000], [55000, 68000], [61000, 75000]];
  let lastPrice = [0, 0];
  const bump = (index, at) => {
    roll("#q-low", lastPrice[0], prices[index][0], at, 0.6);
    roll("#q-high", lastPrice[1], prices[index][1], at, 0.6);
    lastPrice = prices[index];
    tl.fromTo("#q-range", { scale: 1, transformOrigin: "0% 50%" }, { scale: 1.035, duration: 0.14, yoyo: true, repeat: 1, ease: "power2.out" }, at);
  };
  chipOn("#qc-what-0", t);
  chipOn("#qc-cam-1", t + 0.4);
  bump(0, t + 0.4);
  setHTML("#q-days-t", "2", t + 0.8);
  cue("key", t + 0.8, 0.8);
  bump(1, t + 0.8);
  chipOn("#qc-where-1", t + 1.2);
  bump(2, t + 1.2);
  chipOn("#qc-guests-1", t + 1.6);
  bump(3, t + 1.6);

  // The estimate and its working.
  t += 2.25;
  camera(1400, 400, 1.34, t, 1.2, { ry: -5, rx: 1 });
  say("Up comes the <em>estimate range,</em> and how it was worked out.", t + 0.15, 3.2);
  tl.fromTo(".qlr", { autoAlpha: 0, x: 40 }, { autoAlpha: 1, x: 0, duration: 0.55, ease: "expo.out", stagger: 0.14 }, t + 0.5);
  for (let i = 0; i < 5; i += 1) cue("tick", t + 0.5 + i * 0.14, 0.45);
  t += 2.9;
  camera(1400, 700, 1.34, t, 1.1, { ry: -2 });
  say("And a <em>message,</em> for you to read and change.", t + 0.1, 2.7);
  const message = "Hi Meera, thank you for writing to us about your wedding in Goa, in November 2026.\n\nBased on what you’ve told us, a rough estimate is ₹61,000 to ₹75,000.\n\nThis is only a starting point. Once we’ve spoken…";
  type("#q-msg-t", message, t + 0.3, 0.0115, 0);
  cue("patter", t + 0.5, 0.5);
  t += 2.55;
  say("<em>Copy</em> it, or open it in <em>WhatsApp</em> or <em>email.</em>", t, 2.9);
  cursorIn(1500, 960, t);
  click("#qb-copy", t + 0.1, 0.65);
  setHTML("#qb-copy-t", "Copied", t + 0.77);
  cue("tick", t + 0.78, 0.9);
  goTo("#qb-wa", t + 1.05, 0.55);
  tl.to("#qb-wa", { background: "rgb(122 92 23 / 0.1)", duration: 0.2 }, t + 1.5);
  tl.to("#qb-wa", { background: "rgb(122 92 23 / 0)", duration: 0.2 }, t + 2);
  goTo("#qb-mail", t + 1.95, 0.55);
  tl.to("#qb-mail", { background: "rgb(122 92 23 / 0.1)", duration: 0.2 }, t + 2.4);
  cursorOut(t + 2.4);
  t += 2.6;
  // Nothing about a couple is kept.
  camera(960, 490, 0.93, t, 1.2, { frameY: 478 });
  say("<em>Nothing about a couple is saved here.</em>", t + 0.2, 2.8);
  const wipe = (selector, at) => tl.to(selector, { opacity: 0, duration: 0.5, ease: "power2.in" }, at);
  wipe("#q-name-t, #q-place-t, #q-date-t, #q-days-t, #q-msg-t", t + 1);
  wipe("#q-lines, #q-range", t + 1.1);
  ["#qc-what-0", "#qc-cam-1", "#qc-where-1", "#qc-guests-1"].forEach((chip) => lit(chip, false, t + 1.35));
  cue("swell", t + 0.9, 0.5);

  /* ================================= Good to know ================================= */
  t = nextHalf(t + 2.55);
  const s9 = slate(9, "Good to know", "Photo sizes, taking things down, the status light.", t, "crop", "crop", { chapterTitle: "Photo sizes and presets" });
  section("know", t);
  t = s9.ready;
  hide("#s-quotes", t);
  show("#s-sizes", t);
  const crops = [["3:7", "Album cover · 2800 px", 240, 560, 0], ["4:5", "Card, bride and groom · 2000 px", 432, 540, 1], ["21:9", "Desktop cover · 3000 px", 860, 369, 2], ["3:4", "Phone cover · 2000 px", 405, 540, 3], ["16:9", "Film poster · 1920 px", 860, 484, 5]];
  const cropAt = (index) => ({ left: 600 - crops[index][2] / 2, top: 370 - crops[index][3] / 2, width: crops[index][2], height: crops[index][3] });
  gsap.set("#crop", cropAt(0));
  gsap.set("#presets", { z: 60 });
  cameraNow(960, 480, 0.92, t, { ry: 16, rx: 4, z: -80 });
  camera(960, 480, 0.97, t + 0.05, 2.4, { ry: -3, rx: 1, ease: "power2.out" });
  on("#crop-photo", t);
  on("#crop", t);
  on("#crop-ratio", t);
  say("Photos start in Lightroom. <em>Nine presets</em> size them for you.", t + 0.75, 4.2);
  lit("#pr-0", true, t + 0.1);
  const STEP = 0.78;
  for (let i = 1; i < crops.length; i += 1) {
    const at = t + 0.3 + i * STEP;
    tl.to("#crop", { ...cropAt(i), duration: 0.72, ease: "power4.inOut" }, at);
    setHTML("#crop-r", crops[i][0], at + 0.3);
    setHTML("#crop-n", crops[i][1], at + 0.3);
    lit(`#pr-${crops[i - 1][4]}`, false, at + 0.2);
    lit(`#pr-${crops[i][4]}`, true, at + 0.2);
    cue("crop-tick", at + 0.3, 0.8);
  }

  // Archive, Remove, Hide.
  t = nextHalf(t + 0.3 + crops.length * STEP + 0.3);
  chapter("Taking things down", t);
  section("down", t);
  tl.to("#presets", { x: 1400, rotationY: -40, duration: 0.7, ease: "power3.in" }, t);
  tl.to("#crop, #crop-photo, #crop-ratio", { autoAlpha: 0, x: -200, duration: 0.5, ease: "power3.in" }, t);
  cue("whoosh", t, 0.7);
  show("#s-down", t + 0.5);
  hide("#s-sizes", t + 0.72);
  const DOWN = ["#dn-0", "#dn-1", "#dn-2"];
  cameraNow(960, 480, 0.98, t + 0.5, { rx: 8, z: -40 });
  DOWN.forEach((card, i) => {
    tl.fromTo(card, { y: 800, rotation: (i - 1) * 10, rotationX: 40, z: -200, opacity: 1 }, { y: 0, rotation: 0, rotationX: 0, z: 0, duration: 1.05, ease: "expo.out" }, t + 0.5 + i * 0.16);
    cue("land", t + 0.82 + i * 0.16, 0.7);
  });
  camera(960, 480, 0.94, t + 0.5, 1.2, { rx: 1, ease: "power3.out" });
  say("Three ways to take something down. <em>Nothing is lost.</em>", t + 0.75, 2.9);
  note("Archive: older work. Off the lists and the homepage. Its own page still works for old links.", t + 0.76);
  note("Remove from website: when a couple asks. Gone everywhere. Its address leads back to the Weddings page.", t + 0.77);
  note("Hide from website: films, reviews, team, roles. Not shown anywhere, until you switch it back.", t + 0.78);
  t += 3.5;
  const stampAt = t;
  tl.fromTo("#never", { autoAlpha: 0, scale: 2.6 }, { autoAlpha: 1, scale: 1, duration: 0.32, ease: "power4.in" }, stampAt);
  tl.to("#s-down .downcard", { y: 10, duration: 0.07, yoyo: true, repeat: 1 }, stampAt + 0.32);
  cue("stamp", stampAt + 0.32);
  note("Never delete.", stampAt + 0.32);
  say("Deleting for good is for the owner only.", stampAt + 0.5, 2.5);

  // The status light.
  t = nextHalf(stampAt + 2.7);
  chapter("The status light", t);
  section("status", t);
  cue("whoosh", t, 0.55);
  tl.to(DOWN, { y: -900, rotationX: -30, duration: 0.7, ease: "power3.in", stagger: 0.05 }, t);
  leave("#never", t, 0.4, { y: -500 });
  show("#s-status", t + 0.55);
  hide("#s-down", t + 0.8);
  cameraNow(960, 480, 0.9, t + 0.55, { ry: -18, rx: 6, z: -80 });
  camera(960, 480, 0.97, t + 0.55, 1.5, { ry: 3, rx: 1, ease: "power3.out" });
  tl.fromTo("#st-pill", { autoAlpha: 0, x: 120 }, { autoAlpha: 1, x: 0, duration: 0.9, ease: "expo.out" }, t + 0.6);
  tl.fromTo("#st-rec", { autoAlpha: 0, x: -120 }, { autoAlpha: 1, x: 0, duration: 0.9, ease: "expo.out" }, t + 0.6);
  say("This light says when <em>your change is live.</em>", t + 0.75, 2.6);
  tl.to("#st-rec .record__label", { rotation: 360, duration: 8, ease: "none" }, t + 0.6);
  tl.fromTo("#sn-0", { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.6, ease: "expo.out" }, t + 1.1);
  t += 2.85;
  setHTML("#st-words", "Website updating…", t);
  tl.to("#st-dot", { backgroundColor: "#ddaf3a", boxShadow: "0 0 0 14px rgb(221 175 58 / 0.22)", duration: 0.3 }, t);
  cue("tick", t, 0.8);
  tl.fromTo("#sn-1", { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.6, ease: "expo.out" }, t + 0.1);
  tl.to("#st-rec .record__label", { rotation: "+=1320", duration: 2.95, ease: "power1.inOut" }, t);
  say("While it updates: gold, and <em>Home’s record spins faster.</em>", t + 0.1, 3.2);
  t += 2.95;
  setHTML("#st-words", "Website didn’t update", t);
  tl.to("#st-dot", { backgroundColor: "#d9634f", boxShadow: "0 0 0 14px rgb(217 99 79 / 0.22)", duration: 0.3 }, t);
  cue("nope", t, 0.5);
  tl.fromTo("#sn-2", { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.6, ease: "expo.out" }, t + 0.1);
  say("If it turns red, your work is safe. Press <em>Try again.</em>", t + 0.1, 3);
  t += 2.8;
  setHTML("#st-words", "Website live · updated just now", t);
  tl.to("#st-dot", { backgroundColor: "#5fbe82", boxShadow: "0 0 0 14px rgb(95 190 130 / 0.18)", duration: 0.3 }, t);
  tl.to("#st-rec .record__label", { rotation: "+=120", duration: 2, ease: "power2.out" }, t);
  cue("chime", t, 0.7);

  /* ================================= The end ================================= */
  t = nextHalf(t + 0.85);
  chapter("Where to find help", t);
  section("end", t);
  tl.to("#st-pill, #st-notes", { autoAlpha: 0, x: 200, duration: 0.45, ease: "power3.in" }, t - 0.05);
  tl.to("#st-rec", { autoAlpha: 0, x: -200, duration: 0.45, ease: "power3.in" }, t - 0.05);
  show("#s-end", t + 0.3);
  hide("#s-status", t + 0.5);
  gsap.set("#en-rec", { opacity: 0 });
  cameraNow(960, 480, 1, t + 0.3, { rx: 10, frameY: 480 });
  camera(960, 480, 1.03, t + 0.3, 7, { rx: 2, ease: "power1.inOut", frameY: 480 });
  tl.fromTo("#en-rec", { opacity: 0, y: 160 }, { opacity: 1, y: 0, duration: 1.8, ease: "expo.out" }, t + 0.3);
  tl.to("#en-rec .record__label", { rotation: 360 * 2, duration: 16, ease: "none" }, t);
  rise("#en-a", t + 0.45, { stagger: 0.03 });
  note("Stuck?", t + 0.45);
  tl.fromTo("#en-guide", { autoAlpha: 0, y: 60, rotationX: 24 }, { autoAlpha: 1, y: 0, rotationX: 0, duration: 0.9, ease: "expo.out" }, t + 1.05);
  tl.fromTo("#en-search", { autoAlpha: 0, y: 60, rotationX: 24 }, { autoAlpha: 1, y: 0, rotationX: 0, duration: 0.9, ease: "expo.out" }, t + 1.3);
  cue("land", t + 1.2, 0.5);
  cue("land", t + 1.45, 0.5);
  note("Open the Guide: every step, written down. Or press ⌘K and search for anything.", t + 1.05);
  sweep(t + 2, 1.5);
  const lastAt = t + BAR * 1.25;
  fall("#en-a", lastAt - 0.3);
  tl.to("#en-guide, #en-search", { autoAlpha: 0, y: -50, duration: 0.42, ease: "power2.in" }, lastAt - 0.3);
  tl.to("#en-rec", { y: -70, duration: 5, ease: "power1.out" }, lastAt);
  tl.fromTo("#en-logo", { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 1, ease: "expo.out" }, lastAt + 0.05);
  rise("#en-b", lastAt + 0.2, { stagger: 0.02, duration: 1 });
  appear("#en-c", lastAt + 1.1, 1, { y: 14 });
  note("Now go and add a wedding.", lastAt + 0.2);
  cue("end", lastAt);
  sweep(lastAt + 1, 1.6);
  const FILM_END = lastAt + 5;
  tl.to("#fade", { autoAlpha: 1, duration: 1.5, ease: "power1.in" }, FILM_END - 1.6);
  tl.set({}, {}, FILM_END);

  placeCaptions();
  const POSTER = titleAt + 1.9;
  window.FILM = { duration: FILM_END, captions, chapters, cues, sections, poster: POSTER, music: { bpm: BPM, origin: NEEDLE } };
};

/* ---------- Grain, very faint and a fresh sheet every five seconds: any stronger, or any faster, and the 20MB encode turns it to a mesh ---------- */
const grain = $("#grain");
let grainStep = -1;
function updateGrain(time) {
  const step = Math.floor(time / 5);
  if (step === grainStep) return;
  grainStep = step;
  const x = (step * 73) % 320;
  const y = (step * 151) % 320;
  grain.style.backgroundPosition = `${x}px ${y}px`;
}

window.seekFilm = (time) => {
  tl.time(time, false);
  updateGrain(time);
  return true;
};
window.filmReady = Promise.all([
  document.fonts.load('500 40px "Playfair Display"'),
  document.fonts.load('italic 500 40px "Playfair Display"'),
  document.fonts.load('400 40px "Outfit"'),
  document.fonts.load('500 40px "Outfit"'),
  document.fonts.load('400 40px "Bodoni Album"'),
  ...[...document.images].map((image) => image.decode().catch(() => null)),
]).then(() => document.fonts.ready).then(() => {
  build();
  if (location.search.includes("play")) {
    tl.eventCallback("onUpdate", () => updateGrain(tl.time()));
    tl.play();
  } else tl.time(0, false);
  return true;
});
