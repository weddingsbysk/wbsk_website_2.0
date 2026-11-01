import { imageRules } from "@wbsk/content";
import { defineArrayMember, defineField, defineType } from "sanity";
import { hideField, orderField, photoField, sampleField, seoField, statusField, youtubeLinkValidation } from "./fields";
import { AutoAddressInput } from "../components/AutoAddressInput";
import { DesktopCoverInput, FilmFromSourceInput, PhoneCoverInput } from "../components/ExtraInputs";

const required = (label: string) => (rule: { required: () => { error: (m: string) => unknown } }) =>
  rule.required().error(`Add ${label}`);

export const wedding = defineType({
  name: "wedding",
  title: "Wedding",
  type: "document",
  groups: [
    { name: "couple", title: "1 Couple", default: true },
    { name: "photos", title: "2 Photos" },
    { name: "story", title: "3 Story" },
    { name: "films", title: "4 Films & reels" },
    { name: "homepage", title: "5 Homepage" },
    { name: "more", title: "Google & website" },
  ],
  orderings: [{ title: "Newest first", name: "dateDesc", by: [{ field: "weddingDate", direction: "desc" }] }],
  fields: [
    sampleField,
    defineField({ name: "firstName", title: "First name", type: "string", group: "couple", validation: required("the first name") as never }),
    defineField({ name: "secondName", title: "Second name", type: "string", group: "couple", validation: required("the second name") as never }),
    defineField({ name: "placeLabel", title: "Place label", type: "string", group: "couple", options: { layout: "radio", direction: "horizontal", list: ["Destination", "Local"] }, validation: required("the place label") as never }),
    defineField({ name: "city", type: "string", group: "couple", validation: required("the city") as never }),
    defineField({ name: "venue", type: "string", group: "couple", validation: required("the venue") as never }),
    defineField({ name: "weddingDate", title: "Wedding date", type: "date", group: "couple", validation: required("the wedding date") as never }),
    defineField({
      name: "address",
      title: "Page address",
      type: "slug",
      group: "couple",
      description: "Made from the names. If two couples share names, the year is added.",
      components: { input: AutoAddressInput },
      validation: required("the names, so the address can be made") as never,
    }),
    photoField({ name: "cardPhoto", title: "Card photo 4:5", slot: "card photo", rule: imageRules.card, required: true, group: "photos" }),
    photoField({ name: "coverDesktop", title: "Desktop cover 21:9", slot: "cover", rule: imageRules.coverDesktop, required: true, group: "photos", description: "At least 2560px wide. Keep faces away from the lower left, where the name label sits.", components: { input: DesktopCoverInput } }),
    photoField({ name: "coverPhone", title: "Phone cover 3:4", slot: "phone cover", rule: imageRules.coverPhone, required: true, group: "photos", description: "At least 1500 × 2000. Keep faces above the name label at the bottom.", components: { input: PhoneCoverInput } }),
    defineField({
      name: "gallery",
      type: "array",
      group: "photos",
      description: "Drop 50–60 photos, then drag to reorder. The page keeps this order.",
      of: [defineArrayMember({ type: "galleryPhoto" })],
      options: { layout: "grid" },
    }),
    defineField({ name: "shortDescription", title: "Short description", type: "text", rows: 2, group: "story", description: "About 120 characters, shown with the card.", validation: (rule) => [rule.required().error("Add the short description"), rule.max(140).warning("Aim for about 120 characters")] }),
    defineField({ name: "theirStory", title: "Their story", type: "text", rows: 8, group: "story", description: "About 60–120 words.", validation: (rule) => rule.required().error("Add their story") }),
    defineField({ name: "teaser", title: "Teaser", type: "filmLink", group: "films" }),
    defineField({ name: "highlight", title: "Highlight film", type: "filmLink", group: "films" }),
    defineField({ name: "reels", title: "Instagram reels", type: "array", group: "films", of: [defineArrayMember({ type: "reel" })] }),
    defineField({ name: "featured", title: "Featured on the homepage", type: "boolean", group: "homepage", initialValue: false }),
    statusField("more"),
    seoField("more"),
  ],
  preview: {
    select: { first: "firstName", second: "secondName", city: "city", date: "weddingDate", media: "cardPhoto", sample: "isSample", status: "status", featured: "featured" },
    prepare({ first, second, city, date, media, sample, status, featured }) {
      const notes = [sample ? "Sample" : "", status && status !== "live" ? String(status) : "", featured ? "★" : ""].filter(Boolean).join(" · ");
      return { title: [first, second].filter(Boolean).join(" & ") || "New wedding", subtitle: [city, date ? String(date).slice(0, 7) : "", notes].filter(Boolean).join(" · "), media: media as never };
    },
  },
});

export const film = defineType({
  name: "film",
  type: "document",
  fields: [
    sampleField,
    defineField({ name: "useFrom", title: "Use a film from this wedding or shoot", type: "string", description: "Fills the link, poster and names, so nothing is typed twice. Optional.", components: { input: FilmFromSourceInput } }),
    defineField({ name: "url", title: "YouTube link", type: "url", validation: (rule) => [rule.required().error("Add the YouTube link"), rule.custom(youtubeLinkValidation)] }),
    photoField({ name: "poster", title: "Poster 16:9", slot: "poster", rule: imageRules.poster, required: true }),
    defineField({ name: "names", title: "Couple's names", type: "string", validation: required("the names") as never }),
    defineField({ name: "place", type: "string", validation: required("the place") as never }),
    defineField({ name: "kind", title: "Type", type: "string", options: { list: ["Highlight", "Teaser", "Wedding film", "Pre-wedding"] }, validation: required("the type") as never }),
    defineField({ name: "line", title: "One-line description", type: "string", validation: (rule) => [rule.required().error("Add the one-line description"), rule.max(140).warning("Aim for about 120 characters")] }),
    defineField({ name: "linked", title: "Links to", type: "reference", to: [{ type: "wedding" }, { type: "destination" }], description: 'Used for "Their story →". Optional.' }),
    defineField({ name: "featured", title: "Featured on the homepage", type: "boolean", initialValue: false }),
    defineField({ name: "showOnFilmsPage", title: "Show on Films page", type: "boolean", initialValue: true }),
    orderField,
    hideField,
  ],
  orderings: [{ title: "By hand", name: "order", by: [{ field: "order", direction: "asc" }] }],
  preview: {
    select: { names: "names", kind: "kind", media: "poster", sample: "isSample", hidden: "hidden" },
    prepare: ({ names, kind, media, sample, hidden }) => ({ title: names as string, subtitle: [kind, sample ? "Sample" : "", hidden ? "Hidden" : ""].filter(Boolean).join(" · "), media: media as never }),
  },
});

export const destination = defineType({
  name: "destination",
  type: "document",
  fields: [
    sampleField,
    defineField({ name: "name", type: "string", validation: required("the destination name") as never }),
    defineField({ name: "address", title: "Page address", type: "slug", options: { source: "name" }, validation: required("the page address") as never }),
    defineField({
      name: "catalogueNumber",
      title: "Catalogue number",
      type: "string",
      readOnly: true,
      description: "Given automatically and never reused.",
      // Real destinations count from WBSK-PW 001; samples keep their own marks (Decision 09, G7).
      initialValue: async (_params: unknown, { getClient }: { getClient: (options: { apiVersion: string }) => { fetch: (query: string) => Promise<string[]> } }) => {
        const numbers = await getClient({ apiVersion: "2026-11-01" }).fetch(
          `*[_type == "destination" && catalogueNumber match "WBSK-PW*"].catalogueNumber`,
        );
        const highest = numbers.reduce((max, value) => Math.max(max, Number(value.replace(/\D/g, "")) || 0), 0);
        return `WBSK-PW ${String(highest + 1).padStart(3, "0")}`;
      },
    }),
    photoField({ name: "artwork", title: "Sleeve artwork: B&W transparent PNG", slot: "sleeve artwork", rule: imageRules.destinationArt, required: true, description: "Square, at least 1600 × 1600, with a transparent background." }),
    photoField({ name: "coverDesktop", title: "Desktop cover 21:9", slot: "cover", rule: imageRules.coverDesktop, required: true, components: { input: DesktopCoverInput } }),
    photoField({ name: "coverPhone", title: "Phone cover 3:4", slot: "phone cover", rule: imageRules.coverPhone, required: true, components: { input: PhoneCoverInput } }),
    orderField,
    hideField,
    statusField(),
    seoField(),
  ],
  orderings: [{ title: "By hand", name: "order", by: [{ field: "order", direction: "asc" }] }],
  preview: {
    select: { title: "name", no: "catalogueNumber", media: "coverDesktop", sample: "isSample" },
    prepare: ({ title, no, media, sample }) => ({ title: title as string, subtitle: [no, sample ? "Sample" : ""].filter(Boolean).join(" · "), media: media as never }),
  },
});

export const preWeddingShoot = defineType({
  name: "preWeddingShoot",
  title: "Pre-wedding shoot",
  type: "document",
  fields: [
    sampleField,
    defineField({ name: "names", title: "Couple's names", type: "string", validation: required("the names") as never }),
    defineField({ name: "shortDescription", title: "Short description", type: "text", rows: 2, description: "About 120 characters, shown under their film.", validation: (rule) => [rule.required().error("Add the short description"), rule.max(140).warning("Aim for about 120 characters")] }),
    defineField({ name: "destinations", type: "array", of: [defineArrayMember({ type: "reference", to: [{ type: "destination" }] })], validation: (rule) => rule.min(1).error("Pick at least one destination") }),
    defineField({ name: "kind", title: "Type", type: "string", options: { layout: "radio", direction: "horizontal", list: ["Full-length", "Concept"] }, validation: required("the type") as never }),
    defineField({ name: "monthYear", title: "Month and year", type: "date", validation: required("the month and year") as never }),
    defineField({ name: "location", title: "Specific location (optional)", type: "string" }),
    defineField({ name: "films", type: "array", of: [defineArrayMember({ type: "filmLink" })], validation: (rule) => rule.min(1).error("Add at least one film") }),
    defineField({ name: "photos", type: "array", of: [defineArrayMember({ type: "galleryPhoto" })], options: { layout: "grid" } }),
    hideField,
  ],
  preview: {
    select: { title: "names", kind: "kind", sample: "isSample" },
    prepare: ({ title, kind, sample }) => ({ title: title as string, subtitle: [kind, sample ? "Sample" : ""].filter(Boolean).join(" · ") }),
  },
});

export const teamMember = defineType({
  name: "teamMember",
  title: "Team member",
  type: "document",
  fields: [
    sampleField,
    defineField({ name: "name", type: "string", validation: required("the name") as never }),
    defineField({ name: "role", type: "string", validation: required("the role") as never }),
    photoField({ name: "portrait", title: "B&W portrait 4:5", slot: "portrait", rule: imageRules.teamPortrait, required: true, description: "Already black and white, styled in Lightroom. The website doesn't convert colour photos." }),
    defineField({ name: "lines", title: "A few lines", type: "text", rows: 3 }),
    orderField,
    hideField,
  ],
  orderings: [{ title: "By hand", name: "order", by: [{ field: "order", direction: "asc" }] }],
  preview: {
    select: { title: "name", role: "role", media: "portrait", sample: "isSample" },
    prepare: ({ title, role, media, sample }) => ({ title: title as string, subtitle: [role, sample ? "Sample" : ""].filter(Boolean).join(" · "), media: media as never }),
  },
});

export const review = defineType({
  name: "review",
  type: "document",
  fields: [
    sampleField,
    defineField({ name: "names", title: "Couple's names", type: "string", validation: required("the names") as never }),
    defineField({ name: "place", type: "string", validation: required("the place") as never }),
    defineField({ name: "text", title: "Review", type: "text", rows: 8, validation: required("the review") as never }),
    defineField({ name: "highlight", title: "Highlight line (optional)", type: "string" }),
    defineField({ name: "rating", title: "Star rating (optional)", type: "number", options: { list: [5, 4, 3, 2, 1] } }),
    defineField({ name: "reviewDate", title: "Month and year (optional)", type: "date" }),
    defineField({ name: "linked", title: "Linked wedding (optional)", type: "reference", to: [{ type: "wedding" }] }),
    defineField({
      name: "approved",
      title: "Approved",
      type: "boolean",
      initialValue: false,
      description: "Ask the couple's permission first. Stays a private draft until approved.",
      validation: (rule) => rule.custom((value) => (value ? true : "Switch on Approved before publishing")),
    }),
    orderField,
    hideField,
  ],
  orderings: [{ title: "By hand", name: "order", by: [{ field: "order", direction: "asc" }] }],
  preview: {
    select: { title: "names", place: "place", sample: "isSample", approved: "approved" },
    prepare: ({ title, place, sample, approved }) => ({ title: title as string, subtitle: [place, approved ? "" : "Needs approval", sample ? "Sample" : ""].filter(Boolean).join(" · ") }),
  },
});

export const reactionVideo = defineType({
  name: "reactionVideo",
  title: "Reaction video",
  type: "document",
  fields: [
    sampleField,
    defineField({ name: "url", title: "YouTube link", type: "url", validation: (rule) => [rule.required().error("Add the YouTube link"), rule.custom(youtubeLinkValidation)] }),
    photoField({ name: "poster", title: "Poster 9:16", slot: "poster", rule: imageRules.reactionPoster, required: true }),
    defineField({ name: "names", title: "Couple's names", type: "string", validation: required("the names") as never }),
    defineField({ name: "place", type: "string", validation: required("the place") as never }),
    defineField({ name: "linked", title: "Linked wedding (optional)", type: "reference", to: [{ type: "wedding" }] }),
    defineField({ name: "featured", type: "boolean", initialValue: true }),
    orderField,
    hideField,
  ],
  orderings: [{ title: "By hand", name: "order", by: [{ field: "order", direction: "asc" }] }],
  preview: {
    select: { title: "names", media: "poster", sample: "isSample" },
    prepare: ({ title, media, sample }) => ({ title: title as string, subtitle: sample ? "Sample" : undefined, media: media as never }),
  },
});

export const careerRole = defineType({
  name: "careerRole",
  title: "Open role",
  type: "document",
  fields: [
    sampleField,
    defineField({ name: "title", type: "string", validation: required("the role") as never }),
    defineField({ name: "description", title: "Short description", type: "text", rows: 3 }),
    orderField,
    hideField,
  ],
});

export const featuredOnItem = defineType({
  name: "featuredOnItem",
  title: "Featured on item",
  type: "document",
  fields: [
    sampleField,
    defineField({ name: "name", type: "string", validation: required("the name") as never }),
    photoField({ name: "image", title: "Image", slot: "image", rule: { width: 400 }, required: true }),
    defineField({ name: "link", type: "url", validation: required("the link") as never }),
    orderField,
    hideField,
  ],
});

export const weddingPackage = defineType({
  name: "weddingPackage",
  title: "Package",
  type: "document",
  description: "Name and one line only. Prices and inclusions are discussed personally.",
  fields: [
    defineField({ name: "name", type: "string", validation: required("the name") as never }),
    defineField({ name: "line", title: "One line", type: "string", validation: required("the line") as never }),
    orderField,
  ],
  preview: { select: { title: "name", subtitle: "line" } },
});
