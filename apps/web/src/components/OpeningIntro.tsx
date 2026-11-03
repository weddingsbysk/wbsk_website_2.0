"use client";

import { motionTokens, prefersReducedMotion } from "@wbsk/ui/motion";
import { useEffect, useRef, type ReactNode } from "react";
import { publicAsset } from "../lib/site";
import motion from "./intro-logo-motion.json";

const WORD_PAD = 2;
const BAND_HEIGHT = 200;
/** Hairlines are about this wide in the master, in master pixels. */
const HAIRLINE = 2.5;
/** Below this on screen a hairline starts to break up, so it gains just enough weight to hold. */
const HAIRLINE_MIN_DEVICE_PX = 1.15;

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
 * The name is the band it occupies in the 4K master (2640 × 200). These sizes are half that: a
 * 1320 × 100 band, centred in a 1920 × 1080 frame. MARK is where the closed-up WBSK sits inside it.
 */
const MARK = { x: 544, y: 22.5, width: 232 };
const CLIP = { width: 1320, height: 100, nameWidth: 1260 };
const FRAME = { width: 1920, height: 1080 };
const PHONE_BELOW = 820;
const SKIP_FADE_MS = 320;
const LAND_SPARE_MS = 800;

const isTouch = () =>
  window.matchMedia("(hover: none), (pointer: coarse)").matches || window.innerWidth < PHONE_BELOW;

/** React's development mode starts each effect twice, so a stop only counts if no second start follows. */
let pendingEnd: number | undefined;

function clipScale() {
  const { innerWidth: w, innerHeight: h } = window;
  // On phones the name is sized to the screen, not the clip's wide black frame.
  if (w < PHONE_BELOW) return (w * 0.88) / CLIP.nameWidth;
  return Math.min(w / FRAME.width, h / FRAME.height);
}

export function OpeningIntro({ name, mark: markShape }: { name: ReactNode; mark: ReactNode }) {
  const veilRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const glideRef = useRef<HTMLDivElement>(null);
  const boldRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    window.clearTimeout(pendingEnd);
    const root = document.documentElement;
    const veil = veilRef.current;
    const clip = nameRef.current;
    const glide = glideRef.current;
    const mark = glide?.querySelector("svg");
    const bold = boldRef.current;
    const words = [...(clip?.querySelectorAll<HTMLElement>(".wbsk-intro__word") ?? [])];
    if (root.dataset.intro !== "play" || !veil || !clip || !glide || !mark || !bold || words.length !== motion.words.length) return;
    (window as Window & { __wbskIntro?: boolean }).__wbskIntro = true;
    // The head script usually has this downloading already; this covers it finishing later than the page's scripts.
    if (bold.dataset.src && !bold.getAttribute("src")) bold.src = bold.dataset.src;

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
    // On whole device pixels, or the resting logo would be drawn between two and soften.
    const dpr = window.devicePixelRatio || 1;
    const snap = (value: number) => Math.round(value * dpr) / dpr;
    const unit = k / 2;
    clip.style.width = `${CLIP.width * k}px`;
    clip.style.height = `${CLIP.height * k}px`;
    const origin = {
      x: snap((window.innerWidth - CLIP.width * k) / 2),
      y: snap((window.innerHeight - CLIP.height * k) / 2),
    };
    clip.style.left = `${origin.x}px`;
    clip.style.top = `${origin.y}px`;
    clip.style.setProperty("--intro-stroke", String(Math.min(1.2, Math.max(0, HAIRLINE_MIN_DEVICE_PX / (unit * dpr) - HAIRLINE))));

    // Each word is rigid, and slides out from behind its first letter: the outer box is the window,
    // the inner shape moves the opposite way, so the reveal is drawn by the compositor alone.
    const parts = motion.words.map((word, index) => {
      const outer = words[index]!;
      const inner = outer.firstElementChild as SVGSVGElement;
      const width = (word.width + WORD_PAD * 2) * unit;
      outer.style.width = `${width}px`;
      outer.style.height = `${BAND_HEIGHT * unit}px`;
      inner.style.width = `${width}px`;
      inner.style.height = `${BAND_HEIGHT * unit}px`;
      const openAt = snap((word.openX - WORD_PAD) * unit);
      const closedAt = snap((word.closedX - WORD_PAD) * unit);
      const frames = word.spread.map((spread, sample) => {
        const reveal = word.reveal[sample]!;
        const shown = (word.initial + reveal * (word.width - word.initial) + WORD_PAD * (1 + reveal)) * unit;
        const at = closedAt + spread * (openAt - closedAt);
        return { outer: at + shown - width, inner: width - shown };
      });
      outer.style.transform = `translateX(${frames[0]!.outer}px)`;
      inner.style.transform = `translateX(${frames[0]!.inner}px)`;
      return { outer, inner, frames };
    });
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

    const showStill = () => {
      landing = true;
      add(glide.animate([{ opacity: 1 }], { duration: 0, fill: "forwards" }));
      timers.push(window.setTimeout(finish, STILL_MS));
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
      const play = () => {
        if (landing || ended) return;
        // If the end never reports in, the logo still goes home.
        timers.push(window.setTimeout(land, motion.seconds * 1000 + LAND_SPARE_MS));
        const timing = { duration: motion.seconds * 1000, easing: "linear", fill: "forwards" as const };
        const moves = parts.flatMap(({ outer, inner, frames }) => [
          outer.animate(frames.map((frame) => ({ transform: `translateX(${frame.outer}px)` })), timing),
          inner.animate(frames.map((frame) => ({ transform: `translateX(${frame.inner}px)` })), timing),
        ]);
        // All on one clock, so a word and its window never drift apart.
        const now = document.timeline.currentTime;
        moves.forEach((move) => {
          add(move);
          move.startTime = now;
        });
        moves[0]!.addEventListener("finish", land);
      };
      const blur = isTouch() ? {} : { filter: "blur(10px)" };
      const sharp = isTouch() ? {} : { filter: "blur(0px)" };
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
    }

    return () => {
      if (stop()) pendingEnd = window.setTimeout(handOver);
    };
  }, []);

  return (
    <div className="wbsk-intro" aria-hidden="true">
      <div ref={veilRef} className="wbsk-intro__veil" />
      <div ref={nameRef} className="wbsk-intro__name">
        {name}
      </div>
      <div ref={glideRef} className="wbsk-intro__glide">
        {markShape}
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
