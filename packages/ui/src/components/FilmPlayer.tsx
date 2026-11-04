"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { WbskImageSource } from "../image";
import { WbskImage } from "./WbskImage";

const ONE_AT_A_TIME = "wbsk-film-play";

/**
 * An uploaded poster with a play button. YouTube's player and its cookies load only on the press,
 * with sound, and never by itself (Decisions 04 and 06).
 */
export function FilmPlayer({
  videoId,
  poster,
  title,
  sizes = "(min-width: 1024px) 60vw, 100vw",
  active,
  onPlay,
  onStop,
  priority,
  parallax,
}: {
  videoId: string;
  poster: WbskImageSource;
  title: string;
  sizes?: string;
  /** Given by a parent that keeps only one film playing at a time. */
  active?: boolean;
  onPlay?: () => void;
  onStop?: () => void;
  /** The first thing on the page, so its poster loads ahead of everything else. */
  priority?: boolean;
  parallax?: boolean;
}) {
  const [own, setOwn] = useState(false);
  const playing = active ?? own;
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const start = () => {
    window.dispatchEvent(new CustomEvent(ONE_AT_A_TIME, { detail: id }));
    setOwn(true);
    onPlay?.();
  };

  // Only one film ever plays, and it stops when scrolled away (Decisions 06 and 12).
  useEffect(() => {
    if (!playing || !rootRef.current) return;
    const stop = () => {
      setOwn(false);
      onStop?.();
    };
    const onOther = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) stop();
    };
    window.addEventListener(ONE_AT_A_TIME, onOther);
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) stop();
    });
    observer.observe(rootRef.current);
    return () => {
      window.removeEventListener(ONE_AT_A_TIME, onOther);
      observer.disconnect();
    };
    // onStop is a fresh function each render; what matters is whether this film is playing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, id]);

  return (
    <div ref={rootRef} className="wbsk-film">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`}
          title={title}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button type="button" className="wbsk-film__play" aria-label={`Play ${title}`} onClick={start}>
          <WbskImage image={poster} slot="poster" sizes={sizes} aspectRatio={16 / 9} priority={priority} parallax={parallax} />
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
