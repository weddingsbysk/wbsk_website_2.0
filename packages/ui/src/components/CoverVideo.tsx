"use client";

import { useEffect, useRef, useState } from "react";
import type { WbskImageSource } from "../image";
import { prefersReducedMotion } from "../motion";

const POSTER_MELT_MS = 950;

type NetworkInfo = { saveData?: boolean; effectiveType?: string };

const posterUrl = (image: WbskImageSource | null | undefined, width: number) =>
  image ? (image.kind === "sanity" ? `${image.url}?w=${Math.min(width, image.width)}&auto=format&q=82` : image.url) : undefined;

/**
 * A silent looping film (Decisions 04 and 08). The poster belongs to the video element, so the
 * browser counts the first picture the moment it appears, and the film takes over without a change
 * of element. It starts once the page has settled, stops downloading when scrolled past, and stays
 * a poster for data-saver, slow connections and reduced motion. It can always be paused.
 */
export function CoverVideo({
  desktop,
  phone,
  posterDesktop,
  posterPhone,
  label,
}: {
  desktop?: string;
  phone?: string;
  posterDesktop?: WbskImageSource | null;
  posterPhone?: WbskImageSource | null;
  label: string;
}) {
  const landscapeRef = useRef<HTMLVideoElement>(null);
  const portraitRef = useRef<HTMLVideoElement>(null);
  const pausedRef = useRef(false);
  const [state, setState] = useState<"off" | "playing" | "paused">("off");

  useEffect(() => {
    if (!desktop || !phone || prefersReducedMotion()) return;
    const network = (navigator as Navigator & { connection?: NetworkInfo }).connection;
    if (network?.saveData || ["slow-2g", "2g"].includes(network?.effectiveType ?? "")) return;

    const portrait = window.matchMedia("(orientation: portrait)").matches;
    const video = portrait ? portraitRef.current : landscapeRef.current;
    if (!video) return;
    const source = portrait ? phone : desktop;
    let position = 0;
    let onScreen = true;
    const posterAddress = portrait ? posterUrl(posterPhone ?? posterDesktop, 1080) : posterUrl(posterDesktop, 1920);
    let cover: HTMLDivElement | null = null;
    const melt = () => {
      if (!cover) return;
      const gone = cover;
      cover = null;
      gone.dataset.gone = "";
      window.setTimeout(() => gone.remove(), POSTER_MELT_MS);
    };
    video.addEventListener("playing", melt);
    const load = () => {
      if (posterAddress && !video.currentTime && !video.hasAttribute("src")) {
        cover = document.createElement("div");
        cover.className = "wbsk-covervideo__poster";
        cover.style.backgroundImage = `url("${posterAddress}")`;
        video.after(cover);
      }
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
      video.removeEventListener("playing", melt);
      cover?.remove();
      video.pause();
    };
  }, [desktop, phone, posterDesktop, posterPhone]);

  const landscape = posterUrl(posterDesktop, 1920);
  const upright = posterUrl(posterPhone ?? posterDesktop, 1080);
  const current = () => (window.matchMedia("(orientation: portrait)").matches ? portraitRef.current : landscapeRef.current);
  return (
    <>
      {landscape ? <link rel="preload" as="image" href={landscape} media="(orientation: landscape)" fetchPriority="high" /> : null}
      {upright ? <link rel="preload" as="image" href={upright} media="(orientation: portrait)" fetchPriority="high" /> : null}
      <div
        className="wbsk-frame wbsk-coverframe"
        role={posterDesktop?.alt ? "img" : undefined}
        aria-label={posterDesktop?.alt || undefined}
      >
        <video ref={landscapeRef} className="wbsk-covervideo" data-orient="landscape" poster={landscape} muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1} onPlaying={() => setState("playing")} />
        <video ref={portraitRef} className="wbsk-covervideo" data-orient="portrait" poster={upright} muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1} onPlaying={() => setState("playing")} />
      </div>
      {state !== "off" ? (
        <button
          type="button"
          className="wbsk-covervideo__toggle"
          aria-label={state === "playing" ? `Pause ${label}` : `Play ${label}`}
          onClick={() => {
            const video = current();
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
