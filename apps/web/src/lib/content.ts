import { createClient } from "@sanity/client";
import { sanityProject, visibleWithSamples, withCameraQuestion, youTubeId, type FormConfig, type FormKind } from "@wbsk/content";
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

export type Seo = { title?: string; description?: string; image?: string } | null | undefined;

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
  return (await readDestinations()).filter((item) => item.status === "live");
}

/** Archived destinations keep their pages; removed ones only redirect (Decision 20). */
export async function getDestinationPages() {
  return (await readDestinations()).filter((item) => item.status !== "removed" || item.slug);
}

async function readDestinations() {
  const data = await client.fetch<(DestinationResult & { status?: string; seo?: Seo; hidden?: boolean })[]>(/* groq */ `*[
    _type == "destination" && (status == "removed" || (hidden != true &&
    count(*[_type == "preWeddingShoot" && hidden != true && references(^._id)]) > 0))
  ] | order(order asc, _createdAt asc) {
    status,
    seo{title, description, "image": image.asset->url},
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
    status: item.status ?? "live",
    seo: item.seo,
    isSample: Boolean(item.isSample),
    name: item.name,
    slug: item.slug,
    catalogue: item.catalogueNumber ?? "",
    // Sanity serves it in a lighter format and keeps its transparency (Decision 08).
    artworkUrl: item.artworkUrl ? `${item.artworkUrl}?w=800&auto=format` : undefined,
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
  storyTitle?: string;
  theirStory: string;
  cardPhoto: ImageResult;
  albumCover: ImageResult;
  bridePhoto: ImageResult;
  groomPhoto: ImageResult;
  coverDesktop: ImageResult;
  coverPhone: ImageResult;
  gallery: ImageResult[] | null;
  teaser: StoryFilmResult;
  highlight: StoryFilmResult;
  reels: { url: string; label?: string }[] | null;
  seo: Seo;
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
  // A wedding made before the album existed shows its card photo on the cover and its first gallery photos on the pages.
  const firstPhotos = (item.gallery ?? []).slice(0, 2);
  return {
    id: item._id,
    isSample: item.isSample,
    featured: item.featured,
    slug: item.slug,
    href: `/client/${item.slug}/`,
    first: item.firstName,
    second: item.secondName,
    place: `${item.placeLabel} · ${item.city}`.toUpperCase(),
    city: item.city,
    placeLabel: item.placeLabel,
    seo: item.seo,
    venue: item.venue,
    monthYear: monthYear(item.weddingDate),
    shortDescription: item.shortDescription,
    storyTitle: item.storyTitle,
    theirStory: item.theirStory,
    cardPhoto: withoutInlinePreview(toImage(item.cardPhoto)),
    albumCover: withoutInlinePreview(toImage(item.albumCover ?? item.cardPhoto)),
    bridePhoto: withoutInlinePreview(toImage(item.bridePhoto ?? firstPhotos[0] ?? item.cardPhoto)),
    groomPhoto: withoutInlinePreview(toImage(item.groomPhoto ?? firstPhotos[1] ?? item.cardPhoto)),
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
  removed: string[];
}> | null = null;

/** Read once per build: every couple's page needs the whole list for its Next story. */
export function getWeddings() {
  weddingsRead ??= client
    .fetch<WeddingResult[]>(/* groq */ `*[_type == "wedding"] | order(weddingDate desc) {
      seo{title, description, "image": image.asset->url},
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
      storyTitle,
      shortDescription,
      theirStory,
      cardPhoto${imageFields},
      albumCover${imageFields},
      bridePhoto${imageFields},
      groomPhoto${imageFields},
      coverDesktop${imageFields},
      coverPhone${imageFields},
      gallery[]${imageFields},
      teaser{url, poster${imageFields}},
      highlight{url, poster${imageFields}},
      reels[]{url, label}
    }`)
    .then((data) => {
      const removed = data.filter((item) => item.status === "removed").map((item) => item.slug);
      const live = visibleWithSamples(data.filter((item) => !["archived", "removed"].includes(item.status ?? "live")));
      const archived = data.filter((item) => item.status === "archived");
      // Real work lists first, then any samples still showing (Decision 25).
      const listed = live.map(toWedding);
      return { listed, pages: [...listed, ...archived.map(toWedding)], removed };
    });
  return weddingsRead;
}

export function getWeddingsIntro() {
  return client.fetch<{ intro?: string; closingLine?: string; storyQuestion?: string; storyLine?: string } | null>(
    /* groq */ `*[_id == "weddingsPage"][0]{ intro, closingLine, storyQuestion, storyLine }`,
  );
}

type FormResult = Omit<FormConfig, "kind">;

const FORM_IDS: Record<FormKind, string> = { wedding: "formWedding", preWedding: "formPreWedding", careers: "formCareers" };

const formFields = /* groq */ `heading, button, questions[]{key, label, kind, example, locked, shown, required, choices, ask, reply}, nextSteps, thankYouHeading, thankYouText, consent`;

export async function getForm(kind: FormKind): Promise<FormConfig> {
  const form = await client.fetch<FormResult>(/* groq */ `*[_id == $id][0]{ ${formFields} }`, { id: FORM_IDS[kind] });
  return withCameraQuestion({ ...form, kind });
}

export function getPackages() {
  return client.fetch<{ name: string; line: string }[]>(/* groq */ `*[_type == "weddingPackage"] | order(order asc){ name, line }`);
}

export function getOpenRoles() {
  return client.fetch<{ title: string; description?: string; isSample?: boolean; _createdAt: string }[]>(
    /* groq */ `*[_type == "careerRole" && hidden != true] | order(order asc){ title, description, isSample, _createdAt }`,
  ).then((roles) => visibleWithSamples(roles));
}

/** With no open roles the question can't be answered, so it stops being required. */
function withRoles(questions: FormConfig["questions"], titles: string[]) {
  return questions.map((q) => (q.kind === "role" ? { ...q, choices: titles, required: q.required && titles.length > 0 } : q));
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
        questions: withRoles(careers.questions, titles),
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
  // An archived destination leaves the Films page link, while its page stays (Decision 20).
  if (linked._type === "destination" && linked.status === "archived") return null;
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
  const [films, intro, form, packages] = await Promise.all([
    readFilms(),
    client.fetch<{ intro?: string; closingLead?: string } | null>(
      /* groq */ `*[_id == "filmsPage"][0]{ intro, closingLead }`,
    ),
    getForm("wedding"),
    getPackages(),
  ]);
  return {
    intro: intro?.intro,
    closingLead: intro?.closingLead,
    form,
    packages,
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

export async function getHomepageContent() {
  const data = await client.fetch<{
    home: {
      heroLine?: string;
      heroEyebrow?: string;
      tickerWords?: string[];
      enquiryTitle?: string;
      enquiryEmphasis?: string;
      whoWeAre?: string;
      teamLine?: string;
      showFeaturedOn?: boolean;
      counters?: { value: string; label: string }[];
      quoteEmphasis?: string;
      quoteBy?: string;
      weddingsLine?: string;
      albumLabel?: string;
      heroPosterDesktop: ImageResult;
      heroPosterPhone: ImageResult;
      teamPhoto: ImageResult;
      videoDesktop?: string;
      videoPhone?: string;
      weddingOrder?: string[];
      filmOrder?: string[];
    } | null;
    reviews: ReviewResult[];
    featuredOn: { _createdAt: string; isSample?: boolean; name: string; link: string; image: ImageResult }[];
    settings: { googleRating?: number; googleReviewCount?: number; googleProfile?: string } | null;
  }>(/* groq */ `{
    "home": *[_id == "homepage"][0]{
      heroLine, heroEyebrow, tickerWords, enquiryTitle, enquiryEmphasis, whoWeAre, quoteEmphasis, quoteBy, weddingsLine, albumLabel, teamLine, showFeaturedOn, counters[]{value, label},
      heroPosterDesktop${imageFields}, heroPosterPhone${imageFields}, teamPhoto${imageFields},
      "videoDesktop": heroVideoDesktop.asset->url, "videoPhone": heroVideoPhone.asset->url,
      "weddingOrder": featuredWeddings[]._ref, "filmOrder": featuredFilms[]._ref
    },
    "reviews": *[_type == "review" && approved == true && hidden != true] | order(order asc){
      _id, _createdAt, isSample, names, place, text, highlight, rating, reviewDate, ${linkedFields}
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
    .map(({ slug, href, first, second, place, placeLabel, city, venue, monthYear, shortDescription, storyTitle, cardPhoto, albumCover, bridePhoto, groomPhoto, isSample }) => ({
      slug, href, first, second, place, placeLabel, city, venue, monthYear, shortDescription, storyTitle, cardPhoto, albumCover, bridePhoto, groomPhoto, isSample,
    }));
  const google = data.settings;
  return {
    heroLine: home?.heroLine,
    heroEyebrow: home?.heroEyebrow,
    tickerWords: home?.tickerWords,
    enquiryTitle: home?.enquiryTitle,
    enquiryEmphasis: home?.enquiryEmphasis,
    whoWeAre: home?.whoWeAre,
    quoteEmphasis: home?.quoteEmphasis,
    quoteBy: home?.quoteBy,
    weddingsLine: home?.weddingsLine,
    albumLabel: home?.albumLabel,
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
    page: { joinLine?: string; closingLine?: string } | null;
    members: { _createdAt: string; isSample?: boolean; name: string; role: string; lines?: string; portrait: ImageResult }[];
  }>(/* groq */ `{
    "line": *[_id == "teamPage"][0].studioLine,
    "page": *[_id == "teamPage"][0]{ joinLine, closingLine },
    "members": *[_type == "teamMember" && hidden != true] | order(order asc){ _createdAt, isSample, name, role, lines, portrait${imageFields} }
  }`);
  return {
    line: data.line,
    joinLine: data.page?.joinLine,
    closingLine: data.page?.closingLine,
    members: visibleWithSamples(data.members).map((member) => ({
      name: member.name,
      role: member.role,
      lines: member.lines,
      portrait: withoutInlinePreview(toImage(member.portrait)),
    })),
  };
}

export async function getCareersPage() {
  const [page, roles, form] = await Promise.all([
    client.fetch<{ intro?: string; noRolesLine?: string } | null>(/* groq */ `*[_id == "careersPage"][0]{ intro, noRolesLine }`),
    getOpenRoles(),
    getForm("careers"),
  ]);
  const titles = roles.map((role) => role.title);
  return { intro: page?.intro, noRolesLine: page?.noRolesLine, roles, form: { ...form, questions: withRoles(form.questions, titles) } };
}

/** Footer links, from Site settings (Decision 03); each shows once it's filled in. */
export async function getSocialLinks() {
  const settings = await client.fetch<{ instagram?: string; youtube?: string } | null>(
    /* groq */ `*[_id == "siteSettings"][0]{ instagram, youtube }`,
  );
  return [
    settings?.instagram ? { label: "Instagram", href: settings.instagram } : null,
    settings?.youtube ? { label: "YouTube", href: settings.youtube } : null,
  ].filter((link): link is { label: string; href: string } => link !== null);
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

/** Site-wide defaults, and each page's optional overrides (Decision 21). */
export async function getPageSeo(id: string) {
  return client.fetch<{
    page: Seo;
    defaultDescription?: string;
    defaultImage?: string;
    intro?: string;
  }>(
    /* groq */ `{
      "page": *[_id == $id][0].seo{title, description, "image": image.asset->url},
      "intro": *[_id == $id][0]{"text": coalesce(intro, studioLine)}.text,
      "defaultDescription": *[_id == "siteSettings"][0].defaultDescription,
      "defaultImage": *[_id == "siteSettings"][0].defaultShareImage.asset->url
    }`,
    { id },
  );
}

export function metadataFrom(seo: Seo, fallback: { title: string; description?: string; image?: string }) {
  const description = seo?.description || fallback.description;
  const image = seo?.image || fallback.image;
  return {
    title: { absolute: seo?.title || `${fallback.title} | WBSK` },
    description,
    openGraph: { title: seo?.title || fallback.title, description, images: image ? [`${image}?w=1200&h=630&fit=crop&auto=format`] : undefined },
  };
}

export async function mainPageMetadata(id: string, title: string) {
  const seo = await getPageSeo(id);
  return metadataFrom(seo.page, { title, description: seo.intro ?? seo.defaultDescription, image: seo.defaultImage });
}

