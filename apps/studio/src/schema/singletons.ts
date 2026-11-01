import { imageRules } from "@wbsk/content";
import { defineArrayMember, defineField, defineType } from "sanity";
import { photoField, seoField, videoField } from "./fields";

export const homepage = defineType({
  name: "homepage",
  type: "document",
  groups: [
    { name: "hero", title: "Hero video", default: true },
    { name: "who", title: "Who we are" },
    { name: "order", title: "Featured order" },
    { name: "team", title: "Team" },
    { name: "featuredOn", title: "Featured on" },
    { name: "seo", title: "Google & sharing" },
  ],
  fields: [
    videoField({ name: "heroVideoDesktop", title: "Desktop video", required: true, group: "hero" }),
    videoField({ name: "heroVideoPhone", title: "Phone video", required: true, group: "hero" }),
    photoField({ name: "heroPosterDesktop", title: "Desktop poster 16:9", slot: "desktop poster", rule: imageRules.heroPosterDesktop, required: true, group: "hero", description: "The first frame of the desktop video, in the same grade." }),
    photoField({ name: "heroPosterPhone", title: "Phone poster 9:16", slot: "phone poster", rule: imageRules.heroPosterPhone, required: true, group: "hero", description: "The first frame of the phone video, in the same grade." }),
    defineField({ name: "heroLine", title: "Hero line", type: "string", group: "hero", description: "One short line over the film." }),
    defineField({ name: "whoWeAre", title: "Our story line", type: "text", rows: 4, group: "who" }),
    defineField({
      name: "counters",
      type: "array",
      group: "who",
      validation: (rule) => rule.max(2).error("Keep it to two numbers"),
      of: [defineArrayMember({ type: "object", name: "counter", fields: [
        defineField({ name: "value", type: "string", description: 'A round figure such as "250+".' }),
        defineField({ name: "label", type: "string" }),
      ], preview: { select: { title: "value", subtitle: "label" } } })],
    }),
    defineField({ name: "featuredWeddings", title: "Order of featured weddings", type: "array", group: "order", description: "Weddings switched to Featured appear here. Drag to set the order.", of: [defineArrayMember({ type: "reference", to: [{ type: "wedding" }], options: { filter: "featured == true" } })] }),
    defineField({ name: "featuredFilms", title: "Order of featured films", type: "array", group: "order", of: [defineArrayMember({ type: "reference", to: [{ type: "film" }], options: { filter: "featured == true" } })] }),
    photoField({ name: "teamPhoto", title: "Team photo 21:9", slot: "team photo", rule: imageRules.teamPhoto, group: "team" }),
    defineField({ name: "teamLine", title: "Team line", type: "string", group: "team" }),
    defineField({ name: "showFeaturedOn", title: 'Show "Featured on"', type: "boolean", group: "featuredOn", initialValue: false }),
    seoField("seo"),
  ],
  preview: { prepare: () => ({ title: "Homepage" }) },
});

const simplePage = (name: string, title: string, fields: ReturnType<typeof defineField>[]) =>
  defineType({ name, title, type: "document", fields: [...fields, seoField()], preview: { prepare: () => ({ title }) } });

export const weddingsPage = simplePage("weddingsPage", "Weddings page", [
  defineField({ name: "intro", title: "Intro sentence", type: "string" }),
]);
export const filmsPage = simplePage("filmsPage", "Films page", [
  defineField({ name: "intro", title: "Intro line", type: "string" }),
]);
export const teamPage = simplePage("teamPage", "Our team page", [
  defineField({ name: "studioLine", title: "Studio line", type: "string" }),
]);
export const careersPage = simplePage("careersPage", "Careers page", [
  defineField({ name: "intro", type: "text", rows: 3 }),
]);

const offering = (name: string, title: string) =>
  defineField({
    name,
    title,
    type: "object",
    fields: [
      defineField({ name: "name", type: "string" }),
      defineField({ name: "description", type: "text", rows: 3 }),
      defineField({ name: "films", title: "Example films", type: "array", of: [defineArrayMember({ type: "filmLink" })], validation: (rule) => rule.max(2).warning("Each offering shows two films") }),
      defineField({ name: "gallery", title: "Example gallery", type: "array", of: [defineArrayMember({ type: "galleryPhoto" })], options: { layout: "grid" } }),
    ],
  });

export const preWeddingPage = defineType({
  name: "preWeddingPage",
  title: "Pre-wedding page",
  type: "document",
  fields: [
    videoField({ name: "coverVideoDesktop", title: "Desktop video", required: true }),
    videoField({ name: "coverVideoPhone", title: "Phone video", required: true }),
    photoField({ name: "coverPosterDesktop", title: "Desktop poster 16:9", slot: "desktop poster", rule: imageRules.heroPosterDesktop, required: true }),
    photoField({ name: "coverPosterPhone", title: "Phone poster 9:16", slot: "phone poster", rule: imageRules.heroPosterPhone, required: true }),
    defineField({ name: "credit", title: "Credit line", type: "string", description: 'e.g. "Meera & Arjun · Udaipur".' }),
    offering("fullLength", "Full-length"),
    offering("concept", "Concept"),
    seoField(),
  ],
  preview: { prepare: () => ({ title: "Pre-wedding page" }) },
});

export const enquiryForm = defineType({
  name: "enquiryForm",
  title: "Enquiry form",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Form", type: "string", readOnly: true }),
    defineField({ name: "heading", type: "string" }),
    defineField({ name: "button", title: "Button text", type: "string" }),
    defineField({ name: "questions", type: "array", description: "Drag to reorder. Reword or hide what you like.", of: [defineArrayMember({ type: "formQuestion" })] }),
    defineField({ name: "nextSteps", title: "What happens next", type: "array", of: [defineArrayMember({ type: "string" })], validation: (rule) => rule.max(3).warning("Three short steps read best") }),
    defineField({ name: "thankYouHeading", title: "Thank-you heading", type: "string", description: "[names] is replaced with what they typed." }),
    defineField({ name: "thankYouText", title: "Thank-you text", type: "text", rows: 3 }),
    defineField({ name: "consent", title: "Consent wording", type: "text", rows: 3 }),
    defineField({ name: "confirmationEmail", title: "Confirmation email wording", type: "text", rows: 5 }),
  ],
  preview: { select: { title: "title" } },
});

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site settings",
  type: "document",
  groups: [
    { name: "general", title: "General", default: true },
    { name: "google", title: "Google rating" },
    { name: "contact", title: "Backup contact" },
    { name: "privacy", title: "Privacy" },
  ],
  fields: [
    defineField({ name: "siteName", title: "Site name", type: "string", group: "general" }),
    defineField({ name: "defaultDescription", title: "Default description", type: "text", rows: 3, group: "general" }),
    defineField({ name: "defaultShareImage", title: "Default share image", type: "image", group: "general", options: { hotspot: true } }),
    defineField({ name: "instagram", type: "url", group: "general" }),
    defineField({ name: "youtube", title: "YouTube", type: "url", group: "general" }),
    defineField({ name: "analyticsId", title: "Analytics measurement ID", type: "string", group: "general" }),
    defineField({ name: "googleRating", title: "Rating", type: "number", group: "google" }),
    defineField({ name: "googleReviewCount", title: "Number of reviews", type: "number", group: "google" }),
    defineField({ name: "googleProfile", title: "Google profile link", type: "url", group: "google" }),
    defineField({ name: "googleUpdated", title: "Last checked", type: "date", group: "google" }),
    defineField({ name: "formEndpoint", title: "Form web address", type: "url", group: "contact", description: "The web app address from the Enquiries Sheet's script, pasted once during setup." }),
    defineField({ name: "backupWhatsApp", title: "Backup WhatsApp number", type: "string", group: "contact", description: "Shown if a form can't send. Filled in by the team." }),
    defineField({ name: "backupEmail", title: "Backup email", type: "string", group: "contact" }),
    defineField({ name: "privacyPolicy", title: "Privacy policy", type: "text", rows: 16, group: "privacy" }),
  ],
  preview: { prepare: () => ({ title: "Site settings" }) },
});
