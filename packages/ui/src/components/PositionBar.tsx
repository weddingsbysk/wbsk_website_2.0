"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * A slim gold mark that shows a row can move, and where it's got to. It's only ever a picture: it
 * takes no clicks and screen readers skip it, because the row itself is what's used. A row near the
 * top of a page sets `reserved`, so its bar's space is there from the start and nothing shifts.
 */
export function RowBar({ scrollerRef, reserved }: { scrollerRef?: RefObject<HTMLElement | null>; reserved?: boolean }) {
  const barRef = useRef<HTMLSpanElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    const thumb = thumbRef.current;
    // Rows drawn by the server have no ref to give, so the bar follows the row just before it.
    const row = scrollerRef?.current ?? (bar?.previousElementSibling as HTMLElement | null);
    if (!bar || !thumb || !row) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      // A soft glow can spill past a row's edge, so what counts is whether the row can really move sideways.
      const max = getComputedStyle(row).overflowX === "hidden" ? 0 : row.scrollWidth - row.clientWidth;
      bar.hidden = max <= 1;
      if (max <= 1) return;
      const share = row.clientWidth / row.scrollWidth;
      thumb.style.width = `${share * 100}%`;
      thumb.style.transform = `translate3d(${((row.scrollLeft / max) * (1 - share) * 100) / share}%, 0, 0)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    row.addEventListener("scroll", onScroll, { passive: true });
    const watch = new ResizeObserver(onScroll);
    watch.observe(row);
    return () => {
      cancelAnimationFrame(frame);
      row.removeEventListener("scroll", onScroll);
      watch.disconnect();
    };
  }, [scrollerRef]);

  return (
    <span ref={barRef} className="wbsk-posbar" aria-hidden="true" hidden={!reserved}>
      <span ref={thumbRef} className="wbsk-posbar__thumb" />
    </span>
  );
}

/**
 * The same mark for a row that loops: it leaves one end as it comes back in at the other, just as
 * the row does, so a loop never looks like a jump. `count` is how many items share the row.
 */
export function LoopBar({ sliderRef, count }: { sliderRef: RefObject<HTMLSpanElement | null>; count: number }) {
  const width = `${100 / Math.max(count, 2)}%`;
  return (
    <span className="wbsk-posbar" aria-hidden="true">
      <span ref={sliderRef} className="wbsk-posbar__slider">
        <span className="wbsk-posbar__thumb" style={{ width }} />
        <span className="wbsk-posbar__thumb wbsk-posbar__thumb--again" style={{ width }} />
      </span>
    </span>
  );
}

/** Moves a loop's mark; any position is fine, since it wraps round. */
export function placeLoopBar(slider: HTMLElement | null, fraction: number) {
  if (!slider) return;
  slider.style.transform = `translate3d(${(((fraction % 1) + 1) % 1) * 100}%, 0, 0)`;
}
