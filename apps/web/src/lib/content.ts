import { createClient } from "@sanity/client";
import { sanityProject, visibleWithSamples, youTubeId, type FormConfig, type FormKind } from "@wbsk/content";
import type { SanityImage, WbskImageSource } from "@wbsk/ui";
import { publicAsset } from "./site";

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

type StoryFilmResult = { url?: string; poster: ImageResult } | null;
type WeddingResult = {
  _id: string;
  _createdAt: string;
  isSample?: boolean;
  status?: string;
  featured?: boolean;
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
  teaser: StoryFilmResult;
  highlight: StoryFilmResult;
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

function toFilm(film: StoryFilmResult) {
  const poster = withoutInlinePreview(toImage(film?.poster ?? null));
  return film?.url && poster ? { url: film.url, poster } : null;
}

function toWedding(item: WeddingResult) {
  return {
    id: item._id,
    featured: item.featured,
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
      _id,
      _createdAt,
      isSample,
      status,
      featured,
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

type FormResult = Omit<FormConfig, "kind">;

const FORM_IDS: Record<FormKind, string> = { wedding: "formWedding", preWedding: "formPreWedding", careers: "formCareers" };

const formFields = /* groq */ `heading, button, questions[]{key, label, kind, example, locked, shown, required, choices}, nextSteps, thankYouHeading, thankYouText, consent`;

export async function getForm(kind: FormKind): Promise<FormConfig> {
  const form = await client.fetch<FormResult>(/* groq */ `*[_id == $id][0]{ ${formFields} }`, { id: FORM_IDS[kind] });
  return { ...form, kind };
}

export function getPackages() {
  return client.fetch<{ name: string; line: string }[]>(/* groq */ `*[_type == "weddingPackage"] | order(order asc){ name, line }`);
}

export function getOpenRoles() {
  return client.fetch<{ title: string; description?: string; isSample?: boolean; _createdAt: string }[]>(
    /* groq */ `*[_type == "careerRole" && hidden != true] | order(order asc){ title, description, isSample, _createdAt }`,
  ).then((roles) => visibleWithSamples(roles));
}

/** Everything a slide-up panel needs, published as one small file (see app/forms.json). */
export async function getFormsBundle() {
  const [wedding, preWedding, careers, packages, settings, roles] = await Promise.all([
    getForm("wedding"),
    getForm("preWedding"),
    getForm("careers"),
    getPackages(),
    client.fetch<{ formEndpoint?: string; backupWhatsApp?: string; backupEmail?: string } | null>(
      /* groq */ `*[_id == "siteSettings"][0]{ formEndpoint, backupWhatsApp, backupEmail }`,
    ),
    getOpenRoles(),
  ]);
  const titles = roles.map((role) => role.title);
  return {
    forms: {
      wedding,
      preWedding,
      careers: {
        ...careers,
        questions: careers.questions.map((q) => (q.kind === "role" ? { ...q, choices: titles } : q)),
      },
    },
    packages,
    endpoint: settings?.formEndpoint ?? null,
    backupWhatsApp: settings?.backupWhatsApp ?? null,
    backupEmail: settings?.backupEmail ?? null,
  };
}

/** A cover video's address on this site, where the build copied it (scripts/fetch-media.mjs). */
const siteVideo = (url?: string) => (url ? publicAsset(`/media/${url.split("/").pop()}`) : undefined);

const linkedFields = /* groq */ `linked->{_type, status, "slug": address.current}`;
type Linked = { _type: string; status?: string; slug?: string } | null;

function linkedHref(linked: Linked): string | null {
  if (!linked?.slug || linked.status === "removed") return null;
  return linked._type === "destination" ? `/pre-wedding/${linked.slug}/` : `/client/${linked.slug}/`;
}

type FilmResult = {
  _id: string;
  _createdAt: string;
  isSample?: boolean;
  url: string;
  poster: ImageResult;
  names: string;
  place: string;
  kind: string;
  line: string;
  featured?: boolean;
  showOnFilmsPage?: boolean;
  linked: Linked;
};

const filmFields = /* groq */ `_id, _createdAt, isSample, url, poster${imageFields}, names, place, kind, line, featured, showOnFilmsPage, ${linkedFields}`;

/** Films linked to a removed wedding go with it (Decision 20). */
async function readFilms() {
  const films = await client.fetch<FilmResult[]>(/* groq */ `*[_type == "film" && hidden != true] | order(order asc){ ${filmFields} }`);
  return visibleWithSamples(films.filter((film) => film.linked?.status !== "removed")).flatMap((film) => {
    const videoId = youTubeId(film.url);
    const poster = withoutInlinePreview(toImage(film.poster));
    return videoId && poster
      ? [{ ...film, id: film._id, videoId, poster, href: linkedHref(film.linked) }]
      : [];
  });
}

export async function getFilmsPage() {
  const [films, intro] = await Promise.all([
    readFilms(),
    client.fetch<string | null>(/* groq */ `*[_id == "filmsPage"][0].intro`),
  ]);
  return {
    intro,
    films: films
      .filter((film) => film.showOnFilmsPage !== false)
      .map(({ id, videoId, poster, names, place, kind, line, href }) => ({ id, videoId, poster, names, place, kind, line, href })),
  };
}

type ReviewResult = {
  _id: string;
  _createdAt: string;
  isSample?: boolean;
  names: string;
  place: string;
  text: string;
  highlight?: string;
  rating?: number;
  reviewDate?: string;
  linked: Linked;
};

type ReactionResult = {
  _id: string;
  _createdAt: string;
  isSample?: boolean;
  url: string;
  poster: ImageResult;
  names: string;
  place: string;
  linked: Linked;
};

export async function getHomepageContent() {
  const data = await client.fetch<{
    home: {
      heroLine?: string;
      whoWeAre?: string;
      teamLine?: string;
      showFeaturedOn?: boolean;
      counters?: { value: string; label: string }[];
      heroPosterDesktop: ImageResult;
      heroPosterPhone: ImageResult;
      teamPhoto: ImageResult;
      videoDesktop?: string;
      videoPhone?: string;
      weddingOrder?: string[];
      filmOrder?: string[];
    } | null;
    reviews: ReviewResult[];
    reactions: ReactionResult[];
    featuredOn: { _createdAt: string; isSample?: boolean; name: string; link: string; image: ImageResult }[];
    settings: { googleRating?: number; googleReviewCount?: number; googleProfile?: string } | null;
  }>(/* groq */ `{
    "home": *[_id == "homepage"][0]{
      heroLine, whoWeAre, teamLine, showFeaturedOn, counters[]{value, label},
      heroPosterDesktop${imageFields}, heroPosterPhone${imageFields}, teamPhoto${imageFields},
      "videoDesktop": heroVideoDesktop.asset->url, "videoPhone": heroVideoPhone.asset->url,
      "weddingOrder": featuredWeddings[]._ref, "filmOrder": featuredFilms[]._ref
    },
    "reviews": *[_type == "review" && approved == true && hidden != true] | order(order asc){
      _id, _createdAt, isSample, names, place, text, highlight, rating, reviewDate, ${linkedFields}
    },
    "reactions": *[_type == "reactionVideo" && featured != false && hidden != true] | order(order asc){
      _id, _createdAt, isSample, url, poster${imageFields}, names, place, ${linkedFields}
    },
    "featuredOn": *[_type == "featuredOnItem" && hidden != true] | order(order asc){ _createdAt, isSample, name, link, image${imageFields} },
    "settings": *[_id == "siteSettings"][0]{ googleRating, googleReviewCount, googleProfile }
  }`);
  const [films, { listed }, form, packages] = await Promise.all([readFilms(), getWeddings(), getForm("wedding"), getPackages()]);
  const home = data.home;

  // Featured by the switch; order by hand in the Studio, anything not yet ordered after (Decision 04).
  const rank = (order: string[] | undefined, id: string) => {
    const index = order?.indexOf(id) ?? -1;
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  };
  const weddings = listed
    .filter((wedding) => wedding.featured)
    .sort((a, b) => rank(home?.weddingOrder, a.id) - rank(home?.weddingOrder, b.id))
    .map(({ slug, href, first, second, place, venue, monthYear, shortDescription, cardPhoto }) => ({
      slug, href, first, second, place, venue, monthYear, shortDescription, cardPhoto,
    }));
  const google = data.settings;
  return {
    heroLine: home?.heroLine,
    whoWeAre: home?.whoWeAre,
    teamLine: home?.teamLine,
    counters: home?.counters ?? [],
    posterDesktop: toImage(home?.heroPosterDesktop ?? null),
    posterPhone: toImage(home?.heroPosterPhone ?? null),
    videoDesktop: siteVideo(home?.videoDesktop),
    videoPhone: siteVideo(home?.videoPhone),
    teamPhoto: withoutInlinePreview(toImage(home?.teamPhoto ?? null)),
    weddings,
    films: films
      .filter((film) => film.featured)
      .sort((a, b) => rank(home?.filmOrder, a.id) - rank(home?.filmOrder, b.id))
      .map(({ id, videoId, poster, names, line, place, href }) => ({ id, videoId, poster, names, line, place, href })),
    reviews: visibleWithSamples(data.reviews.filter((review) => review.linked?.status !== "removed")).map((review) => ({
      id: review._id,
      names: review.names,
      place: review.place,
      text: review.text,
      highlight: review.highlight,
      rating: review.rating,
      date: review.reviewDate ? monthYear(review.reviewDate) : undefined,
      href: linkedHref(review.linked),
    })),
    reactions: visibleWithSamples(data.reactions).flatMap((reaction) => {
      const videoId = youTubeId(reaction.url);
      const poster = withoutInlinePreview(toImage(reaction.poster));
      return videoId && poster
        ? [{ id: reaction._id, videoId, poster, names: reaction.names, place: reaction.place, href: linkedHref(reaction.linked) }]
        : [];
    }),
    featuredOn: home?.showFeaturedOn
      ? visibleWithSamples(data.featuredOn).map((item) => ({
          name: item.name,
          link: item.link,
          image: withoutInlinePreview(toImage(item.image)),
        }))
      : [],
    google:
      google?.googleRating && google.googleReviewCount && google.googleProfile
        ? { rating: google.googleRating, count: google.googleReviewCount, href: google.googleProfile }
        : null,
    packages,
    form,
  };
}

export async function getTeamPage() {
  const data = await client.fetch<{
    line: string | null;
    members: { _createdAt: string; isSample?: boolean; name: string; role: string; lines?: string; portrait: ImageResult }[];
  }>(/* groq */ `{
    "line": *[_id == "teamPage"][0].studioLine,
    "members": *[_type == "teamMember" && hidden != true] | order(order asc){ _createdAt, isSample, name, role, lines, portrait${imageFields} }
  }`);
  return {
    line: data.line,
    members: visibleWithSamples(data.members).map((member) => ({
      name: member.name,
      role: member.role,
      lines: member.lines,
      portrait: withoutInlinePreview(toImage(member.portrait)),
    })),
  };
}

export async function getCareersPage() {
  const [intro, roles, form] = await Promise.all([
    client.fetch<string | null>(/* groq */ `*[_id == "careersPage"][0].intro`),
    getOpenRoles(),
    getForm("careers"),
  ]);
  return { intro, roles, form };
}

export function getPrivacyPolicy() {
  return client.fetch<string | null>(/* groq */ `*[_id == "siteSettings"][0].privacyPolicy`);
}

type OfferingResult = {
  name?: string;
  description?: string;
  films?: { url: string; poster: ImageResult }[];
  gallery?: ImageResult[];
} | null;

function toOffering(offering: OfferingResult, fallback: string) {
  return {
    name: offering?.name ?? fallback,
    description: offering?.description ?? "",
    films: (offering?.films ?? []).flatMap((film, index) => {
      const videoId = youTubeId(film.url);
      const poster = withoutInlinePreview(toImage(film.poster));
      return videoId && poster ? [{ id: `${fallback}-${index}`, videoId, poster }] : [];
    }),
    gallery: (offering?.gallery ?? []).map(toImage).filter(Boolean).map(withoutInlinePreview) as SanityImage[],
  };
}

export async function getPreWeddingPage() {
  const offeringFields = /* groq */ `{ name, description, films[]{url, poster${imageFields}}, gallery[]${imageFields} }`;
  const page = await client.fetch<{
    credit?: string;
    posterDesktop: ImageResult;
    posterPhone: ImageResult;
    videoDesktop?: string;
    videoPhone?: string;
    fullLength: OfferingResult;
    concept: OfferingResult;
  } | null>(/* groq */ `*[_id == "preWeddingPage"][0]{
    credit,
    "posterDesktop": coverPosterDesktop${imageFields},
    "posterPhone": coverPosterPhone${imageFields},
    "videoDesktop": coverVideoDesktop.asset->url,
    "videoPhone": coverVideoPhone.asset->url,
    fullLength${offeringFields},
    concept${offeringFields}
  }`);
  const [destinations, form] = await Promise.all([getDestinations(), getForm("preWedding")]);
  return {
    credit: page?.credit,
    posterDesktop: toImage(page?.posterDesktop ?? null),
    posterPhone: toImage(page?.posterPhone ?? null),
    videoDesktop: siteVideo(page?.videoDesktop),
    videoPhone: siteVideo(page?.videoPhone),
    offerings: [toOffering(page?.fullLength ?? null, "Full-length"), toOffering(page?.concept ?? null, "Concept")],
    destinations,
    form,
  };
}

type ShootResult = {
  _id: string;
  _createdAt: string;
  isSample?: boolean;
  names: string;
  kind: string;
  shortDescription: string;
  films?: { url: string; poster: ImageResult }[];
  photos?: ImageResult[];
};

/** Every shoot at a place, mixed: films for the carousel, photos with no names (Decision 08). */
export async function getDestinationShoots(id: string) {
  const shoots = await client.fetch<ShootResult[]>(
    /* groq */ `*[_type == "preWeddingShoot" && hidden != true && references($id)] | order(monthYear desc){
      _id, _createdAt, isSample, names, kind, shortDescription, films[]{url, poster${imageFields}}, photos[]${imageFields}
    }`,
    { id },
  );
  const visible = visibleWithSamples(shoots);
  return {
    films: visible.flatMap((shoot) =>
      (shoot.films ?? []).flatMap((film, index) => {
        const videoId = youTubeId(film.url);
        const poster = withoutInlinePreview(toImage(film.poster));
        return videoId && poster
          ? [{ id: `${shoot._id}-${index}`, videoId, poster, names: shoot.names, kind: shoot.kind, description: shoot.shortDescription }]
          : [];
      }),
    ),
    photos: visible.flatMap((shoot) => (shoot.photos ?? []).map(toImage).filter(Boolean).map(withoutInlinePreview)) as SanityImage[],
  };
}

