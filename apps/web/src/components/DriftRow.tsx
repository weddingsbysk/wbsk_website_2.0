"use client";

import "@wbsk/ui/css/home.css";
import { canHover, ClientCard, pressThen, setCardHot, tiltCard, useCardMotion, WbskLink, type WeddingSummary } from "@wbsk/ui";
import { capFling, DRAG_START, MOMENTUM_TAU, nearestLoop, roundsToFill, scalePush, SECONDS_PER_CARD, shouldDrift, stepDrift, targetForCard, type DriftNumbers } from "@wbsk/ui/drift";
import { loadGsap, peekGsap, prefersReducedMotion, setExpandSource, travelEase, watchRestedWheel } from "@wbsk/ui/motion";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
/** The arc's opening, laid out straight (Decision 13): a stack rises, then fans out, nearest first. */
const STACK_RISE_S = 0.9;
const FAN_AT_S = 0.75;
const FAN_S = 1.5;
const FAN_RIPPLE_S = 0.14;
const STACK_SCALE = 0.82;
const STACK_DROP = 70;
const STACK_TURN = 2.5;
/** Dock-style swell under the cursor, as on the records. */
const SWELL = 0.09;
const ROW_SIZES = "(min-width: 1520px) 270px, (min-width: 1190px) 18vw, (min-width: 700px) 210px, 60vw";

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

const Arrow = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d={d} />
  </svg>
);

/** Featured weddings, floating slowly and endlessly like film through a projector (Decision 30). */
export function FeaturedRow({ weddings: allWeddings, seeAllHref }: { weddings: WeddingSummary[]; seeAllHref: string }) {
  const [limit, setLimit] = useState<number | null>(null);
  const weddings = limit === null ? allWeddings : allWeddings.slice(0, limit);
  const [mode, setMode] = useState<Mode>("plain");
  const [fits, setFits] = useState(false);
  const [rounds, setRounds] = useState(1);
  const [paused, setPaused] = useState(false);
  const [atEnds, setAtEnds] = useState({ start: true, end: false });
  const [description, setDescription] = useState("");
  const [bundle, setBundle] = useState<Gsap | null>(() => peekGsap());

  const weddingsRef = useRef(weddings);
  useEffect(() => {
    weddingsRef.current = weddings;
  }, [weddings]);

  const rowRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const layoutRef = useRef<Layout | null>(null);
  const numbers = useRef<DriftNumbers>({ x: 0, velocity: 0, drift: 0, push: 0, pushTarget: 0 });
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

  useCardMotion(rowRef, { pointer: false });

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
      if (!f.gliding && !f.focus) n.x = wrapped();
      const at = layout.setWidth * layout.rounds + n.x;
      if (at === lastX) return;
      lastX = at;
      track.style.transform = `translate3d(${(-at).toFixed(2)}px, 0, 0)`;
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
      // Negative: the cards travel from left to right (owner, 2 November 2026).
      const base = -layout.step / SECONDS_PER_CARD;
      const free = !f.userPaused && !f.hover && !f.focus && !f.touch && performance.now() >= f.holdUntil && Math.abs(n.velocity) < Math.abs(base);
      stepDrift(n, dt, base, free ? 1 : 0);
      render();
      const speed = Math.abs(n.velocity) + Math.abs(n.push) + n.drift * Math.abs(base);
      // Cards passing under a resting cursor come into focus in turn.
      if (f.hover && Math.abs(n.velocity) > 4) focusUnderCursor();
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
        if (!f.userPaused && !f.focus && !f.holding && !f.gliding && performance.now() >= pushFrom) n.pushTarget = scalePush(-self.getVelocity());
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

    // Which card, real or copy, is under this point. Copies are inert, so they can't say for themselves.
    const cards = () => [...track.querySelectorAll<HTMLElement>(":scope > li")];
    const cardAt = (clientX: number, clientY: number) => {
      const layout = layoutRef.current;
      if (!layout) return null;
      const box = row.getBoundingClientRect();
      const trackBox = track.getBoundingClientRect();
      if (clientY < trackBox.top || clientY > trackBox.bottom) return null;
      const along = clientX - box.left - layout.gutter + layout.setWidth * layout.rounds + n.x;
      const slot = Math.floor(along / layout.step);
      if (along - slot * layout.step > layout.cardWidth) return null;
      const item = cards()[slot];
      if (!item) return null;
      return { item, card: item.querySelector<HTMLElement>(".wbsk-card"), index: ((slot % layout.count) + layout.count) % layout.count };
    };

    let hot: HTMLElement | null = null;
    const setHot = (next: HTMLElement | null) => {
      if (next === hot) return;
      if (hot) setCardHot(hot, false);
      if (next) setCardHot(next, true);
      hot = next;
      if (next) row.dataset.overCard = "true";
      else delete row.dataset.overCard;
    };

    // Cards near the cursor swell, their neighbours a little less, then settle back.
    const swollen = new Set<HTMLElement>();
    const swell = (clientX: number, on: boolean) => {
      const layout = layoutRef.current;
      if (!layout) return;
      const box = row.getBoundingClientRect();
      const along = clientX - box.left - layout.gutter + layout.setWidth * layout.rounds + n.x;
      const slot = Math.floor(along / layout.step);
      const all = cards();
      const near = new Set<HTMLElement>();
      if (on) {
        for (let at = slot - 2; at <= slot + 2; at += 1) {
          const card = all[at]?.querySelector<HTMLElement>(".wbsk-card");
          if (!card) continue;
          const distance = (at + 0.5) - (along / layout.step);
          near.add(card);
          swollen.add(card);
          gsap.to(card, { scale: 1 + SWELL * Math.exp(-distance * distance * 1.6), duration: 0.45, ease: "power3.out", overwrite: "auto" });
          if (at === slot) all[at]!.dataset.hot = "";
          else delete all[at]!.dataset.hot;
        }
      }
      swollen.forEach((card) => {
        if (near.has(card)) return;
        gsap.to(card, { scale: 1, duration: 0.5, ease: "power3.out", overwrite: "auto" });
        delete card.parentElement?.dataset.hot;
        swollen.delete(card);
      });
    };

    const cursor = { x: 0, y: 0 };
    const focusUnderCursor = () => {
      const over = cardAt(cursor.x, cursor.y);
      setHot(over?.card ?? null);
      swell(cursor.x, Boolean(over));
      if (over?.card) {
        tiltCard(over.card, cursor.x, cursor.y);
        setDescription(weddingsRef.current[over.index]?.shortDescription ?? "");
      }
    };
    // With the cursor resting on the row, scrolling moves the cards: one notch is about one card.
    const stopWheel = watchRestedWheel(
      row,
      (pixels) => {
        const layout = layoutRef.current;
        if (!layout || f.frozen) return;
        glide?.kill();
        f.gliding = false;
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
          if (f.frozen) return;
          cursor.x = event.clientX;
          cursor.y = event.clientY;
          focusUnderCursor();
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
        setHot(null);
        swell(0, false);
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
      setHot(null);
      swell(0, false);
    };
    // Only a clearly sideways gesture is ever taken. Vertical wheel and swipes stay with the page.
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      glide?.kill();
      f.gliding = false;
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
      if (!layout || !item) return;
      setDescription(weddingsRef.current[real().indexOf(item as HTMLElement)]?.shortDescription ?? "");
      const index = real().indexOf(item as HTMLElement);
      const highest = layout.setWidth * (layout.rounds + 1) + layout.gutter - layout.rowWidth;
      const goal = targetForCard(index, wrapped(), layout.step, layout.cardWidth, layout.rowWidth, layout.gutter);
      const current = wrapped();
      if (goal === current) return;
      n.x = nearestLoop(current, goal, layout.setWidth, highest);
      glideTo(goal);
    };
    const real = () => [...track.querySelectorAll<HTMLElement>("li[data-real]")];
    const onFocusOut = (event: FocusEvent) => {
      if (row.contains(event.relatedTarget as Node | null)) return;
      f.focus = false;
      f.holdUntil = performance.now() + RESUME_AFTER_MS;
    };

    // A press stops the row at once, so the page grows from exactly where the card is.
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
      const layout = layoutRef.current;
      if (!layout) return;
      const link = (event.target as Element).closest<HTMLAnchorElement>(".wbsk-card__link");
      const over = link ? null : cardAt(event.clientX, event.clientY);
      const realItem = link ? link.closest("li")! : real()[over?.index ?? -1];
      if (!realItem) return;
      const realLink = realItem.querySelector<HTMLAnchorElement>(".wbsk-card__link");
      if (!realLink) return;
      const source = (over?.card ?? realItem.querySelector<HTMLElement>(".wbsk-card"))!;
      const index = real().indexOf(realItem as HTMLElement);
      f.frozen = true;
      glide?.kill();
      // Measured from the card's slot: the card itself is swollen under the cursor.
      const offset = (source.closest("li") ?? source).getBoundingClientRect().left - row.getBoundingClientRect().left - layout.gutter;
      writeSession(RETURN_KEY, JSON.stringify({ index, offset }));
      const go = () => {
        replaying = true;
        setExpandSource(source);
        realLink.click();
        replaying = false;
      };
      if (link && canHover()) {
        setExpandSource(source);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      pressThen((over?.card ?? realItem).querySelector<HTMLElement>(".wbsk-card__link") ?? realLink, go);
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
      setHot(null);
      swell(0, false);
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
      delete row.dataset.overCard;
      delete row.dataset.dragging;
    };
  }, [mode, bundle]);

  // A short list or reduced motion: the same row, still, on the browser's own sideways scrolling.
  useEffect(() => {
    const row = rowRef.current;
    if (mode !== "still" || !row) return;
    const ends = () => setAtEnds({ start: row.scrollLeft <= 2, end: row.scrollLeft + row.clientWidth >= row.scrollWidth - 2 });
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
      if (!drag.moved) return;
      drag.moved = false;
      event.preventDefault();
      event.stopPropagation();
    };
    const onDragStart = (event: Event) => event.preventDefault();
    row.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    row.addEventListener("click", onClick, { capture: true });
    row.addEventListener("dragstart", onDragStart);
    return () => {
      row.removeEventListener("scroll", ends);
      row.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      row.removeEventListener("click", onClick, { capture: true });
      row.removeEventListener("dragstart", onDragStart);
    };
  }, [mode]);

  // Hover in the still row uses the ordinary card motion, since it has no copies.
  useEffect(() => {
    const row = rowRef.current;
    if (mode !== "still" || !row) return;
    let hot: HTMLElement | null = null;
    const onOver = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const card = (event.target as Element).closest?.(".wbsk-card__link")?.closest<HTMLElement>(".wbsk-card") ?? null;
      if (card === hot) return;
      if (hot) setCardHot(hot, false);
      if (card) {
        setCardHot(card, true);
        const index = [...row.querySelectorAll(".wbsk-card")].indexOf(card);
        setDescription(weddingsRef.current[index]?.shortDescription ?? "");
      }
      hot = card;
    };
    const onMoveTilt = (event: PointerEvent) => {
      if (hot && event.pointerType === "mouse") tiltCard(hot, event.clientX, event.clientY);
    };
    row.addEventListener("pointermove", onMoveTilt);
    const onLeave = () => {
      if (hot) setCardHot(hot, false);
      hot = null;
    };
    row.addEventListener("pointerover", onOver);
    row.addEventListener("pointerleave", onLeave);
    return () => {
      row.removeEventListener("pointerover", onOver);
      row.removeEventListener("pointermove", onMoveTilt);
      row.removeEventListener("pointerleave", onLeave);
    };
  }, [mode]);

  // The row introduces itself once, when most of it is on screen (Decisions 13 and 30).
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
    let timeline: { progress: (value: number) => unknown } | null = null;
    let finished = false;
    const done = () => {
      finished = true;
      f.frozen = false;
      skipIntroRef.current = () => {};
    };
    const begin = () => {
      const rowBox = row.getBoundingClientRect();
      const centre = rowBox.left + rowBox.width / 2;
      const placed = items
        .map((item) => {
          const box = item.getBoundingClientRect();
          return { item, away: box.left + box.width / 2 - centre, on: box.right > rowBox.left && box.left < rowBox.right };
        })
        .filter((entry) => entry.on)
        .sort((a, b) => Math.abs(a.away) - Math.abs(b.away));
      gsap.set(items, { opacity: 1 });
      const tl = gsap.timeline({
        onComplete: () => {
          gsap.set(items, { clearProps: "transform,opacity,zIndex" });
          done();
        },
      });
      placed.forEach(({ item, away }, rank) => {
        gsap.set(item, { x: -away, y: STACK_DROP, scale: STACK_SCALE, rotation: (rank % 2 ? 1 : -1) * Math.min(rank, 3) * STACK_TURN * 0.5, zIndex: placed.length - rank, opacity: 0 });
        tl.to(item, { y: 0, opacity: 1, duration: STACK_RISE_S, ease: "power3.out" }, 0);
        tl.to(item, { x: 0, scale: 1, rotation: 0, duration: FAN_S, ease: "expo.out" }, FAN_AT_S + rank * FAN_RIPPLE_S);
      });
      timeline = tl;
    };
    const watch = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        watch.disconnect();
        begin();
      },
      { threshold: 0.45 },
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
        (timeline as { kill?: () => void } | null)?.kill?.();
        introDone.current = false;
      }
    };
  }, [bundle, mode]);

  const moveByCard = (direction: 1 | -1) => {
    skipIntroRef.current();
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

  const showArrows = (mode === "drift" || mode === "still") && !fits;
  const copies = mode === "drift" ? Array.from({ length: rounds }, (_, round) => weddings.map((wedding) => ({ wedding, round }))).flat() : [];

  return (
    <>
      <div ref={rowRef} className="wbsk-drift" data-mode={mode} data-fits={fits} data-paused={paused}>
        <ul ref={trackRef} className="wbsk-drift__track" aria-label="Featured weddings">
          {copies.map(({ wedding, round }) => (
            <li key={`before-${round}-${wedding.slug}`} aria-hidden="true" inert>
              <ClientCard wedding={wedding} sizes={ROW_SIZES} copy />
            </li>
          ))}
          {weddings.map((wedding) => (
            <li key={wedding.slug} data-real="" className="wbsk-cardslot">
              <ClientCard wedding={wedding} onShow={setDescription} sizes={ROW_SIZES} />
            </li>
          ))}
          {copies.map(({ wedding, round }) => (
            <li key={`after-${round}-${wedding.slug}`} aria-hidden="true" inert>
              <ClientCard wedding={wedding} sizes={ROW_SIZES} copy />
            </li>
          ))}
        </ul>
      </div>
      <div className="wbsk-container wbsk-drift__below">
        <div className="wbsk-drift__line">
          <CrossfadeLine text={description} />
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
