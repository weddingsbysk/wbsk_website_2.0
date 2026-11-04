"use client";

import { loadGsap, prefersReducedMotion } from "@wbsk/ui/motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const START_MS = 1400;
const OPENING_HOLD_MS = 2900;
const SECTION_HOLD_MS = 3400;
const REST_MS = 700;
const FADE_MS = 260;
const SCROLLED_PX = 60;
const IN_VIEW = 0.45;
const INPUTS = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

type Direction = "up" | "down" | "left" | "right";
type Card = { text: string; direction: Direction };

/** A section's one hint. Its key is shared wherever it's the same kind of thing, so a gallery is explained only once. */
type Section = {
  key: string;
  selector: string;
  mouse?: Card;
  touch?: Card;
  keys?: Card;
  /** Some sections introduce themselves first, so the hint waits its turn. */
  restMs?: number;
  /** Only if it can really move sideways here: a row may be a plain pair on computers. */
  onlyIfRow?: boolean;
};

const GALLERY: Section = {
  key: "wbsk-guide-gallery",
  selector: ".wbsk-gallerywindow",
  mouse: { text: "Scroll inside the frame. Click a photo to see it large", direction: "down" },
  touch: { text: "Swipe up inside the frame. Tap a photo to see it large", direction: "up" },
  keys: { text: "Arrow keys move inside the frame. Enter opens a photo", direction: "down" },
};
const FILM_ROW = (selector: string): Section => ({
  key: "wbsk-guide-filmrow",
  selector,
  onlyIfRow: true,
  mouse: { text: "Drag sideways for the next film", direction: "left" },
  touch: { text: "Swipe sideways for the next film", direction: "left" },
});

const PLACES = {
  home: [
    {
      key: "wbsk-guide-albums",
      selector: ".wbsk-drifttray",
      mouse: { text: "Point at an album to open it. Drag to move the row", direction: "left" },
      touch: { text: "Swipe through the albums. Tap one to open it", direction: "left" },
      keys: { text: "Tab moves through the albums, and opens each one", direction: "right" },
    },
    {
      key: "wbsk-guide-filmstack",
      selector: ".wbsk-stack",
      mouse: { text: "Drag, or use the arrows, to move through the films", direction: "left" },
      touch: { text: "Swipe through the films. Tap the middle one to play", direction: "left" },
    },
  ],
  couple: [GALLERY],
  preWedding: [
    {
      key: "wbsk-guide-records",
      selector: ".wbsk-arc:not([data-mode='row'])",
      restMs: 2600,
      mouse: { text: "Scroll over the records to move them. Click one to open it", direction: "down" },
      touch: { text: "Swipe through the records. Tap one to open it", direction: "left" },
      keys: { text: "Arrow keys move the records. Enter opens one", direction: "right" },
    },
    FILM_ROW(".wbsk-offering__films"),
    GALLERY,
  ],
  destination: [FILM_ROW(".wbsk-carousel"), GALLERY],
  films: [
    {
      key: "wbsk-guide-filmswindow",
      selector: ".wbsk-filmtray__window",
      mouse: { text: "Scroll here for more films", direction: "down" },
      touch: { text: "Swipe sideways for more films", direction: "left" },
    },
  ],
} satisfies Record<string, Section[]>;

const COVER_KEY = "wbsk-guide-couple";

/** If the browser won't remember, the guide stays away rather than repeating on every page. */
function canShow(key: string) {
  try {
    return localStorage.getItem(key) === null;
  } catch {
    return false;
  }
}

function remember(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    // Private windows can refuse storage; canShow has already kept the guide away there.
  }
}

const isTouch = () => window.matchMedia("(hover: none), (pointer: coarse)").matches;
const panelOpen = () => Boolean(document.querySelector(".wbsk-panel[open], .wbsk-panel[data-open='true']"));
const introPlaying = () => document.documentElement.dataset.intro === "play";

function coverCards(hasGallery: boolean, hasFilm: boolean): Card[] {
  const touch = isTouch();
  const move = touch ? "Swipe up" : "Scroll down";
  const direction: Direction = touch ? "up" : "down";
  if (hasGallery && hasFilm) {
    return [
      { text: `${move} for their photographs`, direction },
      { text: "Keep going. Their film is just past the gallery", direction },
    ];
  }
  if (hasGallery) return [{ text: `${move} for their photographs`, direction }];
  return hasFilm ? [{ text: `${move} for their film`, direction }] : [];
}

function cardFor(section: Section, usedKeys: boolean) {
  if (usedKeys && section.keys) return section.keys;
  return isTouch() ? section.touch : section.mouse;
}

/**
 * A soft hint on a first visit, like a card in a film's titles, showing how something moves. Each
 * shows once per visitor and only one at a time. It's gone at the first scroll, tap or key, never
 * takes a click, and screen readers aren't interrupted, because nothing it says is needed to use the page.
 */
export function FirstVisitGuide({ place, hasGallery = false, hasFilm = false }: { place: keyof typeof PLACES; hasGallery?: boolean; hasFilm?: boolean }) {
  const [card, setCard] = useState<Card | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<SVGSVGElement>(null);
  const fadingRef = useRef<(() => void) | null>(null);

  // Each card fades in, and its arrow travels the way to go.
  useEffect(() => {
    const element = cardRef.current;
    const arrow = arrowRef.current;
    if (!card || !element) return;
    let stopped = false;
    let tweens: { kill: () => void }[] = [];
    void loadGsap().then(({ gsap }) => {
      if (stopped) return;
      const still = prefersReducedMotion();
      tweens = [
        gsap.fromTo(element, still ? { opacity: 0 } : { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: still ? 0.3 : 0.8, ease: "power3.out" }),
      ];
      if (!still && arrow) {
        const axis = card.direction === "left" || card.direction === "right" ? "x" : "y";
        const reach = card.direction === "up" || card.direction === "left" ? -9 : 9;
        tweens.push(gsap.fromTo(arrow, { [axis]: -reach / 2 }, { [axis]: reach, duration: 0.85, ease: "sine.inOut", repeat: -1, yoyo: true }));
      }
      fadingRef.current = () => {
        gsap.to(element, { opacity: 0, duration: 0.25, ease: "power2.out", overwrite: true });
      };
    });
    return () => {
      stopped = true;
      tweens.forEach((tween) => tween.kill());
      fadingRef.current = null;
    };
  }, [card]);

  useEffect(() => {
    let timers: number[] = [];
    let rest = 0;
    let showing = false;
    let openingDue = false;
    let usedKeys = false;
    let shownAt = 0;
    const startedAt = performance.now();
    const later = (run: () => void, ms: number) => timers.push(window.setTimeout(run, ms));
    const clear = () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers = [];
    };

    const sections: Section[] = (place === "couple" && !hasGallery ? [] : PLACES[place]).filter((section: Section) => canShow(section.key));
    const inView = new Set<Section>();
    const watched = new Map<Element, Section>();

    /** Waits for the page to come to rest, so the scroll that brought them here doesn't dismiss the hint. */
    const check = () => {
      window.clearTimeout(rest);
      const next = sections.find((section) => inView.has(section) && canShow(section.key));
      if (!next || showing || openingDue) return;
      rest = window.setTimeout(() => {
        if (showing || !inView.has(next)) return;
        // Not over the opening intro, the panel, or the very first moment of a page.
        const waiting = START_MS - (performance.now() - startedAt);
        if (introPlaying() || panelOpen() || waiting > 0) {
          rest = window.setTimeout(check, Math.max(waiting, 400));
          return;
        }
        const words = cardFor(next, usedKeys);
        remember(next.key);
        if (words) play([words], SECTION_HOLD_MS);
        else check();
      }, next.restMs ?? REST_MS);
    };

    const finish = () => {
      if (!showing) return;
      showing = false;
      clear();
      fadingRef.current?.();
      later(() => setCard(null), FADE_MS);
      check();
    };
    const onInput = (event: Event) => {
      if (event.type === "keydown") usedKeys = true;
      openingDue = false;
      finish();
    };
    // Real scrolling only: the page can settle a few pixels by itself as pictures load in.
    const onScroll = () => {
      if (showing && Math.abs(window.scrollY - shownAt) > SCROLLED_PX) finish();
      attach();
      check();
    };

    const play = (cards: Card[], hold: number) => {
      showing = true;
      shownAt = window.scrollY;
      setCard(cards[0]!);
      cards.slice(1).forEach((next, index) => {
        later(() => {
          fadingRef.current?.();
          later(() => setCard(next), FADE_MS);
        }, hold * (index + 1));
      });
      later(finish, hold * cards.length);
    };

    INPUTS.forEach((name) => window.addEventListener(name, onInput, { passive: true, capture: true }));
    window.addEventListener("scroll", onScroll, { passive: true });

    const watch = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const section = watched.get(entry.target);
          if (!section) continue;
          if (entry.isIntersecting) inView.add(section);
          else inView.delete(section);
        }
        check();
      },
      { threshold: IN_VIEW },
    );
    // Some sections only take their final form once the page's scripts are running, so this looks again as people scroll.
    const attach = () => {
      for (const section of sections) {
        const element = document.querySelector<HTMLElement>(section.selector);
        if (!element || watched.has(element)) continue;
        // A row that doesn't scroll sideways on this screen has nothing to explain.
        if (section.onlyIfRow && (getComputedStyle(element).overflowX === "hidden" || element.scrollWidth - element.clientWidth <= 1)) continue;
        watched.set(element, section);
        watch.observe(element);
      }
    };
    attach();

    if (place === "couple") {
      const cards = coverCards(hasGallery, hasFilm);
      if (cards.length && canShow(COVER_KEY) && window.scrollY < 40) {
        openingDue = true;
        later(() => {
          const due = openingDue;
          openingDue = false;
          if (!due || window.scrollY >= 40 || panelOpen()) return check();
          remember(COVER_KEY);
          play(cards, OPENING_HOLD_MS);
        }, START_MS);
      }
    }

    return () => {
      clear();
      window.clearTimeout(rest);
      watch.disconnect();
      INPUTS.forEach((name) => window.removeEventListener(name, onInput, { capture: true }));
      window.removeEventListener("scroll", onScroll);
    };
  }, [place, hasGallery, hasFilm]);

  if (!card) return null;
  // It lives outside the page's own structure, so its arrival can't nudge a section.
  return createPortal(
    <div className="wbsk-guide" aria-hidden="true">
      <div ref={cardRef} className="wbsk-guide__card" style={{ opacity: 0 }}>
        <span className="wbsk-guide__arrowbox" data-direction={card.direction}>
          <svg ref={arrowRef} className="wbsk-guide__arrow" viewBox="0 0 24 40" width="18" height="30" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3c-1.6 8-1.6 24 0 33M5.500 29 12 36l6.500-7" />
          </svg>
        </span>
        <p>{card.text}</p>
      </div>
    </div>,
    document.body,
  );
}
