import type { StructureBuilder, StructureResolver } from "sanity/structure";

const single = (S: StructureBuilder, type: string, title: string) =>
  S.listItem().title(title).id(type).child(S.document().schemaType(type).documentId(type).title(title));

const list = (S: StructureBuilder, type: string, title: string) =>
  S.documentTypeListItem(type).title(title);

/** The menu follows the website's pages (Decision 17). */
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      single(S, "homepage", "Homepage"),
      S.listItem()
        .title("Weddings")
        .id("weddings-section")
        .child(
          S.list()
            .title("Weddings")
            .items([list(S, "wedding", "All weddings"), single(S, "weddingsPage", "Weddings page text")]),
        ),
      S.listItem()
        .title("Films")
        .id("films-section")
        .child(S.list().title("Films").items([list(S, "film", "All films"), single(S, "filmsPage", "Films page text")])),
      S.listItem()
        .title("Pre-wedding")
        .id("prewedding-section")
        .child(
          S.list()
            .title("Pre-wedding")
            .items([
              list(S, "destination", "Destinations"),
              list(S, "preWeddingShoot", "Shoots"),
              single(S, "preWeddingPage", "Pre-wedding page"),
            ]),
        ),
      S.listItem()
        .title("Our team")
        .id("team-section")
        .child(S.list().title("Our team").items([list(S, "teamMember", "Team members"), single(S, "teamPage", "Our team page text")])),
      S.listItem()
        .title("Careers")
        .id("careers-section")
        .child(S.list().title("Careers").items([list(S, "careerRole", "Open roles"), single(S, "careersPage", "Careers page text")])),
      S.divider().title("Couples' words"),
      list(S, "review", "Reviews"),
      list(S, "reactionVideo", "Reaction videos"),
      list(S, "featuredOnItem", "Featured on"),
      S.divider().title("Forms"),
      S.listItem()
        .title("Enquiry forms")
        .id("forms-section")
        .child(
          S.list()
            .title("Enquiry forms")
            .items(
              [
                ["formWedding", "Wedding form"],
                ["formPreWedding", "Pre-wedding form"],
                ["formCareers", "Careers form"],
              ].map(([id, title]) =>
                S.listItem().title(title as string).id(id as string).child(S.document().schemaType("enquiryForm").documentId(id as string).title(title as string)),
              ),
            ),
        ),
      list(S, "weddingPackage", "Packages"),
      S.divider().title("Settings"),
      single(S, "siteSettings", "Site settings"),
    ]);
