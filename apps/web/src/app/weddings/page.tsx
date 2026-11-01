import { CoupleNames, Letterbox, WbskImage, WbskLink } from "@wbsk/ui";
import type { Metadata } from "next";
import { EnquireButton } from "../../components/EnquiryPanel";
import { WeddingsGrid } from "../../components/WeddingsGrid";
import { getWeddings, getWeddingsIntro } from "../../lib/content";

export const metadata: Metadata = { title: "Weddings" };

export default async function Page() {
  const [{ listed }, intro] = await Promise.all([getWeddings(), getWeddingsIntro()]);
  const [lead, ...rest] = listed;
  // Cards only get what they show: the full stories and galleries stay out of this page.
  const cards = rest.map(({ slug, href, first, second, place, venue, monthYear, shortDescription, cardPhoto }) => ({
    slug,
    href,
    first,
    second,
    place,
    venue,
    monthYear,
    shortDescription,
    cardPhoto,
  }));
  return (
    <>
      <section className="wbsk-container wbsk-weddings__intro">
        <p className="wbsk-label">Weddings</p>
        <h1 className="wbsk-h1 wbsk-measure">{intro ?? "Every wedding here belongs to two people who trusted us with the quiet parts too."}</h1>
      </section>
      {lead ? (
        <section className="wbsk-container">
          <WbskLink href={lead.href} className="wbsk-lead-story" data-slug={lead.slug} data-transition="expand">
            <Letterbox>
              {lead.coverDesktop ? (
                <WbskImage image={lead.coverDesktop} portraitImage={lead.coverPhone ?? undefined} slot="coverDesktop" sizes="(min-width: 1440px) 1360px, 100vw" aspectRatio={21 / 9} priority parallax />
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
        <WeddingsGrid weddings={cards} />
      </section>
      <section className="wbsk-container wbsk-closingline">
        <EnquireButton>Tell us about your wedding</EnquireButton>
      </section>
    </>
  );
}
