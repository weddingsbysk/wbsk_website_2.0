import type { ReactNode } from "react";

/** A section's opening: a big centred heading, a short gold line and one sentence. */
export function SectionHead({
  children,
  line,
  as: Tag = "h2",
}: {
  children: ReactNode;
  line?: ReactNode;
  as?: "h1" | "h2";
}) {
  return (
    <div className="wbsk-sectionhead">
      <Tag className="wbsk-sectionhead__title">{children}</Tag>
      <span className="wbsk-sectionhead__rule" aria-hidden="true" />
      {line ? <p className="wbsk-sectionhead__line">{line}</p> : null}
    </div>
  );
}
