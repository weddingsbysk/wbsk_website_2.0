"use client";

import { FilmPlayer, WbskLink, type WbskImageSource } from "@wbsk/ui";
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
 * One film per screen, in a calm screening room (Decision 10). A film stops when scrolled away, so
 * only one ever plays, and the first eight load until the visitor reaches the end.
 */
export function FilmsList({ films }: { films: ScreeningFilm[] }) {
  const [shown, setShown] = useState(FIRST_LOAD);
  const [playing, setPlaying] = useState<string | null>(null);
  const rootRef = useRef<HTMLOListElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

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
      { rootMargin: "-30% 0px -30% 0px" },
    );
    root.querySelectorAll("[data-film]").forEach((film) => observer.observe(film));
    return () => observer.disconnect();
  }, [shown]);

  useEffect(() => {
    const more = moreRef.current;
    if (!more) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) setShown((current) => current + FIRST_LOAD);
    }, { rootMargin: "400px" });
    observer.observe(more);
    return () => observer.disconnect();
  }, [shown]);

  return (
    <>
      <ol ref={rootRef} className="wbsk-screening">
        {films.slice(0, shown).map((film, index) => (
          <li key={film.id} className="wbsk-screening__film" data-film={film.id}>
            <div className="wbsk-container wbsk-screening__inner">
              <FilmPlayer
                videoId={film.videoId}
                poster={film.poster}
                title={`${film.names}, ${film.kind}`}
                sizes="(min-width: 1440px) 1200px, 100vw"
                active={playing === film.id}
                onPlay={() => setPlaying(film.id)}
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
    </>
  );
}
