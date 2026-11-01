import type { MetadataRoute } from "next";
import { getDestinationPages, getWeddings } from "../lib/content";
import { publicAsset, siteUrl } from "../lib/site";

export const dynamic = "force-static";

/** Every page Google should know about; removed ones are left out (Decision 20). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ pages }, destinations] = await Promise.all([getWeddings(), getDestinationPages()]);
  const paths = [
    "/",
    "/weddings/",
    "/films/",
    "/pre-wedding/",
    "/our-team/",
    "/careers/",
    "/privacy/",
    ...pages.map((wedding) => wedding.href),
    ...destinations.filter((item) => item.status !== "removed").map((item) => `/pre-wedding/${item.slug}/`),
  ];
  return paths.map((path) => ({ url: `${siteUrl}${publicAsset(path)}` }));
}
