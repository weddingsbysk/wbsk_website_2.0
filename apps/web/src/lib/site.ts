export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:4173";
/** Only a production build may be indexed; the temporary address always stays out of Google. */
export const isProduction = process.env.NEXT_PUBLIC_SITE_ENV === "production";
export const publicAsset = (path: string) => `${basePath}${path}`;
