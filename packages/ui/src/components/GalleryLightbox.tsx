"use client";

import "../css/gallery.css";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { fullscreenSrcSet } from "../image";
import { prefersReducedMotion } from "../motion";
import { useScrollWindow } from "./useScrollWindow";
import { CloseIcon } from "./icons";

type Photo = { srcSet: string; alt: string; width: number; height: number };

const SWIPE_PIXELS = 48;

function fromLink(link: HTMLAnchorElement): Photo {
  // Sanity writes a photo's size into its address, so the page needn't carry it separately.
  const base = link.href.split("?")[0] ?? "";
  const [, width = 1, height = 1] = (base.match(/-(\d+)x(\d+)\.[a-z0-9]+$/) ?? []).map(Number);
  return {
    srcSet: fullscreenSrcSet(base, width, height),
    alt: link.querySelector<HTMLImageElement>(".wbsk-gallery__sharp")?.alt ?? "",
    width,
    height,
  };
}

const sizesFor = (photo: Photo) => `min(100vw, ${Math.ceil((photo.width / photo.height) * 100)}dvh)`;

/**
 * The gallery's one script: sharp photos fade in over their blurred previews, and the full-screen
 * view opens over the page (Decision 06). Without scripts each photo is simply a link to its image.
 */
export function GalleryLightbox({
  children,
  watermarkSrc,
  scrolling,
  label = "Photographs",
  more,
}: {
  children: ReactNode;
  watermarkSrc: string;
  /** The gallery scrolls inside its own window while the page holds still (owner, 2 November 2026). */
  scrolling?: boolean;
  label?: string;
  /** With a limited gallery: reveal the rest in place, or open them all full-screen (Decision 08). */
  more?: { kind: "show" | "view"; label: string };
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnRef = useRef<HTMLAnchorElement | null>(null);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [index, setIndex] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const links = useCallback(
    () => [...(rootRef.current?.querySelectorAll<HTMLAnchorElement>("a[data-photo]") ?? [])],
    [],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const show = (image: Element) => image.setAttribute("data-loaded", "true");
    const onLoad = (event: Event) => {
      if (event.target instanceof HTMLImageElement) show(event.target);
    };
    root.addEventListener("load", onLoad, true);
    root.querySelectorAll<HTMLImageElement>(".wbsk-gallery__sharp").forEach((image) => {
      if (image.complete) show(image);
    });
    root.dataset.ready = "true";
    return () => root.removeEventListener("load", onLoad, true);
  }, []);

  useScrollWindow(scrollerRef, progressRef, Boolean(scrolling));

  // Browsers without scroll-linked animation still get the rise, once per photo.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scrolling || !scroller || prefersReducedMotion() || CSS.supports("animation-timeline: view()")) return;
    scroller.dataset.reveal = "manual";
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-seen", "true");
          observer.unobserve(entry.target);
        }
      },
      { root: scroller, rootMargin: "0px 0px -6% 0px" },
    );
    scroller.querySelectorAll("a[data-photo]").forEach((photo) => observer.observe(photo));
    return () => observer.disconnect();
  }, [scrolling]);

  const open = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
    const link = (event.target as Element).closest<HTMLAnchorElement>("a[data-photo]");
    if (!link) return;
    event.preventDefault();
    const all = links();
    returnRef.current = link;
    setPhotos(all.map(fromLink));
    setIndex(all.indexOf(link));
    dialogRef.current?.showModal();
  };

  const close = () => dialogRef.current?.close();
  const move = useCallback(
    (by: number) => {
      setIndex((current) =>
        current === null || photos.length === 0 ? current : (current + by + photos.length) % photos.length,
      );
    },
    [photos.length],
  );

  // The neighbours are fetched ahead, so moving between photos feels instant.
  useEffect(() => {
    if (index === null) return;
    for (const by of [1, -1]) {
      const photo = photos[(index + by + photos.length) % photos.length];
      if (!photo) continue;
      const image = new Image();
      image.sizes = sizesFor(photo);
      image.srcset = photo.srcSet;
    }
  }, [index, photos]);

  const current = index === null ? null : photos[index];

  return (
    <div
      ref={rootRef}
      className="wbsk-gallerywrap"
      data-scrolling={scrolling ? "true" : undefined}
      data-limited={more && !expanded ? "true" : undefined}
      onClick={open}
    >
      {scrolling ? (
        <div
          ref={scrollerRef}
          className="wbsk-gallerywindow"
          role="region"
          aria-label={`${label}, scrollable`}
          tabIndex={0}
          data-native-wheel
          data-cursor="Open"
        >
          {children}
        </div>
      ) : (
        children
      )}
      {scrolling ? (
        <span className="wbsk-gallerywindow__progress" aria-hidden="true">
          <span ref={progressRef} />
        </span>
      ) : null}
      {more && !expanded ? (
        <div className="wbsk-gallerywrap__more">
          <button
            type="button"
            className="wbsk-button"
            onClick={() => {
              if (more.kind === "show") {
                setExpanded(true);
                return;
              }
              const all = links();
              returnRef.current = all[0] ?? null;
              setPhotos(all.map(fromLink));
              setIndex(0);
              dialogRef.current?.showModal();
            }}
          >
            <span>{more.label}</span>
          </button>
        </div>
      ) : null}
      <dialog
        ref={dialogRef}
        className="wbsk-lightbox"
        data-tone="dark"
        aria-label="Full-screen photo"
        onClose={() => {
          setIndex(null);
          returnRef.current?.focus();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") move(1);
          if (event.key === "ArrowLeft") move(-1);
        }}
        onPointerDown={(event) => {
          swipeRef.current = event.isPrimary ? { x: event.clientX, y: event.clientY } : null;
        }}
        onPointerUp={(event) => {
          const start = swipeRef.current;
          swipeRef.current = null;
          // Pinched in, a drag belongs to the zoom, not to changing photo.
          if (!start || event.pointerType === "mouse" || (window.visualViewport?.scale ?? 1) > 1.01) return;
          const dx = event.clientX - start.x;
          if (Math.abs(dx) > SWIPE_PIXELS && Math.abs(dx) > Math.abs(event.clientY - start.y)) {
            move(dx < 0 ? 1 : -1);
          }
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (event.target === dialogRef.current) close();
        }}
      >
        {current ? (
          <>
            <div className="wbsk-lightbox__stage">
              <img
                key={current.srcSet}
                srcSet={current.srcSet}
                sizes={sizesFor(current)}
                alt={current.alt}
                width={current.width}
                height={current.height}
              />
              <img className="wbsk-lightbox__mark" src={watermarkSrc} alt="" />
            </div>
            <p className="wbsk-lightbox__count" aria-live="polite">
              <span className="wbsk-sr">Photo </span>
              {index! + 1} / {photos.length}
            </p>
            <button type="button" className="wbsk-iconbutton wbsk-lightbox__close" aria-label="Close photo" onClick={close}>
              <CloseIcon />
            </button>
            <button type="button" className="wbsk-lightbox__nav" data-side="left" aria-label="Previous photo" onClick={() => move(-1)}>
              <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <button type="button" className="wbsk-lightbox__nav" data-side="right" aria-label="Next photo" onClick={() => move(1)}>
              <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        ) : null}
      </dialog>
    </div>
  );
}
