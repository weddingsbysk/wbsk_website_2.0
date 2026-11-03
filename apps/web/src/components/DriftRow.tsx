"use client";

import "@wbsk/ui/css/home.css";
import "@wbsk/ui/css/album.css";
import { AlbumCard, canHover, pressThen, WbskLink, type WeddingSummary } from "@wbsk/ui";
import { capFling, DRAG_START, MOMENTUM_TAU, nearestLoop, roundsToFill, scalePush, SECONDS_PER_CARD, shouldDrift, stepDrift, targetForCard, type DriftNumbers } from "@wbsk/ui/drift";
import { loadGsap, peekGsap, prefersReducedMotion, setExpandSource, travelEase, watchRestedWheel } from "@wbsk/ui/motion";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createShelf, type AlbumSlot, type Shelf } from "./albumMotion";
import { CrossfadeLine } from "./CrossfadeLine";

type Mode = "plain" | "still" | "drift";
type Gsap = Awaited<ReturnType<typeof loadGsap>>;
type Layout = { step: number; cardWidth: number; setWidth: number; rowWidth: number; gutter: number; count: number; rounds: number };

const GLIDE_SECONDS = 1.1;
const RESUME_AFTER_MS = 1500;
const RELEASE_RESUME_MS = 80;
const WHEEL_RESUME_MS = 700;
const FRAME_CAP = 0.1;
const PUSH_WAKE_MS = 900;
const TOUCH_SCROLL_REST_MS = 400;
const FRESH_MOVE_MS = 80;
const PAUSED_KEY = "wbsk-drift-paused";
const RETURN_KEY = "wbsk-drift-return";
const DEFAULT_ALBUM_LABEL = "Our wedding";

function readSession(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeSession(key: string, value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    // Private windows can refuse storage; the row just forgets.
  }
}

/**
 * A press on an album. On a touch screen the first tap opens it and the second opens the story; with a mouse it
 * has usually opened already, and a press goes straight to the story.
 */
function pressAlbum(
  event: MouseEvent,
  shelf: Shelf | null,
  beforeLeaving: (slot: AlbumSlot) => void,
  follow: (slot: AlbumSlot, go: (action: () => void) => void) => void,
) {
  if (!shelf) return;
  const target = event.target as Element;
  const link = target.closest<HTMLAnchorElement>(".wbsk-album__link");
  const fromKeyboard = event.detail === 0;
  const slot = (fromKeyboard ? null : shelf.slotAtPoint(event.clientX, event.clientY)) ?? shelf.slotOf(target);
  if (!slot) return;
  if (!fromKeyboard && !canHover() && shelf.openSlot() !== slot) {
    event.preventDefault();
    event.stopPropagation();
    shelf.open(slot);
    return;
  }
  beforeLeaving(slot);
  setExpandSource(slot.li);
  // The real link under a mouse or keyboard simply carries on. A copy takes no events, so its real album is pressed for it.
  if (link === slot.link && (fromKeyboard || canHover())) return;
  event.preventDefault();
  event.stopPropagation();
  follow(slot, (action) =>
    pressThen(slot.link, () => {
      setExpandSource(slot.li);
      action();
    }),
  );
}

const Arrow = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d={d} />
  </svg>
);

/** Featured weddings as albums, floating slowly and endlessly along a table (Decision 30; owner, 3 November 2026). */
export function FeaturedRow({ weddings: allWeddings, seeAllHref, albumLabel }: { weddings: WeddingSummary[]; seeAllHref: string; albumLabel?: string }) {
  const [limit, setLimit] = useState<number | null>(null);
  const weddings = limit === null ? allWeddings : allWeddings.slice(0, limit);
  const [mode, setMode] = useState<Mode>("plain");
  const [fits, setFits] = useState(false);
  const [rounds, setRounds] = useState(1);
  const [paused, setPaused] = useState(false);
  const [atEnds, setAtEnds] = useState({ start: true, end: false });
  const [description, setDescription] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // The pages' photographs are only asked for once an album has been opened.
  const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set());
  const [bundle, setBundle] = useState<Gsap | null>(() => peekGsap());

  const weddingsRef = useRef(weddings);
  useEffect(() => {
    weddingsRef.current = weddings;
  }, [weddings]);

  const trayRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const shelfRef = useRef<Shelf | null>(null);
  const layoutRef = useRef<Layout | null>(null);
  const numbers = useRef<DriftNumbers>({ x: 0, velocity: 0, drift: 0, push: 0, pushTarget: 0 });
  const cursorRef = useRef({ x: 0, y: 0 });
  const flags = useRef({ hover: false, focus: false, touch: false, holding: false, gliding: false, frozen: false, userPaused: false, holdUntil: 0 });
  const renderRef = useRef<() => void>(() => {});
  const glideRef = useRef<(to: number) => void>(() => {});
  const introDone = useRef(false);
  const skipIntroRef = useRef<() => void>(() => {});
  const returningRef = useRef(typeof window !== "undefined" && Boolean(readSession(RETURN_KEY)));

  // A test address only, like the arc's ?records=: shows the row with fewer cards. Remove at P10.
  useEffect(() => {
    const asked = new URLSearchParams(window.location.search).get("featured");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once, after hydration
    if (asked) setLimit(Number(asked));
    flags.current.userPaused = readSession(PAUSED_KEY) === "1";
    setPaused(flags.current.userPaused);
  }, []);

  const measure = useCallback(() => {
    const row = rowRef.current;
    const track = trackRef.current;
    if (!row || !track) return;
    const real = track.querySelectorAll<HTMLElement>("li[data-real]");
    const first = real[0];
    if (!first) return;
    const cardWidth = first.offsetWidth;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const step = cardWidth + gap;
    const before = layoutRef.current;
    const layout: Layout = {
      step,
      cardWidth,
      setWidth: step * real.length,
      rowWidth: row.clientWidth,
      gutter: parseFloat(getComputedStyle(track).paddingLeft) || 0,
      count: real.length,
      rounds: roundsToFill(step * real.length, row.clientWidth),
    };
    layoutRef.current = layout;
    // A new card size keeps the same place in the loop, so resizing never shows a jump.
    if (before && before.setWidth) numbers.current.x *= layout.setWidth / before.setWidth;
    const drifting = !prefersReducedMotion() && shouldDrift(real.length);
    setMode(drifting ? "drift" : "still");
    setRounds(layout.rounds);
    setFits(layout.setWidth - gap + layout.gutter * 2 <= layout.rowWidth);
    if (before?.cardWidth !== layout.cardWidth) shelfRef.current?.refresh();
    renderRef.current();
  }, []);

  // Start once the row is near the screen: the copies and GSAP needn't weigh on the first load.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    let done = false;
    const begin = () => {
      if (done) return;
      done = true;
      row.dataset.near = "true";
      void loadGsap().then(setBundle);
    };
    if (readSession(RETURN_KEY)) begin();
    const observer = new IntersectionObserver(([entry]) => entry?.isIntersecting && begin(), { rootMargin: "60% 0px" });
    observer.observe(row);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!bundle) return;
    measure();
    const row = rowRef.current;
    if (!row) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(row);
    return () => observer.disconnect();
  }, [bundle, measure, limit]);

  // The albums' own motion, whichever way the row is moving.
  useLayoutEffect(() => {
    const row = rowRef.current;
    const track = trackRef.current;
    const tray = trayRef.current;
    if (mode === "plain" || !bundle || !row || !track || !tray || !layoutRef.current) return;
    const drifting = mode === "drift";
    const shelf = createShelf({
      gsap: bundle.gsap,
      row,
      track,
      tray,
      layout: () => layoutRef.current,
      at: () => (drifting ? (layoutRef.current?.setWidth ?? 0) * (layoutRef.current?.rounds ?? 0) + numbers.current.x : row.scrollLeft),
      calm: prefersReducedMotion(),
      culling: drifting,
      moving: () => Math.abs(numbers.current.velocity) > 20,
      gliding: () => flags.current.gliding,
      onShow: (index) => setDescription(index < 0 ? "" : (weddingsRef.current[index]?.shortDescription ?? "")),
      onOpen: (index) => {
        setOpenIndex(index);
        const slug = index === null ? undefined : weddingsRef.current[index]?.slug;
        if (slug) setOpened((now) => (now.has(slug) ? now : new Set(now).add(slug)));
      },
      onMove: (distance) => {
        if (drifting) glideRef.current(numbers.current.x + distance);
        else row.scrollBy({ left: distance, behavior: prefersReducedMotion() ? "auto" : "smooth" });
      },
      onStop: () => {
        numbers.current.velocity = 0;
        numbers.current.push = 0;
        numbers.current.pushTarget = 0;
      },
    });
    shelfRef.current = shelf;
    return () => {
      shelf.destroy();
      shelfRef.current = null;
      setOpenIndex(null);
    };
  }, [mode, bundle, rounds, weddings.length]);

  // The drift itself. One ticker, and one transform on the track; nothing here reads the layout.
  useLayoutEffect(() => {
    const row = rowRef.current;
    const track = trackRef.current;
    if (mode !== "drift" || !bundle || !row || !track) {
      renderRef.current = () => {};
      if (track) track.style.transform = "";
      return;
    }
    const { gsap, ScrollTrigger } = bundle;
    const n = numbers.current;
    const f = flags.current;
    let moving = false;
    let onScreen = false;
    let ticking = false;
    let lastX = NaN;
    let glide: { kill: () => void } | null = null;

    const wrapped = () => {
      const layout = layoutRef.current;
      if (!layout) return n.x;
      return gsap.utils.wrap(-layout.step / 2, layout.setWidth - layout.step / 2, n.x);
    };
    const render = () => {
      const layout = layoutRef.current;
      if (!layout) return;
      // An open or closing album stays where it is: the row can't jump a whole loop under it.
      if (!f.gliding && !f.focus && !shelfRef.current?.busy()) n.x = wrapped();
      const at = layout.setWidth * layout.rounds + n.x;
      if (at === lastX) return;
      lastX = at;
      track.style.transform = `translate3d(${(-at).toFixed(2)}px, 0, 0)`;
      shelfRef.current?.depth();
    };
    renderRef.current = render;

    // Back from a couple's page: the card returns to where it was pressed (Decision 05).
    const saved = readSession(RETURN_KEY);
    if (saved && layoutRef.current) {
      const { index, offset } = JSON.parse(saved) as { index: number; offset: number };
      n.x = index * layoutRef.current.step - offset;
      f.holdUntil = performance.now() + RESUME_AFTER_MS;
      writeSession(RETURN_KEY, null);
    }
    render();

    const tick = (_time: number, deltaMs: number) => {
      const layout = layoutRef.current;
      if (!layout || f.frozen || f.holding || f.gliding) return;
      const dt = Math.min(deltaMs / 1000, FRAME_CAP);
      // The albums travel from right to left (owner, 3 November 2026).
      const base = layout.step / SECONDS_PER_CARD;
      const free = !f.userPaused && !f.hover && !f.focus && !f.touch && !shelfRef.current?.openSlot() && performance.now() >= f.holdUntil && Math.abs(n.velocity) < Math.abs(base);
      stepDrift(n, dt, base, free ? 1 : 0);
      render();
      const speed = Math.abs(n.velocity) + Math.abs(n.push) + n.drift * Math.abs(base);
      // Albums passing under a resting cursor come up in turn.
      if (f.hover && Math.abs(n.velocity) > 4) shelfRef.current?.pointer(cursor.x, cursor.y);
      const nowMoving = speed > 0.5;
      if (nowMoving !== moving) {
        moving = nowMoving;
        track.dataset.moving = String(moving);
      }
    };
    const sync = () => {
      const run = onScreen && !document.hidden;
      if (run === ticking) return;
      ticking = run;
      if (run) gsap.ticker.add(tick);
      else gsap.ticker.remove(tick);
    };

    const screen = new IntersectionObserver(([entry]) => {
      onScreen = Boolean(entry?.isIntersecting);
      sync();
    });
    screen.observe(row);
    document.addEventListener("visibilitychange", sync);

    // Page scrolling pushes the row a little. A push only: nothing here touches the scroll.
    // The browser putting the scroll back after Back or a reload isn't anyone scrolling.
    const pushFrom = performance.now() + PUSH_WAKE_MS;
    // While a finger is scrolling the page, the row rests, so the phone has one thing to keep smooth.
    const touchScreen = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    const push = ScrollTrigger.create({
      trigger: row,
      start: "top bottom",
      end: "bottom top",
      onUpdate: (self) => {
        if (touchScreen) {
          f.holdUntil = performance.now() + TOUCH_SCROLL_REST_MS;
          return;
        }
        if (!f.userPaused && !f.focus && !f.holding && !f.gliding && performance.now() >= pushFrom) n.pushTarget = scalePush(self.getVelocity());
      },
    });

    const glideTo = (to: number) => {
      const layout = layoutRef.current;
      if (!layout) return;
      f.gliding = true;
      n.velocity = 0;
      n.push = 0;
      n.pushTarget = 0;
      n.drift = 0;
      glide?.kill();
      track.dataset.moving = "true";
      moving = true;
      glide = gsap.to(n, {
        x: to,
        duration: GLIDE_SECONDS,
        ease: travelEase,
        overwrite: true,
        onUpdate: render,
        onComplete: () => {
          f.gliding = false;
          render();
        },
      });
    };
    glideRef.current = glideTo;

    const cursor = cursorRef.current;
    // With the cursor resting on the row, scrolling moves the cards: one notch is about one card.
    const stopWheel = watchRestedWheel(
      row,
      (pixels) => {
        const layout = layoutRef.current;
        // Scrolling the row is a clear wish to get on with it, so the intro makes way.
        skipIntroRef.current();
        if (!layout || f.frozen) return;
        glide?.kill();
        f.gliding = false;
        shelfRef.current?.release(true);
        n.velocity = capFling(n.velocity + (pixels / 100) * (layout.step / MOMENTUM_TAU));
      },
      () => (layoutRef.current?.setWidth ?? 0) * 1.5,
    );

    const pointer = { id: -1, startX: 0, startY: 0, lastX: 0, lastT: 0, speed: 0, moved: false, guard: false };
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      glide?.kill();
      f.gliding = false;
      Object.assign(pointer, { id: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastT: event.timeStamp, speed: 0, moved: false });
      n.velocity = 0;
      if (event.pointerType !== "mouse") f.touch = true;
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== pointer.id) {
        if (event.pointerType === "mouse" && !f.holding) {
          cursor.x = event.clientX;
          cursor.y = event.clientY;
          if (f.frozen) return;
          shelfRef.current?.pointer(cursor.x, cursor.y);
        }
        return;
      }
      const dx = event.clientX - pointer.startX;
      const dy = event.clientY - pointer.startY;
      if (!pointer.moved) {
        if (Math.abs(dy) > DRAG_START && Math.abs(dy) >= Math.abs(dx)) {
          pointer.id = -1;
          return;
        }
        if (Math.abs(dx) <= DRAG_START || Math.abs(dx) <= Math.abs(dy)) return;
        pointer.moved = true;
        f.holding = true;
        n.drift = 0;
        row.setPointerCapture(event.pointerId);
        row.dataset.dragging = "true";
        track.dataset.moving = "true";
        moving = true;
        shelfRef.current?.release(true);
      }
      const step = event.clientX - pointer.lastX;
      const elapsed = Math.max(event.timeStamp - pointer.lastT, 1) / 1000;
      n.x -= step;
      pointer.speed = pointer.speed * 0.6 + (-step / elapsed) * 0.4;
      pointer.lastX = event.clientX;
      pointer.lastT = event.timeStamp;
      render();
    };
    const finishPointer = (event: PointerEvent) => {
      if (event.pointerId !== pointer.id) return;
      pointer.id = -1;
      f.touch = false;
      const now = performance.now();
      if (pointer.moved) {
        f.holding = false;
        pointer.guard = true;
        window.setTimeout(() => (pointer.guard = false), 50);
        delete row.dataset.dragging;
        n.velocity = event.timeStamp - pointer.lastT < FRESH_MOVE_MS && event.type !== "pointercancel" ? capFling(pointer.speed) : 0;
        f.holdUntil = now + RELEASE_RESUME_MS;
      } else if (event.pointerType !== "mouse") {
        f.holdUntil = now + RESUME_AFTER_MS;
      }
    };
    const onPointerEnter = (event: PointerEvent) => {
      if (event.pointerType === "mouse") f.hover = true;
    };
    const onPointerLeave = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      f.hover = false;
      f.holdUntil = performance.now() + RESUME_AFTER_MS;
      shelfRef.current?.release(true);
    };
    // Only a clearly sideways gesture is ever taken. Vertical wheel and swipes stay with the page.
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      glide?.kill();
      f.gliding = false;
      shelfRef.current?.release(true);
      n.x += event.deltaX;
      n.drift = 0;
      f.holdUntil = performance.now() + WHEEL_RESUME_MS;
      render();
    };
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (!target.matches?.(":focus-visible")) return;
      f.focus = true;
      const layout = layoutRef.current;
      const item = target.closest("li");
      const shelf = shelfRef.current;
      if (!layout || !item || !shelf) return;
      const index = real().indexOf(item as HTMLElement);
      const current = wrapped();
      let goal = targetForCard(index, current, layout.step, layout.cardWidth, layout.rowWidth, layout.gutter);
      // The album opens as it arrives, so the whole spread has to lie on the table.
      goal += shelf.fitFor(index * layout.step + layout.gutter - goal);
      const highest = layout.setWidth * (layout.rounds + 1) + layout.gutter - layout.rowWidth;
      if (goal !== current) {
        n.x = nearestLoop(current, goal, layout.setWidth, highest);
        glideTo(goal);
      }
      const slot = shelf.slotOf(item);
      if (slot) shelf.open(slot, { glide: false });
    };
    const real = () => [...track.querySelectorAll<HTMLElement>("li[data-real]")];
    const onFocusOut = (event: FocusEvent) => {
      if (row.contains(event.relatedTarget as Node | null)) return;
      f.focus = false;
      f.holdUntil = performance.now() + RESUME_AFTER_MS;
      shelfRef.current?.release(true);
    };

    // A press stops the row at once, so the page grows from exactly where the album is.
    let replaying = false;
    const onClick = (event: MouseEvent) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey) return;
      if (pointer.guard) {
        pointer.guard = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (replaying) return;
      pressAlbum(
        event,
        shelfRef.current,
        (slot) => {
          f.frozen = true;
          glide?.kill();
          const layout = layoutRef.current;
          if (layout && shelfRef.current) writeSession(RETURN_KEY, JSON.stringify({ index: slot.index, offset: shelfRef.current.leftOf(slot) - layout.gutter }));
        },
        (slot, go) => {
          const realLink = real()[slot.index]?.querySelector<HTMLAnchorElement>(".wbsk-album__link");
          if (!realLink) return;
          go(() => {
            replaying = true;
            realLink.click();
            replaying = false;
          });
        },
      );
    };
    const onDragStart = (event: Event) => event.preventDefault();
    // A press that leaves the row without changing page must not leave it frozen.
    const unfreeze = () => {
      f.frozen = false;
      writeSession(RETURN_KEY, null);
    };
    const onPageShow = () => {
      if (f.frozen) unfreeze();
    };

    row.addEventListener("pointerdown", onPointerDown);
    row.addEventListener("pointermove", onPointerMove);
    row.addEventListener("pointerup", finishPointer);
    row.addEventListener("pointercancel", finishPointer);
    row.addEventListener("pointerenter", onPointerEnter);
    row.addEventListener("pointerleave", onPointerLeave);
    row.addEventListener("wheel", onWheel, { passive: false });
    row.addEventListener("focusin", onFocusIn);
    row.addEventListener("focusout", onFocusOut);
    row.addEventListener("click", onClick, { capture: true });
    row.addEventListener("dragstart", onDragStart);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      gsap.ticker.remove(tick);
      stopWheel();
      glide?.kill();
      push.kill();
      screen.disconnect();
      document.removeEventListener("visibilitychange", sync);
      row.removeEventListener("pointerdown", onPointerDown);
      row.removeEventListener("pointermove", onPointerMove);
      row.removeEventListener("pointerup", finishPointer);
      row.removeEventListener("pointercancel", finishPointer);
      row.removeEventListener("pointerenter", onPointerEnter);
      row.removeEventListener("pointerleave", onPointerLeave);
      row.removeEventListener("wheel", onWheel);
      row.removeEventListener("focusin", onFocusIn);
      row.removeEventListener("focusout", onFocusOut);
      row.removeEventListener("click", onClick, { capture: true });
      row.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("pageshow", onPageShow);
      renderRef.current = () => {};
      delete track.dataset.moving;
      delete row.dataset.dragging;
    };
  }, [mode, bundle]);

  // A short list or reduced motion: the same row, still, on the browser's own sideways scrolling.
  useEffect(() => {
    const row = rowRef.current;
    if (mode !== "still" || !row) return;
    const ends = () => {
      setAtEnds({ start: row.scrollLeft <= 2, end: row.scrollLeft + row.clientWidth >= row.scrollWidth - 2 });
      shelfRef.current?.depth();
    };
    ends();
    row.addEventListener("scroll", ends, { passive: true });
    const drag = { active: false, x: 0, left: 0, moved: false };
    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      Object.assign(drag, { active: true, x: event.clientX, left: row.scrollLeft, moved: false });
    };
    const onMove = (event: PointerEvent) => {
      if (!drag.active) return;
      const distance = event.clientX - drag.x;
      if (Math.abs(distance) > DRAG_START) drag.moved = true;
      if (drag.moved) {
        row.scrollLeft = drag.left - distance;
        row.dataset.dragging = "true";
      }
    };
    const onUp = () => {
      drag.active = false;
      delete row.dataset.dragging;
    };
    const onClick = (event: MouseEvent) => {
      if (drag.moved) {
        drag.moved = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.shiftKey) return;
      pressAlbum(event, shelfRef.current, () => {}, (slot, go) => go(() => slot.link.click()));
    };
    const onDragStart = (event: Event) => event.preventDefault();
    const onHover = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && !drag.active) shelfRef.current?.pointer(event.clientX, event.clientY);
    };
    const onLeave = (event: PointerEvent) => {
      if (event.pointerType === "mouse") shelfRef.current?.release(true);
    };
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (!target.matches?.(":focus-visible")) return;
      const slot = shelfRef.current?.slotOf(target);
      if (slot) shelfRef.current?.open(slot);
    };
    const onFocusOut = (event: FocusEvent) => {
      if (!row.contains(event.relatedTarget as Node | null)) shelfRef.current?.release(true);
    };
    row.addEventListener("pointermove", onHover);
    row.addEventListener("pointerleave", onLeave);
    row.addEventListener("focusin", onFocusIn);
    row.addEventListener("focusout", onFocusOut);
    row.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    row.addEventListener("click", onClick, { capture: true });
    row.addEventListener("dragstart", onDragStart);
    return () => {
      row.removeEventListener("scroll", ends);
      row.removeEventListener("pointermove", onHover);
      row.removeEventListener("pointerleave", onLeave);
      row.removeEventListener("focusin", onFocusIn);
      row.removeEventListener("focusout", onFocusOut);
      row.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      row.removeEventListener("click", onClick, { capture: true });
      row.removeEventListener("dragstart", onDragStart);
    };
  }, [mode]);

  // The albums introduce themselves once, when most of the row is on screen (owner, 3 November 2026).
  useLayoutEffect(() => {
    const row = rowRef.current;
    const track = trackRef.current;
    if (!row || !track || !bundle || mode === "plain" || introDone.current) return;
    introDone.current = true;
    if (prefersReducedMotion() || returningRef.current) return;
    const { gsap } = bundle;
    const f = flags.current;
    const items = [...track.querySelectorAll<HTMLElement>(":scope > li")];
    gsap.set(items, { opacity: 0 });
    f.frozen = true;
    let timeline: { progress: (value: number) => unknown; kill: () => unknown } | null = null;
    let finished = false;
    const done = () => {
      finished = true;
      f.frozen = false;
      skipIntroRef.current = () => {};
      // A cursor that came to rest on an album during the intro now counts.
      if (f.hover) shelfRef.current?.pointer(cursorRef.current.x, cursorRef.current.y);
    };
    const begin = () => {
      timeline = shelfRef.current?.playIntro(done) ?? null;
      if (!timeline && !finished) {
        gsap.set(items, { clearProps: "opacity" });
        done();
      }
    };
    const watch = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        watch.disconnect();
        begin();
      },
      { threshold: 0.7 },
    );
    watch.observe(row);
    const skip = () => {
      if (finished) return;
      watch.disconnect();
      if (timeline) timeline.progress(1);
      else {
        gsap.set(items, { clearProps: "opacity" });
        done();
      }
    };
    skipIntroRef.current = skip;
    row.addEventListener("pointerdown", skip);
    row.addEventListener("focusin", skip);
    const onSideways = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) skip();
    };
    row.addEventListener("wheel", onSideways, { passive: true });
    return () => {
      watch.disconnect();
      row.removeEventListener("pointerdown", skip);
      row.removeEventListener("focusin", skip);
      row.removeEventListener("wheel", onSideways);
      // Development mode starts effects twice, and a change of mode starts again; neither should lose the intro.
      if (!finished) {
        (timeline as { kill: () => unknown } | null)?.kill();
        introDone.current = false;
      }
    };
  }, [bundle, mode]);

  const moveByCard = (direction: 1 | -1) => {
    skipIntroRef.current();
    shelfRef.current?.release(true);
    const layout = layoutRef.current;
    const row = rowRef.current;
    if (!layout || !row) return;
    if (mode === "drift") {
      const n = numbers.current;
      const from = n.x;
      const target = (Math.round(from / layout.step) + direction) * layout.step;
      glideRef.current(target);
      return;
    }
    const to = row.scrollLeft + layout.step * direction;
    if (prefersReducedMotion() || !bundle) row.scrollLeft = to;
    else bundle.gsap.to(row, { scrollLeft: to, duration: GLIDE_SECONDS, ease: travelEase, overwrite: true });
  };

  const togglePause = () => {
    skipIntroRef.current();
    const next = !flags.current.userPaused;
    flags.current.userPaused = next;
    writeSession(PAUSED_KEY, next ? "1" : "0");
    setPaused(next);
  };

  const label = albumLabel ?? DEFAULT_ALBUM_LABEL;
  const openWedding = openIndex === null ? null : weddings[openIndex];
  const showArrows = (mode === "drift" || mode === "still") && !fits;
  const copies = mode === "drift" ? Array.from({ length: rounds }, (_, round) => weddings.map((wedding) => ({ wedding, round }))).flat() : [];

  return (
    <>
      <div ref={trayRef} className="wbsk-drifttray">
        <span className="wbsk-drifttray__pool" aria-hidden="true" />
        <div ref={rowRef} className="wbsk-drift" data-mode={mode} data-fits={fits} data-paused={paused}>
          <ul ref={trackRef} className="wbsk-drift__track" aria-label="Featured weddings">
            {copies.map(({ wedding, round }) => (
              <li key={`before-${round}-${wedding.slug}`} aria-hidden="true" inert>
                <AlbumCard wedding={wedding} label={label} photos={opened.has(wedding.slug)} copy />
              </li>
            ))}
            {weddings.map((wedding) => (
              <li key={wedding.slug} data-real="">
                <AlbumCard wedding={wedding} label={label} photos={opened.has(wedding.slug)} />
              </li>
            ))}
            {copies.map(({ wedding, round }) => (
              <li key={`after-${round}-${wedding.slug}`} aria-hidden="true" inert>
                <AlbumCard wedding={wedding} label={label} photos={opened.has(wedding.slug)} copy />
              </li>
            ))}
          </ul>
        </div>
        <span className="wbsk-drifttray__sweep" aria-hidden="true" />
        <span className="wbsk-drifttray__lamp" aria-hidden="true" />
      </div>
      <div className="wbsk-container wbsk-drift__below">
        <div className="wbsk-drift__line">
          <CrossfadeLine text={description} />
          {openWedding ? (
            <WbskLink
              href={openWedding.href}
              className="wbsk-link wbsk-drift__go"
              data-transition="expand"
              data-keeps-album=""
              onClick={() => {
                const slot = shelfRef.current?.openSlot();
                if (slot) setExpandSource(slot.li);
              }}
            >
              View story →
            </WbskLink>
          ) : null}
        </div>
        <div className="wbsk-drift__bar">
          <div className="wbsk-drift__controls">
            {mode === "drift" ? (
              <button type="button" className="wbsk-roundbutton" aria-label={paused ? "Play moving weddings" : "Pause moving weddings"} onClick={togglePause}>
                {paused ? <Arrow d="M8 5v14l11-7z" /> : <Arrow d="M9 5v14M15 5v14" />}
              </button>
            ) : null}
            {showArrows ? (
              <>
                <button type="button" className="wbsk-roundbutton" aria-label="Previous wedding" disabled={mode === "still" && atEnds.start} onClick={() => moveByCard(-1)}>
                  <Arrow d="M15 5l-7 7 7 7" />
                </button>
                <button type="button" className="wbsk-roundbutton" aria-label="Next wedding" disabled={mode === "still" && atEnds.end} onClick={() => moveByCard(1)}>
                  <Arrow d="M9 5l7 7-7 7" />
                </button>
              </>
            ) : null}
          </div>
          <WbskLink href={seeAllHref} className="wbsk-link wbsk-morelink wbsk-drift__see">
            See all weddings →
          </WbskLink>
        </div>
      </div>
    </>
  );
}
