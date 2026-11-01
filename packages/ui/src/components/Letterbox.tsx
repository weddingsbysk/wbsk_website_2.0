"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { prefersReducedMotion } from "../motion";

/**
 * Cinema bars part from the middle as a wide image reaches the middle of the screen, once
 * (Decision 12). The styles open them by themselves if this script never runs.
 */
export function Letterbox({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.dataset.letterbox = "open";
      return;
    }
    el.dataset.letterbox = "waiting";
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting && entry?.boundingClientRect.top > 0) return;
        el.dataset.letterbox = "open";
        observer.disconnect();
      },
      { rootMargin: "0px 0px -35% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className="wbsk-letterbox">
      <div className="wbsk-letterbox__picture">{children}</div>
      <span className="wbsk-letterbox__bar" data-edge="top" aria-hidden="true" />
      <span className="wbsk-letterbox__bar" data-edge="bottom" aria-hidden="true" />
    </div>
  );
}
