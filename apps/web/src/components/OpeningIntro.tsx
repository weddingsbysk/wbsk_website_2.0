"use client";

import { motionTokens, prefersReducedMotion } from "@wbsk/ui/motion";
import { useEffect, useRef } from "react";
import { publicAsset } from "../lib/site";

/** A clip that hasn't arrived by now gets the still instead, so nobody waits on a slow network. */
const VIDEO_WAIT_MS = 1800;
const STILL_MS = 600;
/** Long enough for the slowest word of the hero title to finish arriving. */
const TITLE_DONE_MS = 4000;
const GLIDE_DELAY_MS = 60;
const GLIDE_MS = 1000;
const LOGO_MELT_AT_MS = 400;
const LOGO_MELT_MS = 400;
const REVEAL_MS = 2600;
const HERO_SETTLE_EXTRA_MS = 1000;

/**
 * The clip holds only the band the name occupies, at the master's full 4K sharpness (2640 × 200).
 * These sizes are half that: a 1320 × 100 band, centred in a 1920 × 1080 frame. MARK is where the
 * closed-up WBSK sits inside it.
 */
const MARK = { x: 544, y: 22.5, width: 232 };
const CLIP = { width: 1320, height: 100, nameWidth: 1260 };
const FRAME = { width: 1920, height: 1080 };
const PHONE_BELOW = 820;
/**
 * Phones and tablets get the closing logo as a strip of frames with real transparency, played by
 * stepping one image. A video, with blending, blur and movement on top, proved unreliable on iPhones.
 */
const STRIP = { frames: 36, width: 960, height: 72, ms: 1160 };
const SKIP_FADE_MS = 320;
const LAND_SPARE_MS = 800;

const usesStrip = () =>
  window.matchMedia("(hover: none), (pointer: coarse)").matches || window.innerWidth < PHONE_BELOW;

/** React's development mode starts each effect twice, so a stop only counts if no second start follows. */
let pendingEnd: number | undefined;

function clipScale() {
  const { innerWidth: w, innerHeight: h } = window;
  // On phones the name is sized to the screen, not the clip's wide black frame.
  if (w < PHONE_BELOW) return (w * 0.88) / CLIP.nameWidth;
  return Math.min(w / FRAME.width, h / FRAME.height);
}

export function OpeningIntro() {
  const veilRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const stripImageRef = useRef<HTMLImageElement>(null);
  const glideRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLImageElement>(null);
  const boldRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    window.clearTimeout(pendingEnd);
    const root = document.documentElement;
    const veil = veilRef.current;
    const video = videoRef.current;
    const strip = stripRef.current;
    const stripImage = stripImageRef.current;
    const glide = glideRef.current;
    const mark = markRef.current;
    const bold = boldRef.current;
    if (root.dataset.intro !== "play" || !veil || !video || !strip || !stripImage || !glide || !mark || !bold) return;
    (window as Window & { __wbskIntro?: boolean }).__wbskIntro = true;
    // The head script usually has these downloading already; this covers it finishing later than the page's scripts.
    const stripped = usesStrip();
    const clip: HTMLElement = stripped ? strip : video;
    for (const element of [stripped ? stripImage : video, mark, bold]) {
      if (element.dataset.src && !element.getAttribute("src")) element.src = element.dataset.src;
    }

    const reduced = prefersReducedMotion();
    const animations: Animation[] = [];
    const timers: number[] = [];
    let ended = false;
    let landing = false;
    let clipFade: Animation | undefined;

    const add = (animation: Animation) => {
      animations.push(animation);
      return animation;
    };
    const stop = () => {
      if (ended) return false;
      ended = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      animations.forEach((animation) => animation.cancel());
      video.pause();
      removeSkip();
      return true;
    };
    const handOver = () => {
      // A refresh starts at the top for the intro; from here on, Back keeps a visitor's place again.
      history.scrollRestoration = "auto";
      // The logo has landed (or been skipped), so now the film's title can arrive.
      root.dataset.hero = "enter";
      delete root.dataset.intro;
      window.setTimeout(() => (root.dataset.hero = "done"), TITLE_DONE_MS);
    };
    const finish = () => {
      if (stop()) handOver();
    };
    // A tap brings the page up quickly, not as a cut.
    let skipping = false;
    const skip = () => {
      if (skipping || ended) return;
      skipping = true;
      removeSkip();
      timers.forEach((timer) => window.clearTimeout(timer));
      const fade = { duration: SKIP_FADE_MS, easing: motionTokens.softSettle, fill: "forwards" as const };
      for (const part of [clip, glide]) add(part.animate([{ opacity: getComputedStyle(part).opacity }, { opacity: 0 }], fade));
      add(veil.animate([{ opacity: getComputedStyle(veil).opacity }, { opacity: 0 }], fade)).addEventListener("finish", finish);
    };
    const removeSkip = () => {
      for (const type of ["pointerdown", "keydown", "wheel", "touchstart"]) {
        window.removeEventListener(type, skip);
      }
    };
    for (const type of ["pointerdown", "keydown", "wheel", "touchstart"]) {
      window.addEventListener(type, skip, { passive: true });
    }

    const k = clipScale();
    clip.style.width = `${CLIP.width * k}px`;
    clip.style.height = `${stripped ? (CLIP.width * k * STRIP.height) / STRIP.width : CLIP.height * k}px`;
    const origin = {
      x: (window.innerWidth - CLIP.width * k) / 2,
      y: (window.innerHeight - CLIP.height * k) / 2,
    };
    const start = { x: origin.x + MARK.x * k, y: origin.y + MARK.y * k, width: MARK.width * k };
    glide.style.width = `${start.width}px`;
    const from = `translate(${start.x}px, ${start.y}px) scale(1)`;
    glide.style.transform = from;

    // The homepage starts coming up as soon as the logo begins to move, under the glide.
    const revealPage = () => {
      const { softSettle, travel } = motionTokens;
      const hero = document.querySelector(".wbsk-hero .wbsk-frame");
      const reveal = add(
        veil.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: REVEAL_MS,
          easing: travel,
          fill: "both",
        }),
      );
      hero?.animate([{ transform: "scale(1.05)" }, { transform: "scale(1)" }], {
        duration: REVEAL_MS + HERO_SETTLE_EXTRA_MS,
        easing: softSettle,
        fill: "both",
      }).addEventListener("finish", (event) => (event.target as Animation).cancel());
      reveal.addEventListener("finish", finish);
    };

    // No clip to play, such as an iPhone in Low Power Mode: the still logo takes the same journey.
    const glideStill = () => {
      if (ended) return;
      const target = document.querySelector(".wbsk-header__logo img")?.getBoundingClientRect();
      if (!target) return finish();
      const to = `translate(${target.left}px, ${target.top}px) scale(${target.width / start.width})`;
      add(
        glide.animate([{ transform: from }, { transform: to }], {
          duration: GLIDE_MS,
          delay: GLIDE_DELAY_MS,
          easing: motionTokens.travel,
          fill: "both",
        }),
      );
      add(bold.animate([{ opacity: 0 }, { opacity: 1 }], { duration: LOGO_MELT_MS, delay: GLIDE_DELAY_MS + LOGO_MELT_AT_MS, fill: "both" }));
      add(mark.animate([{ opacity: 1 }, { opacity: 0 }], { duration: LOGO_MELT_MS, delay: GLIDE_DELAY_MS + LOGO_MELT_AT_MS + LOGO_MELT_MS / 2, fill: "both" }));
      revealPage();
    };

    const showStill = () => {
      if (landing) return;
      landing = true;
      add(clip.animate([{ opacity: 0 }], { duration: 0, fill: "forwards" }));
      add(glide.animate([{ opacity: 1 }], { duration: 0, fill: "forwards" }));
      timers.push(window.setTimeout(reduced ? finish : glideStill, STILL_MS));
    };

    const land = () => {
      if (landing || ended) return;
      landing = true;
      const target = document.querySelector(".wbsk-header__logo img")?.getBoundingClientRect();
      if (!target) return finish();
      // Measured now: a phone's address bar can have moved things since the start.
      const box = clip.getBoundingClientRect();
      const here = { x: box.left + MARK.x * k, y: box.top + MARK.y * k };
      const scale = target.width / start.width;
      const fromHere = `translate(${here.x}px, ${here.y}px) scale(1)`;
      const to = `translate(${target.left}px, ${target.top}px) scale(${scale})`;
      const { travel } = motionTokens;
      mark.style.opacity = "0";
      bold.style.opacity = "1";

      // The clip itself travels, so there's no swap to see. It melts into the official logo on the way.
      const clipTo = `translate(${target.left - here.x}px, ${target.top - here.y}px) scale(${scale})`;
      clip.style.opacity = "1";
      clip.style.transformOrigin = `${MARK.x * k}px ${MARK.y * k}px`;
      clipFade?.cancel();
      add(
        clip.animate([{ transform: "none" }, { transform: clipTo }], {
          duration: GLIDE_MS,
          delay: GLIDE_DELAY_MS,
          easing: travel,
          fill: "both",
        }),
      );
      add(
        glide.animate([{ transform: fromHere }, { transform: to }], {
          duration: GLIDE_MS,
          delay: GLIDE_DELAY_MS,
          easing: travel,
          fill: "both",
        }),
      );
      add(
        glide.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: LOGO_MELT_MS,
          delay: GLIDE_DELAY_MS + LOGO_MELT_AT_MS,
          fill: "both",
        }),
      );
      add(
        clip.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: LOGO_MELT_MS,
          delay: GLIDE_DELAY_MS + LOGO_MELT_AT_MS + LOGO_MELT_MS / 2,
          fill: "both",
        }),
      );
      revealPage();
    };

    if (reduced) {
      showStill();
    } else {
      const waiting = window.setTimeout(showStill, VIDEO_WAIT_MS);
      timers.push(waiting);
      const play = () => {
        if (landing || ended) return;
        // If the end never reports in, the logo still goes home.
        timers.push(window.setTimeout(land, (stripped ? STRIP.ms : 1200) + LAND_SPARE_MS));
        if (stripped) {
          add(
            stripImage.animate([{ transform: "translateY(0)" }, { transform: `translateY(${(-100 * (STRIP.frames - 1)) / STRIP.frames}%)` }], {
              duration: STRIP.ms,
              easing: `steps(${STRIP.frames - 1}, end)`,
              fill: "forwards",
            }),
          ).addEventListener("finish", land);
        } else {
          video.play().catch(showStill);
        }
      };
      const begin = () => {
        if (landing || ended) return;
        window.clearTimeout(waiting);
        const blur = stripped ? {} : { filter: "blur(10px)" };
        const sharp = stripped ? {} : { filter: "blur(0px)" };
        clipFade = add(
          clip.animate(
            [
              { opacity: 0, transform: "scale(1.04)", ...blur },
              { opacity: 1, transform: "scale(1)", ...sharp },
            ],
            { duration: 1000, easing: motionTokens.softSettle, fill: "forwards" },
          ),
        );
        clipFade.addEventListener("finish", () => {
          timers.push(window.setTimeout(play, 500));
        });
      };
      if (stripped) {
        // Fully decoded before it shows, so the first frame and every step after it are ready.
        stripImage.decode().then(begin, showStill);
      } else {
        video.addEventListener("ended", land);
        video.addEventListener("error", showStill, { once: true });
        if (video.error) showStill();
        else if (video.readyState >= 2) begin();
        else video.addEventListener("loadeddata", begin, { once: true });
      }
    }

    return () => {
      if (stop()) pendingEnd = window.setTimeout(handOver);
    };
  }, []);

  return (
    <div className="wbsk-intro" aria-hidden="true">
      <div ref={veilRef} className="wbsk-intro__veil" />
      <video
        ref={videoRef}
        data-src={publicAsset("/intro/intro-reverse.mp4")}
        data-only="video"
        muted
        playsInline
        preload="auto"
        suppressHydrationWarning
      />
      <div ref={stripRef} className="wbsk-intro__strip">
        <img ref={stripImageRef} data-src={publicAsset("/intro/intro-strip.webp")} data-only="strip" alt="" suppressHydrationWarning />
      </div>
      <div ref={glideRef} className="wbsk-intro__glide">
        <img ref={markRef} data-src={publicAsset("/intro/wbsk-mark-gold.png")} alt="" suppressHydrationWarning />
        <img
          ref={boldRef}
          data-src={publicAsset("/wbsk-logo.svg")}
          alt=""
          suppressHydrationWarning
        />
      </div>
    </div>
  );
}
