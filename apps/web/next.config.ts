import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  transpilePackages: ["@wbsk/ui", "@wbsk/content"],
  // Each page bundles only the components it uses, not everything the package exports.
  experimental: { optimizePackageImports: ["@wbsk/ui"] },
  reactStrictMode: true,
};

export default config;
