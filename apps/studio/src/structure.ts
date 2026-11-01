import type { ListItemBuilder, StructureBuilder, StructureResolver, StructureResolverContext } from "sanity/structure";

const single = (S: StructureBuilder, type: string, title: string) =>
  S.listItem().title(title).id(type).child(S.document().schemaType(type).documentId(type).title(title));

const list = (S: StructureBuilder, type: string, title: string) =>
  S.documentTypeListItem(type).title(title);

/** Counts beside each list (Decision 17), read fresh whenever a section opens. */
const counted = async (S: StructureBuilder, context: StructureResolverContext, title: string, items: [string, string][], extra: ListItemBuilder[] = []) => {
  const query = `{${items.map(([type]) => `"${type}": count(*[_type == "${type}" && !(_id in path("drafts.**")) && hidden != true])`).join(",")}}`;
  const counts = await context.getClient({ apiVersion: "2026-11-01" }).fetch<Record<string, number>>(query);
  return S.list()
    .title(title)
    .items([...items.map(([type, label]) => list(S, type, `${label} · ${counts[type] ?? 0}`)), ...extra]);
};

/** The menu follows the website's pages (Decision 17). */
export const structure: StructureResolver = (S, context) =>
  S.list()
    .title("Content")
    .items([
      single(S, "homepage", "Homepage"),
      S.listItem()
        .title("Weddings")
        .id("weddings-section")
        .child(() => counted(S, context, "Weddings", [["wedding", "All weddings"]], [single(S, "weddingsPage", "Weddings page text")])),
      S.listItem()
        .title("Films")
        .id("films-section")
        .child(() => counted(S, context, "Films", [["film", "All films"]], [single(S, "filmsPage", "Films page text")])),
      S.listItem()
        .title("Pre-wedding")
        .id("prewedding-section")
        .child(() =>
          counted(S, context, "Pre-wedding", [["destination", "Destinations"], ["preWeddingShoot", "Shoots"]], [single(S, "preWeddingPage", "Pre-wedding page")]),
        ),
      S.listItem()
        .title("Our team")
        .id("team-section")
        .child(() => counted(S, context, "Our team", [["teamMember", "Team members"]], [single(S, "teamPage", "Our team page text")])),
      S.listItem()
        .title("Careers")
        .id("careers-section")
        .child(() => counted(S, context, "Careers", [["careerRole", "Open roles"]], [single(S, "careersPage", "Careers page text")])),
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
