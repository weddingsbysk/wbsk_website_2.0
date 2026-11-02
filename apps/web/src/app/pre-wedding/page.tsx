import "@wbsk/ui/css/pages.css";
import { CoverVideo, HeroDrift, FilmPlayer, Gallery, GalleryLightbox, Reveal, TitleWords, WbskImage, SectionHead } from "@wbsk/ui";
import type { Metadata } from "next";
import { EnquiryForm } from "../../components/EnquiryForm";
import { PreWeddingArc } from "../../components/PreWeddingArc";
import { getPreWeddingPage, mainPageMetadata } from "../../lib/content";
import { publicAsset } from "../../lib/site";

export const generateMetadata = (): Promise<Metadata> => mainPageMetadata("preWeddingPage", "Pre-wedding");


export default async function Page() {
  const page = await getPreWeddingPage();
  return (
    <>
      <section id="hero" data-tone="dark" className="wbsk-hero">
        <div className="wbsk-hero__media">
          <CoverVideo desktop={page.videoDesktop} phone={page.videoPhone} posterDesktop={page.posterDesktop} posterPhone={page.posterPhone} label="the pre-wedding film" />
        </div>
        <HeroDrift />
        <div className="wbsk-hero__text wbsk-container">
          <h1 className="wbsk-display">
            <TitleWords text="Pre-wedding" />
          </h1>
          {page.credit ? <p className="wbsk-hero__credit">{page.credit}</p> : null}
        </div>
      </section>

      <div data-tone="dark">
        <PreWeddingArc
          allSamples={page.destinations.every((destination) => destination.isSample)}
          destinations={page.destinations.map((destination) => ({
            id: destination.id,
            name: destination.name,
            href: `/pre-wedding/${destination.slug}/`,
            catalogue: destination.catalogue,
            artworkUrl: destination.artworkUrl,
            cover: destination.cover,
            coverPhone: destination.coverPhone,
          }))}
        />
      </div>

      <section className="wbsk-offers" aria-label="What we offer">
        <div className="wbsk-container wbsk-offers__head">
          <SectionHead>What We Offer</SectionHead>
        </div>
        <div className="wbsk-offerings">
          <div className="wbsk-offers__cloth" aria-hidden="true" />
          <svg className="wbsk-offers__line" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" aria-hidden="true">
            <path d="M53 0 C47 20, 54 38, 50 56 S46.5 82, 52 100" vectorEffect="non-scaling-stroke" />
          </svg>
          {page.offerings.map((offering, index) => (
            <article key={offering.name} className="wbsk-offering" data-tone={index % 2 ? "dark" : undefined}>
              <div className="wbsk-offering__inner">
                <Reveal>
                  <h2 className="wbsk-h1">{offering.name}</h2>
                  <p className="wbsk-lead">{offering.description}</p>
                </Reveal>
                <div className="wbsk-offering__films">
                  {offering.films.slice(0, 2).map((film, order) => (
                    <FilmPlayer
                      key={film.id}
                      videoId={film.videoId}
                      poster={film.poster}
                      title={`${offering.name} example film ${order + 1}`}
                      sizes="(min-width: 900px) 21vw, 72vw"
                    />
                  ))}
                </div>
                {offering.gallery.length ? (
                  <div className="wbsk-offering__gallery" aria-label={`${offering.name} example photographs`} role="group">
                    <GalleryLightbox watermarkSrc={publicAsset("/wbsk-logo.svg")} scrolling label={`${offering.name} photographs`}>
                      <Gallery photos={offering.gallery} />
                    </GalleryLightbox>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="wbsk-section wbsk-container" id="plan">
        <EnquiryForm config={page.form} />
      </section>
    </>
  );
}
