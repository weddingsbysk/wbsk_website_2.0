import { createClient } from "@sanity/client";
import { sanityProject, visibleWithSamples } from "@wbsk/content";
import type { WbskImageSource } from "@wbsk/ui";

// Published content only, with no token. A failed read fails the build, so the live site keeps
// its last good version (Decision 19).
const client = createClient({ ...sanityProject, useCdn: false, perspective: "published" });

type ImageResult = {
  url?: string;
  width?: number;
  height?: number;
  lqip?: string;
  description?: string;
  hotspot?: { x: number; y: number };
} | null;

const imageFields = /* groq */ `{
  "url": asset->url,
  "width": asset->metadata.dimensions.width,
  "height": asset->metadata.dimensions.height,
  "lqip": asset->metadata.lqip,
  description,
  hotspot
}`;

function toImage(value: ImageResult): WbskImageSource | null {
  if (!value?.url || !value.width || !value.height) return null;
  return {
    kind: "sanity",
    url: value.url,
    width: value.width,
    height: value.height,
    alt: value.description ?? "",
    lqip: value.lqip,
    focal: value.hotspot ? { x: value.hotspot.x, y: value.hotspot.y } : undefined,
  };
}

export async function getHomepage() {
  const data = await client.fetch<{
    heroLine?: string;
    whoWeAre?: string;
    teamLine?: string;
    heroPosterDesktop: ImageResult;
    heroPosterPhone: ImageResult;
    teamPhoto: ImageResult;
  } | null>(/* groq */ `*[_id == "homepage"][0]{
    heroLine,
    whoWeAre,
    teamLine,
    heroPosterDesktop${imageFields},
    heroPosterPhone${imageFields},
    teamPhoto${imageFields}
  }`);
  return {
    heroLine: data?.heroLine,
    whoWeAre: data?.whoWeAre,
    teamLine: data?.teamLine,
    posterDesktop: toImage(data?.heroPosterDesktop ?? null),
    posterPhone: toImage(data?.heroPosterPhone ?? null),
    teamPhoto: toImage(data?.teamPhoto ?? null),
  };
}

type DestinationResult = {
  _id: string;
  _createdAt: string;
  isSample?: boolean;
  name: string;
  slug: string;
  catalogueNumber?: string;
  artworkUrl?: string;
  coverDesktop: ImageResult;
  coverPhone: ImageResult;
};

/** A destination shows once it has a published shoot; order and hiding are set in the Studio. */
export async function getDestinations() {
  const data = await client.fetch<DestinationResult[]>(/* groq */ `*[
    _type == "destination" && hidden != true && (!defined(status) || status == "live") &&
    count(*[_type == "preWeddingShoot" && hidden != true && references(^._id)]) > 0
  ] | order(order asc, _createdAt asc) {
    _id,
    _createdAt,
    isSample,
    name,
    "slug": address.current,
    catalogueNumber,
    "artworkUrl": artwork.asset->url,
    coverDesktop${imageFields},
    coverPhone${imageFields}
  }`);
  return visibleWithSamples(data).map((item) => ({
    id: item._id,
    isSample: Boolean(item.isSample),
    name: item.name,
    slug: item.slug,
    catalogue: item.catalogueNumber ?? "",
    artworkUrl: item.artworkUrl,
    cover: toImage(item.coverDesktop),
    coverPhone: toImage(item.coverPhone),
  }));
}
