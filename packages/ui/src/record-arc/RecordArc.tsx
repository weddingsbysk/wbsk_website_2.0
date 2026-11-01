"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { WbskImage } from "../components/WbskImage";
import type { WbskImageSource } from "../image";
import { WbskLink } from "../link-context";
import { loadGsap, prefersReducedMotion } from "../motion";
import { drawLabel, drawRecord, drawSleeve, LABEL_SHARE } from "./textures";

export type ArcDestination = {
  id: string;
  name: string;
  href: string;
  catalogue: string;
  artworkUrl?: string;
  cover?: WbskImageSource | null;
  coverPhone?: WbskImageSource | null;
};

type Props = {
  destinations: ArcDestination[];
  /** Goes straight to the page: the arc's own dissolve replaces the usual page change. */
  navigate: (href: string) => void;
};

type Item = {
  index: number;
  name: string;
  el: HTMLElement;
  rig: HTMLElement;
  rec: HTMLElement;
  disc: HTMLElement;
  sleeve: HTMLElement;
  thick: HTMLElement[];
  dim: HTMLElement;
  fan: number;
};

const never = () => () => {};
/** Gives the browser room between pieces of drawing, so the page never stalls on the records. */
const breathe = () =>
  new Promise<void>((resolve) => {
    if ("requestIdleCallback" in window) window.requestIdleCallback(() => resolve(), { timeout: 200 });
    else setTimeout(resolve, 16);
  });
const LAST_OPENED_KEY = "wbsk-arc-last";
const CARD_STOCKS = 5;

function fontFamily(variable: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value ? `${value}, ${fallback}` : fallback;
}

/** Remembers the record a visitor opened, so the arc rebuilds around it on their return. */
function takeLastOpened(): string | null {
  try {
    const value = sessionStorage.getItem(LAST_OPENED_KEY);
    sessionStorage.removeItem(LAST_OPENED_KEY);
    return value;
  } catch {
    return null;
  }
}

function rememberOpened(id: string) {
  try {
    sessionStorage.setItem(LAST_OPENED_KEY, id);
  } catch {
    // Without storage the arc simply starts from its usual record.
  }
}

/**
 * The destination record arc (Decisions 08, 09 and 13). The links underneath are the real page
 * content, and all a visitor gets without scripts or with reduced motion: a simple row of sleeves.
 */
export function RecordArc({ destinations, navigate }: Props) {
  const arcRef = useRef<HTMLElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const reduced = useSyncExternalStore(never, prefersReducedMotion, () => false);
  const [drawn, setDrawn] = useState<"waiting" | "arc" | "row">("waiting");
  const mode = reduced ? "row" : drawn;
  const [opening, setOpening] = useState<ArcDestination | null>(null);

  useEffect(() => {
    const arc = arcRef.current;
    if (!arc || destinations.length === 0 || reduced) return;

    // Straight back to the arc, before anything is drawn, so the page top never flashes up.
    const lastOpened = takeLastOpened();
    if (lastOpened) arc.scrollIntoView({ block: "center" });

    let disposed = false;
    let cleanup = () => {};
    const urls: string[] = [];

    void (async () => {
      await breathe();
      const { gsap } = await loadGsap();
      const serif = fontFamily("--font-bodoni", "Didot, Georgia, serif");
      const sans = fontFamily("--font-hanken", "Arial, sans-serif");
      await Promise.all([
        document.fonts.load(`500 40px ${serif}`),
        document.fonts.load(`500 20px ${sans}`),
      ]).catch(() => []);

      const elements = [...arc.querySelectorAll<HTMLElement>("[data-arc-item]")];
      const recordUrl = await drawRecord();
      urls.push(recordUrl);
      await breathe();
      // Each card stock is drawn at most once, with a pause between so the page never stalls.
      const stocks = new Map<number, string>();
      for (let i = 0; i < elements.length; i += 1) {
        if (disposed) return;
        const stock = i % CARD_STOCKS;
        if (!stocks.has(stock)) {
          const url = await drawSleeve(stock, serif);
          urls.push(url);
          stocks.set(stock, url);
          await breathe();
        }
      }
      if (disposed) return;

      const labels: HTMLCanvasElement[] = [];
      for (const destination of destinations) {
        labels.push(drawLabel(destination.name, destination.catalogue, serif, sans));
        await breathe();
        if (disposed) return;
      }

      const items: Item[] = elements.map((el, index) => {
        const disc = el.querySelector<HTMLElement>("[data-disc]")!;
        const sleeve = el.querySelector<HTMLElement>("[data-sleeve]")!;
        disc.style.backgroundImage = `url(${recordUrl})`;
        sleeve.style.backgroundImage = `url(${stocks.get(index % CARD_STOCKS)})`;
        const label = labels[index]!;
        label.className = "wbsk-arc__label";
        label.style.width = label.style.height = `${LABEL_SHARE * 100}%`;
        label.setAttribute("aria-hidden", "true");
        disc.appendChild(label);
        return {
          index,
          name: destinations[index]!.name,
          el,
          rig: el.querySelector<HTMLElement>("[data-rig]")!,
          rec: el.querySelector<HTMLElement>("[data-rec]")!,
          disc,
          sleeve,
          thick: [...el.querySelectorAll<HTMLElement>("[data-thick]")],
          dim: el.querySelector<HTMLElement>("[data-dim]")!,
          fan: 0,
        };
      });

      const MAX = items.length - 1;
      const returningTo = lastOpened ? destinations.findIndex((d) => d.id === lastOpened) : -1;
      const startAt = returningTo >= 0 ? returningTo : Math.floor(MAX / 2);

      const state = { p: startAt, reveal: 0, stack: 0 };
      const tilt = { x: 0, y: 0 };
      const dock = { amount: 0, x: 0, target: 0, on: false, ticking: false };
      const glide = { on: false, to: startAt, from: startAt, direction: 0 };
      let target = startAt;
      let introDone = false;
      let opened = false;
      let settleTween: ReturnType<typeof gsap.to> | null = null;
      let introTimeline: ReturnType<typeof gsap.timeline> | null = null;
      let idleTimer = 0;
      let lastDrag = 0;
      let hinted = false;
      let lit: Item | null = null;

      const recordSize = () => items[0]!.rig.offsetWidth || 200;

      const geometry = () => {
        const width = arc.clientWidth;
        const height = arc.clientHeight;
        const s = recordSize();
        const reach = width / 2 - s * 0.2;
        const cornerD = Math.max(1.25, Math.min(3.2, reach / (s * 1.02)));
        const drop = height * 0.27;
        const angle = Math.min(2 * Math.atan2(drop, reach), 0.6);
        return { height, s, cornerD, angle, radius: reach / Math.sin(angle) };
      };

      let restTimer = 0;
      const layout = () => {
        arc.dataset.moving = "true";
        window.clearTimeout(restTimer);
        restTimer = window.setTimeout(() => delete arc.dataset.moving, 400);
        const g = geometry();
        const { s } = g;
        const centreOut = Math.max(0, 1 - Math.abs(state.p - Math.round(state.p)) * 2.2) * state.reveal;
        for (const item of items) {
          const d = item.index - state.p;
          const away = Math.abs(d);
          const angle = (d / g.cornerD) * g.angle;
          let x = g.radius * Math.sin(angle);
          let y = g.radius * (1 - Math.cos(angle)) - g.height * 0.04;
          x += d > 0 ? Math.min(d, 1) * s * 0.42 * centreOut : Math.max(d, -1) * s * 0.06 * centreOut;
          const out = Math.max(0, 1 - away * 2.2) * state.reveal;
          x -= out * s * 0.24;
          let scale = 1 - Math.min(away, g.cornerD + 1) * 0.08;
          scale *= 1 + 0.14 * Math.exp(-(d * d) / 0.16) * state.reveal;
          if (dock.amount > 0.001) {
            const near = (x - dock.x) / (s * 0.85);
            scale *= 1 + 0.16 * dock.amount * Math.exp(-near * near);
          }
          let rotateZ = ((angle * 180) / Math.PI) * 0.85;
          let rotateY = -Math.max(-2, Math.min(2, d)) * 12;
          const edge = g.cornerD;
          const opacity = away > edge + 1.1 ? 0 : away > edge + 0.4 ? 1 - (away - edge - 0.4) / 0.7 : 1;
          const k = item.fan;
          const stackY = g.height * 0.06 + g.height * 0.28 * (1 - state.stack);
          x *= k;
          y = y * k + stackY * (1 - k);
          scale = scale * (0.78 + 0.22 * k) * (0.9 + 0.1 * state.stack);
          rotateZ *= k;
          rotateY *= k;
          item.el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
          if (!opened) {
            item.el.style.opacity = String(opacity * Math.max(Math.min(1, k * 1.6), away < 0.5 ? state.stack : 0));
          }
          item.el.style.zIndex = String(100 - Math.round(away * 10));
          const weight = Math.max(0, 1 - away * 2);
          item.rig.style.transform = `perspective(1200px) rotateY(${rotateY + tilt.y * weight}deg) rotateX(${tilt.x * weight}deg) rotateZ(${rotateZ}deg)`;
          const isCentre = away < 0.5 && state.reveal > 0.5;
          if (!(opened && isCentre)) {
            item.rec.style.transform = `translate3d(${out * s * 0.5 + s * 0.04}px, 0, 0)`;
          }
          item.el.dataset.centre = String(isCentre);
          item.dim.style.opacity = String(Math.min(away, 3) * 0.12);
        }
        // The light follows the tilt on the centre record only (Decision 09).
        const centre = items[Math.round(state.p)]!;
        if (lit && lit !== centre) {
          for (const name of ["--sheen", "--lx", "--ly", "--shx", "--shy"]) lit.rig.style.removeProperty(name);
        }
        lit = centre;
        const px = tilt.y / 22;
        const py = -tilt.x / 16;
        if (px !== 0 || py !== 0) {
          centre.rig.style.setProperty("--sheen", `${-38 + px * 80}deg`);
          centre.rig.style.setProperty("--lx", `${35 + px * 70}%`);
          centre.rig.style.setProperty("--ly", `${25 + py * 70}%`);
          centre.rig.style.setProperty("--shx", `${-px * 26}px`);
          centre.rig.style.setProperty("--shy", `${-py * 18}px`);
        }
      };

      const centreIndex = () => Math.round(state.p);
      const announce = () => {
        const index = centreIndex();
        arc.dataset.centreName = items[index]!.name;
        if (liveRef.current) {
          liveRef.current.textContent = `${items[index]!.name}, ${index + 1} of ${items.length}`;
        }
      };

      const glideTick = () => {
        const distance = glide.to - state.p;
        if (Math.abs(distance) < 0.002) {
          state.p = glide.to;
          layout();
          gsap.ticker.remove(glideTick);
          glide.on = false;
          target = Math.round(state.p);
          announce();
          return;
        }
        // The same pace on 60Hz and 120Hz screens (Decision 13).
        state.p += distance * (1 - Math.pow(1 - 0.08, gsap.ticker.deltaRatio(60)));
        layout();
      };

      const settle = (to: number, duration?: number, ease?: string) => {
        const end = Math.max(0, Math.min(MAX, to));
        if (glide.on) {
          gsap.ticker.remove(glideTick);
          glide.on = false;
        }
        target = end;
        settleTween?.kill();
        const distance = Math.abs(end - state.p);
        settleTween = gsap.to(state, {
          p: end,
          duration: duration ?? Math.min(1.1 + (distance - 1) * 0.35, 2),
          ease: ease ?? "power3.inOut",
          onUpdate: layout,
          onComplete: announce,
        });
      };

      const onWheel = (event: WheelEvent) => {
        if (opened || !introDone) {
          event.preventDefault();
          return;
        }
        let delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        if (event.deltaMode === 1) delta *= 32;
        const base = glide.on ? glide.to : state.p;
        // At either end the page takes over, so nothing ever traps the scroll (Decision 08).
        if ((base <= 0.001 && delta < 0) || (base >= MAX - 0.001 && delta > 0)) {
          if (glide.on) event.preventDefault();
          return;
        }
        event.preventDefault();
        settleTween?.kill();
        settleTween = null;
        glide.to = Math.max(0, Math.min(MAX, base + delta / (recordSize() * 1.1)));
        if (!glide.on) {
          glide.on = true;
          glide.from = Math.round(state.p);
          gsap.ticker.add(glideTick);
        }
        glide.direction = delta > 0 ? 1 : -1;
        window.clearTimeout(idleTimer);
        idleTimer = window.setTimeout(() => {
          const rest = glide.to;
          let nearest = glide.direction > 0 ? Math.ceil(rest - 0.2) : Math.floor(rest + 0.2);
          if (nearest === glide.from && Math.abs(rest - glide.from) > 0.05) {
            nearest = glide.from + glide.direction;
          }
          glide.to = Math.max(0, Math.min(MAX, nearest));
          glide.from = glide.to;
        }, 160);
      };

      let drag: { x: number; y: number; p: number; moved: boolean; sideways: boolean | null; dx: number } | null = null;
      const onDown = (event: PointerEvent) => {
        if (opened || !introDone || event.pointerType === "mouse") return;
        drag = { x: event.clientX, y: event.clientY, p: state.p, moved: false, sideways: null, dx: 0 };
      };
      const onMove = (event: PointerEvent) => {
        if (!drag) return;
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        if (drag.sideways === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
          drag.sideways = Math.abs(dx) > Math.abs(dy);
        }
        if (!drag.sideways) return;
        drag.moved = true;
        settleTween?.kill();
        drag.dx = dx;
        state.p = Math.max(-0.3, Math.min(MAX + 0.3, drag.p - dx / (recordSize() * 1.4)));
        layout();
      };
      const onUp = () => {
        if (!drag) return;
        const { moved, dx, p } = drag;
        drag = null;
        if (!moved) return;
        lastDrag = Date.now();
        const base = Math.round(p);
        const records = Math.max(1, Math.round(Math.abs(dx) / (recordSize() * 1.4)));
        settle(Math.abs(dx) > 40 ? base + (dx < 0 ? 1 : -1) * records : base, 0.9, "power3.out");
      };

      const dockTick = () => {
        dock.x += (dock.target - dock.x) * (1 - Math.pow(1 - 0.18, gsap.ticker.deltaRatio(60)));
        layout();
        // Once the swell has caught up with a still cursor, nothing needs redrawing.
        const caughtUp = Math.abs(dock.target - dock.x) < 0.5 && dock.amount > 0.999;
        if (caughtUp || (!dock.on && dock.amount < 0.001)) {
          gsap.ticker.remove(dockTick);
          dock.ticking = false;
        }
      };
      const dockStart = () => {
        if (!dock.ticking) {
          dock.ticking = true;
          gsap.ticker.add(dockTick);
        }
      };
      const tiltTo = (px: number, py: number, duration = 0.8) => {
        gsap.to(tilt, { y: px * 22, x: -py * 16, duration, ease: "power3.out", overwrite: "auto", onUpdate: layout });
      };

      const playIntro = (delay: number) => {
        introTimeline?.kill();
        introDone = false;
        arc.dataset.state = "intro";
        state.reveal = 0;
        state.stack = 0;
        for (const item of items) item.fan = 0;
        layout();
        const centre = centreIndex();
        introTimeline = gsap.timeline({
          delay,
          onUpdate: layout,
          onComplete: () => {
            introDone = true;
            arc.dataset.state = "ready";
            announce();
          },
        });
        introTimeline.to(state, { stack: 1, duration: 0.9, ease: "power3.out" }, 0);
        for (const item of [...items].sort((a, b) => Math.abs(a.index - centre) - Math.abs(b.index - centre))) {
          introTimeline.to(item, { fan: 1, duration: 1.5, ease: "expo.out" }, 0.75 + Math.abs(item.index - centre) * 0.14);
        }
        introTimeline.to(state, { reveal: 1, duration: 1.1, ease: "power3.inOut" }, "-=0.8");
      };

      const open = () => {
        if (opened || !introDone) return;
        opened = true;
        arc.dataset.state = "opening";
        const item = items[centreIndex()]!;
        const destination = destinations[item.index]!;
        rememberOpened(destination.id);
        setOpening(destination);
        if (liveRef.current) liveRef.current.textContent = `Opening ${item.name}`;
        dock.on = false;
        gsap.to(dock, { amount: 0, duration: 0.4, overwrite: "auto" });
        dockStart();
        tiltTo(0, 0, 0.4);

        // A real 33⅓ rpm, reached gently (Decision 09); the light above the grooves stays still.
        const spin = gsap.to(item.disc, { rotation: "+=360", duration: 60 / (100 / 3), ease: "none", repeat: -1 });
        spin.timeScale(0);
        gsap.to(spin, { timeScale: 1, duration: 1.2, ease: "power1.in" });

        const s = recordSize();
        const others = items.filter((other) => other !== item).map((other) => other.el);
        gsap
          .timeline({ delay: 0.35, onComplete: () => navigate(destination.href) })
          .to(item.thick, { opacity: 0, duration: 0.2, ease: "none" })
          .to(item.sleeve, { x: -s * 0.9, opacity: 0, duration: 0.9, ease: "power2.inOut" }, "<")
          // The whole item sits a little left while its record is out, so this lands dead centre.
          .to(item.rec, { x: s * 0.24, duration: 0.9, ease: "power2.inOut" }, "<")
          .to(others, { opacity: 0, duration: 0.6, ease: "power2.out" }, "<")
          .to(item.rec, { scale: 3, opacity: 0, duration: 1.1, ease: "power2.in" })
          .to(() => coverRef.current, { opacity: 1, duration: 0.9, ease: "power1.out" }, "-=0.7");
      };

      const showHint = () => {
        if (hinted) return;
        hinted = true;
        hintRef.current?.setAttribute("data-on", "true");
        window.setTimeout(() => hintRef.current?.removeAttribute("data-on"), 2600);
      };

      const onEnter = (event: PointerEvent) => {
        if (event.pointerType === "mouse" && introDone) showHint();
      };
      const onHover = (event: PointerEvent) => {
        if (event.pointerType !== "mouse" || opened || !introDone) return;
        const box = arc.getBoundingClientRect();
        tiltTo((event.clientX - box.left) / box.width - 0.5, (event.clientY - box.top) / box.height - 0.5);
        dock.target = event.clientX - (box.left + box.width / 2);
        if (!dock.on) {
          dock.on = true;
          dock.x = dock.target;
          gsap.to(dock, { amount: 1, duration: 0.6, ease: "power3.out", overwrite: "auto" });
        }
        dockStart();
      };
      const onLeave = () => {
        if (!opened) tiltTo(0, 0);
        dock.on = false;
        gsap.to(dock, { amount: 0, duration: 0.6, ease: "power3.out", overwrite: "auto" });
        dockStart();
      };
      const onClick = (event: MouseEvent) => {
        if (opened || !introDone || Date.now() - lastDrag < 300) return;
        const element = (event.target as Element).closest<HTMLElement>("[data-arc-item]");
        const item = items.find((candidate) => candidate.el === element);
        if (!item) return;
        if (item.index === centreIndex() && Math.abs(state.p - item.index) < 0.05) open();
        else settle(item.index);
      };
      const onKey = (event: KeyboardEvent) => {
        if (opened || !introDone) return;
        if (event.key === "ArrowRight") {
          event.preventDefault();
          settle(target + 1);
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          settle(target - 1);
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      };

      arc.addEventListener("wheel", onWheel, { passive: false });
      arc.addEventListener("pointerdown", onDown);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      arc.addEventListener("pointerenter", onEnter);
      arc.addEventListener("pointermove", onHover);
      arc.addEventListener("pointerleave", onLeave);
      arc.addEventListener("click", onClick);
      arc.addEventListener("keydown", onKey);
      window.addEventListener("resize", layout);

      setDrawn("arc");
      layout();

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            observer.disconnect();
            playIntro(0.4);
          }
        },
        { threshold: 0.6 },
      );
      observer.observe(arc);

      cleanup = () => {
        observer.disconnect();
        window.clearTimeout(idleTimer);
        window.clearTimeout(restTimer);
        introTimeline?.kill();
        settleTween?.kill();
        gsap.ticker.remove(glideTick);
        gsap.ticker.remove(dockTick);
        gsap.killTweensOf([state, tilt, dock, ...items.flatMap((item) => [item, item.disc, item.rec, item.sleeve, ...item.thick, item.el])]);
        arc.removeEventListener("wheel", onWheel);
        arc.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        arc.removeEventListener("pointerenter", onEnter);
        arc.removeEventListener("pointermove", onHover);
        arc.removeEventListener("pointerleave", onLeave);
        arc.removeEventListener("click", onClick);
        arc.removeEventListener("keydown", onKey);
        window.removeEventListener("resize", layout);
      };
    })().catch(() => {
      // If the records can't be drawn or the library won't load, the plain row is the arc.
      if (!disposed) setDrawn("row");
    });

    return () => {
      disposed = true;
      cleanup();
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [destinations, navigate, reduced]);

  return (
    <>
      <section
        ref={arcRef}
        className="wbsk-arc"
        data-mode={mode}
        data-native-wheel
        tabIndex={mode === "arc" ? 0 : undefined}
        aria-label={
          mode === "row"
            ? "Destinations"
            : "Destinations. Use the left and right arrow keys to move, and Enter to open."
        }
        aria-roledescription={mode === "arc" ? "carousel" : undefined}
      >
        {mode !== "row"
          ? destinations.map((destination) => (
              <div key={destination.id} className="wbsk-arc__item" data-arc-item aria-hidden="true">
                <div className="wbsk-arc__rig" data-rig>
                  <div className="wbsk-arc__rec" data-rec>
                    <span className="wbsk-arc__shadow" />
                    <span className="wbsk-arc__disc" data-disc />
                    <span className="wbsk-arc__sheen" />
                    <span className="wbsk-arc__iris" />
                  </div>
                  <div className="wbsk-arc__sleeve" data-sleeve>
                    {destination.artworkUrl ? (
                      <img src={destination.artworkUrl} alt="" loading="lazy" decoding="async" />
                    ) : null}
                  </div>
                  <span className="wbsk-arc__thick" data-thick />
                  <span className="wbsk-arc__thick wbsk-arc__thick--right" data-thick />
                  <span className="wbsk-arc__dim" data-dim />
                </div>
                <div className="wbsk-arc__name">{destination.name}</div>
              </div>
            ))
          : null}
        <div ref={hintRef} className="wbsk-arc__hint">
          Scroll to explore
        </div>
        <ul className="wbsk-arc__row">
          {destinations.map((destination) => (
            <li key={destination.id}>
              <WbskLink href={destination.href}>
                <span className="wbsk-arc__card">
                  {destination.artworkUrl ? (
                    <img src={destination.artworkUrl} alt="" loading="lazy" decoding="async" />
                  ) : null}
                </span>
                <span className="wbsk-arc__cardname">{destination.name}</span>
              </WbskLink>
            </li>
          ))}
        </ul>
      </section>
      <p ref={liveRef} className="wbsk-visually-hidden" aria-live="polite" />
      {opening
        ? createPortal(
            <div ref={coverRef} className="wbsk-arc__cover" aria-hidden="true">
              {opening.cover ? (
                <WbskImage
                  image={opening.cover}
                  portraitImage={opening.coverPhone ?? undefined}
                  slot="coverDesktop"
                  sizes="100vw"
                  priority
                />
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
