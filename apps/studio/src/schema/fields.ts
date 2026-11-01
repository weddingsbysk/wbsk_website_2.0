import {
  describeRule,
  imageSizeFromRef,
  isYouTubeLink,
  MAX_VIDEO_BYTES,
  meetsSize,
  tooSmallMessage,
  type SizeRule,
} from "@wbsk/content";
import { defineField, type ValidationContext } from "sanity";

type ImageValue = { asset?: { _ref?: string } };
type FileValue = { asset?: { _ref?: string } };

const API_VERSION = "2026-11-01";

/** Every photo needs a description typed by hand before publishing (Decision 18). */
export const descriptionField = defineField({
  name: "description",
  title: "Description",
  type: "string",
  description: 'What the photo shows, e.g. "Meera and Arjun laughing during the varmala, Goa".',
  validation: (rule) =>
    rule.custom((value, context) => {
      const parent = context.parent as ImageValue | undefined;
      if (!parent?.asset) return true;
      return value?.trim() ? true : "Add a description of this photo";
    }),
});

type PhotoOptions = {
  name: string;
  title: string;
  slot: string;
  rule: SizeRule;
  required?: boolean;
  group?: string;
  description?: string;
  hidden?: (context: { document?: Record<string, unknown> }) => boolean;
};

export function photoField({ name, title, slot, rule, required, group, description, hidden }: PhotoOptions) {
  return defineField({
    name,
    title,
    type: "image",
    group,
    hidden,
    description: description ?? `At least ${describeRule(rule)}.`,
    options: { hotspot: true, accept: "image/*" },
    fields: [descriptionField],
    validation: (r) =>
      r.custom((value: ImageValue | undefined) => {
        if (!value?.asset) return required ? `Add the ${slot}` : true;
        const size = imageSizeFromRef(value.asset._ref);
        if (size && !meetsSize(size, rule)) return tooSmallMessage(slot, rule, size);
        return true;
      }),
  });
}

export const smallGalleryNote = (size: { width: number; height: number }, rule: SizeRule) =>
  `This photo is ${size.width} × ${size.height}, under ${describeRule(rule)}. It can stay, but may look soft full-screen.`;

export function videoField({ name, title, required, group }: { name: string; title: string; required?: boolean; group?: string }) {
  return defineField({
    name,
    title,
    type: "file",
    group,
    description: "MP4 (H.264), silent, under 30 MB. See the Cover Video Export Guide.",
    options: { accept: "video/mp4" },
    validation: (r) =>
      r.custom(async (value: FileValue | undefined, context: ValidationContext) => {
        if (!value?.asset?._ref) return required ? `Add the ${title.toLowerCase()}` : true;
        const size = await context
          .getClient({ apiVersion: API_VERSION })
          .fetch<number | null>(`*[_id == $id][0].size`, { id: value.asset._ref });
        if (size && size > MAX_VIDEO_BYTES) {
          return `This video is ${(size / 1000 / 1000).toFixed(1)} MB. The limit is 30 MB.`;
        }
        return true;
      }),
  });
}

export function youtubeLinkValidation(value: unknown): true | string {
  if (!value) return true;
  return typeof value === "string" && isYouTubeLink(value) ? true : "This needs to be a YouTube link";
}

/** Marks generated sample content. Set by the sample generator, never by hand (Decision 25). */
export const sampleField = defineField({
  name: "isSample",
  title: "Sample",
  type: "boolean",
  readOnly: true,
  hidden: ({ value }) => !value,
  initialValue: false,
});

export const hideField = defineField({
  name: "hidden",
  title: "Hide from website",
  type: "boolean",
  initialValue: false,
});

/** Weddings and destinations have their own pages, so they get Archive and Remove (Decision 20). */
export function statusField(group?: string) {
  return defineField({
    name: "status",
    title: "On the website",
    type: "string",
    group,
    initialValue: "live",
    options: {
      layout: "radio",
      list: [
        { title: "Live", value: "live" },
        { title: "Archived: off the lists, its page stays", value: "archived" },
        { title: "Removed: gone, its address leads to the listing page", value: "removed" },
      ],
    },
  });
}

export const orderField = defineField({
  name: "order",
  title: "Display order",
  type: "number",
  description: "Lower numbers come first.",
});

export function seoField(group?: string) {
  return defineField({
    name: "seo",
    title: "Google & sharing",
    type: "seo",
    group,
    options: { collapsible: true, collapsed: true },
  });
}
