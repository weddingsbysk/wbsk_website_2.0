"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { prefersReducedMotion } from "../motion";

/**
 * Rises and fades in once as it enters the screen. Content is never hidden by default: only
 * something still below the screen after scripts run is tucked away, so nothing depends on them.
 */
export function Reveal({
  children,
  delayIndex = 0,
  className = "",
}: {
  children: ReactNode;
  delayIndex?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    el.dataset.reveal = "waiting";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        el.style.setProperty("--reveal-index", String(delayIndex));
        el.dataset.reveal = "shown";
        observer.disconnect();
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delayIndex]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
