"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { prefersReducedMotion } from "../motion";

/** A portrait glides in from its own side and its spotlight warms up behind it, once (Decision 07). */
export function GlideIn({ side, children }: { side: "left" | "right"; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.85) return;
    el.dataset.glide = "waiting";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        el.dataset.glide = "in";
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className="wbsk-person__photo" data-side={side}>
      {children}
    </div>
  );
}
