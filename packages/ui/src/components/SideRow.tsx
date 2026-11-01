"use client";

import { useRef, useState, type ReactNode } from "react";

const DRAG_START = 6;

/**
 * A sideways row: swipe on phones, arrows or drag on computers (Decisions 04 and 07). The browser's
 * own scrolling moves it, so it never holds up the page or keyboard.
 */
export function SideRow({ children, label, footer }: { children: ReactNode; label: string; footer?: ReactNode }) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const drag = useRef<{ x: number; start: number; moved: boolean } | null>(null);
  const [ends, setEnds] = useState({ start: true, end: false });

  const measure = () => {
    const row = scrollerRef.current;
    if (!row) return;
    setEnds({ start: row.scrollLeft <= 2, end: row.scrollLeft + row.clientWidth >= row.scrollWidth - 2 });
  };
  const move = (direction: 1 | -1) => {
    const row = scrollerRef.current;
    if (!row) return;
    const step = (row.querySelector("li")?.getBoundingClientRect().width ?? 320) + 24;
    row.scrollBy({ left: step * direction, behavior: "smooth" });
  };

  return (
    <div className="wbsk-siderow">
      <ul
        ref={scrollerRef}
        className="wbsk-siderow__list"
        aria-label={label}
        onScroll={measure}
        onPointerDown={(event) => {
          if (event.pointerType !== "mouse" || !scrollerRef.current) return;
          drag.current = { x: event.clientX, start: scrollerRef.current.scrollLeft, moved: false };
        }}
        onPointerMove={(event) => {
          const current = drag.current;
          if (!current || !scrollerRef.current) return;
          const distance = event.clientX - current.x;
          if (Math.abs(distance) > DRAG_START) current.moved = true;
          if (current.moved) scrollerRef.current.scrollLeft = current.start - distance;
        }}
        onPointerUp={() => {
          // Leaves the flag for the click that follows a drag, so it doesn't open a card.
          window.setTimeout(() => (drag.current = null));
        }}
        onPointerLeave={() => (drag.current = null)}
        onClickCapture={(event) => {
          if (drag.current?.moved) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        {children}
      </ul>
      <div className="wbsk-siderow__bar">
        <div className="wbsk-siderow__footer">{footer}</div>
        <div className="wbsk-siderow__arrows">
          <button type="button" className="wbsk-roundbutton" aria-label={`Previous, ${label}`} disabled={ends.start} onClick={() => move(-1)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <button type="button" className="wbsk-roundbutton" aria-label={`Next, ${label}`} disabled={ends.end} onClick={() => move(1)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
