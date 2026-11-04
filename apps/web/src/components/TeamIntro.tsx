"use client";

import { loadGsap, prefersReducedMotion } from "@wbsk/ui/motion";
import { useLayoutEffect, useRef } from "react";

const SEEN_KEY = "wbsk-team-intro";
const SKIP_KEY = "wbsk-intro-skip-for-tests";
const INPUTS = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

function seenThisVisit() {
  try {
    return Boolean(sessionStorage.getItem(SEEN_KEY) || sessionStorage.getItem(SKIP_KEY));
  } catch {
    return true;
  }
}

/**
 * The Team page opens like a film's credits: a lamp warms up, the crew's names roll past and settle
 * on the lead, then the lamp opens out onto the page. It plays once a visit, is gone at the first
 * scroll, tap or key, and never takes a click. Without scripts it lifts by itself (see the styles),
 * and screen readers skip it, because every name is on the page.
 */
export function TeamIntro({ credits }: { credits: { name: string; role: string }[] }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const html = document.documentElement;
    const release = () => {
      html.dataset.teamIntro = "off";
      root.hidden = true;
    };
    if (prefersReducedMotion() || seenThisVisit()) {
      release();
      return;
    }
    delete html.dataset.teamIntro;
    let stopped = false;
    let cleanup = () => {};
    void loadGsap().then(({ gsap }) => {
      if (stopped) return;
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        // Private windows can refuse storage; seenThisVisit has already said no there.
      }
      const rollWindow = root.querySelector<HTMLElement>(".wbsk-teamintro__names");
      const roll = root.querySelector<HTMLElement>(".wbsk-teamintro__roll");
      const lamp = root.querySelector(".wbsk-teamintro__lamp");
      const rule = root.querySelector(".wbsk-teamintro__rule");
      const words = root.querySelector(".wbsk-teamintro__credits");
      const portrait = document.querySelector<HTMLElement>(".wbsk-person[data-lead] .wbsk-person__photo:not([data-glide])");
      if (!roll || !rollWindow) return release();
      const lines = roll.children.length;
      const timeline = gsap.timeline({ onComplete: release });
      if (portrait) gsap.set(portrait, { opacity: 0, scale: 1.05 });
      timeline.fromTo(lamp, { opacity: 0, scale: 0.45 }, { opacity: 1, scale: 1, duration: 1, ease: "power2.out" }, 0);
      timeline.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "power3.inOut" }, 0.1);
      timeline.fromTo(rollWindow, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, 0.25);
      for (let line = 1; line < lines; line += 1) {
        timeline.to(roll, { yPercent: (-100 * line) / lines, duration: 0.42, ease: "power3.inOut" }, 0.45 + (line - 1) * 0.42);
      }
      // The lamp opens out onto the page; the title and the lead's portrait arrive with it.
      const lift = Math.max(1.5, 0.45 + (lines - 1) * 0.42 + 0.3);
      timeline.to(words, { opacity: 0, y: -18, duration: 0.45, ease: "power2.in" }, lift);
      timeline.to(lamp, { scale: 3.4, duration: 1.1, ease: "power2.inOut" }, lift);
      timeline.to(root, { opacity: 0, duration: 0.8, ease: "power2.inOut" }, lift + 0.25);
      timeline.call(() => {
        html.dataset.teamIntro = "off";
      }, undefined, lift + 0.2);
      if (portrait) {
        timeline.to(portrait, { opacity: 1, scale: 1, duration: 1.1, ease: "power3.out", clearProps: "opacity,scale,transform" }, lift + 0.25);
      }

      const skip = () => {
        INPUTS.forEach((name) => window.removeEventListener(name, skip, { capture: true }));
        timeline.kill();
        html.dataset.teamIntro = "off";
        if (portrait) gsap.set(portrait, { clearProps: "opacity,scale,transform" });
        gsap.to(root, { opacity: 0, duration: 0.25, ease: "power2.out", onComplete: release });
      };
      INPUTS.forEach((name) => window.addEventListener(name, skip, { passive: true, capture: true }));
      cleanup = () => {
        INPUTS.forEach((name) => window.removeEventListener(name, skip, { capture: true }));
        timeline.kill();
        if (portrait) gsap.set(portrait, { clearProps: "opacity,scale,transform" });
      };
    });
    return () => {
      stopped = true;
      cleanup();
    };
  }, []);

  return (
    <div ref={rootRef} className="wbsk-teamintro" aria-hidden="true">
      <span className="wbsk-teamintro__lamp" />
      <div className="wbsk-teamintro__credits">
        <span className="wbsk-teamintro__rule" />
        <div className="wbsk-teamintro__names">
          <div className="wbsk-teamintro__roll">
            {credits.map((credit) => (
              <div key={credit.name} className="wbsk-teamintro__line">
                <p className="wbsk-label">{credit.role}</p>
                <p className="wbsk-teamintro__name">{credit.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
