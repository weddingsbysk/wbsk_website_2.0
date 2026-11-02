import { CoupleNames, Letterbox, SectionHead, TitleWords, WbskImage, WbskLink } from "@wbsk/ui";
import type { Metadata } from "next";
import { EnquireButton } from "../../components/EnquiryPanel";
import { WeddingsGrid } from "../../components/WeddingsGrid";
import { getWeddings, getWeddingsIntro, mainPageMetadata } from "../../lib/content";

export const generateMetadata = (): Promise<Metadata> => mainPageMetadata("weddingsPage", "Weddings");

export default async function Page() {
  const [{ listed }, page] = await Promise.all([getWeddings(), getWeddingsIntro()]);
  const [lead, ...rest] = listed;
  // Cards only get what they show: the full stories and galleries stay out of this page.
  const cards = rest.map(({ slug, href, first, second, place, placeLabel, city, venue, monthYear, shortDescription, storyTitle, cardPhoto }) => ({
    slug,
    href,
    first,
    second,
    place,
    placeLabel,
    city,
    venue,
    monthYear,
    shortDescription,
    storyTitle,
    cardPhoto,
  }));
  return (
    <div className="wbsk-weddings">
      <section className="wbsk-container wbsk-weddings__intro">
        <SectionHead as="h1" line={page?.intro ?? "Every wedding here belongs to two people who trusted us with the quiet parts too."}>
          <TitleWords text="Weddings" />
        </SectionHead>
      </section>
      {lead ? (
        <section className="wbsk-container">
          <WbskLink href={lead.href} className="wbsk-lead-story" data-slug={lead.slug} data-transition="expand">
            <Letterbox>
              {lead.coverDesktop ? (
                <WbskImage image={lead.coverDesktop} portraitImage={lead.coverPhone ?? undefined} slot="coverDesktop" sizes="(min-width: 1680px) 1570px, 100vw" aspectRatio={21 / 9} priority parallax />
              ) : null}
            </Letterbox>
            <span className="wbsk-lead-story__text" data-tone="dark">
              <span className="wbsk-label">{lead.place}</span>
              <span className="wbsk-h2 wbsk-lead-story__names">
                <CoupleNames first={lead.first} second={lead.second} />
              </span>
            </span>
          </WbskLink>
        </section>
      ) : null}
      <section className="wbsk-container wbsk-weddings__grid">
        <WeddingsGrid weddings={cards} leadDescription={lead?.shortDescription ?? ""} />
      </section>
      <section className="wbsk-container wbsk-closingline">
        <EnquireButton statement>{page?.closingLine ?? "Tell us about your wedding"}</EnquireButton>
      </section>
    </div>
  );
}
