import "@wbsk/ui/css/pages.css";
import { Gallery, GalleryLightbox, Reveal, StoryCover } from "@wbsk/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackToRecords } from "../../../components/BackToRecords";
import { DestinationFilms } from "../../../components/DestinationFilms";
import { EnquireButton } from "../../../components/EnquiryPanel";
import { GoneRedirect } from "../../../components/GoneRedirect";
import { getDestinationPages, getDestinationShoots, metadataFrom } from "../../../lib/content";
import { publicAsset } from "../../../lib/site";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;


export async function generateStaticParams() {
  const destinations = await getDestinationPages();
  return destinations.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const destination = (await getDestinationPages()).find((item) => item.slug === slug);
  if (!destination) return {};
  if (destination.status === "removed") return { robots: { index: false } };
  return metadataFrom(destination.seo, {
    title: `${destination.name} pre-wedding films and photos`,
    description: `Pre-wedding films and photographs from ${destination.name}, by Weddings By Siddhant Kapoor.`,
    image: destination.cover?.url,
  });
}

export default async function Page({ params }: Params) {
  const { slug } = await params;
  const destination = (await getDestinationPages()).find((item) => item.slug === slug);
  if (!destination) notFound();
  if (destination.status === "removed") return <GoneRedirect to="/pre-wedding/" label="the Pre-wedding page" />;
  const { films, photos } = await getDestinationShoots(destination.id);
  return (
    <div className="wbsk-destination">
      <StoryCover cover={destination.cover} coverPhone={destination.coverPhone} place="PRE-WEDDING" names={destination.name} meta="" />
      <div className="wbsk-container wbsk-backrow">
        <BackToRecords />
      </div>
      <div className="wbsk-destination__after" />
      {films.length ? (
        <section data-tone="dark" className="wbsk-section wbsk-carouselsection" aria-label="Films">
          <DestinationFilms films={films} />
        </section>
      ) : null}
      {photos.length ? (
        <section className="wbsk-section wbsk-container" aria-label="Photographs">
          <GalleryLightbox watermarkSrc={publicAsset("/wbsk-logo.svg")} scrolling>
            <Gallery photos={photos} />
          </GalleryLightbox>
        </section>
      ) : null}
      <section className="wbsk-container wbsk-closingline">
        <Reveal>
          <EnquireButton statement kind="preWedding">
            Book your pre-wedding
          </EnquireButton>
        </Reveal>
      </section>
    </div>
  );
}
