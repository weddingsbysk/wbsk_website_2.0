import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  transpilePackages: ["@wbsk/ui", "@wbsk/content"],
  reactStrictMode: true,
};

export default config;
