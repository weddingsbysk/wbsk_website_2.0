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
        <h1 className="wbsk-h1">{title}</h1>
        <p className="wbsk-lead wbsk-measure wbsk-pageintro__text">{children}</p>
      </div>
    </section>
  );
}
