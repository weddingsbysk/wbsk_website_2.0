/** Upload and text rules shared by the Studio and the tests (Decisions 04, 06, 07, 08, 18). */
export type SizeRule = {
  width?: number;
  height?: number;
  longEdge?: number;
};

export const imageRules = {
  card: { width: 1600, height: 2000 },
  coverDesktop: { width: 2560 },
  coverPhone: { width: 1500, height: 2000 },
  gallery: { longEdge: 2560 },
  poster: { width: 1920, height: 1080 },
  heroPosterDesktop: { width: 1920, height: 1080 },
  heroPosterPhone: { width: 1080, height: 1920 },
  teamPortrait: { width: 1600, height: 2000 },
  teamPhoto: { width: 2560 },
  reactionPoster: { width: 1080, height: 1920 },
  destinationArt: { width: 1600, height: 1600 },
} satisfies Record<string, SizeRule>;

export const MAX_VIDEO_BYTES = 30 * 1000 * 1000;

/** Sanity image references carry their size: image-abc123-3000x2000-jpg */
export function imageSizeFromRef(ref: string | undefined): { width: number; height: number } | null {
  const match = ref?.match(/^image-[^-]+-(\d+)x(\d+)-[a-z0-9]+$/);
  return match ? { width: Number(match[1]), height: Number(match[2]) } : null;
}

export function meetsSize(size: { width: number; height: number }, rule: SizeRule): boolean {
  if (rule.width && size.width < rule.width) return false;
  if (rule.height && size.height < rule.height) return false;
  if (rule.longEdge && Math.max(size.width, size.height) < rule.longEdge) return false;
  return true;
}

export function describeRule(rule: SizeRule): string {
  if (rule.longEdge) return `${rule.longEdge}px on its long edge`;
  if (rule.width && rule.height) return `${rule.width} × ${rule.height}`;
  return `${rule.width}px wide`;
}

export function tooSmallMessage(
  slot: string,
  rule: SizeRule,
  size: { width: number; height: number },
): string {
  return `This photo is too small for the ${slot}. Please upload one at least ${describeRule(rule)}. Yours was ${size.width} × ${size.height}.`;
}

const YOUTUBE = /^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtube-nocookie\.com\/embed\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtu\.be\/)[\w-]{6,}/;
export const isYouTubeLink = (value: string) => YOUTUBE.test(value);
export const isInstagramLink = (value: string) =>
  /^https:\/\/(www\.)?instagram\.com\/(reel|reels|p)\/[\w-]+/.test(value);

export function youTubeId(value: string): string | null {
  return value.match(/(?:v=|embed\/|shorts\/|youtu\.be\/)([\w-]{6,})/)?.[1] ?? null;
}

/** "Meera & Arjun" becomes meera-arjun, the pattern current wedding addresses already use. */
export function addressFromNames(first: string, second: string): string {
  return `${first} ${second}`
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
