"use client";

import { FilmPlayer, RowBar, type WbskImageSource } from "@wbsk/ui";
import { useEffect, useRef, useState } from "react";

export type DestinationFilm = {
  id: string;
  videoId: string;
  poster: WbskImageSource;
  names: string;
  kind: string;
  description: string;
};

/** One big film with the next peeking in; a film stops when it leaves the front (Decision 08). */
export function DestinationFilms({ films }: { films: DestinationFilm[] }) {
  const [playing, setPlaying] = useState<string | null>(null);
  const rowRef = useRef<HTMLUListElement>(null);
  const dragRef = useRef<{ x: number; start: number; moved: boolean } | null>(null);
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) continue;
          const id = (entry.target as HTMLElement).dataset.film;
          setPlaying((current) => (current === id ? null : current));
        }
      },
      { root: row, threshold: 0.6 },
    );
    row.querySelectorAll("[data-film]").forEach((film) => observer.observe(film));
    return () => observer.disconnect();
  }, []);
  return (
    <>
    <ul
      ref={rowRef}
      className="wbsk-carousel"
      aria-label="Films from this place"
      tabIndex={0}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" && rowRef.current) {
          dragRef.current = { x: event.clientX, start: rowRef.current.scrollLeft, moved: false };
        }
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || !rowRef.current) return;
        const distance = event.clientX - drag.x;
        if (Math.abs(distance) > 6) drag.moved = true;
        if (drag.moved) rowRef.current.scrollLeft = drag.start - distance;
      }}
      onPointerUp={() => window.setTimeout(() => (dragRef.current = null))}
      onPointerLeave={() => (dragRef.current = null)}
      onClickCapture={(event) => {
        if (dragRef.current?.moved) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      {films.map((film) => (
        <li key={film.id} className="wbsk-carousel__film" data-film={film.id}>
          <div className="wbsk-carousel__frame">
            <FilmPlayer
              videoId={film.videoId}
              poster={film.poster}
              title={`${film.names}, ${film.kind}`}
              sizes="(min-width: 1024px) 80vw, 92vw"
              active={playing === film.id}
              onPlay={() => setPlaying(film.id)}
              onStop={() => setPlaying((p) => (p === film.id ? null : p))}
            />
            {playing === film.id ? null : (
              <div className="wbsk-carousel__over">
                <span className="wbsk-carousel__tag">{film.kind}</span>
                <span className="wbsk-h3">{film.names}</span>
              </div>
            )}
          </div>
          <p className="wbsk-filmcaption__line">{film.description}</p>
        </li>
      ))}
    </ul>
    <RowBar scrollerRef={rowRef} />
    </>
  );
}
