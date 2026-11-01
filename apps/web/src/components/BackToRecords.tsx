"use client";

import { prefersReducedMotion } from "@wbsk/ui/motion";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { publicAsset } from "../lib/site";

const FADE_MS = 800;

/** A quiet link at the top of the page (G9). The page fades, then the arc replays (Decision 13). */
export function BackToRecords() {
  const router = useRouter();
  const go = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    const main = document.getElementById("main");
    if (!main || prefersReducedMotion()) {
      router.push("/pre-wedding/");
      return;
    }
    main
      .animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, easing: "ease-in-out", fill: "forwards" })
      .addEventListener("finish", (finished) => {
        router.push("/pre-wedding/");
        window.setTimeout(() => (finished.target as Animation).cancel(), 200);
      });
  };
  return (
    <a className="wbsk-link wbsk-backlink" href={publicAsset("/pre-wedding/")} onClick={go}>
      Back to the records
    </a>
  );
}
