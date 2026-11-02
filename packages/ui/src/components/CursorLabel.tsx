"use client";

import { useEffect, useRef } from "react";
import { canHover } from "./cardMotion";
import { loadGsap, prefersReducedMotion, settleEase } from "../motion";

/** A soft gold ring that trails the cursor over anything with data-cursor, and says what it does there. */
export function CursorLabel() {
  const ringRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const ring = ringRef.current;
    const word = wordRef.current;
    if (!ring || !word || !canHover() || prefersReducedMotion()) return;
    let stopped = false;
    let cleanup = () => {};
    void loadGsap().then(({ gsap }) => {
      if (stopped) return;
      const toX = gsap.quickTo(ring, "x", { duration: 0.45, ease: settleEase });
      const toY = gsap.quickTo(ring, "y", { duration: 0.45, ease: settleEase });
      let shown = false;
      const onMove = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") return;
        toX(event.clientX);
        toY(event.clientY);
        const target = (event.target as Element | null)?.closest?.<HTMLElement>("[data-cursor]");
        const over = target && !(event.target as Element).closest("button, iframe");
        if (over && word.textContent !== target.dataset.cursor) word.textContent = target.dataset.cursor ?? "";
        if (Boolean(over) !== shown) {
          shown = Boolean(over);
          gsap.to(ring, { opacity: shown ? 1 : 0, scale: shown ? 1 : 0.5, duration: 0.35, ease: settleEase, overwrite: "auto" });
        }
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      cleanup = () => window.removeEventListener("pointermove", onMove);
    });
    return () => {
      stopped = true;
      cleanup();
    };
  }, []);
  return (
    <div ref={ringRef} className="wbsk-cursor" aria-hidden="true">
      <span ref={wordRef} />
    </div>
  );
}
