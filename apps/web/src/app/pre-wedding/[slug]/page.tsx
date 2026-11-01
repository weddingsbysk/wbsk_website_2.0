import { WbskImage } from "@wbsk/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackToRecords } from "../../../components/BackToRecords";
import { getDestinations } from "../../../lib/content";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  const destinations = await getDestinations();
  return destinations.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const destination = (await getDestinations()).find((item) => item.slug === slug);
  return { title: destination?.name ?? "Pre-wedding" };
}

/** The cover the record dissolves into. The rest of this page arrives in P8. */
export default async function Page({ params }: Params) {
  const { slug } = await params;
  const destination = (await getDestinations()).find((item) => item.slug === slug);
  if (!destination) notFound();
  return (
    <section id="hero" data-tone="dark" className="wbsk-hero">
      {destination.cover ? (
        <WbskImage
          image={destination.cover}
          portraitImage={destination.coverPhone ?? undefined}
          slot="coverDesktop"
          sizes="100vw"
          priority
        />
      ) : null}
      <div className="wbsk-hero__top wbsk-container">
        <BackToRecords />
      </div>
      <div className="wbsk-hero__text wbsk-container">
        <h1 className="wbsk-display wbsk-measure">{destination.name}</h1>
      </div>
    </section>
  );
}
