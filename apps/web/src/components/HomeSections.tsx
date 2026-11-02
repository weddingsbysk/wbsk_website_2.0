"use client";

import "@wbsk/ui/css/home.css";
import { FilmPlayer, SideRow, WbskLink, type WbskImageSource } from "@wbsk/ui";
import { prefersReducedMotion } from "@wbsk/ui/motion";
import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from "react";

const never = () => () => {};
const readReduced = () => prefersReducedMotion();
const noReduced = () => false;
const useReducedMotion = () => useSyncExternalStore(never, readReduced, noReduced);

const COUNT_MS = 1600;

/** Counts up once, gently, when it comes into view; "250+" keeps its "+" (Decision 03). */
export function Counter({ value, label }: { value: string; label: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const node = ref.current;
    const match = value.match(/^(\D*)(\d+)(.*)$/);
    if (!node || !match || prefersReducedMotion()) return;
    const [, before, digits, after] = match;
    const target = Number(digits);
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (time: number) => {
        const t = Math.min(1, (time - start) / COUNT_MS);
        const eased = 1 - Math.pow(1 - t, 3);
        node.textContent = `${before}${Math.round(target * eased)}${after}`;
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);
  return (
    <div className="wbsk-counter">
      <p ref={ref} className="wbsk-counter__value">{value}</p>
      <p className="wbsk-label">{label}</p>
    </div>
  );
}

export type StackFilm = {
  id: string;
  videoId: string;
  poster: WbskImageSource;
  names: string;
  line: string;
  place: string;
  href: string | null;
};

const SWIPE = 48;

/**
 * The swipeable film stack: the front film large, the next peeking behind (Decision 04). Normal page
 * scrolling is never held. A film stops when it leaves the front, so no sound plays from behind.
 */
export function FilmStack({ films }: { films: StackFilm[] }) {
  const reduced = useReducedMotion();
  const [front, setFront] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null);
  const drag = useRef<number | null>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const count = films.length;

  // The cards settle into the stack as the section comes into view, once (Decision 04).
  useEffect(() => {
    const stack = stackRef.current;
    if (!stack) return;
    if (stack.getBoundingClientRect().top < window.innerHeight * 0.8) return;
    stack.dataset.settled = "false";
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      delete stack.dataset.settled;
    }, { threshold: 0.3 });
    observer.observe(stack);
    return () => observer.disconnect();
  }, []);
  const go = (by: number) => {
    setPlaying(null);
    setFront((current) => (current + by + count) % count);
  };
  if (!count) return null;
  const current = films[front]!;

  if (reduced) {
    return (
      <ul className="wbsk-filmrow" aria-label="Featured films">
        {films.map((film) => (
          <li key={film.id}>
            <FilmPlayer videoId={film.videoId} poster={film.poster} title={film.names} active={playing === film.id} onPlay={() => setPlaying(film.id)} onStop={() => setPlaying((p) => (p === film.id ? null : p))} />
            <FilmCaption film={film} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div ref={stackRef} className="wbsk-stack" role="group" aria-roledescription="carousel" aria-label="Featured films">
      <div
        className="wbsk-stack__cards"
        onPointerDown={(event) => {
          if (!playing) drag.current = event.clientX;
        }}
        onPointerUp={(event) => {
          const start = drag.current;
          drag.current = null;
          if (start !== null && Math.abs(event.clientX - start) > SWIPE) go(event.clientX < start ? 1 : -1);
        }}
        onPointerCancel={() => (drag.current = null)}
      >
        {films.map((film, index) => {
          const place = (index - front + count) % count;
          return (
            <div
              key={film.id}
              className="wbsk-stack__card"
              data-place={place > 2 ? "hidden" : place}
              inert={place !== 0}
              aria-hidden={place !== 0 || undefined}
            >
              <FilmPlayer
                videoId={film.videoId}
                poster={film.poster}
                title={film.names}
                sizes="(min-width: 1024px) 70vw, 92vw"
                active={playing === film.id}
                onPlay={() => setPlaying(film.id)}
                onStop={() => setPlaying((p) => (p === film.id ? null : p))}
              />
            </div>
          );
        })}
      </div>
      <div className="wbsk-stack__bar">
        <FilmCaption film={current} />
        <div className="wbsk-stack__controls">
          <p className="wbsk-stack__count" aria-live="polite">
            <span className="wbsk-sr">Film </span>
            {front + 1} / {count}
          </p>
          <button type="button" className="wbsk-roundbutton" aria-label="Previous film" onClick={() => go(-1)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <button type="button" className="wbsk-roundbutton" aria-label="Next film" onClick={() => go(1)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function FilmCaption({ film }: { film: StackFilm }) {
  return (
    <div className="wbsk-filmcaption" key={film.id}>
      <p className="wbsk-h3">
        {film.href ? (
          <WbskLink href={film.href} className="wbsk-link">
            {film.names}
          </WbskLink>
        ) : (
          film.names
        )}
      </p>
      <p className="wbsk-filmcaption__line">{film.line}</p>
    </div>
  );
}

export type ReviewItem = {
  id: string;
  names: string;
  place: string;
  text: string;
  highlight?: string;
  rating?: number;
  date?: string;
  href: string | null;
};

const REVIEW_MS = 7000;
const EXCERPT = 200;

function excerpt(review: ReviewItem) {
  if (review.highlight) return review.highlight;
  if (review.text.length <= EXCERPT) return review.text;
  return `${review.text.slice(0, review.text.lastIndexOf(" ", EXCERPT))}…`;
}

function Stars({ rating }: { rating?: number }) {
  if (!rating) return null;
  return (
    <p className="wbsk-stars" role="img" aria-label={`Rated ${rating} out of 5`}>
      {"★".repeat(rating)}
    </p>
  );
}

/** One review at a time, cross-fading, always pausable, with an ivory reading view (Decision 07). */
export function ReviewsLoop({ reviews }: { reviews: ReviewItem[] }) {
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [reading, setReading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const swipeRef = useRef<number | null>(null);
  const reduced = useReducedMotion();
  const count = reviews.length;
  const running = !reduced && !held && !stopped && !userPaused && !reading && onScreen && count > 1;

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(Boolean(entry?.isIntersecting)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % count), REVIEW_MS);
    return () => window.clearInterval(timer);
  }, [running, count]);

  if (!count) return null;
  const review = reviews[index]!;
  // Once someone takes over, it stays with them (Decision 07).
  const go = (by: number) => {
    setStopped(true);
    setIndex((current) => (current + by + count) % count);
  };
  const needsMore = Boolean(review.highlight) || review.text.length > EXCERPT;
  const swipe = {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      swipeRef.current = event.clientX;
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const start = swipeRef.current;
      swipeRef.current = null;
      if (start !== null && Math.abs(event.clientX - start) > SWIPE) go(event.clientX < start ? 1 : -1);
    },
  };

  return (
    <div
      ref={rootRef}
      className="wbsk-reviews"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
    >
      <div className="wbsk-reviews__slide" key={review.id} aria-live={running ? "off" : "polite"} {...swipe}>
        <Stars rating={review.rating} />
        <blockquote className="wbsk-reviews__quote">{excerpt(review)}</blockquote>
        {needsMore ? (
          <button
            type="button"
            className="wbsk-link wbsk-morelink wbsk-textbutton"
            onClick={() => {
              setStopped(true);
              setReading(true);
              dialogRef.current?.showModal();
            }}
          >
            Read full review →
          </button>
        ) : null}
        <p className="wbsk-reviews__who">
          {review.names} · {review.place}
        </p>
        {review.href ? (
          <WbskLink href={review.href} className="wbsk-link wbsk-morelink">
            Read their story →
          </WbskLink>
        ) : null}
      </div>
      <div className="wbsk-reviews__controls">
        <button type="button" className="wbsk-roundbutton" aria-label="Previous review" onClick={() => go(-1)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <div className="wbsk-reviews__dots">
          {reviews.map((item, dot) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Review ${dot + 1} of ${count}`}
              aria-current={dot === index || undefined}
              onClick={() => {
                setStopped(true);
                setIndex(dot);
              }}
            />
          ))}
        </div>
        <button type="button" className="wbsk-roundbutton" aria-label="Next review" onClick={() => go(1)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
        </button>
        {!reduced && !stopped ? (
          <button
            type="button"
            className="wbsk-roundbutton"
            aria-label={userPaused ? "Play reviews" : "Pause reviews"}
            onClick={() => setUserPaused(!userPaused)}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              {userPaused ? <path d="M8 5.5v13l11-6.5z" /> : <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />}
            </svg>
          </button>
        ) : null}
      </div>

      <dialog
        ref={dialogRef}
        className="wbsk-readview"
        aria-label={`Review from ${review.names}`}
        onClose={() => setReading(false)}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") setIndex((current) => (current + 1) % count);
          if (event.key === "ArrowLeft") setIndex((current) => (current - 1 + count) % count);
        }}
      >
        <button type="button" className="wbsk-iconbutton wbsk-readview__close" aria-label="Close review" onClick={() => dialogRef.current?.close()}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg>
        </button>
        <div className="wbsk-readview__inner" key={review.id} {...swipe}>
          <Stars rating={review.rating} />
          <p className="wbsk-readview__text">{review.text}</p>
          <p className="wbsk-reviews__who">
            {review.names} · {review.place}
            {review.date ? ` · ${review.date}` : ""}
          </p>
          {review.href ? (
            <WbskLink href={review.href} className="wbsk-link wbsk-morelink" onClick={() => dialogRef.current?.close()}>
              Read their story →
            </WbskLink>
          ) : null}
          <div className="wbsk-readview__nav">
            <button type="button" className="wbsk-roundbutton" aria-label="Previous review" onClick={() => setIndex((index - 1 + count) % count)}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
            </button>
            <button type="button" className="wbsk-roundbutton" aria-label="Next review" onClick={() => setIndex((index + 1) % count)}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

export type ReactionItem = {
  id: string;
  videoId: string;
  poster: WbskImageSource;
  names: string;
  place: string;
  href: string | null;
};

/** 9:16 reaction films in a sideways row; only one plays at a time (Decision 07). */
export function ReactionRow({ reactions }: { reactions: ReactionItem[] }) {
  const [playing, setPlaying] = useState<string | null>(null);
  return (
    <SideRow label="Reaction videos">
      {reactions.map((reaction) => (
        <li key={reaction.id} className="wbsk-siderow__reaction">
          <FilmPlayer
            vertical
            videoId={reaction.videoId}
            poster={reaction.poster}
            title={`${reaction.names} reacting to their film`}
            sizes="(min-width: 1024px) 22vw, 60vw"
            active={playing === reaction.id}
            onPlay={() => setPlaying(reaction.id)}
            onStop={() => setPlaying((p) => (p === reaction.id ? null : p))}
          />
          <p className="wbsk-reaction__who">
            {reaction.names} · {reaction.place}
          </p>
          {reaction.href ? (
            <WbskLink href={reaction.href} className="wbsk-link wbsk-morelink">
              Their story →
            </WbskLink>
          ) : null}
        </li>
      ))}
    </SideRow>
  );
}
