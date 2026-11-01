"use client";

import { useEffect, useRef } from "react";
import { loadGsap, prefersReducedMotion, supportsScrollTimeline } from "../motion";

/**
 * Browsers without scroll-linked animation get the same drift through GSAP: the picture moves at
 * 15% of the scroll, and the title lifts and dims as the hero leaves (Decision 12).
 */
export function HeroDrift() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const hero = ref.current?.closest<HTMLElement>(".wbsk-hero");
    if (!hero || supportsScrollTimeline() || prefersReducedMotion()) return;
    let cancelled = false;
    let cleanup = () => {};
    void loadGsap().then(({ gsap }) => {
      if (cancelled) return;
      const trigger = { trigger: hero, start: "top top", end: "bottom top", scrub: true };
      const tweens = [
        gsap.to(hero.querySelector(".wbsk-hero__media"), { yPercent: 13, ease: "none", scrollTrigger: trigger }),
        gsap.to(hero.querySelector(".wbsk-hero__text"), { y: -48, opacity: 0.25, ease: "none", scrollTrigger: { ...trigger, end: "70% top" } }),
      ];
      cleanup = () => {
        for (const tween of tweens) {
          tween.scrollTrigger?.kill();
          tween.kill();
        }
      };
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);
  return <span ref={ref} hidden />;
}
