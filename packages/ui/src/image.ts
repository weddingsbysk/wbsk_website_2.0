export type FocalPoint = { x: number; y: number };

export type SanityImage = {
  kind: "sanity";
  url: string;
  width: number;
  height: number;
  alt: string;
  focal?: FocalPoint;
  lqip?: string;
};

export type LocalImage = {
  kind: "local";
  url: string;
  width: number;
  height: number;
  alt: string;
};

export type WbskImageSource = SanityImage | LocalImage;

export const slotWidths = {
  thumbnail: [300, 600],
  albumCover: [320, 400, 600],
  fullscreen: [1600, 2048, 2560],
  card: [400, 600, 800, 1000, 1200],
  coverDesktop: [1280, 1920, 2560],
  coverPhone: [600, 900, 1200],
  poster: [640, 960, 1440, 1920],
} as const;

export type ImageSlot = keyof typeof slotWidths;

/** Quality is checked by eye against real photographs before launch and raised if any loss shows. */
export const defaultQuality = 82;

export function sanityUrl(
  image: SanityImage,
  options: { width: number; height?: number; quality?: number },
): string {
  const params = new URLSearchParams({
    w: String(Math.round(options.width)),
    auto: "format",
    q: String(options.quality ?? defaultQuality),
  });
  if (options.height) {
    params.set("h", String(Math.round(options.height)));
    params.set("fit", "crop");
    if (image.focal) {
      params.set("crop", "focalpoint");
      params.set("fp-x", image.focal.x.toFixed(3));
      params.set("fp-y", image.focal.y.toFixed(3));
    }
  }
  return `${image.url}?${params.toString()}`;
}

/** Never asks for more pixels than the upload has, since that adds bytes without adding detail. */
export function buildSrcSet(image: SanityImage, slot: ImageSlot, aspectRatio?: number): string {
  const widths = slotWidths[slot].filter((w) => w <= image.width);
  const usable = widths.length > 0 ? widths : [image.width];
  return usable
    .map((w) => {
      const height = aspectRatio ? w / aspectRatio : undefined;
      return `${sanityUrl(image, { width: w, height })} ${w}w`;
    })
    .join(", ");
}

/** The largest long edges for the full-screen view, matched to the screen (Decision 06). */
const FULLSCREEN_EDGES = [1600, 2048, 2560];

export function fullscreenWidths(width: number, height: number): number[] {
  const scale = Math.min(1, width / height);
  const widths = FULLSCREEN_EDGES.map((edge) => Math.round(edge * scale)).filter((w) => w <= width);
  return widths.length ? widths : [width];
}

/** A full-screen photo's sizes, worked out in the browser so they don't weigh down the page. */
export function fullscreenSrcSet(baseUrl: string, width: number, height: number): string {
  const image: SanityImage = { kind: "sanity", url: baseUrl, width, height, alt: "" };
  return fullscreenWidths(width, height)
    .map((w) => `${sanityUrl(image, { width: w })} ${w}w`)
    .join(", ");
}

/** A tiny blurred version to show first: a separate small request, so it adds nothing to the page. */
export const tinyPreviewUrl = (url: string) => `${url}?w=32&blur=20&q=30&auto=format`;

