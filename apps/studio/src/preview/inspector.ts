import { EyeOpenIcon } from "@sanity/icons/EyeOpen";
import { defineDocumentInspector } from "sanity";
import { PreviewPane } from "./PreviewPane";

export const PREVIEW_INSPECTOR = "wbsk-preview";

export const previewInspector = defineDocumentInspector({
  name: PREVIEW_INSPECTOR,
  component: PreviewPane,
  useMenuItem: () => ({ icon: EyeOpenIcon, title: "Preview", showAsAction: true }),
});
