"use client";

import { useEffect, type RefObject } from "react";
import { createWheelClassifier, prefersReducedMotion } from "../motion";

/**
 * A section that scrolls by itself while the page holds still. A mouse wheel glides inside it and
 * hands back to the page at either end, so nobody is ever trapped; the slim gold line shows progress.
 */
export function useScrollWindow(scrollerRef: RefObject<HTMLElement | null>, progressRef: RefObject<HTMLElement | null>, enabled = true) {
  useEffect(() => {
    const scroller = scrollerRef.current;
    const bar = progressRef.current;
    if (!enabled || !scroller || !bar) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = scroller.scrollHeight - scroller.clientHeight;
      // Nothing to scroll, so nothing to suggest.
      if (bar.parentElement) bar.parentElement.hidden = max <= 1;
      bar.style.transform = `scaleY(${max > 0 ? Math.max(0.04, scroller.scrollTop / max) : 1})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    // Photographs load and films are added as people go, which changes how far there is to scroll.
    const watch = new ResizeObserver(onScroll);
    watch.observe(scroller);
    if (scroller.firstElementChild) watch.observe(scroller.firstElementChild);
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", onScroll);
      watch.disconnect();
    };
  }, [scrollerRef, progressRef, enabled]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!enabled || !scroller || prefersReducedMotion()) return;
    const isMouse = createWheelClassifier();
    let target = scroller.scrollTop;
    let frame = 0;
    const glide = () => {
      const distance = target - scroller.scrollTop;
      if (Math.abs(distance) < 0.5) {
        scroller.scrollTop = target;
        frame = 0;
        return;
      }
      scroller.scrollTop += distance * 0.16;
      frame = requestAnimationFrame(glide);
    };
    const onWheel = (event: WheelEvent) => {
      if (!isMouse(event, event.timeStamp)) {
        cancelAnimationFrame(frame);
        frame = 0;
        target = scroller.scrollTop;
        return;
      }
      const max = scroller.scrollHeight - scroller.clientHeight;
      const step = event.deltaMode === 1 ? event.deltaY * 40 : event.deltaY;
      const base = frame ? target : scroller.scrollTop;
      if ((base <= 0 && step < 0) || (base >= max - 1 && step > 0)) return;
      event.preventDefault();
      target = Math.max(0, Math.min(max, base + step * 1.4));
      if (!frame) frame = requestAnimationFrame(glide);
    };
    scroller.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("wheel", onWheel);
    };
  }, [scrollerRef, enabled]);
}
