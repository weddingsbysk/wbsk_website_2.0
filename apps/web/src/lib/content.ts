import { createClient } from "@sanity/client";
import { sanityProject, visibleWithSamples } from "@wbsk/content";
import type { SanityImage, WbskImageSource } from "@wbsk/ui";

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

type FilmResult = { url?: string; poster: ImageResult } | null;
type WeddingResult = {
  _createdAt: string;
  isSample?: boolean;
  status?: string;
  firstName: string;
  secondName: string;
  placeLabel: string;
  city: string;
  venue: string;
  weddingDate: string;
  slug: string;
  shortDescription: string;
  theirStory: string;
  cardPhoto: ImageResult;
  coverDesktop: ImageResult;
  coverPhone: ImageResult;
  gallery: ImageResult[] | null;
  teaser: FilmResult;
  highlight: FilmResult;
  reels: { url: string; label?: string }[] | null;
};

const monthYear = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

/** Most images fetch a tiny preview instead, so their inline one needn't weigh down the page. */
export function withoutInlinePreview<T extends WbskImageSource | null>(image: T): T {
  if (!image || image.kind !== "sanity") return image;
  return { ...image, lqip: undefined };
}

function toFilm(film: FilmResult) {
  const poster = withoutInlinePreview(toImage(film?.poster ?? null));
  return film?.url && poster ? { url: film.url, poster } : null;
}

function toWedding(item: WeddingResult) {
  return {
    slug: item.slug,
    href: `/client/${item.slug}/`,
    first: item.firstName,
    second: item.secondName,
    place: `${item.placeLabel} · ${item.city}`.toUpperCase(),
    city: item.city,
    venue: item.venue,
    monthYear: monthYear(item.weddingDate),
    shortDescription: item.shortDescription,
    theirStory: item.theirStory,
    cardPhoto: withoutInlinePreview(toImage(item.cardPhoto)),
    coverDesktop: toImage(item.coverDesktop),
    coverPhone: toImage(item.coverPhone),
    gallery: (item.gallery ?? []).map(toImage).filter(Boolean).map(withoutInlinePreview) as SanityImage[],
    teaser: toFilm(item.teaser),
    highlight: toFilm(item.highlight),
    reels: item.reels ?? [],
  };
}

let weddingsRead: Promise<{
  listed: ReturnType<typeof toWedding>[];
  pages: ReturnType<typeof toWedding>[];
}> | null = null;

/** Read once per build: every couple's page needs the whole list for its Next story. */
export function getWeddings() {
  weddingsRead ??= client
    .fetch<WeddingResult[]>(/* groq */ `*[_type == "wedding" && status != "removed"] | order(weddingDate desc) {
      _createdAt,
      isSample,
      status,
      firstName,
      secondName,
      placeLabel,
      city,
      venue,
      weddingDate,
      "slug": address.current,
      shortDescription,
      theirStory,
      cardPhoto${imageFields},
      coverDesktop${imageFields},
      coverPhone${imageFields},
      gallery[]${imageFields},
      teaser{url, poster${imageFields}},
      highlight{url, poster${imageFields}},
      reels[]{url, label}
    }`)
    .then((data) => {
      const live = visibleWithSamples(data.filter((item) => item.status !== "archived"));
      const archived = data.filter((item) => item.status === "archived");
      // Real work lists first, then any samples still showing (Decision 25).
      const listed = live.map(toWedding);
      return { listed, pages: [...listed, ...archived.map(toWedding)] };
    });
  return weddingsRead;
}

export function getWeddingsIntro() {
  return client.fetch<string | null>(/* groq */ `*[_id == "weddingsPage"][0].intro`);
}
