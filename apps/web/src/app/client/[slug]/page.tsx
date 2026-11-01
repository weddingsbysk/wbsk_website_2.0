import { youTubeId } from "@wbsk/content";
import { CoupleNames, FilmPlayer, Gallery, GalleryLightbox, Reveal, StoryCover, WbskImage, WbskLink } from "@wbsk/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EnquireButton } from "../../../components/EnquiryPanel";
import { getWeddings, withoutInlinePreview } from "../../../lib/content";
import { publicAsset } from "../../../lib/site";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  const { pages } = await getWeddings();
  return pages.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const wedding = (await getWeddings()).pages.find((item) => item.slug === slug);
  if (!wedding) return {};
  return { title: `${wedding.first} & ${wedding.second}`, description: wedding.shortDescription };
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export default async function Page({ params }: Params) {
  const { slug } = await params;
  const { pages, listed } = await getWeddings();
  const wedding = pages.find((item) => item.slug === slug);
  if (!wedding) notFound();

  // The next older wedding; after the oldest, back to the newest (Decision 06).
  const position = listed.findIndex((item) => item.slug === slug);
  const next = listed.length > 1 ? listed[(position + 1) % listed.length] : null;
  const names = `${wedding.first} and ${wedding.second}`;
  const teaserId = wedding.teaser ? youTubeId(wedding.teaser.url) : null;
  const highlightId = wedding.highlight ? youTubeId(wedding.highlight.url) : null;

  return (
    <>
      <StoryCover
        cover={wedding.coverDesktop}
        coverPhone={wedding.coverPhone}
        place={wedding.place}
        names={<CoupleNames first={wedding.first} second={wedding.second} />}
        meta={`${wedding.venue} · ${wedding.monthYear}`}
      />

      <section className="wbsk-container wbsk-story" data-film={teaserId ? "true" : "false"}>
        <Reveal className="wbsk-story__text">
          <h2 className="wbsk-label">Their story</h2>
          {wedding.theirStory.split(/\n{2,}/).map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="wbsk-lead">
              {paragraph}
            </p>
          ))}
          <p className="wbsk-card__meta">
            {wedding.venue}, {wedding.city} · {wedding.monthYear}
          </p>
        </Reveal>
        {teaserId && wedding.teaser?.poster ? (
          <Reveal delayIndex={1}>
            <FilmPlayer videoId={teaserId} poster={wedding.teaser.poster} title={`teaser for ${names}`} />
          </Reveal>
        ) : null}
      </section>

      {wedding.gallery.length ? (
        <section className="wbsk-container wbsk-story__gallery" aria-label="Photographs">
          <div className="wbsk-gallerybar">
            <h2 className="wbsk-label">The day, in photographs</h2>
            <p className="wbsk-card__meta">{wedding.gallery.length} photographs · scroll inside the frame</p>
          </div>
          <GalleryLightbox watermarkSrc={publicAsset("/wbsk-logo.svg")} scrolling>
            <Gallery photos={wedding.gallery} />
          </GalleryLightbox>
        </section>
      ) : null}

      {highlightId && wedding.highlight?.poster ? (
        <section data-tone="dark" className="wbsk-section">
          <div className="wbsk-container wbsk-cinema">
            <Reveal>
              <h2 className="wbsk-h2">The film</h2>
            </Reveal>
            <Reveal delayIndex={1}>
              <FilmPlayer videoId={highlightId} poster={wedding.highlight.poster} title={`highlight film for ${names}`} />
            </Reveal>
            {wedding.reels.length ? (
              <ul className="wbsk-reels">
                {wedding.reels.map((reel, index) => (
                  <li key={reel.url}>
                    <a className="wbsk-reel" href={reel.url} target="_blank" rel="noopener noreferrer">
                      <span>{reel.label ?? `Reel ${ROMAN[index] ?? index + 1}`}</span>
                      <span aria-hidden="true" className="wbsk-reel__arrow">↗</span>
                      <span className="wbsk-sr"> (opens Instagram in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="wbsk-container wbsk-closingband">
        <p className="wbsk-lead">Planning something like this?</p>
        <div>
          <EnquireButton statement>Tell us about your wedding</EnquireButton>
        </div>
      </section>

      {next ? (
        <WbskLink href={next.href} className="wbsk-nextstory" data-transition="next">
          {next.coverDesktop ? (
            <WbskImage image={withoutInlinePreview(next.coverDesktop)} portraitImage={withoutInlinePreview(next.coverPhone) ?? undefined} slot="coverDesktop" sizes="100vw" aspectRatio={21 / 9} />
          ) : null}
          <span className="wbsk-nextstory__text" data-tone="dark">
            <span className="wbsk-label">Next story · {next.place}</span>
            <span className="wbsk-h2 wbsk-lead-story__names">
              <CoupleNames first={next.first} second={next.second} />
            </span>
          </span>
        </WbskLink>
      ) : null}
    </>
  );
}
