import { sanityProject } from "@wbsk/content";
import { CoupleNames, Header, LinkProvider, StoryCover, type WbskImageSource, type WbskLinkProps } from "@wbsk/ui";
import { navItems } from "@wbsk/content";
import logoUrl from "../../../web/public/wbsk-logo.svg";

type DraftImage = { asset?: { _ref?: string }; description?: string; hotspot?: { x: number; y: number } } | undefined;
export type DraftDocument = Record<string, unknown>;

export function draftImage(value: DraftImage): WbskImageSource | null {
  const match = value?.asset?._ref?.match(/^image-([^-]+)-(\d+)x(\d+)-([a-z0-9]+)$/);
  if (!match) return null;
  const [, id, width, height, format] = match;
  return {
    kind: "sanity",
    url: `https://cdn.sanity.io/images/${sanityProject.projectId}/${sanityProject.dataset}/${id}-${width}x${height}.${format}`,
    width: Number(width),
    height: Number(height),
    alt: value?.description ?? "",
    focal: value?.hotspot ? { x: value.hotspot.x, y: value.hotspot.y } : undefined,
  };
}

// Links in a preview don't go anywhere: it's only for checking the draft.
const renderLink = ({ href: _href, onClick: _onClick, ...rest }: WbskLinkProps) => (
  <a href="#preview" onClick={(event) => event.preventDefault()} {...rest} />
);

export function WeddingPreview({ doc, phone }: { doc: DraftDocument; phone: boolean }) {
  const first = (doc.firstName as string) || "First name";
  const second = (doc.secondName as string) || "Second name";
  return (
    <LinkProvider value={renderLink}>
      <Header items={navItems} enquireHref="/#enquire" homeHref="/" logoSrc={logoUrl} currentPath="/client/" />
      <main>
        <StoryCover
          cover={draftImage(doc.coverDesktop as DraftImage)}
          coverPhone={draftImage(doc.coverPhone as DraftImage)}
          place={[doc.placeLabel, doc.city].filter(Boolean).join(" · ").toUpperCase() || "PLACE"}
          names={<CoupleNames first={first} second={second} />}
          meta={[doc.venue, doc.weddingDate].filter(Boolean).join(" · ")}
        />
        <div className="wbsk-container wbsk-story">
          <p className="wbsk-lead wbsk-measure">{(doc.theirStory as string) || "Their story appears here as you type."}</p>
        </div>
      </main>
    </LinkProvider>
  );
}
