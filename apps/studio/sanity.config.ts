import { sanityProject } from "@wbsk/content";
import { HomeIcon } from "@sanity/icons/Home";
import { defineConfig, type DocumentActionComponent } from "sanity";
import { structureTool } from "sanity/structure";
import { OWNER_USER_IDS, wbskTheme } from "./src/brand";
import { DocumentInput } from "./src/components/DocumentChrome";
import { HomeTool } from "./src/components/HomeTool";
import { WbskNavbar } from "./src/components/Navbar";
import { previewInspector } from "./src/preview/inspector";
import { schemaTypes, singletonTypes } from "./src/schema";
import { structure } from "./src/structure";

const FIXED = new Set([...singletonTypes, "enquiryForm", "weddingPackage"]);
const PREVIEWED = new Set(["wedding"]);

export default defineConfig({
  name: "wbsk",
  title: "WBSK Studio",
  projectId: sanityProject.projectId,
  dataset: sanityProject.dataset,
  theme: wbskTheme,
  studio: { components: { navbar: WbskNavbar } },
  form: { components: { input: DocumentInput } },
  plugins: [
    structureTool({
      name: "content",
      title: "Content",
      structure,
    }),
  ],
  tools: (prev) => [{ name: "home", title: "Home", icon: HomeIcon, component: HomeTool }, ...prev],
  schema: {
    types: schemaTypes,
    templates: (prev) => prev.filter((template) => !FIXED.has(template.schemaType)),
  },
  document: {
    inspectors: (prev, context) =>
      PREVIEWED.has(context.documentType) ? [previewInspector, ...prev] : prev,
    newDocumentOptions: (prev) => prev.filter((item) => !FIXED.has(item.templateId)),
    actions: (prev, context) => {
      const owner = context.currentUser ? OWNER_USER_IDS.has(context.currentUser.id) : false;
      const removeFromFixed = new Set(["delete", "duplicate", "unpublish"]);
      return prev.filter((action: DocumentActionComponent) => {
        if (FIXED.has(context.schemaType)) return !removeFromFixed.has(action.action ?? "");
        if (action.action === "delete") return owner;
        return true;
      });
    },
  },
});
