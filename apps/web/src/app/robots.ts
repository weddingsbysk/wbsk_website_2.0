import type { MetadataRoute } from "next";
import { isProduction, siteUrl } from "../lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  if (!isProduction) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${siteUrl}/sitemap.xml` };
}
