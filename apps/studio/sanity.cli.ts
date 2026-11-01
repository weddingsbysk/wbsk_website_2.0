import { sanityProject } from "@wbsk/content";
import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: { projectId: sanityProject.projectId, dataset: sanityProject.dataset },
  studioHost: "wbsk",
});
