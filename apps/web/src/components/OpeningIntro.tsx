"use client";

import { motionTokens, prefersReducedMotion } from "@wbsk/ui/motion";
import { useEffect, useRef } from "react";
import { publicAsset } from "../lib/site";

/** A clip that hasn't arrived by now gets the still instead, so nobody waits on a slow network. */
const VIDEO_WAIT_MS = 1800;
const STILL_MS = 600;
/** Long enough for the slowest word of the hero title to finish arriving. */
const TITLE_DONE_MS = 4000;

/** Where the closed-up WBSK sits in the 1920 × 1080 clip. */
const MARK = { x: 844, y: 512.5, width: 232 };
const CLIP = { width: 1920, height: 1080, nameWidth: 1260 };
const PHONE_BELOW = 820;

/** Starts the small files downloading as soon as the veil is parsed, ahead of the page's scripts. */
const loadScript = `(function(){if(document.documentElement.dataset.intro!=="play")return;document.querySelectorAll(".wbsk-intro [data-src]").forEach(function(e){e.src=e.dataset.src})})()`;

function clipScale() {
  const { innerWidth: w, innerHeight: h } = window;
  // On phones the name is sized to the screen, not the clip's wide black frame.
  if (w < PHONE_BELOW) return (w * 0.88) / CLIP.nameWidth;
  return Math.min(w / CLIP.width, h / CLIP.height);
}

export function OpeningIntro() {
  const veilRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const glideRef = useRef<HTMLDivElement>(null);
  const boldRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const veil = veilRef.current;
    const video = videoRef.current;
    const glide = glideRef.current;
    const bold = boldRef.current;
    if (root.dataset.intro !== "play" || !veil || !video || !glide || !bold) return;
    (window as Window & { __wbskIntro?: boolean }).__wbskIntro = true;

    const reduced = prefersReducedMotion();
    const animations: Animation[] = [];
    const timers: number[] = [];
    let ended = false;
    let landing = false;

    const add = (animation: Animation) => {
      animations.push(animation);
      return animation;
    };
    const finish = () => {
      if (ended) return;
      ended = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      animations.forEach((animation) => animation.cancel());
      video.pause();
      // The logo has landed (or been skipped), so now the film's title can arrive.
      root.dataset.hero = "enter";
      delete root.dataset.intro;
      window.setTimeout(() => (root.dataset.hero = "done"), TITLE_DONE_MS);
      removeSkip();
    };
    const skip = () => finish();
    const removeSkip = () => {
      for (const type of ["pointerdown", "keydown", "wheel", "touchstart"]) {
        window.removeEventListener(type, skip);
      }
    };
    for (const type of ["pointerdown", "keydown", "wheel", "touchstart"]) {
      window.addEventListener(type, skip, { passive: true });
    }

    const k = clipScale();
    video.style.width = `${CLIP.width * k}px`;
    video.style.height = `${CLIP.height * k}px`;
    const origin = {
      x: (window.innerWidth - CLIP.width * k) / 2,
      y: (window.innerHeight - CLIP.height * k) / 2,
    };
    const start = { x: origin.x + MARK.x * k, y: origin.y + MARK.y * k, width: MARK.width * k };
    glide.style.width = `${start.width}px`;
    const from = `translate(${start.x}px, ${start.y}px) scale(1)`;
    glide.style.transform = from;

    const showStill = () => {
      if (landing) return;
      landing = true;
      add(video.animate([{ opacity: 0 }], { duration: 0, fill: "forwards" }));
      add(glide.animate([{ opacity: 1 }], { duration: 0, fill: "forwards" }));
      timers.push(window.setTimeout(finish, STILL_MS));
    };

    const land = () => {
      if (landing || ended) return;
      landing = true;
      const target = document.querySelector(".wbsk-header__logo img")?.getBoundingClientRect();
      if (!target) return finish();
      const to = `translate(${target.left}px, ${target.top}px) scale(${target.width / start.width})`;
      const { softSettle, travel } = motionTokens;
      const hero = document.querySelector(".wbsk-hero .wbsk-frame");

      add(glide.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: "forwards" }));
      add(video.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "forwards" }));
      const move = add(
        glide.animate([{ transform: from }, { transform: to }], {
          duration: 1000,
          delay: 140,
          easing: travel,
          fill: "forwards",
        }),
      );
      add(
        bold.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 500,
          delay: 540,
          fill: "forwards",
        }),
      );
      add(
        veil.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 800,
          delay: 420,
          easing: softSettle,
          fill: "forwards",
        }),
      );
      hero?.animate([{ transform: "scale(1.05)" }, { transform: "scale(1)" }], {
        // A slow push-out, running on under the title so the frame is still moving as it lands.
        duration: 2800,
        delay: 300,
        easing: softSettle,
        fill: "both",
      }).addEventListener("finish", (event) => (event.target as Animation).cancel());
      move.addEventListener("finish", finish);
    };

    if (reduced) {
      showStill();
    } else {
      const waiting = window.setTimeout(showStill, VIDEO_WAIT_MS);
      timers.push(waiting);
      const begin = () => {
        if (landing || ended) return;
        window.clearTimeout(waiting);
        const fade = add(
          video.animate(
            [
              { opacity: 0, transform: "scale(1.04)", filter: "blur(10px)" },
              { opacity: 1, transform: "scale(1)", filter: "blur(0px)" },
            ],
            { duration: 1000, easing: motionTokens.softSettle, fill: "forwards" },
          ),
        );
        fade.addEventListener("finish", () => {
          timers.push(
            window.setTimeout(() => {
              video.play().catch(showStill);
            }, 500),
          );
        });
      };
      video.addEventListener("ended", land);
      if (video.readyState >= 2) begin();
      else video.addEventListener("loadeddata", begin, { once: true });
    }

    return finish;
  }, []);

  return (
    <div className="wbsk-intro" aria-hidden="true">
      <div ref={veilRef} className="wbsk-intro__veil" />
      <video
        ref={videoRef}
        data-src={publicAsset("/intro/intro-reverse.mp4")}
        muted
        playsInline
        preload="auto"
        suppressHydrationWarning
      />
      <div ref={glideRef} className="wbsk-intro__glide">
        <img data-src={publicAsset("/intro/wbsk-mark-gold.png")} alt="" suppressHydrationWarning />
        <img
          ref={boldRef}
          data-src={publicAsset("/wbsk-logo.svg")}
          alt=""
          suppressHydrationWarning
        />
      </div>
      <script dangerouslySetInnerHTML={{ __html: loadScript }} />
    </div>
  );
}
