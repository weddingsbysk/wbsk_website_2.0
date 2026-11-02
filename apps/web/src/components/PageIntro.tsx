import { SectionHead, TitleWords } from "@wbsk/ui";
import type { ReactNode } from "react";

/** Plain opening used by pages still waiting for their own phase. */
export function PageIntro({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "light" | "dark";
  children: ReactNode;
}) {
  return (
    <section
      data-tone={tone === "dark" ? "dark" : undefined}
      className="wbsk-section wbsk-pageintro"
    >
      <div className="wbsk-container">
        <SectionHead as="h1" line={children}>
          <TitleWords text={title} />
        </SectionHead>
      </div>
    </section>
  );
}
