import type { loadGsap } from "@wbsk/ui/motion";

/**
 * How the homepage's albums move (owner, 3 November 2026): the turn and sheen as they travel, the two-page
 * opening, the ribbon's physics and the intro. Only albums near the screen are drawn or worked out, and
 * nothing is written unless it has really changed, so a still row costs nothing.
 */

type Gsap = Awaited<ReturnType<typeof loadGsap>>["gsap"];
type Timeline = ReturnType<Gsap["timeline"]>;

export type ShelfLayout = { step: number; cardWidth: number; setWidth: number; rowWidth: number; gutter: number; count: number };

// How the albums sit in the room.
const CAMERA = 5.5;
const TILT_BACK = 13;
const TURN_AT_EDGE = 19;
const GLARE_TRAVEL = 44;
const ALBUM_HEIGHT = 1.27;
const OPEN_SCALE = 1.08;
const HOVER_INTENT_MS = 170;
const LEAVE_MS = 320;
const SWELL = 0.045;
const HOT_TILT = 5;

// The ribbon: heavy satin, one slow swing about a second long that dies away in a few passes, tail looser than the top.
const RIBBON_LINKS = 4;
const RIBBON_AT = 0.171;
const RIBBON_STIFF = [46, 38, 30, 24];
const RIBBON_DAMP = [3.6, 3.4, 3.2, 3];
const RIBBON_STEP = 1 / 120;
const WIND_PER_SPEED = 0.085;
const WIND_CAP = 30;
const FLING_PER_ACCEL = 0.05;
const ACCEL_CAP = 6000;
const FLUTTER = 2;
const SWING_CAP = 58;
const BRUSH_CAP = 170;
/** No piece turns further than this from the one above, so the satin curves and never creases. */
const PIECE_TURN_CAP = 11;

export type AlbumSlot = {
  li: HTMLElement;
  position: number;
  index: number;
  link: HTMLAnchorElement;
  swell: HTMLElement;
  stage: HTMLElement;
  body: HTMLElement;
  cover: HTMLElement;
  glare: HTMLElement;
  ribbon: HTMLElement;
  links: HTMLElement[];
  turn: number;
  turnShown: number;
  tiltX: number;
  tiltY: number;
  opened: number;
  flat: number;
  dealt: number;
  glareShown: number;
  glowShown: number;
  shown: boolean;
  pushed: number;
  swing: number[];
  swingSpeed: number[];
  pieceShown: number[];
  ribbonFrom: number;
  ribbonSpeed: number;
  phase: number;
  timeline: Timeline | null;
};

type Options = {
  gsap: Gsap;
  row: HTMLElement;
  track: HTMLElement;
  tray: HTMLElement;
  layout: () => ShelfLayout | null;
  /** How far the row has travelled, in pixels. */
  at: () => number;
  /** Reduced motion: no turning, no swinging, and an album opens at once. */
  calm: boolean;
  /** In the endless row, albums far off the table aren't drawn. */
  culling: boolean;
  /** The row is being carried along by something, so a resting cursor shouldn't open what passes under it. */
  moving: () => boolean;
  gliding: () => boolean;
  onShow: (index: number) => void;
  onOpen: (index: number | null) => void;
  /** Asks the row to carry an open album fully onto the table. */
  onMove: (distance: number) => void;
  /** Stops the row's own momentum, so an album opens where it is. */
  onStop: () => void;
};

export type Shelf = ReturnType<typeof createShelf>;

/** A smooth value between two of a row of points, shaped by the points either side (Catmull-Rom). */
function curveThrough(points: number[], from: number, t: number) {
  const a = points[Math.max(from - 1, 0)]!;
  const b = points[from]!;
  const c = points[from + 1]!;
  const d = points[Math.min(from + 2, points.length - 1)]!;
  return 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
}

export function createShelf({ gsap, row, track, tray, layout, at, calm, culling, moving, gliding, onShow, onOpen, onMove, onStop }: Options) {
  const touchScreen = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  // Chrome breaks up small type under perspective on very dense screens, so there an album rests without it and
  // takes it only while it moves, when nobody can read anyway. Safari and Firefox hold up at any density.
  const chrome = CSS.supports("-webkit-app-region", "none");
  const cameraAtRest = window.devicePixelRatio <= 2.2 || !chrome || CSS.supports("-webkit-touch-callout", "none");
  const sweep = tray.querySelector<HTMLElement>(".wbsk-drifttray__sweep");
  const lamp = tray.querySelector<HTMLElement>(".wbsk-drifttray__lamp");
  const padTop = parseFloat(getComputedStyle(row).paddingTop) || 0;

  const slots: AlbumSlot[] = [...track.children].map((element, position) => {
    const li = element as HTMLElement;
    const part = <T extends HTMLElement>(name: string) => li.querySelector<T>(name)!;
    return {
      li,
      position,
      index: position,
      link: part<HTMLAnchorElement>(".wbsk-album__link"),
      swell: part(".wbsk-album__swell"),
      stage: part(".wbsk-album__stage"),
      body: part(".wbsk-album__3d"),
      cover: part(".wbsk-album__cover"),
      glare: part(".wbsk-album__glare"),
      ribbon: part(".wbsk-album__ribbon"),
      links: [...li.querySelectorAll<HTMLElement>(".wbsk-album__link-piece")],
      turn: 0,
      turnShown: NaN,
      tiltX: 0,
      tiltY: 0,
      opened: 0,
      flat: 0,
      dealt: 1,
      glareShown: NaN,
      glowShown: NaN,
      shown: true,
      pushed: 0,
      swing: new Array<number>(RIBBON_LINKS).fill(0),
      swingSpeed: new Array<number>(RIBBON_LINKS).fill(0),
      pieceShown: [] as number[],
      ribbonFrom: NaN,
      ribbonSpeed: 0,
      phase: position * 1.7,
      timeline: null,
    };
  });
  const setIndexes = () => {
    const count = layout()?.count ?? slots.length;
    slots.forEach((slot) => (slot.index = slot.position % count));
  };
  setIndexes();

  let openSlot: AlbumSlot | null = null;
  let hotSlot: AlbumSlot | null = null;
  const closing = new Set<AlbumSlot>();
  let intent = 0;
  let leaving = 0;
  let intro: Timeline | null = null;

  const leftOf = (slot: AlbumSlot, l: ShelfLayout) => slot.position * l.step + l.gutter - at();

  /** One transform for the whole album, written only when it has really changed. */
  function applyAlbum(slot: AlbumSlot) {
    // Lying fully open it's perfectly flat, with no perspective at all, so the photographs are drawn at their sharpest.
    if (slot.flat === 1) {
      slot.body.style.transform = "none";
      return;
    }
    const open = slot.opened;
    const rotateX = TILT_BACK * (1 - open) + slot.tiltX;
    const rotateY = slot.turn * slot.dealt * (1 - open) + slot.tiltY;
    const nearness = (cameraAtRest && !calm ? 1 : Math.min(1, open * 3)) * (1 - slot.flat * 0.95);
    const camera = nearness ? `perspective(${(CAMERA / nearness).toFixed(2)}em) ` : "";
    slot.body.style.transform = `${camera}rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
  }

  /* As an album travels it turns, because the camera is in the middle: left of centre you see its pages, right of
     centre its spine. The lamp's sheen slides across its photograph. At the row's slow pace this writes a few
     times a second. */
  function depth() {
    const l = layout();
    if (!l) return;
    const half = l.rowWidth / 2;
    // Drawn well before they arrive, so a hard fling never reaches a blank table.
    const ahead = (touchScreen ? 1 : 1.5) * l.step;
    for (const slot of slots) {
      const left = leftOf(slot, l);
      if (culling) {
        const visible = left + l.cardWidth > -ahead && left < l.rowWidth + ahead;
        if (visible !== slot.shown) {
          slot.shown = visible;
          // The album's look goes, not its link: a keyboard can still Tab to one far along the row.
          slot.swell.style.visibility = visible ? "" : "hidden";
        }
        if (!visible) continue;
      }
      const away = (left + l.cardWidth / 2 - half) / (half + l.cardWidth / 2);
      slot.turn = calm ? 0 : Math.max(-1.2, Math.min(1.2, away)) * TURN_AT_EDGE;
      if (!(Math.abs(slot.turn - slot.turnShown) <= 0.05) && !slot.opened && !slot.tiltX) {
        slot.turnShown = slot.turn;
        applyAlbum(slot);
      }
      if (calm) continue;
      const glareAt = (slot.turn / TURN_AT_EDGE) * GLARE_TRAVEL;
      if (!(Math.abs(glareAt - slot.glareShown) <= 0.4)) {
        slot.glareShown = glareAt;
        slot.glare.style.transform = `translate3d(${glareAt.toFixed(1)}%,0,0)`;
      }
      const glow = 0.3 + 0.7 * Math.max(0, 1 - Math.abs(away) * 1.25);
      if (!(Math.abs(glow - slot.glowShown) <= 0.02)) {
        slot.glowShown = glow;
        slot.glare.style.opacity = glow.toFixed(2);
      }
    }
  }

  /* The ribbon's physics. Each link is a damped pendulum hanging from the one above. Moving through the air it
     trails behind; a sudden start or stop flings it. */
  const offsetOf = (element: HTMLElement) => ("_gsap" in element ? Number(gsap.getProperty(element, "x")) || 0 : 0);
  let ribbonAt = NaN;
  let onTable = false;
  function stepRibbons(time: number, deltaMs: number) {
    const l = layout();
    if (!l || !onTable || document.hidden || !deltaMs) return;
    const dt = Math.min(deltaMs / 1000, 0.05);
    const now = at();
    let moved = Number.isNaN(ribbonAt) ? 0 : now - ribbonAt;
    // The row's wrap-around isn't movement.
    if (Math.abs(moved) > l.setWidth / 2) moved -= Math.sign(moved) * l.setWidth;
    ribbonAt = now;
    const rowSpeed = -moved / dt;
    const steps = Math.max(1, Math.ceil(dt / RIBBON_STEP));
    const h = dt / steps;
    for (const slot of slots) {
      if (!slot.shown) continue;
      const here = offsetOf(slot.li) + offsetOf(slot.stage);
      const own = Number.isNaN(slot.ribbonFrom) ? 0 : (here - slot.ribbonFrom) / dt;
      slot.ribbonFrom = here;
      const speed = rowSpeed + own;
      const accel = Math.max(-ACCEL_CAP, Math.min(ACCEL_CAP, (speed - slot.ribbonSpeed) / dt));
      slot.ribbonSpeed = speed;
      const wind = Math.max(-WIND_CAP, Math.min(WIND_CAP, speed * WIND_PER_SPEED));
      const alive = Math.min(1, Math.abs(speed) / 60);
      for (let step = 0; step < steps; step += 1) {
        for (let i = 0; i < RIBBON_LINKS; i += 1) {
          const above = i ? slot.swing[i - 1]! : 0;
          const flutter = Math.sin(time * (1.9 + i * 0.35) + slot.phase + i * 0.8) * FLUTTER * alive;
          const target = above * (i ? 0.92 : 0) + wind * (i ? 0.22 : 0.62) + flutter;
          const force = RIBBON_STIFF[i]! * (target - slot.swing[i]!) - RIBBON_DAMP[i]! * slot.swingSpeed[i]! + accel * FLING_PER_ACCEL * (1 + i * 0.5);
          slot.swingSpeed[i] = slot.swingSpeed[i]! + force * h;
          slot.swing[i] = Math.max(-SWING_CAP, Math.min(SWING_CAP, slot.swing[i]! + slot.swingSpeed[i]! * h));
        }
      }
      // The pieces lie along one smooth curve through the four weights, so it bends without a corner.
      const pieces = slot.links.length;
      let above = 0;
      for (let piece = 0; piece < pieces; piece += 1) {
        const along = (piece / Math.max(pieces - 1, 1)) * (RIBBON_LINKS - 1);
        const from = Math.min(Math.floor(along), RIBBON_LINKS - 2);
        const angle = curveThrough(slot.swing, from, along - from);
        const turn = Math.max(-PIECE_TURN_CAP, Math.min(PIECE_TURN_CAP, angle - above));
        above += turn;
        const shown = slot.pieceShown[piece];
        if (shown === undefined || Math.abs(turn - shown) > 0.06) {
          slot.pieceShown[piece] = turn;
          slot.links[piece]!.style.transform = `rotate(${turn.toFixed(2)}deg)`;
        }
      }
    }
  }

  // The cursor passing through a ribbon pushes it along.
  let brushFrom = NaN;
  function brush(clientX: number, clientY: number) {
    const moved = Number.isNaN(brushFrom) ? 0 : clientX - brushFrom;
    brushFrom = clientX;
    const l = layout();
    if (!l || !moved || calm) return;
    const box = row.getBoundingClientRect();
    const down = clientY - box.top;
    const top = padTop + l.cardWidth * ALBUM_HEIGHT * 0.97;
    if (down < top || down > top + l.cardWidth * 0.34) return;
    for (const slot of slots) {
      if (!slot.shown) continue;
      const spot = leftOf(slot, l) + offsetOf(slot.li) + offsetOf(slot.stage) + l.cardWidth * RIBBON_AT;
      if (Math.abs(clientX - box.left - spot) > l.cardWidth * 0.08) continue;
      const push = Math.max(-BRUSH_CAP, Math.min(BRUSH_CAP, moved * 16));
      slot.swingSpeed.forEach((speed, i) => (slot.swingSpeed[i] = speed - push * (0.45 + i * 0.3)));
    }
  }

  /** How much an open album may grow: never wider than the table. */
  function openScale(l: ShelfLayout) {
    return Math.min(OPEN_SCALE, (l.rowWidth * 0.96) / (2 * l.cardWidth));
  }

  /** How far the row must move for this album's open spread to lie on the table. */
  function fitFor(left: number) {
    const l = layout();
    if (!l) return 0;
    const centre = left + l.cardWidth / 2;
    const half = l.cardWidth * openScale(l) + 12;
    if (touchScreen) return centre - l.rowWidth / 2;
    if (centre - half < 0) return centre - half;
    if (centre + half > l.rowWidth) return centre + half - l.rowWidth;
    return 0;
  }

  function openTimeline(slot: AlbumSlot, l: ShelfLayout) {
    const scale = openScale(l);
    const q = gsap.utils.selector(slot.li);
    const tl = gsap.timeline({
      paused: true,
      onReverseComplete: () => {
        delete slot.li.dataset.open;
        closing.delete(slot);
        slot.turnShown = NaN;
      },
    });
    tl.fromTo(slot.stage, { x: 0, scale: 1 }, { x: (l.cardWidth * scale) / 2, scale, duration: 1.2, ease: "power2.inOut" }, 0);
    tl.to(slot, { opened: 1, duration: 1.1, ease: "power2.inOut", onUpdate: () => applyAlbum(slot) }, 0);
    tl.to(slot, { flat: 1, duration: 0.34, ease: "sine.inOut", onUpdate: () => applyAlbum(slot) }, 0.98);
    // A heavy board: it comes up slowly and lays itself down, and it never bounces.
    tl.to(slot.cover, { rotationY: -180, duration: 1.3, ease: "power2.inOut" }, 0.02);
    // The ribbon slides along to the fold, where a real bookmark sits.
    tl.fromTo(slot.ribbon, { x: 0 }, { x: -l.cardWidth * RIBBON_AT, duration: 1.2, ease: "power2.inOut" }, 0);
    tl.to(q(".wbsk-album__front > .wbsk-album__shade"), { opacity: 0.72, duration: 0.64, ease: "power1.in" }, 0.02);
    // Past upright the front can't be seen, so it stops being drawn, and only then is the inside drawn.
    // Safari otherwise shows each through the other, the wrong way round.
    tl.set(q(".wbsk-album__front"), { visibility: "hidden" }, 0.68);
    tl.set(q(".wbsk-album__inner"), { visibility: "visible" }, 0.68);
    tl.fromTo(q(".wbsk-album__inner > .wbsk-album__shade"), { opacity: 0.8 }, { opacity: 0, duration: 0.74, ease: "power1.out" }, 0.58);
    tl.fromTo(q(".wbsk-album__cast"), { opacity: 1 }, { opacity: 0, duration: 0.95, ease: "sine.inOut" }, 0.24);
    tl.to(q(".wbsk-album__back--left, .wbsk-album__edge--bottom-left"), { opacity: 1, duration: 0.42, ease: "sine.in" }, 0.72);
    // The dark falling off at the table's edges mustn't dim the photographs.
    if (lamp) tl.to(lamp, { opacity: 0.12, duration: 0.8, ease: "sine.inOut" }, 0.3);
    return tl;
  }

  function pushNeighbours(slot: AlbumSlot, on: boolean, l: ShelfLayout) {
    const spread = l.cardWidth * openScale(l) - l.cardWidth / 2 - (l.step - l.cardWidth) * 0.55;
    for (const other of slots) {
      if (other === slot) continue;
      const left = leftOf(other, l);
      if (left + l.cardWidth < -l.step * 2 || left > l.rowWidth + l.step * 2) continue;
      other.pushed = on ? (other.position < slot.position ? -1 : 1) * Math.max(0, spread) : 0;
      if (calm) gsap.set(other.li, { x: other.pushed, opacity: on ? 0.42 : 1 });
      else gsap.to(other.li, { x: other.pushed, opacity: on ? 0.42 : 1, duration: on ? 1.05 : 0.9, ease: "power2.inOut", overwrite: "auto" });
    }
  }

  function open(slot: AlbumSlot, { glide = true }: { glide?: boolean } = {}) {
    const l = layout();
    if (!l || openSlot === slot) return;
    clearTimeout(leaving);
    close();
    onStop();
    openSlot = slot;
    closing.delete(slot);
    slot.li.dataset.open = "";
    slot.timeline ??= openTimeline(slot, l);
    onShow(slot.index);
    onOpen(slot.index);
    pushNeighbours(slot, true, l);
    // The swell and the cursor's tilt make way, so the spread lies steady.
    gsap.to(slot.swell, { scale: 1, duration: 0.6, ease: "power2.out", overwrite: "auto" });
    gsap.to(slot, { tiltX: 0, tiltY: 0, duration: 0.6, ease: "power2.out", overwrite: "auto", onUpdate: () => applyAlbum(slot) });
    if (calm) {
      slot.timeline.progress(1);
    } else {
      slot.timeline.timeScale(1).play();
    }
    if (glide) {
      const move = fitFor(leftOf(slot, l));
      if (Math.abs(move) > 1) onMove(move);
    }
  }

  function close() {
    const slot = openSlot;
    const l = layout();
    if (!slot || !l) return;
    openSlot = null;
    onOpen(null);
    if (touchScreen) onShow(-1);
    pushNeighbours(slot, false, l);
    if (calm) {
      slot.timeline?.progress(0);
      delete slot.li.dataset.open;
      return;
    }
    // Shut again before it had even started, there's nothing to play back, so nothing would ever say it had finished.
    if (!slot.timeline?.progress()) {
      slot.timeline?.pause(0);
      delete slot.li.dataset.open;
      slot.turnShown = NaN;
      return;
    }
    closing.add(slot);
    slot.timeline.timeScale(1.2).reverse();
  }

  function setHot(slot: AlbumSlot | null) {
    if (slot) clearTimeout(leaving);
    if (slot === hotSlot) return;
    const was = hotSlot;
    if (was) {
      gsap.to(was.swell, { scale: 1, duration: 0.5, ease: "power3.out", overwrite: "auto" });
      gsap.to(was, {
        tiltX: 0,
        tiltY: 0,
        duration: 0.5,
        ease: "power3.out",
        overwrite: "auto",
        onUpdate: () => applyAlbum(was),
        onComplete: () => {
          was.turnShown = NaN;
        },
      });
    }
    hotSlot = slot;
    clearTimeout(intent);
    if (!slot) {
      delete row.dataset.overCard;
      // Off the open album and onto the bare table: it closes after a moment.
      clearTimeout(leaving);
      leaving = window.setTimeout(close, LEAVE_MS);
      return;
    }
    row.dataset.overCard = "true";
    if (slot === openSlot) return;
    onShow(slot.index);
    if (!calm) gsap.to(slot.swell, { scale: 1 + SWELL, duration: 0.45, ease: "power3.out", overwrite: "auto" });
    const whenStill = () => {
      if (hotSlot !== slot) return;
      if (moving()) intent = window.setTimeout(whenStill, 120);
      else open(slot);
    };
    intent = window.setTimeout(whenStill, HOVER_INTENT_MS);
  }

  /** Which album is under this point, real or copy. Copies are inert, so they can't say for themselves. */
  function slotAtPoint(clientX: number, clientY: number) {
    const l = layout();
    if (!l) return null;
    const box = row.getBoundingClientRect();
    const x = clientX - box.left;
    const y = clientY - box.top;
    const height = l.cardWidth * ALBUM_HEIGHT;
    if (openSlot) {
      const scale = openScale(l);
      const spine = leftOf(openSlot, l) + l.cardWidth / 2;
      const middle = padTop + height / 2;
      if (Math.abs(x - spine) <= l.cardWidth * scale && Math.abs(y - middle) <= (height * scale) / 2) return openSlot;
    }
    if (y < padTop - 8 || y > padTop + height + 8) return null;
    for (const slot of slots) {
      if (!slot.shown) continue;
      const left = leftOf(slot, l) + slot.pushed;
      if (x >= left && x <= left + l.cardWidth) return slot;
    }
    return null;
  }

  function tiltTo(slot: AlbumSlot, clientX: number, clientY: number) {
    if (slot === openSlot || calm) return;
    const box = slot.li.getBoundingClientRect();
    const x = ((clientX - box.left) / box.width - 0.5) * 2;
    const y = ((clientY - box.top) / box.height - 0.5) * 2;
    gsap.to(slot, {
      tiltX: Math.max(-1, Math.min(1, y)) * -HOT_TILT,
      tiltY: Math.max(-1, Math.min(1, x)) * HOT_TILT,
      duration: 0.6,
      ease: "power3.out",
      overwrite: "auto",
      onUpdate: () => applyAlbum(slot),
    });
  }

  /** The cursor over the row, wherever it is. */
  function pointer(clientX: number, clientY: number) {
    brush(clientX, clientY);
    if (gliding() && openSlot) return;
    const over = slotAtPoint(clientX, clientY);
    setHot(over);
    if (over) tiltTo(over, clientX, clientY);
  }

  /* A pile of albums is set down under the lamp, then dealt out along the table, top of the pile first. The lamp's
     light passes along them and slides across each photograph in turn, and the album in the middle lifts its cover once. */
  function playIntro(done: () => void) {
    const l = layout();
    if (!l) {
      done();
      return null;
    }
    depth();
    const placed = slots
      .map((slot) => {
        const left = leftOf(slot, l);
        return { slot, away: left + l.cardWidth / 2 - l.rowWidth / 2, on: left + l.cardWidth > 0 && left < l.rowWidth };
      })
      .filter((entry) => entry.on)
      .sort((a, b) => Math.abs(b.away) - Math.abs(a.away));
    // Albums off the table's edge take no part in the intro, and are simply there when the row brings them in.
    const inIntro = new Set(placed.map((entry) => entry.slot));
    gsap.set(slots.filter((slot) => !inIntro.has(slot)).map((slot) => slot.li), { clearProps: "opacity" });

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(placed.map((entry) => entry.slot.li), { clearProps: "transform,opacity,zIndex" });
        placed.forEach(({ slot }) => {
          slot.turnShown = NaN;
          slot.glareShown = NaN;
          slot.glowShown = NaN;
          slot.dealt = 1;
          gsap.set(slot.glare, { clearProps: "transform,opacity" });
        });
        if (sweep) gsap.set(sweep, { opacity: 0 });
        intro = null;
        depth();
        done();
      },
    });
    if (sweep) gsap.set(sweep, { xPercent: -110, opacity: 0 });
    const pile = placed.length;
    placed.forEach(({ slot, away }, rank) => {
      // Rank 0 is the farthest, so it lies on top of the pile and goes first.
      const height = pile - rank;
      slot.dealt = 0;
      slot.turnShown = NaN;
      applyAlbum(slot);
      const askew = (rank % 2 ? 1 : -1) * Math.min(height, 4) * 1.15;
      gsap.set(slot.li, { x: -away + (rank % 2 ? 3 : -3) * Math.min(height, 3), rotation: askew, zIndex: height, opacity: 0 });
      // Down from above the table.
      tl.fromTo(slot.li, { opacity: 0 }, { opacity: 1, duration: 0.42, ease: "sine.out" }, 0);
      tl.fromTo(slot.li, { scale: 1.34, y: -l.cardWidth * 0.16 - height * 2.2 }, { scale: 1, y: -height * 2.2, duration: 0.95, ease: "power3.out" }, 0);
      // Then dealt, with weight.
      const when = 0.82 + rank * 0.1;
      tl.to(slot.li, { x: 0, y: 0, rotation: 0, duration: 1.35, ease: "expo.out" }, when);
      tl.to(slot, { dealt: 1, duration: 1.35, ease: "expo.out", onUpdate: () => applyAlbum(slot) }, when);
    });
    // The light passing.
    const lightAt = 1.55;
    const lightFor = 1.5;
    if (sweep) {
      tl.to(sweep, { opacity: 1, duration: 0.3, ease: "sine.out" }, lightAt);
      tl.to(sweep, { xPercent: 230, duration: lightFor, ease: "sine.inOut" }, lightAt);
      tl.to(sweep, { opacity: 0, duration: 0.3, ease: "sine.in" }, lightAt + lightFor - 0.3);
    }
    placed.forEach(({ slot, away }) => {
      const across = (away + l.rowWidth / 2) / l.rowWidth;
      const when = lightAt + 0.05 + across * (lightFor - 0.45);
      tl.fromTo(slot.glare, { xPercent: -46, opacity: 0.2 }, { xPercent: 46, duration: 0.85, ease: "sine.inOut" }, when);
      tl.to(slot.glare, { opacity: 1, duration: 0.3, ease: "sine.out" }, when);
      tl.to(slot.glare, { opacity: 0.35, duration: 0.45, ease: "sine.in" }, when + 0.4);
    });
    // The album in the middle lifts its cover, once, and lets it fall: an invitation.
    const middle = placed[placed.length - 1]?.slot;
    if (middle) {
      const cast = middle.li.querySelector(".wbsk-album__cast");
      tl.call(() => (middle.li.dataset.open = ""), undefined, 2.6);
      tl.fromTo(middle.cover, { rotationY: 0 }, { rotationY: -26, duration: 0.62, ease: "sine.inOut", yoyo: true, repeat: 1, repeatDelay: 0.08 }, 2.6);
      if (cast) tl.set(cast, { opacity: 1 }, 2.6);
      tl.call(
        () => {
          if (openSlot !== middle) delete middle.li.dataset.open;
        },
        undefined,
        3.94,
      );
    }
    intro = tl;
    return tl;
  }

  const onDocumentDown = (event: PointerEvent) => {
    if (!openSlot || event.pointerType === "mouse") return;
    if ((event.target as Element | null)?.closest?.("[data-keeps-album]")) return;
    if (slotAtPoint(event.clientX, event.clientY) !== openSlot) close();
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") close();
  };
  const tableWatch = new IntersectionObserver(([entry]) => {
    onTable = Boolean(entry?.isIntersecting);
    ribbonAt = NaN;
  });
  document.addEventListener("pointerdown", onDocumentDown);
  window.addEventListener("keydown", onKey);
  if (!calm) {
    tableWatch.observe(tray);
    gsap.ticker.add(stepRibbons);
  }
  depth();

  return {
    slots,
    depth,
    open,
    close,
    pointer,
    slotAtPoint,
    fitFor,
    leftOf: (slot: AlbumSlot) => {
      const l = layout();
      return l ? leftOf(slot, l) : 0;
    },
    /** Off the row altogether, or taken up by a drag. */
    release: (closeNow: boolean) => {
      setHot(null);
      if (closeNow) {
        clearTimeout(leaving);
        close();
      }
    },
    slotOf: (element: Element | null) => {
      const li = element?.closest?.(".wbsk-drift__track > li");
      return li ? (slots.find((slot) => slot.li === li) ?? null) : null;
    },
    openSlot: () => openSlot,
    /** While an album is open or closing, the row mustn't jump a whole loop under it. */
    busy: () => openSlot !== null || closing.size > 0,
    playIntro,
    introPlaying: () => intro !== null,
    /** A new album size: anything open is shut, and its opening is worked out afresh next time. */
    refresh: () => {
      clearTimeout(intent);
      clearTimeout(leaving);
      close();
      setIndexes();
      for (const slot of slots) {
        slot.timeline?.progress(0).kill();
        slot.timeline = null;
        delete slot.li.dataset.open;
        closing.delete(slot);
      }
      depth();
    },
    destroy: () => {
      clearTimeout(intent);
      clearTimeout(leaving);
      tableWatch.disconnect();
      gsap.ticker.remove(stepRibbons);
      document.removeEventListener("pointerdown", onDocumentDown);
      window.removeEventListener("keydown", onKey);
      intro?.kill();
      for (const slot of slots) {
        slot.timeline?.progress(0).kill();
        delete slot.li.dataset.open;
        slot.swell.style.visibility = "";
        gsap.killTweensOf([slot, slot.swell, slot.li]);
      }
      delete row.dataset.overCard;
    },
  };
}
