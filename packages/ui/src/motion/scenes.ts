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
