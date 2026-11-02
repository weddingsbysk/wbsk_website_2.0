import type { ComponentType } from "react";
import type { ListItemBuilder, StructureBuilder, StructureResolver, StructureResolverContext } from "sanity/structure";
import { BoxLine, FilmLine, FormLine, GearLine, HomeLine, MapLine, PlayLine, QuoteLine, RecordLine, RingsLine, RoleLine, StarLine, TeamLine, TextLine } from "./components/icons";

const single = (S: StructureBuilder, type: string, title: string, icon: ComponentType = TextLine) =>
  S.listItem().title(title).id(type).icon(icon).child(S.document().schemaType(type).documentId(type).title(title));

const list = (S: StructureBuilder, type: string, title: string, icon: ComponentType) =>
  S.documentTypeListItem(type).title(title).icon(icon);

/** Counts beside each list (Decision 17), read fresh whenever a section opens. */
const counted = async (S: StructureBuilder, context: StructureResolverContext, title: string, items: [string, string, ComponentType][], extra: ListItemBuilder[] = []) => {
  const query = `{${items.map(([type]) => `"${type}": count(*[_type == "${type}" && !(_id in path("drafts.**")) && hidden != true])`).join(",")}}`;
  const counts = await context.getClient({ apiVersion: "2026-11-01" }).fetch<Record<string, number>>(query);
  return S.list()
    .title(title)
    .items([...items.map(([type, label, icon]) => list(S, type, `${label} · ${counts[type] ?? 0}`, icon)), ...extra]);
};

/** The menu follows the website's pages (Decision 17). */
export const structure: StructureResolver = (S, context) =>
  S.list()
    .title("Content")
    .items([
      S.divider().title("Website pages"),
      single(S, "homepage", "Homepage", HomeLine),
      S.listItem()
        .title("Weddings")
        .id("weddings-section")
        .icon(RingsLine)
        .child(() => counted(S, context, "Weddings", [["wedding", "All weddings", RingsLine]], [single(S, "weddingsPage", "Weddings page text")])),
      S.listItem()
        .title("Films")
        .id("films-section")
        .icon(FilmLine)
        .child(() => counted(S, context, "Films", [["film", "All films", FilmLine]], [single(S, "filmsPage", "Films page text")])),
      S.listItem()
        .title("Pre-wedding")
        .id("prewedding-section")
        .icon(RecordLine)
        .child(() =>
          counted(S, context, "Pre-wedding", [["destination", "Destinations", RecordLine], ["preWeddingShoot", "Shoots", MapLine]], [single(S, "preWeddingPage", "Pre-wedding page")]),
        ),
      S.listItem()
        .title("Our team")
        .id("team-section")
        .icon(TeamLine)
        .child(() => counted(S, context, "Our team", [["teamMember", "Team members", TeamLine]], [single(S, "teamPage", "Our team page text")])),
      S.listItem()
        .title("Careers")
        .id("careers-section")
        .icon(RoleLine)
        .child(() => counted(S, context, "Careers", [["careerRole", "Open roles", RoleLine]], [single(S, "careersPage", "Careers page text")])),
      S.divider().title("Couples' words"),
      list(S, "review", "Reviews", QuoteLine),
      list(S, "reactionVideo", "Reaction videos", PlayLine),
      list(S, "featuredOnItem", "Featured on", StarLine),
      S.divider().title("Forms"),
      S.listItem()
        .title("Enquiry forms")
        .id("forms-section")
        .icon(FormLine)
        .child(
          S.list()
            .title("Enquiry forms")
            .items(
              [
                ["formWedding", "Wedding form"],
                ["formPreWedding", "Pre-wedding form"],
                ["formCareers", "Careers form"],
              ].map(([id, title]) =>
                S.listItem().title(title as string).id(id as string).icon(FormLine).child(S.document().schemaType("enquiryForm").documentId(id as string).title(title as string)),
              ),
            ),
        ),
      list(S, "weddingPackage", "Packages", BoxLine),
      S.divider().title("Settings"),
      single(S, "siteSettings", "Site settings", GearLine),
    ]);
