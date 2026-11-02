"use client";

import { useEffect, type RefObject } from "react";
import { loadGsap, prefersReducedMotion, settleEase } from "../motion";

/** Card motion (Decisions 05, 11, 12): tweens start from wherever the card is, so nothing snaps. */
const HOVER = 0.3;
const ZOOM = 1.045;
const ZOOM_SECONDS = 1.2;
const LIFT = -6;
const NUDGE = 4;
const ARRIVE = 0.7;
const RIPPLE = 0.09;
const RISE = 24;
const PRESS_MS = 150;

export const canHover = () =>
  typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/** Lifts a card or lets it down. Also used for the moving row's copies, which take no events themselves. */
export function setCardHot(card: HTMLElement, on: boolean) {
  if (prefersReducedMotion()) return;
  const wanted = on ? "true" : "false";
  card.dataset.hot = wanted;
  void loadGsap().then(({ gsap }) => {
    if (card.dataset.hot !== wanted) return;
    const part = (name: string) => card.querySelector(name);
    const hover = { duration: HOVER, ease: settleEase, overwrite: "auto" as const };
    gsap.to(part(".wbsk-card__link"), { ...hover, y: on ? LIFT : 0 });
    gsap.to(part(".wbsk-card__photo"), { ...hover, "--card-lift": on ? 1 : 0 });
    gsap.to(part(".wbsk-card__clip .wbsk-frame"), { duration: ZOOM_SECONDS, ease: settleEase, overwrite: "auto", scale: on ? ZOOM : 1 });
    gsap.to(part(".wbsk-card__more"), { ...hover, opacity: on ? 1 : 0 });
    gsap.to(part(".wbsk-card__arrow"), { ...hover, x: on ? NUDGE : 0 });
    gsap.to(part(".wbsk-card__rule"), { ...hover, scaleX: on ? 1 : 0 });
  });
}

/** A brief press-in on touch screens, then the action (Decision 05). */
export function pressThen(link: HTMLElement, action: () => void) {
  if (canHover() || prefersReducedMotion()) {
    action();
    return;
  }
  link.dataset.pressed = "true";
  window.setTimeout(() => {
    action();
    delete link.dataset.pressed;
  }, PRESS_MS);
}

type Options = {
  /** The moving row works out its own hover and press, since its copies take no events. */
  pointer?: boolean;
};

/** Hover, keyboard focus and press for every card inside a container. */
export function useCardMotion(rootRef: RefObject<HTMLElement | null>, { pointer = true }: Options = {}) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const cardOf = (target: EventTarget | null) =>
      (target as Element | null)?.closest?.(".wbsk-card__link")?.closest<HTMLElement>(".wbsk-card") ?? null;
    let hovered: HTMLElement | null = null;
    let focused: HTMLElement | null = null;
    const settle = (next: HTMLElement | null, other: HTMLElement | null, previous: HTMLElement | null) => {
      if (previous && previous !== next && previous !== other) setCardHot(previous, false);
      if (next && next !== previous) setCardHot(next, true);
    };
    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !canHover()) return;
      const next = cardOf(event.target);
      settle(next, focused, hovered);
      hovered = next;
    };
    const onPointerLeave = () => {
      settle(null, focused, hovered);
      hovered = null;
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!(event.target as Element).matches?.(":focus-visible")) return;
      const next = cardOf(event.target);
      settle(next, hovered, focused);
      focused = next;
    };
    const onFocusOut = () => {
      settle(null, hovered, focused);
      focused = null;
    };
    let pressed: HTMLAnchorElement | null = null;
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element).closest<HTMLAnchorElement>(".wbsk-card__link");
      if (!link || canHover() || prefersReducedMotion()) return;
      if (pressed === link) {
        pressed = null;
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      pressThen(link, () => {
        pressed = link;
        link.click();
      });
    };
    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    if (pointer) {
      root.addEventListener("pointerover", onPointerOver);
      root.addEventListener("pointerleave", onPointerLeave);
      root.addEventListener("click", onClick, { capture: true });
    }
    return () => {
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
      root.removeEventListener("pointerover", onPointerOver);
      root.removeEventListener("pointerleave", onPointerLeave);
      root.removeEventListener("click", onClick, { capture: true });
    };
  }, [rootRef, pointer]);
}

/** Each card still below the screen rises and fades in once. Nothing on screen at load ever waits. */
export function useCardEntrance(rootRef: RefObject<HTMLElement | null>, selector = ".wbsk-cardslot") {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;
    const waiting = [...root.querySelectorAll<HTMLElement>(selector)].filter(
      (item) => item.getBoundingClientRect().top >= window.innerHeight,
    );
    if (!waiting.length) return;
    waiting.forEach((item) => (item.dataset.enter = "waiting"));
    const showAll = () => waiting.forEach((item) => delete item.dataset.enter);
    let triggers: { kill: () => void }[] = [];
    let cancelled = false;
    // GSAP waits until cards are nearly here, so it never competes with the page's first photo.
    const near = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        near.disconnect();
        loadGsap()
          .then(({ gsap, ScrollTrigger }) => {
            if (cancelled) return;
            gsap.set(waiting, { opacity: 0, y: RISE });
            showAll();
            triggers = ScrollTrigger.batch(waiting, {
              start: "top 94%",
              once: true,
              interval: 0.08,
              onEnter: (batch) => {
                gsap.to(batch, { opacity: 1, y: 0, duration: ARRIVE, ease: settleEase, stagger: RIPPLE, overwrite: true, clearProps: "transform,opacity" });
              },
            });
          })
          .catch(showAll);
      },
      { rootMargin: "60% 0px" },
    );
    waiting.forEach((item) => near.observe(item));
    return () => {
      cancelled = true;
      near.disconnect();
      triggers.forEach((trigger) => trigger.kill());
    };
  }, [rootRef, selector]);
}

/** Cards added by "Show more" ripple in the same way (Decision 12). */
export function rippleIn(items: HTMLElement[]) {
  if (prefersReducedMotion() || !items.length) return;
  void loadGsap().then(({ gsap }) => {
    gsap.fromTo(items, { opacity: 0, y: RISE }, { opacity: 1, y: 0, duration: ARRIVE, ease: settleEase, stagger: RIPPLE, clearProps: "transform,opacity" });
  });
}
