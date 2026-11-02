"use client";

import { FilmPlayer, useScrollWindow, WbskLink, type WbskImageSource } from "@wbsk/ui";
import { useEffect, useRef, useState } from "react";

export type ScreeningFilm = {
  id: string;
  videoId: string;
  poster: WbskImageSource;
  names: string;
  place: string;
  kind: string;
  line: string;
  href: string | null;
};

const FIRST_LOAD = 8;

/**
 * The films in one scrolling section of dark cloth, while the page holds still (owner, 2 November
 * 2026). A film stops when scrolled away, so only one ever plays, and the first eight load until
 * the visitor reaches the end.
 */
export function FilmsList({ films }: { films: ScreeningFilm[] }) {
  const [shown, setShown] = useState(FIRST_LOAD);
  const [playing, setPlaying] = useState<string | null>(null);
  const rootRef = useRef<HTMLOListElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  useScrollWindow(windowRef, progressRef);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const element = entry.target as HTMLElement;
          element.dataset.centre = entry.isIntersecting ? "true" : "false";
          if (!entry.isIntersecting) setPlaying((current) => (current === element.dataset.film ? null : current));
        }
      },
      { root: windowRef.current, rootMargin: "-30% 0px -30% 0px" },
    );
    root.querySelectorAll("[data-film]").forEach((film) => observer.observe(film));
    return () => observer.disconnect();
  }, [shown]);

  useEffect(() => {
    const more = moreRef.current;
    if (!more) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) setShown((current) => current + FIRST_LOAD);
    }, { root: windowRef.current, rootMargin: "400px" });
    observer.observe(more);
    return () => observer.disconnect();
  }, [shown]);

  return (
    <div className="wbsk-container">
      <div className="wbsk-filmtray">
        <div ref={windowRef} className="wbsk-filmtray__window" role="region" aria-label="Films, scrollable" tabIndex={0} data-native-wheel>
      <ol ref={rootRef} className="wbsk-screening">
        {films.slice(0, shown).map((film, index) => (
          <li key={film.id} className="wbsk-screening__film" data-film={film.id}>
            <div className="wbsk-screening__inner">
              <FilmPlayer
                videoId={film.videoId}
                poster={film.poster}
                title={`${film.names}, ${film.kind}`}
                sizes="(min-width: 900px) 56vw, 92vw"
                active={playing === film.id}
                onPlay={() => setPlaying(film.id)}
                onStop={() => setPlaying((p) => (p === film.id ? null : p))}
                priority={index === 0}
              />
              <div className="wbsk-screening__text">
                <p className="wbsk-label">
                  {film.kind} · {film.place}
                </p>
                <h2 className="wbsk-h3">{film.names}</h2>
                <p className="wbsk-filmcaption__line">{film.line}</p>
                {film.href ? (
                  <WbskLink href={film.href} className="wbsk-link wbsk-morelink">
                    Their story →
                  </WbskLink>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>
      {films.length > shown ? <div ref={moreRef} aria-hidden="true" /> : null}
        </div>
        <span className="wbsk-gallerywindow__progress" aria-hidden="true">
          <span ref={progressRef} />
        </span>
      </div>
    </div>
  );
}
