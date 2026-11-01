"use client";

import { ClientCard, Reveal, type WeddingSummary } from "@wbsk/ui";
import { useState } from "react";

const PAGE = 12;
const RIPPLE_COLUMNS = 3;

/** The grid, with one description line that travels with it (Decision 05). */
export function WeddingsGrid({ weddings }: { weddings: WeddingSummary[] }) {
  const [shown, setShown] = useState(PAGE);
  const [description, setDescription] = useState("");
  return (
    <div className="wbsk-gridwrap">
      <p className="wbsk-sharedline" data-filled={description ? "true" : "false"} aria-live="polite">
        <span key={description}>{description}</span>
      </p>
      <ul className="wbsk-grid" onMouseLeave={() => setDescription("")}>
        {weddings.slice(0, shown).map((wedding, index) => (
          <li key={wedding.slug}>
            <Reveal delayIndex={index % RIPPLE_COLUMNS}>
              <ClientCard wedding={wedding} onShow={setDescription} />
            </Reveal>
          </li>
        ))}
      </ul>
      {weddings.length > shown ? (
        <div className="wbsk-grid__more">
          <button type="button" className="wbsk-button" onClick={() => setShown(shown + PAGE)}>
            <span>Show more</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
