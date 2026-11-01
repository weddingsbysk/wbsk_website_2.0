"use client";

import { useEffect, useRef, useState } from "react";
import { buildSrcSet, sanityUrl, type ImageSlot, type WbskImageSource } from "../image";
import { loadGsap, prefersReducedMotion, supportsScrollTimeline } from "../motion";

type Props = {
  image: WbskImageSource;
  /** A version made for portrait screens, such as the phone poster (Decision 04). */
  portraitImage?: WbskImageSource;
  slot: ImageSlot;
  sizes: string;
  /** Frame shape as width / height. Reserves the space, so the page never jumps. */
  aspectRatio?: number;
  priority?: boolean;
  parallax?: boolean;
  className?: string;
};

/** Parallax needs about 25% more picture than its frame (Decision 12). */
const PARALLAX_EXTRA = 0.25;
const PARALLAX_TRAVEL = PARALLAX_EXTRA / 0.15 / 2;

export function WbskImage({
  image,
  portraitImage,
  slot,
  sizes,
  aspectRatio,
  priority,
  parallax,
  className = "",
}: Props) {
  const ratio = aspectRatio ?? image.width / image.height;
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    const img = imgRef.current;
    if (!parallax || !frame || !img || supportsScrollTimeline() || prefersReducedMotion()) return;
    let cleanup = () => {};
    let cancelled = false;
    void loadGsap().then(({ gsap, ScrollTrigger }) => {
      if (cancelled) return;
      const tween = gsap.fromTo(
        img,
        { yPercent: 0 },
        {
          yPercent: -(PARALLAX_EXTRA / (1 + PARALLAX_EXTRA)) * 100,
          ease: "none",
          scrollTrigger: {
            trigger: frame,
            // A steady 15% of scroll at any frame size, matching the browser-native version.
            start: () => `center center+=${frame.offsetHeight * PARALLAX_TRAVEL}`,
            end: () => `center center-=${frame.offsetHeight * PARALLAX_TRAVEL}`,
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      );
      cleanup = () => {
        tween.scrollTrigger?.kill();
        tween.kill();
        ScrollTrigger.refresh();
      };
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [parallax]);

  const fetchHeight = parallax ? 1 + PARALLAX_EXTRA : 1;
  const srcSet =
    image.kind === "sanity" ? buildSrcSet(image, slot, ratio / fetchHeight) : undefined;
  const src =
    image.kind === "sanity" ? sanityUrl(image, { width: Math.min(image.width, 1280) }) : image.url;
  const blur = image.kind === "sanity" ? image.lqip : undefined;

  return (
    <div
      ref={frameRef}
      className={`wbsk-frame ${className}`}
      data-parallax={parallax ? "on" : undefined}
      style={{ aspectRatio: String(ratio), backgroundImage: blur ? `url(${blur})` : undefined }}
    >
      {priority && portraitImage?.kind === "local" ? (
        <>
          <link
            rel="preload"
            as="image"
            href={src}
            media="(orientation: landscape)"
            fetchPriority="high"
          />
          <link
            rel="preload"
            as="image"
            href={portraitImage.url}
            media="(orientation: portrait)"
            fetchPriority="high"
          />
        </>
      ) : null}
      <picture>
        {portraitImage ? (
          <source
            media="(orientation: portrait)"
            srcSet={
              portraitImage.kind === "sanity"
                ? buildSrcSet(portraitImage, slot, portraitImage.width / portraitImage.height)
                : portraitImage.url
            }
            sizes={sizes}
            width={portraitImage.width}
            height={portraitImage.height}
          />
        ) : null}
        <img
          ref={imgRef}
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding={priority ? "sync" : "async"}
          data-loaded={loaded || !blur ? "true" : "false"}
          onLoad={() => setLoaded(true)}
        />
      </picture>
    </div>
  );
}
