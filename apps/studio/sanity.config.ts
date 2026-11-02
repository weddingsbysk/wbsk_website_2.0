import { sanityProject } from "@wbsk/content";
import { defineConfig, type DocumentActionComponent } from "sanity";
import { structureTool } from "sanity/structure";
import { OWNER_USER_IDS, wbskTheme } from "./src/brand";
import { ArchiveAction, RemoveAction, RestoreAction } from "./src/components/actions";
import { DocumentInput } from "./src/components/DocumentChrome";
import { HomeTool } from "./src/components/HomeTool";
import { GuideLine, HomeLine, PhotosLine, PlayLine } from "./src/components/icons";
import { WbskNavbar } from "./src/components/Navbar";
import { StudioShell } from "./src/components/StudioShell";
import { previewInspector } from "./src/preview/inspector";
import { schemaTypes, singletonTypes } from "./src/schema";
import { structure } from "./src/structure";
import { GuideTool } from "./src/tools/GuideTool";
import { PhotoLibrary } from "./src/tools/PhotoLibrary";
import { TutorialsTool } from "./src/tools/TutorialsTool";

const FIXED = new Set([...singletonTypes, "enquiryForm", "weddingPackage"]);
const PREVIEWED = new Set(["wedding", "destination", "homepage", "preWeddingPage", "enquiryForm"]);
const HAS_OWN_PAGE = new Set(["wedding", "destination"]);

export default defineConfig({
  name: "wbsk",
  title: "WBSK Studio",
  projectId: sanityProject.projectId,
  dataset: sanityProject.dataset,
  theme: wbskTheme,
  studio: { components: { layout: StudioShell, navbar: WbskNavbar } },
  form: { components: { input: DocumentInput } },
  plugins: [
    structureTool({
      name: "content",
      title: "Content",
      structure,
    }),
  ],
  tools: (prev) => [
    { name: "home", title: "Home", icon: HomeLine, component: HomeTool },
    ...prev,
    { name: "photos", title: "Photo library", icon: PhotosLine, component: PhotoLibrary },
    { name: "guide", title: "Guide", icon: GuideLine, component: GuideTool },
    { name: "tutorials", title: "Tutorials", icon: PlayLine, component: TutorialsTool },
  ],
  schema: {
    types: schemaTypes,
    templates: (prev) => prev.filter((template) => !FIXED.has(template.schemaType)),
  },
  // Decision 17 keeps the Studio to its own menu, so Sanity's extras stay out of the way.
  announcements: { enabled: false },
  releases: { enabled: false },
  scheduledDrafts: { enabled: false },
  tasks: { enabled: false },
  document: {
    comments: { enabled: false },
    inspectors: (prev, context) =>
      PREVIEWED.has(context.documentType) ? [previewInspector, ...prev] : prev,
    newDocumentOptions: (prev) => prev.filter((item) => !FIXED.has(item.templateId)),
    actions: (prev, context) => {
      const owner = context.currentUser ? OWNER_USER_IDS.has(context.currentUser.id) : false;
      const removeFromFixed = new Set(["delete", "duplicate", "unpublish"]);
      const kept = prev.filter((action: DocumentActionComponent) => {
        // Sanity's extras stay out of the way (Decision 17).
        if (/canvas/i.test(action.displayName ?? action.name ?? "")) return false;
        if (FIXED.has(context.schemaType)) return !removeFromFixed.has(action.action ?? "");
        if (action.action === "delete") return owner;
        // "Unpublish" would break a page with no warning; Archive and Remove do it kindly (Decision 20).
        if (HAS_OWN_PAGE.has(context.schemaType) && action.action === "unpublish") return false;
        return true;
      });
      return HAS_OWN_PAGE.has(context.schemaType) ? [...kept, ArchiveAction, RemoveAction, RestoreAction] : kept;
    },
  },
});
