import type { Metadata } from "next";
import { PageIntro } from "../../components/PageIntro";
import { PreWeddingArc } from "../../components/PreWeddingArc";
import { getDestinations } from "../../lib/content";

export const metadata: Metadata = { title: "Pre-wedding" };

export default async function Page() {
  const destinations = await getDestinations();
  return (
    <>
      <PageIntro title="Pre-wedding" tone="dark">
        Pick a record. Every one is a place we&rsquo;ve filmed a couple before their wedding.
      </PageIntro>
      <div data-tone="dark">
        <PreWeddingArc
          allSamples={destinations.every((destination) => destination.isSample)}
          destinations={destinations.map((destination) => ({
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
    </>
  );
}
