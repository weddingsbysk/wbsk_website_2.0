import "@wbsk/ui/css/pages.css";
import { Gallery, GalleryLightbox, Reveal, StoryCover } from "@wbsk/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackToRecords } from "../../../components/BackToRecords";
import { DestinationFilms } from "../../../components/DestinationFilms";
import { EnquireButton } from "../../../components/EnquiryPanel";
import { getDestinations, getDestinationShoots } from "../../../lib/content";
import { publicAsset } from "../../../lib/site";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

const GALLERY_SHOWN = 20;

export async function generateStaticParams() {
  const destinations = await getDestinations();
  return destinations.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const destination = (await getDestinations()).find((item) => item.slug === slug);
  return { title: destination ? `${destination.name} pre-wedding films and photos` : "Pre-wedding" };
}

export default async function Page({ params }: Params) {
  const { slug } = await params;
  const destination = (await getDestinations()).find((item) => item.slug === slug);
  if (!destination) notFound();
  const { films, photos } = await getDestinationShoots(destination.id);
  return (
    <>
      <StoryCover cover={destination.cover} coverPhone={destination.coverPhone} place="PRE-WEDDING" names={destination.name} meta={`${films.length} film${films.length === 1 ? "" : "s"} from here`} />
      <div className="wbsk-container wbsk-backrow">
        <BackToRecords />
      </div>
      {films.length ? (
        <section data-tone="dark" className="wbsk-section wbsk-carouselsection" aria-label="Films">
          <DestinationFilms films={films} />
        </section>
      ) : null}
      {photos.length ? (
        <section className="wbsk-section wbsk-container" aria-label="Photographs">
          <GalleryLightbox
            watermarkSrc={publicAsset("/wbsk-logo.svg")}
            more={photos.length > GALLERY_SHOWN ? { kind: "show", label: "Show more" } : undefined}
          >
            <Gallery photos={photos} limit={GALLERY_SHOWN} />
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
    </>
  );
}
