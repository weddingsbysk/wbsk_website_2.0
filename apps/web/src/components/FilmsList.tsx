"use client";

import { FilmPlayer, RowBar, useScrollWindow, WbskLink, type WbskImageSource } from "@wbsk/ui";
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
 * The films, two to a row, in one scrolling window on the page's own cloth, so the enquiry stays
 * close (owner, 4 November 2026). A film stops when scrolled away, so only one ever plays, and the
 * first eight load until the visitor reaches the end.
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
          if (!entry.isIntersecting) setPlaying((current) => (current === element.dataset.film ? null : current));
        }
      },
      { root: windowRef.current },
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
        <div ref={windowRef} className="wbsk-filmtray__window" role="region" aria-label="Films, scrollable" tabIndex={0} data-native-wheel data-parallax-scroller>
      <ol ref={rootRef} className="wbsk-screening">
        {films.slice(0, shown).map((film, index) => (
          <li key={film.id} className="wbsk-screening__film" data-film={film.id}>
            <div className="wbsk-screening__inner">
              <FilmPlayer
                videoId={film.videoId}
                poster={film.poster}
                title={`${film.names}, ${film.kind}`}
                sizes="(min-width: 700px) 46vw, 82vw"
                active={playing === film.id}
                onPlay={() => setPlaying(film.id)}
                onStop={() => setPlaying((p) => (p === film.id ? null : p))}
                priority={index === 0}
                parallax
              />
              <div className="wbsk-screening__text">
                <div className="wbsk-screening__meta">
                  <p className="wbsk-label">
                    {film.kind} · {film.place}
                  </p>
                  {film.href ? (
                    <WbskLink href={film.href} className="wbsk-link wbsk-morelink">
                      Their story →
                    </WbskLink>
                  ) : null}
                </div>
                <h2 className="wbsk-h3">{film.names}</h2>
                <p className="wbsk-filmcaption__line">{film.line}</p>
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
        {/* On phones the row runs sideways, so its mark does too. */}
        <RowBar scrollerRef={windowRef} reserved />
      </div>
    </div>
  );
}
