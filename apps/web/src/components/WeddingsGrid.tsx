"use client";

import { ArrowIcon, ClientCard, rippleIn, useCardEntrance, useCardMotion, type WeddingSummary } from "@wbsk/ui";
import { useEffect, useRef, useState } from "react";
import { CrossfadeLine } from "./CrossfadeLine";

const PAGE = 12;
const GRID_SIZES = "(min-width: 1680px) 500px, (min-width: 1200px) 31vw, (min-width: 700px) 47vw, calc(100vw - 32px)";

/** The grid, with one description line that travels with it (Decision 05). */
export function WeddingsGrid({ weddings, leadDescription }: { weddings: WeddingSummary[]; leadDescription: string }) {
  const [shown, setShown] = useState(PAGE);
  const [description, setDescription] = useState(leadDescription);
  const listRef = useRef<HTMLUListElement>(null);
  const firstNewRef = useRef<number | null>(null);
  useCardMotion(listRef);
  useCardEntrance(listRef);

  // "Show more": the new cards ripple in, and keyboard focus moves to the first of them.
  useEffect(() => {
    const first = firstNewRef.current;
    const list = listRef.current;
    if (first === null || !list) return;
    firstNewRef.current = null;
    const added = [...list.querySelectorAll<HTMLElement>(":scope > li")].slice(first);
    rippleIn(added);
    added[0]?.querySelector<HTMLElement>(".wbsk-card__link")?.focus({ preventScroll: true });
  }, [shown]);

  return (
    <div className="wbsk-gridwrap">
      <div className="wbsk-sharedline">
        <CrossfadeLine text={description} />
      </div>
      <ul ref={listRef} className="wbsk-grid">
        {weddings.slice(0, shown).map((wedding) => (
          <li key={wedding.slug} className="wbsk-cardslot">
            <ClientCard wedding={wedding} onShow={setDescription} sizes={GRID_SIZES} />
          </li>
        ))}
      </ul>
      {weddings.length > shown ? (
        <div className="wbsk-grid__more">
          <button
            type="button"
            className="wbsk-button"
            onClick={() => {
              firstNewRef.current = shown;
              setShown(shown + PAGE);
            }}
          >
            <span>Show more</span>
            <ArrowIcon />
          </button>
        </div>
      ) : null}
    </div>
  );
}
