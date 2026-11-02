import { loadGsap, prefersReducedMotion, settleEase } from "./index";

const NOTHING = () => {};

/**
 * The page's scroll motion, built on one page at a time. Everything follows the scroll or plays
 * once as it arrives: nothing here ever holds up scrolling (Decision 12). What's already on screen
 * when the page opens stays as it is, and without scripts nothing is hidden at all.
 */
export function startScrollScenes(root: HTMLElement): () => void {
  if (prefersReducedMotion()) return NOTHING;
  let stopped = false;
  let context: { revert: () => void } | null = null;

  void loadGsap().then(({ gsap, ScrollTrigger }) => {
    if (stopped) return;
    const below = (el: Element) => el.getBoundingClientRect().top > window.innerHeight * 0.92;
    context = gsap.context(() => {
      // Section openings: the heading rises and straightens, the gold line draws, the sentence follows.
      gsap.utils.toArray<HTMLElement>(".wbsk-sectionhead", root).filter(below).forEach((head) => {
        const title = head.querySelector(".wbsk-sectionhead__title");
        const rule = head.querySelector(".wbsk-sectionhead__rule");
        const line = head.querySelector(".wbsk-sectionhead__line");
        const steps = gsap.timeline({ scrollTrigger: { trigger: head, start: "top 88%", once: true } });
        steps.from(title, { y: 56, opacity: 0, skewY: 2.5, duration: 1.2, ease: settleEase });
        if (rule) steps.from(rule, { scaleX: 0, duration: 1, ease: settleEase }, 0.25);
        if (line) steps.from(line, { y: 18, opacity: 0, duration: 0.9, ease: settleEase }, 0.4);
      });

      // The perspective quote lights up word by word as it's read down the screen.
      const words = gsap.utils.toArray<HTMLElement>(".wbsk-lit", root);
      if (words.length && words[0]!.getBoundingClientRect().top > window.innerHeight * 0.6) {
        gsap.fromTo(
          words,
          { opacity: 0.16 },
          {
            opacity: 1,
            stagger: 0.1,
            ease: "none",
            scrollTrigger: { trigger: words[0], start: "top 82%", end: "top 38%", scrub: 0.4 },
          },
        );
      }

      // The strip of words slides sideways only as the page scrolls, so it's never moving by itself.
      gsap.utils.toArray<HTMLElement>(".wbsk-ticker p", root).forEach((strip) => {
        gsap.fromTo(
          strip,
          { xPercent: 0 },
          {
            xPercent: -22,
            ease: "none",
            scrollTrigger: { trigger: strip, start: "top bottom", end: "bottom top", scrub: 0.5 },
          },
        );
      });

      // The opening film draws in from the edges as you scroll on from it.
      const heroMedia = root.querySelector(".wbsk-hero__media");
      if (heroMedia && window.scrollY < 40) {
        gsap.fromTo(
          heroMedia,
          { clipPath: "inset(0% 0% 0% 0% round 0px)" },
          {
            clipPath: "inset(6% 3% 0% 3% round 24px)",
            ease: "none",
            scrollTrigger: { trigger: root.querySelector(".wbsk-hero"), start: "top top", end: "bottom 35%", scrub: 0.5 },
          },
        );
      }

      // Big pictures and films grow into place as they come up the screen, tied to the scroll.
      gsap.utils.toArray<HTMLElement>("[data-scene='grow']", root).filter(below).forEach((media) => {
        gsap.from(media, {
          scale: 0.9,
          y: 48,
          ease: "none",
          scrollTrigger: { trigger: media, start: "top 100%", end: "top 55%", scrub: 0.6 },
        });
      });

      // The next scene slides over this one, which falls behind more slowly, for a sense of depth.
      gsap.utils.toArray<HTMLElement>(":scope > section", root).forEach((scene) => {
        const next = scene.nextElementSibling;
        if (!next || scene.matches(".wbsk-storycover")) return;
        gsap.to(scene, {
          y: 72,
          ease: "none",
          scrollTrigger: { trigger: next, start: "top 100%", end: "top 40%", scrub: 0.6 },
        });
      });
      // The footer's contents rise out from under the page as it lifts away.
      const footer = document.querySelector(".wbsk-footer");
      if (footer) {
        gsap.from(footer.children, {
          y: -90,
          ease: "none",
          scrollTrigger: { trigger: footer, start: "top 100%", end: "bottom 100%", scrub: 0.5 },
        });
      }
    }, root);
    ScrollTrigger.refresh();
  });

  return () => {
    stopped = true;
    context?.revert();
  };
}
