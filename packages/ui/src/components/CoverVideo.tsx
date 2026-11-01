"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../motion";

type NetworkInfo = { saveData?: boolean; effectiveType?: string };

/**
 * A silent looping film over its poster (Decisions 04 and 08). It starts once the page has settled,
 * stops downloading when scrolled past, and stays a poster for data-saver, slow connections and
 * reduced motion. It can always be paused.
 */
export function CoverVideo({ desktop, phone, label }: { desktop?: string; phone?: string; label: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pausedRef = useRef(false);
  const [state, setState] = useState<"off" | "playing" | "paused">("off");

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !desktop || !phone || prefersReducedMotion()) return;
    const network = (navigator as Navigator & { connection?: NetworkInfo }).connection;
    if (network?.saveData || ["slow-2g", "2g"].includes(network?.effectiveType ?? "")) return;

    const source = window.matchMedia("(orientation: portrait)").matches ? phone : desktop;
    let position = 0;
    let onScreen = true;
    const load = () => {
      if (video.getAttribute("src") !== source) {
        video.src = source;
        video.currentTime = position;
      }
      if (!pausedRef.current) video.play().catch(() => {});
    };
    const unload = () => {
      position = video.currentTime;
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
    // Waits for the opening intro and the page's own load, so a film never competes with them.
    const whenReady = () => {
      if (document.documentElement.dataset.intro === "play") return;
      observer.disconnect();
      if (onScreen) load();
    };
    const observer = new MutationObserver(whenReady);
    const onLoad = () => {
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-intro"] });
      whenReady();
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    const view = new IntersectionObserver(([entry]) => {
      onScreen = Boolean(entry?.isIntersecting);
      if (document.documentElement.dataset.intro === "play") return;
      if (onScreen) load();
      else unload();
    });
    view.observe(video);
    return () => {
      observer.disconnect();
      view.disconnect();
      window.removeEventListener("load", onLoad);
      video.pause();
    };
  }, [desktop, phone]);

  if (!desktop || !phone) return null;
  return (
    <>
      <video
        ref={videoRef}
        className="wbsk-covervideo"
        data-on={state !== "off" || undefined}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
        tabIndex={-1}
        onPlaying={() => setState("playing")}
      />
      {state !== "off" ? (
        <button
          type="button"
          className="wbsk-covervideo__toggle"
          aria-label={state === "playing" ? `Pause ${label}` : `Play ${label}`}
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            if (state === "playing") {
              pausedRef.current = true;
              video.pause();
              setState("paused");
            } else {
              pausedRef.current = false;
              void video.play();
            }
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
            {state === "playing" ? <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /> : <path d="M8 5.5v13l11-6.5z" />}
          </svg>
        </button>
      ) : null}
    </>
  );
}
