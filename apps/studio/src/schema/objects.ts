import { imageRules, imageSizeFromRef, isInstagramLink, meetsSize } from "@wbsk/content";
import { defineField, defineType } from "sanity";
import { SeoInput } from "../components/ExtraInputs";
import { descriptionField, photoField, smallGalleryNote, youtubeLinkValidation } from "./fields";

export const galleryPhoto = defineType({
  name: "galleryPhoto",
  title: "Photo",
  type: "image",
  options: { hotspot: true, accept: "image/*" },
  fields: [descriptionField],
  validation: (rule) =>
    rule
      .custom((value: { asset?: { _ref?: string } } | undefined) => {
        const size = imageSizeFromRef(value?.asset?._ref);
        if (size && !meetsSize(size, imageRules.gallery)) return smallGalleryNote(size, imageRules.gallery);
        return true;
      })
      .warning(),
  preview: {
    select: { title: "description", media: "asset", ref: "asset._ref" },
    prepare({ title, media, ref }) {
      const size = imageSizeFromRef(ref as string | undefined);
      const small = size && !meetsSize(size, imageRules.gallery);
      return {
        title: (title as string) || "Needs a description",
        subtitle: small ? "Small" : undefined,
        media: media as never,
      };
    },
  },
});

/** A YouTube link and its uploaded poster: never one without the other (Decision 06). */
export const filmLink = defineType({
  name: "filmLink",
  title: "Film",
  type: "object",
  fields: [
    defineField({
      name: "url",
      title: "YouTube link",
      type: "url",
      validation: (rule) => rule.custom(youtubeLinkValidation),
    }),
    defineField({
      ...photoField({ name: "poster", title: "Poster 16:9", slot: "poster", rule: imageRules.poster }),
      validation: (rule) =>
        rule.custom((value: { asset?: { _ref?: string } } | undefined, context) => {
          const parent = context.parent as { url?: string } | undefined;
          if (!value?.asset) return parent?.url ? "Add a poster for this film" : true;
          const size = imageSizeFromRef(value.asset._ref);
          if (size && !meetsSize(size, imageRules.poster)) {
            return `This poster is too small. Please upload one at least 1920 × 1080. Yours was ${size.width} × ${size.height}.`;
          }
          return true;
        }),
    }),
  ],
  preview: { select: { title: "url", media: "poster" } },
});

export const reel = defineType({
  name: "reel",
  title: "Instagram reel",
  type: "object",
  fields: [
    defineField({
      name: "url",
      title: "Instagram link",
      type: "url",
      validation: (rule) =>
        rule.required().custom((value) =>
          !value || isInstagramLink(value) ? true : "This needs to be an Instagram reel link",
        ),
    }),
    defineField({ name: "label", title: "Label (optional)", type: "string", description: 'e.g. "Sangeet". Empty reads as Reel I, Reel II.' }),
  ],
  preview: { select: { title: "label", subtitle: "url" } },
});

export const seo = defineType({
  name: "seo",
  title: "Google & sharing",
  type: "object",
  description: "Optional. Leave empty and these are written for you.",
  components: { input: SeoInput },
  fields: [
    defineField({ name: "title", title: "Search title", type: "string", validation: (rule) => rule.max(60).warning("Google usually shows about 60 characters") }),
    defineField({ name: "description", title: "Search description", type: "text", rows: 3, validation: (rule) => rule.max(155).warning("Google usually shows about 155 characters") }),
    defineField({ name: "image", title: "Share image", type: "image", options: { hotspot: true } }),
  ],
});

export const formQuestion = defineType({
  name: "formQuestion",
  title: "Question",
  type: "object",
  fields: [
    defineField({ name: "key", title: "Sheet column", type: "string", readOnly: true, description: "Stays the same when the question is reworded, so the Sheet keeps its column." }),
    defineField({ name: "label", title: "Question", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "example", title: "Example text", type: "string" }),
    defineField({ name: "ask", title: "How the chat asks it", type: "string", description: "Leave empty to use the chat's own wording." }),
    defineField({ name: "reply", title: "What the chat says back", type: "string", description: "Optional. [first] is their first name, [answer] is what they said." }),
    defineField({ name: "kind", title: "Kind", type: "string", readOnly: true }),
    defineField({ name: "locked", title: "Always on", type: "boolean", readOnly: true, hidden: ({ value }) => !value }),
    defineField({ name: "shown", title: "Shown", type: "boolean", initialValue: true, readOnly: ({ parent }) => Boolean((parent as { locked?: boolean })?.locked) }),
    defineField({ name: "required", title: "Required", type: "boolean", readOnly: ({ parent }) => Boolean((parent as { locked?: boolean })?.locked) }),
    defineField({ name: "choices", title: "Choices", type: "array", of: [{ type: "string" }], hidden: ({ parent }) => !["one", "many"].includes((parent as { kind?: string })?.kind ?? "") }),
  ],
  preview: {
    select: { title: "label", shown: "shown", required: "required", locked: "locked" },
    prepare({ title, shown, required, locked }) {
      const state = locked ? "Always on" : shown === false ? "Hidden" : required ? "Shown · Required" : "Shown · Optional";
      return { title: title as string, subtitle: state };
    },
  },
});
