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

/** GSAP is the only animation library, and only loads once something needs it. */
export function loadGsap(): Promise<GsapBundle> {
  gsapPromise ??= Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
    ([{ gsap }, { ScrollTrigger }]) => {
      gsap.registerPlugin(ScrollTrigger);
      return { gsap, ScrollTrigger };
    },
  );
  return gsapPromise;
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
