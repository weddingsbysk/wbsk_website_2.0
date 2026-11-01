"use client";

import { useState } from "react";
import type { WbskImageSource } from "../image";
import { WbskImage } from "./WbskImage";

/**
 * An uploaded poster with a play button. YouTube's player and its cookies load only on the press,
 * with sound, and never by itself (Decisions 04 and 06).
 */
export function FilmPlayer({
  videoId,
  poster,
  title,
}: {
  videoId: string;
  poster: WbskImageSource;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="wbsk-film">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`}
          title={title}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button type="button" className="wbsk-film__play" aria-label={`Play ${title}`} onClick={() => setPlaying(true)}>
          <WbskImage image={poster} slot="poster" sizes="(min-width: 1024px) 60vw, 100vw" aspectRatio={16 / 9} />
          <span className="wbsk-film__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M8 5.5v13l11-6.5z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
