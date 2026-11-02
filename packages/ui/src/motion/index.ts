export { motion as motionTokens } from "../tokens";

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function supportsScrollTimeline(): boolean {
  return typeof CSS !== "undefined" && CSS.supports("animation-timeline: view()");
}

type GsapBundle = {
  gsap: typeof import("gsap").gsap;
  ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger;
};

let gsapPromise: Promise<GsapBundle> | null = null;
let gsapLoaded: GsapBundle | null = null;

/** GSAP if it has already arrived, for anything that must be ready within this very frame. */
export const peekGsap = () => gsapLoaded;

/** GSAP is the only animation library, and only loads once something needs it. */
export function loadGsap(): Promise<GsapBundle> {
  gsapPromise ??= Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
    ([{ gsap }, { ScrollTrigger }]) => {
      gsap.registerPlugin(ScrollTrigger);
      gsapLoaded = { gsap, ScrollTrigger };
      return gsapLoaded;
    },
  );
  return gsapPromise;
}

/** The agreed curves as functions, because GSAP doesn't read cubic-bezier strings (Decisions 11, 12). */
export function bezierEase(x1: number, y1: number, x2: number, y2: number) {
  const coordinate = (t: number, a: number, b: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (progress: number) => {
    if (progress <= 0 || progress >= 1) return progress;
    let low = 0;
    let high = 1;
    let t = progress;
    for (let i = 0; i < 20; i += 1) {
      if (coordinate(t, x1, x2) < progress) low = t;
      else high = t;
      t = (low + high) / 2;
    }
    return coordinate(t, y1, y2);
  };
}

export const settleEase = bezierEase(0.22, 1, 0.36, 1);
export const travelEase = bezierEase(0.65, 0, 0.35, 1);

let expandSource: HTMLElement | null = null;
/** The moving row's copies can't be links, so the row says which copy the page should grow from. */
export function setExpandSource(card: HTMLElement | null) {
  expandSource = card;
}
export function takeExpandSource() {
  const card = expandSource;
  expandSource = null;
  return card;
}

const GESTURE_GAP_MS = 250;
const MOUSE_NOTCH_MIN = 50;

/**
 * Decides whether a wheel gesture came from a mouse. Browsers don't say, so this is cautious:
 * a gesture counts only if its first event is a large step. Trackpads start small and stay native.
 */
export function createWheelClassifier() {
  let lastEventAt = -Infinity;
  let isMouse = false;
  return (event: Pick<WheelEvent, "deltaX" | "deltaY" | "deltaMode">, now: number): boolean => {
    if (now - lastEventAt > GESTURE_GAP_MS) {
      isMouse =
        event.deltaX === 0 && (event.deltaMode === 1 || Math.abs(event.deltaY) >= MOUSE_NOTCH_MIN);
    }
    lastEventAt = now;
    return isMouse;
  };
}

const REST_MS = 280;

/**
 * Lets a wheel move something only when the cursor had already come to rest on it. A page scroll
 * that started elsewhere carries straight on as the thing passes under the cursor, and after one
 * full loop the page takes over, so nobody can get stuck in an endless row (owner, 2 November 2026).
 */
export function watchRestedWheel(el: HTMLElement, onMove: (pixels: number) => void, loopPixels: () => number): () => void {
  let enteredAt = Infinity;
  let lastWheelAt = -Infinity;
  let claimed = false;
  let travelled = 0;
  const onEnter = (event: PointerEvent) => {
    if (event.pointerType === "mouse") enteredAt = event.timeStamp;
  };
  const onLeave = () => {
    enteredAt = Infinity;
  };
  const onAnyWheel = (event: WheelEvent) => {
    if (event.timeStamp - lastWheelAt > GESTURE_GAP_MS) {
      claimed = event.composedPath().includes(el) && event.timeStamp - enteredAt >= REST_MS;
      travelled = 0;
    }
    lastWheelAt = event.timeStamp;
  };
  const onWheel = (event: WheelEvent) => {
    if (!claimed || Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.ctrlKey || event.metaKey) return;
    const pixels = event.deltaMode === 1 ? event.deltaY * 40 : event.deltaY;
    travelled += Math.abs(pixels);
    if (travelled > loopPixels()) {
      claimed = false;
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    onMove(pixels);
  };
  el.addEventListener("pointerenter", onEnter);
  el.addEventListener("pointerleave", onLeave);
  el.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("wheel", onAnyWheel, { capture: true, passive: true });
  return () => {
    el.removeEventListener("pointerenter", onEnter);
    el.removeEventListener("pointerleave", onLeave);
    el.removeEventListener("wheel", onWheel);
    window.removeEventListener("wheel", onAnyWheel, { capture: true });
  };
}

function hasOwnScroll(start: Element | null): boolean {
  for (let el = start; el && el !== document.documentElement; el = el.parentElement) {
    if (el.matches("[data-native-wheel], dialog, input, textarea, select")) return true;
    const overflow = getComputedStyle(el).overflowY;
    if ((overflow === "auto" || overflow === "scroll") && el.scrollHeight > el.clientHeight) {
      return true;
    }
  }
  return false;
}

/** Light smoothing for mouse wheels on computers only (Decision 12, option A). Returns a cleanup. */
export function startWheelSmoothing(): () => void {
  if (prefersReducedMotion() || !window.matchMedia("(pointer: fine)").matches) return () => {};
  const isMouseGesture = createWheelClassifier();
  const position = { y: window.scrollY };
  let target = window.scrollY;
  let running = false;
  let gsap: GsapBundle["gsap"] | null = null;
  let stopped = false;
  void loadGsap().then((bundle) => {
    if (!stopped) gsap = bundle.gsap;
  });

  const stop = () => {
    if (!running || !gsap) return;
    gsap.killTweensOf(position);
    running = false;
  };

  const onWheel = (event: WheelEvent) => {
    if (!gsap || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!isMouseGesture(event, event.timeStamp)) {
      stop();
      return;
    }
    if (hasOwnScroll(event.target as Element)) return;
    event.preventDefault();
    if (!running) {
      position.y = window.scrollY;
      target = window.scrollY;
    }
    const step = event.deltaMode === 1 ? event.deltaY * 40 : event.deltaY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    target = Math.max(0, Math.min(max, target + step));
    running = true;
    gsap.to(position, {
      y: target,
      duration: 0.45,
      ease: "power2.out",
      overwrite: true,
      onUpdate: () => window.scrollTo(0, position.y),
      onComplete: () => {
        running = false;
      },
    });
  };

  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", stop);
  window.addEventListener("pointerdown", stop);
  return () => {
    stopped = true;
    stop();
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("keydown", stop);
    window.removeEventListener("pointerdown", stop);
  };
}
