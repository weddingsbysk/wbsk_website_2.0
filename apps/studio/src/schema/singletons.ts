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
    { name: "enquiry", title: "Get in touch" },
    { name: "seo", title: "Google & sharing" },
  ],
  fields: [
    videoField({ name: "heroVideoDesktop", title: "Desktop video", required: true, group: "hero" }),
    videoField({ name: "heroVideoPhone", title: "Phone video", required: true, group: "hero" }),
    photoField({ name: "heroPosterDesktop", title: "Desktop poster 16:9", slot: "desktop poster", rule: imageRules.heroPosterDesktop, required: true, group: "hero", description: "The first frame of the desktop video, in the same grade." }),
    photoField({ name: "heroPosterPhone", title: "Phone poster 9:16", slot: "phone poster", rule: imageRules.heroPosterPhone, required: true, group: "hero", description: "The first frame of the phone video, in the same grade." }),
    defineField({ name: "heroLine", title: "Hero line", type: "string", group: "hero", description: "One short line over the film." }),
    defineField({ name: "heroEyebrow", title: "Small line above the hero line", type: "string", group: "hero", description: 'Empty reads "Photography · Films · Events".' }),
    defineField({ name: "tickerWords", title: "Moving words", type: "array", group: "who", description: "The strip of words above the quote. Empty shows the usual seven.", of: [defineArrayMember({ type: "string" })], options: { layout: "tags" }, validation: (rule) => rule.min(3).warning("Three or more read best").max(12).warning("Twelve at most read best") }),
    defineField({ name: "whoWeAre", title: "Perspective quote", type: "text", rows: 3, group: "who", description: "The big quote on the dark section. No quotation marks: the site adds them." }),
    defineField({ name: "quoteEmphasis", title: "Word in gold", type: "string", group: "who", description: "One word from the quote, spelt exactly as it is there. It shows in gold italic." }),
    defineField({ name: "quoteBy", title: "Who said it", type: "string", group: "who" }),
    defineField({ name: "weddingsLine", title: "Line under Recent Weddings", type: "string", group: "who" }),
    defineField({ name: "albumLabel", title: "Small line on each album's cover", type: "string", group: "who", description: 'Empty reads "Our wedding".' }),
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
    defineField({ name: "enquiryTitle", title: "Line beside the form", type: "string", group: "enquiry", description: "Empty reads \"Let’s create something beautiful together\"." }),
    defineField({ name: "enquiryEmphasis", title: "Word in gold", type: "string", group: "enquiry", description: 'One word from the line, spelt exactly as it is there. Empty uses "beautiful".' }),
    seoField("seo"),
  ],
  preview: { prepare: () => ({ title: "Homepage" }) },
});

const simplePage = (name: string, title: string, fields: ReturnType<typeof defineField>[]) =>
  defineType({ name, title, type: "document", fields: [...fields, seoField()], preview: { prepare: () => ({ title }) } });

export const weddingsPage = simplePage("weddingsPage", "Weddings page", [
  defineField({ name: "intro", title: "Intro sentence", type: "string" }),
  defineField({ name: "closingLine", title: "Closing line", type: "string", description: 'Empty reads "Tell us about your wedding".' }),
  defineField({ name: "storyQuestion", title: "Every couple's page: closing question", type: "string", description: 'Empty reads "Planning something like this?".' }),
  defineField({ name: "storyLine", title: "Every couple's page: closing line", type: "string", description: 'Empty reads "Tell us about your wedding".' }),
]);
export const filmsPage = simplePage("filmsPage", "Films page", [
  defineField({ name: "intro", title: "Intro line", type: "string" }),
  defineField({ name: "closingLead", title: "Closing question", type: "string", description: 'Empty reads "Want a film like this?".' }),
  defineField({ name: "closingLine", title: "Closing line", type: "string", description: 'Empty reads "Tell us about your wedding".' }),
]);
export const teamPage = simplePage("teamPage", "Our team page", [
  defineField({ name: "studioLine", title: "Studio line", type: "string" }),
  defineField({ name: "joinLine", title: "Careers invitation", type: "string", description: 'Empty reads "Want to join us?".' }),
  defineField({ name: "closingLine", title: "Closing line", type: "string", description: 'Empty reads "Tell us about your wedding".' }),
]);
export const careersPage = simplePage("careersPage", "Careers page", [
  defineField({ name: "intro", type: "text", rows: 3 }),
  defineField({ name: "noRolesLine", title: "When no roles are open", type: "string", description: "Empty reads \"No open roles right now, but we’d still like to see your work.\"" }),
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
    defineField({ name: "publishLinkExpires", title: "Publish link expires", type: "date", group: "general", description: "The GitHub token behind Publish lasts a year. The home screen warns a month before." }),
    defineField({ name: "catalogueCounter", type: "number", hidden: true, readOnly: true }),
    defineField({ name: "rebuildRequested", type: "datetime", hidden: true, readOnly: true }),
    defineField({ name: "privacyPolicy", title: "Privacy policy", type: "text", rows: 16, group: "privacy" }),
  ],
  preview: { prepare: () => ({ title: "Site settings" }) },
});
