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
      <ul
        className="wbsk-grid"
        onMouseLeave={() => setDescription("")}
        onPointerMove={(event) => {
          // The photo drifts a little with the cursor. Variables only, so the browser just moves it.
          if (event.pointerType !== "mouse") return;
          const photo = (event.target as Element).closest<HTMLElement>(".wbsk-card__photo");
          if (!photo) return;
          const box = photo.getBoundingClientRect();
          photo.style.setProperty("--mx", `${((event.clientX - box.left) / box.width - 0.5) * -14}px`);
          photo.style.setProperty("--my", `${((event.clientY - box.top) / box.height - 0.5) * -14}px`);
        }}
      >
        {weddings.slice(0, shown).map((wedding, index) => (
          <li key={wedding.slug}>
            <Reveal delayIndex={index % RIPPLE_COLUMNS} className="wbsk-cardreveal">
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
